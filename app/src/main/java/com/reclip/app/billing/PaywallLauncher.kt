package com.reclip.app.billing

import android.content.Intent
import android.util.Log
import androidx.activity.ComponentActivity
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallActivityLauncher
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResult
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResultHandler

/**
 * Owns the RevenueCat [PaywallActivityLauncher] and the Customer Center
 * launch path for [activity]. Construct from [androidx.activity.ComponentActivity.onCreate]
 * BEFORE the activity reaches STARTED — ActivityResult launchers must register
 * during INITIALIZED/CREATED, otherwise they throw.
 *
 * Results are forwarded to [onPaywallResult] which [com.reclip.app.MainActivity]
 * posts into the WebView as `window.onPaywallResult(status, errorMessage)`.
 * Entitlement changes propagate separately via [RevenueCatManager.addCustomerInfoListener].
 */
class PaywallLauncher(
    private val activity: ComponentActivity,
    private val onPaywallResult: (status: String, errorMessage: String?) -> Unit
) {

    private val launcher: PaywallActivityLauncher =
        PaywallActivityLauncher(activity, object : PaywallResultHandler {
            override fun onActivityResult(result: PaywallResult) {
                when (result) {
                    is PaywallResult.Purchased -> onPaywallResult("purchased", null)
                    is PaywallResult.Restored  -> onPaywallResult("restored", null)
                    is PaywallResult.Cancelled -> onPaywallResult("cancelled", null)
                    is PaywallResult.Error     -> onPaywallResult("error", result.error.message)
                }
            }
        })

    /** Show the paywall only if the user is not already entitled. */
    fun showIfNeeded() {
        if (!RevenueCatManager.isSdkConfigured()) {
            onPaywallResult("error", RevenueCatManager.sdkDisabledReason())
            return
        }
        launcher.launchIfNeeded(
            requiredEntitlementIdentifier = RevenueCatManager.ENTITLEMENT_PRO
        )
    }

    /** Always show the paywall (e.g. from an explicit "Go Pro" tap). */
    fun showAlways() {
        if (!RevenueCatManager.isSdkConfigured()) {
            onPaywallResult("error", RevenueCatManager.sdkDisabledReason())
            return
        }
        launcher.launch()
    }

    /**
     * Launch RevenueCat's Customer Center (manage subscription, restore,
     * support). 10.6.0 ships [com.revenuecat.purchases.ui.revenuecatui.customercenter.CustomerCenterActivity];
     * reflection keeps the call working if the class is moved in a future SDK
     * version without forcing a compile break.
     */
    fun showCustomerCenter() {
        if (!RevenueCatManager.isSdkConfigured()) {
            onPaywallResult("error", RevenueCatManager.sdkDisabledReason())
            return
        }
        try {
            val klass = Class.forName(
                "com.revenuecat.purchases.ui.revenuecatui.customercenter.CustomerCenterActivity"
            )
            activity.startActivity(Intent(activity, klass))
        } catch (t: Throwable) {
            Log.e("PaywallLauncher", "Customer Center activity not found", t)
            onPaywallResult("error", "customer center unavailable")
        }
    }
}
