# Keep Chaquopy
-keep class com.chaquo.** { *; }
-keep class com.reclip.app.MainActivity$ReClipBridge { *; }
-keepclassmembers class com.reclip.app.MainActivity$ReClipBridge {
    @android.webkit.JavascriptInterface *;
}
