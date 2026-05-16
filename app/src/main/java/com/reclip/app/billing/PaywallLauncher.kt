package com.reclip.app.billing

import android.app.Activity
import android.content.Intent
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

/**
 * Owns the paywall and Customer Center launch paths for a given
 * [ComponentActivity]. Result callbacks fire on the main thread and are
 * forwarded to MainActivity so the WebView can be notified.
 */
class PaywallLauncher(
    private val activity: ComponentActivity,
    private val onPaywallResult: (status: String, errorMessage: String?) -> Unit
) {

    private val launcher = activity.registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val status = result.data?.getStringExtra(ReclipPaywallActivity.EXTRA_PAYWALL_STATUS)
                ?: ReclipPaywallActivity.STATUS_PURCHASED
            onPaywallResult(status, null)
        } else {
            onPaywallResult("cancelled", null)
        }
    }

    /** Show the custom ReClip paywall only if the user is not already entitled. */
    fun showIfNeeded() {
        if (RevenueCatManager.isPro()) return
        showAlways()
    }

    /** Always show the custom ReClip paywall, for example from a Go Pro button. */
    fun showAlways() {
        launcher.launch(Intent(activity, ReclipPaywallActivity::class.java))
    }

    /**
     * Launch the RevenueCat Customer Center (manage subscription, restore,
     * contact support). 10.6.0 ships [CustomerCenterActivity]; if your SDK
     * version exposes a typed launcher, prefer that here.
     */
    fun showCustomerCenter() {
        try {
            val klass = Class.forName(
                "com.revenuecat.purchases.ui.revenuecatui.customercenter.CustomerCenterActivity"
            )
            activity.startActivity(Intent(activity, klass))
        } catch (t: Throwable) {
            Log.e("PaywallLauncher", "Customer Center activity not found: " +
                "verify the class name against your purchases-ui version", t)
            onPaywallResult("error", "customer center unavailable")
        }
    }
}
