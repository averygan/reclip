package com.reclip.app.billing

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.reclip.app.R
import com.revenuecat.purchases.Package

/**
 * Native ReClip paywall. It renders packages from the current RevenueCat
 * offering so dashboard changes can update purchase options without an app
 * release.
 */
class ReclipPaywallActivity : AppCompatActivity() {

    private lateinit var statusLabel: TextView
    private lateinit var packageContainer: LinearLayout
    private lateinit var continueBtn: Button
    private lateinit var restoreBtn: Button
    private lateinit var closeBtn: Button

    private var availablePackages: List<Package> = emptyList()
    private var selectedPackage: Package? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reclip_paywall)

        statusLabel = findViewById(R.id.reclip_paywall_status)
        packageContainer = findViewById(R.id.reclip_paywall_packages)
        continueBtn = findViewById(R.id.reclip_paywall_continue)
        restoreBtn = findViewById(R.id.reclip_paywall_restore)
        closeBtn = findViewById(R.id.reclip_paywall_close)

        closeBtn.setOnClickListener { finish() }
        continueBtn.setOnClickListener { purchaseSelectedPackage() }
        restoreBtn.setOnClickListener { restorePurchases() }

        loadPackages()
    }

    private fun loadPackages() {
        statusLabel.text = "Loading premium options..."
        statusLabel.visibility = View.VISIBLE
        continueBtn.isEnabled = false
        packageContainer.removeAllViews()

        RevenueCatManager.getAvailablePackages { packages, error ->
            availablePackages = packages
            if (packages.isEmpty()) {
                selectedPackage = null
                statusLabel.text = error ?: "Premium options are unavailable right now."
                continueBtn.text = "Unlock Premium"
                continueBtn.isEnabled = false
                return@getAvailablePackages
            }

            statusLabel.visibility = View.GONE
            selectedPackage = packages.first()
            renderPackages()
            updateContinueButton()
        }
    }

    private fun renderPackages() {
        packageContainer.removeAllViews()
        availablePackages.forEach { pkg ->
            packageContainer.addView(createPackageCard(pkg))
        }
    }

    private fun createPackageCard(pkg: Package): TextView {
        val price = pkg.product.price.formatted
        val title = packageTitle(pkg)
        val description = pkg.product.description.takeIf { it.isNotBlank() }
            ?: "Premium ReClip access"
        val text = "$title\n$description\n$price"

        return TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).also { it.topMargin = dp(10) }
            background = packageBackground(pkg == selectedPackage)
            isClickable = true
            isFocusable = true
            minHeight = dp(86)
            setPadding(dp(16), dp(14), dp(16), dp(14))
            setTextColor(Color.WHITE)
            textSize = 15f
            typeface = Typeface.DEFAULT
            setLineSpacing(dp(2).toFloat(), 1f)
            this.text = text
            setOnClickListener {
                selectedPackage = pkg
                renderPackages()
                updateContinueButton()
            }
        }
    }

    private fun packageTitle(pkg: Package): String {
        val title = pkg.product.title.trim()
        if (title.isNotBlank()) return title

        return when (pkg.identifier.lowercase()) {
            "\$rc_lifetime", "lifetime" -> "Lifetime Access"
            "\$rc_annual", "annual", "yearly" -> "Annual Access"
            "\$rc_monthly", "monthly" -> "Monthly Access"
            else -> "Premium Access"
        }
    }

    private fun updateContinueButton() {
        val pkg = selectedPackage
        if (pkg == null) {
            continueBtn.text = "Unlock Premium"
            continueBtn.isEnabled = false
            return
        }

        continueBtn.text = "Unlock Premium - ${pkg.product.price.formatted}"
        continueBtn.isEnabled = true
    }

    private fun purchaseSelectedPackage() {
        val pkg = selectedPackage ?: return
        continueBtn.isEnabled = false
        RevenueCatManager.purchasePackage(this, pkg) { success, err ->
            continueBtn.isEnabled = true
            if (success) {
                setResult(
                    RESULT_OK,
                    Intent().putExtra(EXTRA_PAYWALL_STATUS, STATUS_PURCHASED)
                )
                finish()
            } else if (err != null && err != "cancelled") {
                Toast.makeText(this, err, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun restorePurchases() {
        restoreBtn.isEnabled = false
        RevenueCatManager.restorePurchases { success, err ->
            restoreBtn.isEnabled = true
            if (success) {
                setResult(
                    RESULT_OK,
                    Intent().putExtra(EXTRA_PAYWALL_STATUS, STATUS_RESTORED)
                )
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

    private fun packageBackground(selected: Boolean): GradientDrawable {
        return GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            if (selected) {
                intArrayOf(Color.parseColor("#B31B0D3A"), Color.parseColor("#B3004970"))
            } else {
                intArrayOf(Color.parseColor("#4213142C"), Color.parseColor("#42101422"))
            }
        ).apply {
            cornerRadius = dp(18).toFloat()
            setStroke(
                dp(if (selected) 2 else 1),
                Color.parseColor(if (selected) "#FF46F7FF" else "#44FFFFFF")
            )
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    companion object {
        const val EXTRA_PAYWALL_STATUS = "paywall_status"
        const val STATUS_PURCHASED = "purchased"
        const val STATUS_RESTORED = "restored"
    }
}
