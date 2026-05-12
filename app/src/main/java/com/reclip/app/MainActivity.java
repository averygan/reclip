package com.reclip.app;

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "ReClip";

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

        // Request storage permissions on Android < 10
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 102);
            }
        }

        webView = findViewById(R.id.webview);
        setupWebView();

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
                String url = extractUrl(shared);
                if (url != null) {
                    pendingSharedUrl = url;
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
        String[] parts = text.split("\\s+");
        for (String part : parts) {
            if (part.startsWith("http://") || part.startsWith("https://")) {
                return part;
            }
        }
        return text.trim();
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

        webView.addJavascriptInterface(new ReClipBridge(), "ReClip");
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
     * Get the writable directory for the executable ffmpeg copy.
     * filesDir is always writable and persistent.
     */
    private String getFFmpegWritableDir() {
        File dir = new File(getFilesDir(), "ffmpeg");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir.getAbsolutePath();
    }

    /**
     * Get the directory containing the bundled libffmpeg.so binary.
     */
    private String getFFmpegNativeDir() {
        return getApplicationInfo().nativeLibraryDir;
    }

    /**
     * Configure ffmpeg in the Python engine. Called before every operation
     * to ensure paths are set up correctly.
     */
    private void configureFFmpeg(PyObject engine) {
        String nativeDir = getFFmpegNativeDir();
        String writableDir = getFFmpegWritableDir();
        Log.i(TAG, "Configuring FFmpeg: native=" + nativeDir + " writable=" + writableDir);
        engine.callAttr("set_ffmpeg_path", nativeDir, writableDir);
    }

    /**
     * Save a file from app-private storage to public Downloads/ReClip/.
     * Uses MediaStore on Android 10+ (no permission needed),
     * direct file copy on older versions.
     *
     * @return the public path/URI of the saved file, or null on failure.
     */
    private String saveFileToDownloads(File srcFile, String mimeType) {
        if (!srcFile.exists()) return null;

        String filename = srcFile.getName();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ — use MediaStore (no storage permission needed)
            try {
                ContentResolver resolver = getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH,
                    Environment.DIRECTORY_DOWNLOADS + "/ReClip");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    Log.e(TAG, "MediaStore insert returned null");
                    return null;
                }

                try (InputStream in = new FileInputStream(srcFile);
                     OutputStream out = resolver.openOutputStream(uri)) {
                    if (out == null) {
                        resolver.delete(uri, null, null);
                        return null;
                    }
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) > 0) {
                        out.write(buffer, 0, read);
                    }
                }

                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, values, null, null);

                // Delete source file from cache
                srcFile.delete();

                Log.i(TAG, "Saved to MediaStore: " + uri);
                return uri.toString();
            } catch (Exception e) {
                Log.e(TAG, "MediaStore save failed", e);
                return null;
            }
        } else {
            // Android < 10 — direct file copy (needs WRITE_EXTERNAL_STORAGE)
            try {
                File downloadsDir = new File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    "ReClip");
                if (!downloadsDir.exists()) downloadsDir.mkdirs();

                File destFile = new File(downloadsDir, filename);
                // Handle name collisions
                int counter = 1;
                String baseName = filename.contains(".") ?
                    filename.substring(0, filename.lastIndexOf('.')) : filename;
                String ext = filename.contains(".") ?
                    filename.substring(filename.lastIndexOf('.')) : "";
                while (destFile.exists()) {
                    destFile = new File(downloadsDir, baseName + " (" + counter + ")" + ext);
                    counter++;
                }

                try (InputStream in = new FileInputStream(srcFile);
                     OutputStream out = new java.io.FileOutputStream(destFile)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) > 0) {
                        out.write(buffer, 0, read);
                    }
                }

                srcFile.delete();

                // Notify media scanner
                Intent scanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                scanIntent.setData(Uri.fromFile(destFile));
                sendBroadcast(scanIntent);

                Log.i(TAG, "Saved to: " + destFile.getAbsolutePath());
                return destFile.getAbsolutePath();
            } catch (Exception e) {
                Log.e(TAG, "Legacy save failed", e);
                return null;
            }
        }
    }

    private String guessMimeType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/mp4";
        if (lower.endsWith(".opus") || lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".webm")) return "video/webm";
        return "video/mp4";
    }

    /**
     * Bridge between WebView UI and native Python/Java code.
     */
    public class ReClipBridge {

        @JavascriptInterface
        public void fetchInfo(String url, String callbackId) {
            executor.execute(() -> {
                try {
                    Python py = Python.getInstance();
                    PyObject engine = py.getModule("reclip_engine");
                    configureFFmpeg(engine);
                    PyObject result = engine.callAttr("get_info", url);
                    String json = result.toString();
                    postToWebView("window._nativeCallback('" + callbackId + "', " + json + ");");
                } catch (Exception e) {
                    Log.e(TAG, "fetchInfo error", e);
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
                    configureFFmpeg(engine);
                    engine.callAttr("reset_progress");

                    // Download to app cache first
                    String cacheDir = getCacheDir().getAbsolutePath() + "/reclip";
                    new File(cacheDir).mkdirs();

                    PyObject result = engine.callAttr("download_media",
                        url, cacheDir, formatChoice,
                        formatId.isEmpty() ? null : formatId,
                        title);
                    String json = result.toString();

                    Log.i(TAG, "Download result: " + json);

                    // Parse result and save to public Downloads
                    try {
                        org.json.JSONObject obj = new org.json.JSONObject(json);
                        if (obj.optBoolean("success", false)) {
                            String srcPath = obj.getString("file");
                            File src = new File(srcPath);

                            if (!src.exists()) {
                                Log.e(TAG, "Source file doesn't exist: " + srcPath);
                                obj.put("success", false);
                                obj.put("error", "Downloaded file not found: " + srcPath);
                                json = obj.toString();
                            } else {
                                String mimeType = guessMimeType(src.getName());
                                String publicPath = saveFileToDownloads(src, mimeType);

                                if (publicPath != null) {
                                    obj.put("file", publicPath);
                                    obj.put("public_uri", publicPath);
                                    Log.i(TAG, "Saved file to: " + publicPath);
                                } else {
                                    obj.put("success", false);
                                    obj.put("error", "Failed to save to Downloads. Check permissions.");
                                }
                                json = obj.toString();
                            }
                        }
                    } catch (Exception moveErr) {
                        Log.e(TAG, "Error saving file", moveErr);
                    }

                    postToWebView("window._nativeCallback('" + callbackId + "', " + json + ");");
                } catch (Exception e) {
                    Log.e(TAG, "startDownload error", e);
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
        public void openFile(String pathOrUri) {
            mainHandler.post(() -> {
                try {
                    Uri uri;
                    String mime;
                    if (pathOrUri.startsWith("content://")) {
                        uri = Uri.parse(pathOrUri);
                        mime = guessMimeType(pathOrUri);
                    } else {
                        File file = new File(pathOrUri);
                        uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider", file);
                        mime = guessMimeType(file.getName());
                    }
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, mime);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "openFile error", e);
                    Toast.makeText(MainActivity.this,
                        "Can't open file", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void shareFile(String pathOrUri) {
            mainHandler.post(() -> {
                try {
                    Uri uri;
                    String mime;
                    if (pathOrUri.startsWith("content://")) {
                        uri = Uri.parse(pathOrUri);
                        mime = guessMimeType(pathOrUri);
                    } else {
                        File file = new File(pathOrUri);
                        uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider", file);
                        mime = guessMimeType(file.getName());
                    }
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType(mime);
                    intent.putExtra(Intent.EXTRA_STREAM, uri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(intent, "Share via"));
                } catch (Exception e) {
                    Log.e(TAG, "shareFile error", e);
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
                configureFFmpeg(engine);
                return engine.callAttr("check_dependencies").toString();
            } catch (Exception e) {
                Log.e(TAG, "checkEngine error", e);
                return "{\"success\":false,\"error\":\"" +
                    e.getMessage().replace("\"", "\\\"") + "\"}";
            }
        }
    }

    private void postToWebView(String js) {
        mainHandler.post(() -> webView.evaluateJavascript(js, null));
    }
}
