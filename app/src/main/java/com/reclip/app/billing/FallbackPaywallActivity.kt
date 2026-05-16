package com.reclip.app.billing

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.reclip.app.R

/**
 * Code-side fallback paywall, shown only when the RevenueCat SDK paywall
 * cannot be displayed (no offerings, no network, dashboard misconfigured).
 *
 * Result propagation: this activity does not push results back to the
 * WebView itself — RevenueCatManager's [com.revenuecat.purchases.interfaces.UpdatedCustomerInfoListener]
 * fires automatically on a successful purchase or restore, and MainActivity's
 * listener forwards the new entitlement to JS via window.onProStatusChanged.
 */
class FallbackPaywallActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_fallback_paywall)

        val priceLabel  = findViewById<TextView>(R.id.fallback_paywall_price)
        val continueBtn = findViewById<Button>(R.id.fallback_paywall_continue)
        val restoreBtn  = findViewById<Button>(R.id.fallback_paywall_restore)
        val closeBtn    = findViewById<Button>(R.id.fallback_paywall_close)

        // Populate the price line from the current lifetime package, if any.
        RevenueCatManager.getOfferings { offerings, _ ->
            val pkg = offerings?.current?.lifetime
            priceLabel.text = pkg?.product?.price?.formatted ?: "Unlock ReClip Pro"
        }

        continueBtn.setOnClickListener {
            continueBtn.isEnabled = false
            RevenueCatManager.purchaseLifetime(this) { success, err ->
                continueBtn.isEnabled = true
                if (success) {
                    setResult(RESULT_OK)
                    finish()
                } else if (err != null && err != "cancelled") {
                    Toast.makeText(this, err, Toast.LENGTH_LONG).show()
                }
            }
        }

        restoreBtn.setOnClickListener {
            restoreBtn.isEnabled = false
            RevenueCatManager.restorePurchases { success, err ->
                restoreBtn.isEnabled = true
                if (success) {
                    setResult(RESULT_OK)
                    finish()
                } else {
                    Toast.makeText(
                        this,
                        err ?: "Nothing to restore",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        closeBtn.setOnClickListener { finish() }
    }
}
