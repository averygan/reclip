package com.reclip.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.util.Log;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import com.reclip.app.billing.RevenueCatManager;
import java.io.File;

public class ReClipApplication extends Application {

    private static final String TAG = "ReClip";
    private static String ffmpegPath = null;
    private static String ffprobePath = null;

    @Override
    public void onCreate() {
        super.onCreate();

        // Initialize Chaquopy Python runtime
        if (!Python.isStarted()) {
            Python.start(new AndroidPlatform(this));
        }

        // Configure RevenueCat once, on process start.
        RevenueCatManager.INSTANCE.configure(this);

        // Locate bundled ffmpeg binary.
        // When native libs are bundled in jniLibs/ as libffmpeg.so / libffprobe.so,
        // Android extracts them to nativeLibraryDir alongside other .so files.
        // We just need to find them and make them executable.
        setupFFmpeg();

        // Create notification channel for downloads
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "reclip_downloads",
                getString(R.string.download_channel),
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(getString(R.string.download_channel_desc));
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void setupFFmpeg() {
        try {
            // Android automatically extracts jniLibs/*.so to the app's native lib dir
            ApplicationInfo appInfo = getApplicationInfo();
            String nativeDir = appInfo.nativeLibraryDir;

            File ffmpeg = new File(nativeDir, "libffmpeg.so");
            File ffprobe = new File(nativeDir, "libffprobe.so");

            if (ffmpeg.exists()) {
                ffmpeg.setExecutable(true, false);
                ffmpegPath = ffmpeg.getAbsolutePath();
                Log.i(TAG, "FFmpeg found: " + ffmpegPath + " (" + (ffmpeg.length() / 1024 / 1024) + " MB)");
            } else {
                Log.w(TAG, "FFmpeg binary not found in " + nativeDir);
            }

            if (ffprobe.exists()) {
                ffprobe.setExecutable(true, false);
                ffprobePath = ffprobe.getAbsolutePath();
                Log.i(TAG, "FFprobe found: " + ffprobePath);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting up FFmpeg", e);
        }
    }

    /** Returns the absolute path to the bundled ffmpeg binary, or null if not available. */
    public static String getFFmpegPath() {
        return ffmpegPath;
    }

    /** Returns the absolute path to the bundled ffprobe binary, or null if not available. */
    public static String getFFprobePath() {
        return ffprobePath;
    }
}
