import { Purchases } from "@revenuecat/purchases-js";

const API_KEY = "rcb_sb_RxDiRUgSVZVzSHkACLkcJHwVi";
const DEFAULT_ENTITLEMENT_ID = "reclip_pro";
const DEFAULT_OFFERING_ID = "ReClip Pro";
const FALLBACK_CUSTOMER_ID_KEY = "reclip_rc_customer_id";

let sharedPurchasesPromise = null;

function getFallbackCustomerId() {
  let customerId = window.localStorage.getItem(FALLBACK_CUSTOMER_ID_KEY);
  if (!customerId) {
    const generatedId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `reclip-web-${Date.now()}`;
    customerId = `reclip-${generatedId}`;
    window.localStorage.setItem(FALLBACK_CUSTOMER_ID_KEY, customerId);
  }
  return customerId;
}

function getNativeCustomerId() {
  if (typeof window.ReClip === "undefined") return null;
  if (typeof window.ReClip.getRevenueCatAppUserId !== "function") return null;
  try {
    return window.ReClip.getRevenueCatAppUserId() || null;
  } catch (error) {
    console.warn("Unable to read RevenueCat app user ID from native bridge", error);
    return null;
  }
}

async function getOrCreateCustomerId() {
  return getNativeCustomerId() || getFallbackCustomerId();
}

async function getPurchases() {
  if (!sharedPurchasesPromise) {
    // @revenuecat/purchases-js Purchases.configure takes positional args
    // (apiKey, appUserId, httpConfig?) — passing an options object causes
    // the apiKey validator to receive "[object Object]" and reject the key.
    sharedPurchasesPromise = getOrCreateCustomerId().then((appUserId) =>
      Purchases.configure(API_KEY, appUserId)
    );
  }
  return sharedPurchasesPromise;
}

async function getOffering(purchases, preferredOfferingId) {
  const offerings = await purchases.getOfferings();
  if (preferredOfferingId && offerings.all[preferredOfferingId]) {
    return offerings.all[preferredOfferingId];
  }
  return offerings.current;
}

async function getCustomerInfoWithFallback(purchases) {
  try {
    return await purchases.getCustomerInfo();
  } catch (error) {
    console.warn("Unable to fetch latest RevenueCat customer info", error);
    return null;
  }
}

function hasEntitlement(customerInfo, entitlementId) {
  if (!customerInfo || !customerInfo.entitlements) return false;
  const active = customerInfo.entitlements.active || {};
  return Object.prototype.hasOwnProperty.call(active, entitlementId);
}

async function presentManagedPaywall({
  containerId = "paywall-container",
  entitlementId = DEFAULT_ENTITLEMENT_ID,
  offeringId = DEFAULT_OFFERING_ID,
  onBeforePresent,
  onAfterClose,
} = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing paywall container: #${containerId}`);
  }

  if (typeof onBeforePresent === "function") {
    onBeforePresent();
  }

  container.innerHTML = "";

  const purchases = await getPurchases();
  const offering = await getOffering(purchases, offeringId);
  if (!offering) {
    throw new Error("No RevenueCat offering available for the paywall");
  }

  let purchaseResult = null;
  try {
    purchaseResult = await purchases.presentPaywall({
      htmlTarget: container,
      offering,
    });
  } finally {
    if (typeof onAfterClose === "function") {
      onAfterClose();
    }
  }

  const customerInfo = purchaseResult?.customerInfo
    || (await getCustomerInfoWithFallback(purchases));

  return {
    purchaseResult,
    customerInfo,
    unlocked: hasEntitlement(customerInfo, entitlementId),
  };
}

window.ReclipRevenueCatPaywall = {
  getPurchases,
  getOrCreateCustomerId,
  presentManagedPaywall,
  hasEntitlement,
};
