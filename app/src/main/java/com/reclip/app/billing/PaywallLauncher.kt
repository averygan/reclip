package com.reclip.app.billing

import android.content.Intent
import android.util.Log
import androidx.activity.ComponentActivity
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallActivityLauncher
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResult
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResultHandler

/**
 * Owns the RevenueCat [PaywallActivityLauncher] and Customer Center launch
 * for a given [ComponentActivity]. Register this in onCreate (ActivityResult
 * launchers must be registered before STARTED state).
 *
 * Result callbacks fire on the main thread and are forwarded to the supplied
 * [onPaywallResult] callback so MainActivity can post them to the WebView.
 *
 * NOTE: The exact class names below come from purchases-ui ~10.x. If you bump
 * the RC SDK, double-check that PaywallActivityLauncher / PaywallResultHandler
 * still live at this package. The Customer Center launch path is intentionally
 * minimal — verify the activity name in your SDK version (10.6.0 ships it as
 * an Activity that can be started with a plain Intent; if RC ships a typed
 * launcher in your version, swap to that for typed results).
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

    /**
     * Show the paywall only if the user is not already entitled.
     * If the RC offerings can't be fetched (no network, dashboard not
     * configured), fall back to [FallbackPaywallActivity] so the user
     * still sees something coherent.
     */
    fun showIfNeeded() {
        if (RevenueCatManager.isPro()) return
        RevenueCatManager.getOfferings { offerings, _ ->
            if (offerings?.current != null) {
                launcher.launchIfNeeded(
                    requiredEntitlementIdentifier = RevenueCatManager.ENTITLEMENT_PRO
                )
            } else {
                activity.startActivity(Intent(activity, FallbackPaywallActivity::class.java))
            }
        }
    }

    /** Always show the paywall (e.g. from a "Go Pro" button). */
    fun showAlways() {
        RevenueCatManager.getOfferings { offerings, _ ->
            if (offerings?.current != null) {
                launcher.launch()
            } else {
                activity.startActivity(Intent(activity, FallbackPaywallActivity::class.java))
            }
        }
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
