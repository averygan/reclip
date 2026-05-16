package com.reclip.app.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesException
import com.revenuecat.purchases.PurchasesTransactionException
import com.revenuecat.purchases.awaitCustomerInfo
import com.revenuecat.purchases.awaitOfferings
import com.revenuecat.purchases.awaitPurchase
import com.revenuecat.purchases.awaitRestore
import com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener
import com.revenuecat.purchases.models.PurchaseParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Single point of contact for RevenueCat. Initialized once from
 * [com.reclip.app.ReClipApplication.onCreate], then accessed from
 * [com.reclip.app.MainActivity]'s JS bridge.
 *
 * Identifiers used here must match what's configured in the RevenueCat
 * dashboard — adjust [ENTITLEMENT_PRO] and [LIFETIME_PRODUCT_ID] if needed.
 */
object RevenueCatManager {

    private const val TAG = "RevenueCatManager"

    // Sandbox / test key — replace via BuildConfig or remote config before shipping.
    private const val API_KEY = "test_RqnYeLnlWXtZFVPLyXeCZInFYVm"

    /** Entitlement identifier (lowercase snake_case, matches the RC dashboard). */
    const val ENTITLEMENT_PRO = "reclip_pro"

    /** Product identifier for the lifetime one-time purchase. */
    const val LIFETIME_PRODUCT_ID = "lifetime"

    @Volatile private var cachedCustomerInfo: CustomerInfo? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val listeners = mutableListOf<(CustomerInfo) -> Unit>()

    /** Call once from Application.onCreate. */
    fun configure(context: Context) {
        Purchases.logLevel = LogLevel.WARN
        Purchases.configure(
            PurchasesConfiguration.Builder(context.applicationContext, API_KEY).build()
        )
        Purchases.sharedInstance.updatedCustomerInfoListener =
            UpdatedCustomerInfoListener { info ->
                cachedCustomerInfo = info
                listeners.toList().forEach { runCatching { it(info) } }
            }
        // Warm the cache so isPro() works immediately on first UI query.
        refreshCustomerInfo(null)
    }

    /** Subscribe to entitlement / customer-info changes. */
    fun addCustomerInfoListener(cb: (CustomerInfo) -> Unit) {
        listeners.add(cb)
        cachedCustomerInfo?.let { cb(it) }
    }

    /** Synchronous best-effort entitlement check off the cached info. */
    fun isPro(): Boolean =
        cachedCustomerInfo?.entitlements?.get(ENTITLEMENT_PRO)?.isActive == true

    /** Pull latest customer info; updates the cache and fires listeners. */
    fun refreshCustomerInfo(onComplete: ((CustomerInfo?) -> Unit)?) {
        scope.launch {
            try {
                val info = Purchases.sharedInstance.awaitCustomerInfo()
                cachedCustomerInfo = info
                onComplete?.invoke(info)
            } catch (e: PurchasesException) {
                Log.e(TAG, "getCustomerInfo failed: ${e.error}", e)
                onComplete?.invoke(null)
            }
        }
    }

    /** Fetch the current offering set (products configured in the dashboard). */
    fun getOfferings(onResult: (Offerings?, String?) -> Unit) {
        scope.launch {
            try {
                onResult(Purchases.sharedInstance.awaitOfferings(), null)
            } catch (e: PurchasesException) {
                Log.e(TAG, "getOfferings failed: ${e.error}", e)
                onResult(null, e.error.message)
            }
        }
    }

    /**
     * Kick off a purchase for the lifetime package. Resolves the package off
     * the current offering's `lifetime` slot, falling back to a product-id match.
     * @param onResult (success, errorMessage). errorMessage="cancelled" on user cancel.
     */
    fun purchaseLifetime(activity: Activity, onResult: (Boolean, String?) -> Unit) {
        scope.launch {
            try {
                val offerings = Purchases.sharedInstance.awaitOfferings()
                val pkg: Package = offerings.current?.lifetime
                    ?: offerings.current?.availablePackages?.firstOrNull {
                        it.product.id == LIFETIME_PRODUCT_ID
                    }
                    ?: run {
                        onResult(false, "Lifetime package not found in current offering")
                        return@launch
                    }
                val result = Purchases.sharedInstance.awaitPurchase(
                    PurchaseParams.Builder(activity, pkg).build()
                )
                cachedCustomerInfo = result.customerInfo
                onResult(isPro(), null)
            } catch (e: PurchasesTransactionException) {
                if (e.userCancelled) {
                    onResult(false, "cancelled")
                } else {
                    Log.e(TAG, "purchase failed: ${e.error}", e)
                    onResult(false, e.error.message)
                }
            } catch (e: PurchasesException) {
                Log.e(TAG, "offerings/purchase failed: ${e.error}", e)
                onResult(false, e.error.message)
            }
        }
    }

    /** Restore prior purchases (e.g. after reinstall, new device). */
    fun restorePurchases(onResult: (Boolean, String?) -> Unit) {
        scope.launch {
            try {
                val info = Purchases.sharedInstance.awaitRestore()
                cachedCustomerInfo = info
                onResult(isPro(), null)
            } catch (e: PurchasesException) {
                Log.e(TAG, "restore failed: ${e.error}", e)
                onResult(false, e.error.message)
            }
        }
    }
}
