package com.reclip.app;

import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class DownloadService extends Service {
    public static final String ACTION_START = "com.reclip.app.DOWNLOAD_START";
    public static final String ACTION_UPDATE = "com.reclip.app.DOWNLOAD_UPDATE";
    public static final String ACTION_FINISH = "com.reclip.app.DOWNLOAD_FINISH";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_PROGRESS = "progress";
    public static final String EXTRA_INDETERMINATE = "indeterminate";
    public static final String EXTRA_SUCCESS = "success";
    private static final int NOTIFICATION_ID = 1;

    private Notification buildNotification(String title, String text, int progress, boolean indeterminate, boolean ongoing) {
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, "reclip_downloads")
            .setContentTitle(title == null || title.isEmpty() ? "ReClip Download" : title)
            .setContentText(text == null || text.isEmpty() ? "Downloading..." : text)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setOngoing(ongoing);
        if (indeterminate) {
            b.setProgress(0, 0, true);
        } else {
            int clamped = Math.max(0, Math.min(100, progress));
            b.setProgress(100, clamped, false);
        }
        return b.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : "ReClip Download";
        String text = intent != null ? intent.getStringExtra(EXTRA_TEXT) : "Downloading...";
        int progress = intent != null ? intent.getIntExtra(EXTRA_PROGRESS, 0) : 0;
        boolean indeterminate = intent == null || intent.getBooleanExtra(EXTRA_INDETERMINATE, true);

        if (ACTION_FINISH.equals(action)) {
            boolean success = intent != null && intent.getBooleanExtra(EXTRA_SUCCESS, false);
            Notification done = buildNotification(
                title,
                text != null ? text : (success ? "Download complete" : "Download failed"),
                success ? 100 : 0,
                false,
                false
            );
            NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, done);
            stopForeground(STOP_FOREGROUND_DETACH);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification n = buildNotification(title, text, progress, indeterminate, true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

