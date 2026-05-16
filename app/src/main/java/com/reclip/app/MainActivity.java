package com.reclip.app;

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
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
import android.webkit.ConsoleMessage;
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
import com.reclip.app.billing.PaywallLauncher;
import com.reclip.app.billing.RevenueCatManager;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "ReClip";
    private WebView webView;
    private PaywallLauncher paywallLauncher;
    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String pendingSharedUrl = null;

    private void showDownloadNotification(String title, int percent, String status, boolean indeterminate) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        notifyDownloadService(DownloadService.ACTION_UPDATE, title, status, percent, indeterminate, false);
    }

    private void completeDownloadNotification(String title, boolean success, String detail) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        notifyDownloadService(DownloadService.ACTION_FINISH, title, detail, success ? 100 : 0, false, success);
    }

    private void notifyDownloadService(
        String action, String title, String text, int progress, boolean indeterminate, boolean success
    ) {
        Intent i = new Intent(this, DownloadService.class);
        i.setAction(action);
        i.putExtra(DownloadService.EXTRA_TITLE, title);
        i.putExtra(DownloadService.EXTRA_TEXT, text);
        i.putExtra(DownloadService.EXTRA_PROGRESS, progress);
        i.putExtra(DownloadService.EXTRA_INDETERMINATE, indeterminate);
        i.putExtra(DownloadService.EXTRA_SUCCESS, success);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(i);
        } else {
            startService(i);
        }
    }

    private String progressTextFromJson(String progressJson) {
        try {
            org.json.JSONObject p = new org.json.JSONObject(progressJson);
            String status = p.optString("status", "");
            int percent = (int) Math.round(p.optDouble("percent", 0));
            String speed = p.optString("speed", "");
            String eta = p.optString("eta", "");
            StringBuilder msg = new StringBuilder();
            if (percent > 0) msg.append(percent).append("%");
            if (!speed.isEmpty()) {
                if (msg.length() > 0) msg.append(" · ");
                msg.append(speed);
            }
            if (!eta.isEmpty()) {
                if (msg.length() > 0) msg.append(" · ");
                msg.append("ETA ").append(eta);
            }
            if (msg.length() == 0) {
                if ("processing".equals(status)) return "Processing...";
                if ("downloading".equals(status)) return "Downloading...";
                return "Starting...";
            }
            return msg.toString();
        } catch (Exception e) {
            return "Downloading...";
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Lock phones to portrait; tablets (sw >= 600dp) rotate freely.
        if (getResources().getBoolean(R.bool.lock_portrait)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }

        // Register the RC paywall launcher BEFORE the activity reaches STARTED
        // (ActivityResult launchers must register during INITIALIZED/CREATED).
        // Results are forwarded to the WebView as window.onPaywallResult(status, err).
        paywallLauncher = new PaywallLauncher(this, (status, err) -> {
            String errJson = err == null
                ? "null"
                : "'" + err.replace("'", "\\'") + "'";
            postToWebView(
                "if(window.onPaywallResult)window.onPaywallResult('" + status
                + "'," + errJson + ");"
            );
            if ("purchased".equals(status) || "restored".equals(status)) {
                RevenueCatManager.INSTANCE.refreshCustomerInfo(info -> {
                    boolean pro = RevenueCatManager.INSTANCE.isPro();
                    postToWebView("if(window.onProStatusChanged)window.onProStatusChanged(" + pro + ");");
                    return kotlin.Unit.INSTANCE;
                });
            }
            return kotlin.Unit.INSTANCE;
        });

        setContentView(R.layout.activity_main);

        // Push entitlement updates to the WebView so it can lock/unlock pro features live.
        RevenueCatManager.INSTANCE.addCustomerInfoListener(info -> {
            boolean pro = RevenueCatManager.INSTANCE.isPro();
            postToWebView("if(window.onProStatusChanged)window.onProStatusChanged(" + pro + ");");
            return kotlin.Unit.INSTANCE;
        });

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
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(
                    TAG,
                    "WebViewConsole: " + consoleMessage.message() +
                    " @" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber()
                );
                return true;
            }
        });
        webView.setBackgroundColor(0xFF0F0F23);

        webView.addJavascriptInterface(new ReClipBridge(), "ReClip");
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        // Ask the JS side if it can handle this (e.g., close an open sheet).
        // If not, fall back to default WebView/Activity back behavior.
        webView.evaluateJavascript(
            "(function(){" +
            "  var sheet = document.getElementById('downloadsSheet');" +
            "  if (sheet && sheet.classList.contains('open')) {" +
            "    closeDownloads();" +
            "    return 'handled';" +
            "  }" +
            "  return 'unhandled';" +
            "})()",
            result -> {
                if (result != null && result.contains("handled") && !result.contains("unhandled")) {
                    return; // JS handled it
                }
                mainHandler.post(this::performDefaultBack);
            }
        );
    }

    private void performDefaultBack() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
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
        engine.callAttr("set_spotify_credentials",
            BuildConfig.SPOTIFY_CLIENT_ID,
            BuildConfig.SPOTIFY_CLIENT_SECRET);
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

        String filename = normalizeSavedFilename(srcFile.getName());

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
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".webm")) return "video/webm";
        return "video/mp4";
    }

    private String normalizeSavedFilename(String originalName) {
        if (originalName == null || originalName.trim().isEmpty()) {
            return "reclip_download";
        }
        String name = originalName.trim();
        String lower = name.toLowerCase(Locale.ROOT);

        // yt-dlp thumbnail conversions can produce names like *.webp.jpg or *.webp.jpeg.
        if (lower.endsWith(".webp.jpg")) {
            name = name.substring(0, name.length() - ".webp.jpg".length()) + "_thumbnail.jpg";
        } else if (lower.endsWith(".webp.jpeg")) {
            name = name.substring(0, name.length() - ".webp.jpeg".length()) + "_thumbnail.jpg";
        }

        return name;
    }

    /**
     * Bridge between WebView UI and native Python/Java code.
     */
    public class ReClipBridge {

        @JavascriptInterface
        public void fetchInfo(String url, String callbackId) {
            executor.execute(() -> {
                try {
                    if (isSpotifyLink(url) && !RevenueCatManager.INSTANCE.isPro()) {
                        postToWebView("window._nativeCallback('" + callbackId + "', " +
                            jsonError("Spotify downloads require ReClip Pro") + ");");
                        mainHandler.post(() -> paywallLauncher.showIfNeeded());
                        return;
                    }

                    Python py = Python.getInstance();
                    PyObject engine = py.getModule("reclip_engine");
                    configureFFmpeg(engine);
                    PyObject result = engine.callAttr("get_info", url);
                    String json = result.toString();
                    Log.i(TAG, "fetchInfo result: " + json);
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
                AtomicBoolean monitorRunning = new AtomicBoolean(true);
                Thread progressMonitor = null;
                try {
                    String premiumReason = premiumRestrictionError(url, formatChoice);
                    if (premiumReason != null) {
                        postToWebView("window._nativeCallback('" + callbackId + "', " +
                            jsonError(premiumReason) + ");");
                        if (!RevenueCatManager.INSTANCE.isPro()) {
                            mainHandler.post(() -> paywallLauncher.showIfNeeded());
                        }
                        return;
                    }

                    Python py = Python.getInstance();
                    PyObject engine = py.getModule("reclip_engine");
                    configureFFmpeg(engine);
                    engine.callAttr("reset_progress");

                    final String notifTitle =
                        (title != null && !title.trim().isEmpty()) ? title.trim() : "ReClip Download";
                    showDownloadNotification(notifTitle, 0, "Starting...", true);
                    progressMonitor = new Thread(() -> {
                        while (monitorRunning.get()) {
                            try {
                                String pJson = engine.callAttr("get_progress").toString();
                                org.json.JSONObject p = new org.json.JSONObject(pJson);
                                String status = p.optString("status", "");
                                int percent = (int) Math.round(p.optDouble("percent", 0));
                                boolean indeterminate = "processing".equals(status) || percent <= 0;
                                showDownloadNotification(
                                    notifTitle,
                                    percent,
                                    progressTextFromJson(pJson),
                                    indeterminate
                                );
                            } catch (Exception ignored) { }
                            try { Thread.sleep(700); } catch (InterruptedException ignored) { break; }
                        }
                    });
                    progressMonitor.start();

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

                                    // Record in download history
                                    try {
                                        addToHistory(
                                            obj.optString("filename", ""),
                                            publicPath,
                                            obj.optLong("size", 0),
                                            url,
                                            title,
                                            formatChoice,
                                            mimeType
                                        );
                                    } catch (Exception histErr) {
                                        Log.e(TAG, "Failed to record history", histErr);
                                    }
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

                    try {
                        org.json.JSONObject finalObj = new org.json.JSONObject(json);
                        boolean ok = finalObj.optBoolean("success", false);
                        if (ok) {
                            completeDownloadNotification(notifTitle, true, "Download complete");
                        } else {
                            completeDownloadNotification(
                                notifTitle, false, finalObj.optString("error", "Download failed")
                            );
                        }
                    } catch (Exception ignored) {
                        completeDownloadNotification(notifTitle, false, "Download failed");
                    }

                    postToWebView("window._nativeCallback('" + callbackId + "', " + json + ");");
                } catch (Exception e) {
                    Log.e(TAG, "startDownload error", e);
                    completeDownloadNotification(title, false, e.getMessage());
                    String err = "{\"success\":false,\"error\":\"" +
                        e.getMessage().replace("\"", "\\\"") + "\"}";
                    postToWebView("window._nativeCallback('" + callbackId + "', " + err + ");");
                } finally {
                    monitorRunning.set(false);
                    if (progressMonitor != null) {
                        progressMonitor.interrupt();
                    }
                }
            });
        }

        private String premiumRestrictionError(String url, String formatChoice) {
            boolean isAudioRequest = "audio".equalsIgnoreCase(formatChoice == null ? "" : formatChoice);
            boolean isSpotifyUrl = isSpotifyLink(url);
            boolean needsPro = isAudioRequest || isSpotifyUrl;
            if (needsPro && !RevenueCatManager.INSTANCE.isPro()) {
                return isSpotifyUrl
                    ? "Spotify downloads require ReClip Pro"
                    : "Audio extraction requires ReClip Pro";
            }
            return null;
        }

        private boolean isSpotifyLink(String url) {
            if (url == null) return false;
            String lower = url.toLowerCase(Locale.ROOT);
            return lower.contains("open.spotify.com/") || lower.contains("spotify.link/");
        }

        private String jsonError(String message) {
            String escaped = message == null ? "Unknown error"
                : message.replace("\\", "\\\\").replace("\"", "\\\"");
            return "{\"success\":false,\"error\":\"" + escaped + "\"}";
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

                    // Always show "Open with..." chooser so users can pick
                    // their preferred player (VLC, MX Player, system player, etc.)
                    Intent chooser = Intent.createChooser(intent, "Open with");
                    if (chooser.resolveActivity(getPackageManager()) != null) {
                        startActivity(chooser);
                    } else {
                        Toast.makeText(MainActivity.this,
                            "No app available to open this file", Toast.LENGTH_SHORT).show();
                    }
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
        public void openUrl(String url) {
            mainHandler.post(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "openUrl error", e);
                    Toast.makeText(MainActivity.this,
                        "Can't open link", Toast.LENGTH_SHORT).show();
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

        @JavascriptInterface
        public String getRuntimeInfo() {
            try {
                org.json.JSONObject out = new org.json.JSONObject();
                out.put("mode", "local_on_device");
                out.put("server", "none (in-process, no IP:PORT)");
                out.put("nativeLibraryDir", getFFmpegNativeDir());
                out.put("writableFfmpegDir", getFFmpegWritableDir());
                out.put("bundledFfmpegPath", ReClipApplication.getFFmpegPath());
                out.put("bundledFfprobePath", ReClipApplication.getFFprobePath());
                out.put("sdkInt", Build.VERSION.SDK_INT);
                out.put("appPackage", getPackageName());
                out.put("isPro", RevenueCatManager.INSTANCE.isPro());
                out.put("revenueCatConfigured", RevenueCatManager.INSTANCE.isSdkConfigured());
                return out.toString();
            } catch (Exception e) {
                return "{\"success\":false,\"error\":\"" +
                    e.getMessage().replace("\"", "\\\"") + "\"}";
            }
        }

        /**
         * Return the download history as a JSON array string.
         * Each entry: {id, filename, path, size, sourceUrl, title, type, mime, timestamp, exists}
         */
        @JavascriptInterface
        public String getDownloadHistory() {
            try {
                org.json.JSONArray arr = loadHistory();
                // Verify each file still exists (in case user deleted via Files app)
                for (int i = 0; i < arr.length(); i++) {
                    org.json.JSONObject item = arr.getJSONObject(i);
                    String path = item.optString("path", "");
                    item.put("exists", fileStillExists(path));
                }
                return arr.toString();
            } catch (Exception e) {
                Log.e(TAG, "getDownloadHistory error", e);
                return "[]";
            }
        }

        /**
         * Delete a history entry. If alsoDeleteFile=true, also removes
         * the actual file from disk/MediaStore.
         */
        @JavascriptInterface
        public boolean deleteHistoryItem(String id, boolean alsoDeleteFile) {
            try {
                org.json.JSONArray arr = loadHistory();
                org.json.JSONArray filtered = new org.json.JSONArray();
                String pathToDelete = null;
                for (int i = 0; i < arr.length(); i++) {
                    org.json.JSONObject item = arr.getJSONObject(i);
                    if (item.optString("id").equals(id)) {
                        pathToDelete = item.optString("path", null);
                    } else {
                        filtered.put(item);
                    }
                }
                saveHistory(filtered);

                if (alsoDeleteFile && pathToDelete != null) {
                    deleteDownloadedFile(pathToDelete);
                }
                return true;
            } catch (Exception e) {
                Log.e(TAG, "deleteHistoryItem error", e);
                return false;
            }
        }

        /**
         * Clear all history (does not delete files).
         */
        @JavascriptInterface
        public boolean clearHistory() {
            try {
                saveHistory(new org.json.JSONArray());
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /**
         * Open file with chooser dialog so user picks their preferred player.
         */
        @JavascriptInterface
        public void openWithChooser(String pathOrUri, String mime) {
            mainHandler.post(() -> {
                try {
                    Uri uri;
                    if (pathOrUri.startsWith("content://")) {
                        uri = Uri.parse(pathOrUri);
                    } else {
                        File file = new File(pathOrUri);
                        if (!file.exists()) {
                            Toast.makeText(MainActivity.this,
                                "File no longer exists", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider", file);
                    }
                    String effectiveMime = (mime != null && !mime.isEmpty())
                        ? mime : guessMimeType(pathOrUri);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, effectiveMime);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                                    | Intent.FLAG_ACTIVITY_NEW_TASK);
                    Intent chooser = Intent.createChooser(intent, "Open with");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(chooser);
                } catch (Exception e) {
                    Log.e(TAG, "openWithChooser error", e);
                    Toast.makeText(MainActivity.this,
                        "Can't open file", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // ─── RevenueCat / ReClip Pro ──────────────────────────────────

        /** Sync entitlement check off the cached customer info. */
        @JavascriptInterface
        public boolean isProUser() {
            return RevenueCatManager.INSTANCE.isPro();
        }

        /** Pull latest customer info. Calls back with the resulting pro status. */
        @JavascriptInterface
        public void refreshCustomerInfo(String callbackId) {
            RevenueCatManager.INSTANCE.refreshCustomerInfo(info -> {
                boolean pro = RevenueCatManager.INSTANCE.isPro();
                postToWebView("window._nativeCallback('" + callbackId + "',{\"isPro\":" + pro + "});");
                return kotlin.Unit.INSTANCE;
            });
        }

        /** Show the RevenueCat paywall only if the user lacks the entitlement. */
        @JavascriptInterface
        public void showPaywall() {
            mainHandler.post(() -> paywallLauncher.showIfNeeded());
        }

        /** Always show the paywall (e.g. from an explicit "Go Pro" tap). */
        @JavascriptInterface
        public void showPaywallAlways() {
            mainHandler.post(() -> paywallLauncher.showAlways());
        }

        /** Show the RevenueCat Customer Center (manage / restore / support). */
        @JavascriptInterface
        public void showCustomerCenter() {
            mainHandler.post(() -> paywallLauncher.showCustomerCenter());
        }

        /** Restore prior purchases. Callback: {"isPro":bool,"error":string|null}. */
        @JavascriptInterface
        public void restorePurchases(String callbackId) {
            RevenueCatManager.INSTANCE.restorePurchases((success, err) -> {
                String errJson = err == null ? "null" : "\"" + err.replace("\"", "\\\"") + "\"";
                postToWebView("window._nativeCallback('" + callbackId + "',{\"isPro\":" +
                    success + ",\"error\":" + errJson + "});");
                return kotlin.Unit.INSTANCE;
            });
        }

        /**
         * Kick off the lifetime purchase. Callback: {"isPro":bool,"error":string|null}.
         * Useful if you want to bypass the paywall UI and trigger purchase directly.
         */
        @JavascriptInterface
        public void purchaseLifetime(String callbackId) {
            mainHandler.post(() -> RevenueCatManager.INSTANCE.purchaseLifetime(
                MainActivity.this,
                (success, err) -> {
                    String errJson = err == null ? "null" : "\"" + err.replace("\"", "\\\"") + "\"";
                    postToWebView("window._nativeCallback('" + callbackId + "',{\"isPro\":" +
                        success + ",\"error\":" + errJson + "});");
                    return kotlin.Unit.INSTANCE;
                }
            ));
        }
    }

    // ─── History persistence ───────────────────────────────────────────

    private File getHistoryFile() {
        return new File(getFilesDir(), "download_history.json");
    }

    private org.json.JSONArray loadHistory() {
        File f = getHistoryFile();
        if (!f.exists()) return new org.json.JSONArray();
        try {
            java.io.FileInputStream in = new java.io.FileInputStream(f);
            byte[] buf = new byte[(int) f.length()];
            in.read(buf);
            in.close();
            return new org.json.JSONArray(new String(buf, "UTF-8"));
        } catch (Exception e) {
            Log.e(TAG, "loadHistory failed", e);
            return new org.json.JSONArray();
        }
    }

    private void saveHistory(org.json.JSONArray arr) {
        try {
            java.io.FileOutputStream out = new java.io.FileOutputStream(getHistoryFile());
            out.write(arr.toString().getBytes("UTF-8"));
            out.close();
        } catch (Exception e) {
            Log.e(TAG, "saveHistory failed", e);
        }
    }

    private void addToHistory(String filename, String path, long size,
                              String sourceUrl, String title, String type, String mime) {
        try {
            org.json.JSONArray arr = loadHistory();
            org.json.JSONObject entry = new org.json.JSONObject();
            entry.put("id", "dl_" + System.currentTimeMillis() + "_" +
                              (int)(Math.random() * 10000));
            entry.put("filename", filename);
            entry.put("path", path);
            entry.put("size", size);
            entry.put("sourceUrl", sourceUrl);
            entry.put("title", title);
            entry.put("type", type);          // "video" or "audio"
            entry.put("mime", mime);
            entry.put("timestamp", System.currentTimeMillis());

            // Insert at front (most recent first)
            org.json.JSONArray newArr = new org.json.JSONArray();
            newArr.put(entry);
            for (int i = 0; i < arr.length(); i++) {
                newArr.put(arr.get(i));
            }
            // Cap at 200 entries
            if (newArr.length() > 200) {
                org.json.JSONArray capped = new org.json.JSONArray();
                for (int i = 0; i < 200; i++) capped.put(newArr.get(i));
                newArr = capped;
            }
            saveHistory(newArr);
        } catch (Exception e) {
            Log.e(TAG, "addToHistory failed", e);
        }
    }

    private boolean fileStillExists(String pathOrUri) {
        if (pathOrUri == null || pathOrUri.isEmpty()) return false;
        try {
            if (pathOrUri.startsWith("content://")) {
                Uri uri = Uri.parse(pathOrUri);
                java.io.InputStream is = getContentResolver().openInputStream(uri);
                if (is != null) {
                    is.close();
                    return true;
                }
                return false;
            } else {
                return new File(pathOrUri).exists();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private void deleteDownloadedFile(String pathOrUri) {
        try {
            if (pathOrUri.startsWith("content://")) {
                getContentResolver().delete(Uri.parse(pathOrUri), null, null);
            } else {
                new File(pathOrUri).delete();
            }
        } catch (Exception e) {
            Log.e(TAG, "deleteDownloadedFile error", e);
        }
    }

    private void postToWebView(String js) {
        mainHandler.post(() -> webView.evaluateJavascript(js, null));
    }

}
