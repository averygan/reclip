# Keep Chaquopy
-keep class com.chaquo.** { *; }
-keep class com.reclip.app.MainActivity$ReClipBridge { *; }
-keepclassmembers class com.reclip.app.MainActivity$ReClipBridge {
    @android.webkit.JavascriptInterface *;
}

# RevenueCat — the AAR ships consumer rules, but be defensive in case
# the paywall/customer-center UI relies on reflection across configurations.
-keep class com.revenuecat.purchases.** { *; }
-keep class com.android.billingclient.** { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations,
                RuntimeInvisibleAnnotations, RuntimeVisibleParameterAnnotations,
                RuntimeInvisibleParameterAnnotations, AnnotationDefault

# Kotlin metadata required by RevenueCat's coroutine extensions
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata { *; }
