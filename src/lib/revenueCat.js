/**
 * RevenueCat integration.
 * Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY in .env.
 * In RevenueCat dashboard the entitlement identifier must be "pro" (display name can be "DocTrust Pro").
 * See docs/REVENUECAT.md for full setup.
 */

import { Platform } from 'react-native';

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (_) {}

/** Must match RevenueCat entitlement Identifier (e.g. "pro" or "DocTrust Pro"). */
const ENTITLEMENT_ID = 'DocTrust Pro';

export function isRevenueCatAvailable() {
  return Purchases != null;
}

let revenueCatConfigured = false;

/**
 * Configure RevenueCat. Call once at app launch (e.g. in AuthContext or root).
 * Skips if already configured to avoid "Purchases instance already set" (e.g. React Strict Mode double-mount).
 * @param {string} [userId] - Optional; can call logIn(userId) after login instead.
 */
export async function configureRevenueCat(userId = null) {
  if (!Purchases) return;
  if (revenueCatConfigured) {
    if (userId) await Purchases.logIn(userId);
    return;
  }
  const testStoreKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY;
  const useTestStore = typeof __DEV__ !== 'undefined' && __DEV__ && testStoreKey && testStoreKey.trim().length > 0;
  const apiKey = useTestStore
    ? testStoreKey.trim()
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey) return;
  if (typeof __DEV__ !== 'undefined' && __DEV__ && Purchases.setLogLevel) {
    try {
      const { LOG_LEVEL } = require('react-native-purchases');
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    } catch (_) {}
  }
  await Purchases.configure({ apiKey });
  revenueCatConfigured = true;
  if (userId) await Purchases.logIn(userId);
}

/**
 * Identify user after login. Call on login.
 */
export async function revenueCatLogIn(userId) {
  if (!Purchases || !userId) return;
  await Purchases.logIn(userId);
}

/**
 * Reset identity. Call on logout.
 */
export async function revenueCatLogOut() {
  if (!Purchases) return;
  await Purchases.logOut();
}

/**
 * Get current offerings (packages with prices).
 * @returns {Promise<import('react-native-purchases').Offerings | null>}
 */
export async function getRevenueCatOfferings() {
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings;
}

/**
 * Purchase a package. Returns customerInfo on success.
 * @param {import('react-native-purchases').Package} pkg
 * @returns {Promise<{ customerInfo: import('react-native-purchases').CustomerInfo } | { error: Error }>}
 */
export async function purchaseRevenueCatPackage(pkg) {
  if (!Purchases) return { error: new Error('RevenueCat not installed') };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Check if user has active PRO entitlement from RevenueCat.
 * @returns {Promise<boolean>}
 */
export async function getRevenueCatIsPro() {
  if (!Purchases) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  return entitlement != null;
}

/**
 * Restore previous purchases (e.g. after reinstall or new device).
 * Call only in response to user action (e.g. Restore button); may trigger OS sign-in prompts.
 * @returns {Promise<{ customerInfo: import('react-native-purchases').CustomerInfo } | { error: Error }>}
 */
export async function restoreRevenueCatPurchases() {
  if (!Purchases) return { error: new Error('RevenueCat not installed') };
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { customerInfo };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Get customer info (for debugging or syncing with Supabase).
 * @returns {Promise<import('react-native-purchases').CustomerInfo | null>}
 */
export async function getRevenueCatCustomerInfo() {
  if (!Purchases) return null;
  return await Purchases.getCustomerInfo();
}

/**
 * Present RevenueCat Paywall — not available (react-native-purchases-ui removed to fix iOS build).
 * Use your own SubscriptionBottomSheet with getRevenueCatOfferings() and purchaseRevenueCatPackage().
 */
export async function presentRevenueCatPaywall() {
  return false;
}

export function isRevenueCatUIAvailable() {
  return false;
}
