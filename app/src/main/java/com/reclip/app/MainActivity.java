package com.reclip.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String pendingSharedUrl = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        webView = findViewById(R.id.webview);
        setupWebView();

        // Handle shared URLs from other apps (e.g. share from YouTube)
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (shared != null) {
                // Extract URL from shared text (may contain extra text)
                String url = extractUrl(shared);
                if (url != null) {
                    pendingSharedUrl = url;
                    // Inject into WebView once loaded
                    if (webView != null) {
                        webView.evaluateJavascript(
                            "if(window.onSharedUrl) window.onSharedUrl('" +
                            url.replace("'", "\\'") + "');", null);
                    }
                }
            }
        }
    }

    private String extractUrl(String text) {
        // Find first URL in text
        String[] parts = text.split("\\s+");
        for (String part : parts) {
            if (part.startsWith("http://") || part.startsWith("https://")) {
                return part;
            }
        }
        return text.trim(); // fallback: treat whole thing as URL
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(0xFF0F0F23);

        // Add the bridge between JS and native Python engine
        webView.addJavascriptInterface(new ReClipBridge(), "ReClip");

        // Load the UI from assets
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * JavaScript bridge — exposes native functionality to the WebView UI.
     * All Python/yt-dlp calls run on background threads via the executor.
     */
    public class ReClipBridge {

        @JavascriptInterface
        public void fetchInfo(String url, String callbackId) {
            executor.execute(() -> {
                try {
                    Python py = Python.getInstance();
                    PyObject engine = py.getModule("reclip_engine");
                    // Pass ffmpeg path so yt-dlp can find it
                    String ffmpegDir = getFFmpegDir();
                    if (ffmpegDir != null) {
                        engine.callAttr("set_ffmpeg_path", ffmpegDir);
                    }
                    PyObject result = engine.callAttr("get_info", url);
                    String json = result.toString();
                    postToWebView("window._nativeCallback('" + callbackId + "', " + json + ");");
                } catch (Exception e) {
                    String err = "{\"success\":false,\"error\":\"" +
                        e.getMessage().replace("\"", "\\\"") + "\"}";
                    postToWebView("window._nativeCallback('" + callbackId + "', " + err + ");");
                }
            });
        }

        @JavascriptInterface
        public void startDownload(String url, String formatChoice, String formatId, String title, String callbackId) {
            executor.execute(() -> {
                try {
                    Python py = Python.getInstance();
                    PyObject engine = py.getModule("reclip_engine");
                    // Pass ffmpeg path so yt-dlp can find it
                    String ffmpegDir = getFFmpegDir();
                    if (ffmpegDir != null) {
                        engine.callAttr("set_ffmpeg_path", ffmpegDir);
                    }
                    engine.callAttr("reset_progress");

                    // Download to app cache first, then move to Downloads
                    String cacheDir = getCacheDir().getAbsolutePath() + "/reclip";
                    PyObject result = engine.callAttr("download_media",
                        url, cacheDir, formatChoice,
                        formatId.isEmpty() ? null : formatId,
                        title);
                    String json = result.toString();

                    // Parse result and move file to public Downloads
                    try {
                        org.json.JSONObject obj = new org.json.JSONObject(json);
                        if (obj.optBoolean("success", false)) {
                            String srcPath = obj.getString("file");
                            String filename = obj.getString("filename");
                            File src = new File(srcPath);

                            // Move to Downloads/ReClip/
                            File destDir = new File(
                                Environment.getExternalStoragePublicDirectory(
                                    Environment.DIRECTORY_DOWNLOADS), "ReClip");
                            destDir.mkdirs();
                            File dest = new File(destDir, filename);

                            // Handle name collisions
                            int counter = 1;
                            String baseName = filename.contains(".")
                                ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                            String ext = filename.contains(".")
                                ? filename.substring(filename.lastIndexOf('.')) : "";
                            while (dest.exists()) {
                                dest = new File(destDir, baseName + " (" + counter + ")" + ext);
                                counter++;
                            }

                            if (src.renameTo(dest)) {
                                obj.put("file", dest.getAbsolutePath());
                                obj.put("filename", dest.getName());

                                // Notify media scanner
                                Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                                scanIntent.setData(Uri.fromFile(dest));
                                sendBroadcast(scanIntent);
                            }
                            json = obj.toString();
                        }
                    } catch (Exception moveErr) {
                        // If move fails, keep the cached version
                    }

                    postToWebView("window._nativeCallback('" + callbackId + "', " + json + ");");
                } catch (Exception e) {
                    String err = "{\"success\":false,\"error\":\"" +
                        e.getMessage().replace("\"", "\\\"") + "\"}";
                    postToWebView("window._nativeCallback('" + callbackId + "', " + err + ");");
                }
            });
        }

        @JavascriptInterface
        public String getProgress() {
            try {
                Python py = Python.getInstance();
                PyObject engine = py.getModule("reclip_engine");
                return engine.callAttr("get_progress").toString();
            } catch (Exception e) {
                return "{\"percent\":0,\"status\":\"error\"}";
            }
        }

        @JavascriptInterface
        public String getClipboard() {
            try {
                ClipboardManager clipboard =
                    (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null && clipboard.hasPrimaryClip()) {
                    ClipData clip = clipboard.getPrimaryClip();
                    if (clip != null && clip.getItemCount() > 0) {
                        CharSequence text = clip.getItemAt(0).getText();
                        if (text != null) return text.toString();
                    }
                }
            } catch (Exception e) { /* ignore */ }
            return "";
        }

        @JavascriptInterface
        public void openFile(String filePath) {
            mainHandler.post(() -> {
                try {
                    File file = new File(filePath);
                    Uri uri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider", file);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    String mime = filePath.endsWith(".mp3") ? "audio/mpeg" : "video/mp4";
                    intent.setDataAndType(uri, mime);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                        "Can't open file", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void shareFile(String filePath) {
            mainHandler.post(() -> {
                try {
                    File file = new File(filePath);
                    Uri uri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider", file);
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    String mime = filePath.endsWith(".mp3") ? "audio/mpeg" : "video/mp4";
                    intent.setType(mime);
                    intent.putExtra(Intent.EXTRA_STREAM, uri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(intent, "Share via"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                        "Can't share file", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String getPendingUrl() {
            String url = pendingSharedUrl;
            pendingSharedUrl = null;
            return url != null ? url : "";
        }

        @JavascriptInterface
        public String checkEngine() {
            try {
                Python py = Python.getInstance();
                PyObject engine = py.getModule("reclip_engine");
                // Set ffmpeg path before checking
                String ffmpegDir = getFFmpegDir();
                if (ffmpegDir != null) {
                    engine.callAttr("set_ffmpeg_path", ffmpegDir);
                }
                return engine.callAttr("check_dependencies").toString();
            } catch (Exception e) {
                return "{\"success\":false,\"error\":\"" +
                    e.getMessage().replace("\"", "\\\"") + "\"}";
            }
        }
    }

    /**
     * Returns the directory containing the bundled ffmpeg binary,
     * or null if not found. yt-dlp's ffmpeg_location option takes a directory.
     */
    private String getFFmpegDir() {
        String path = ReClipApplication.getFFmpegPath();
        if (path != null) {
            return new File(path).getParent();
        }
        return null;
    }

    private void postToWebView(String js) {
        mainHandler.post(() -> webView.evaluateJavascript(js, null));
    }
}
