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

/** RevenueCat entitlement Identifier. Must match dashboard (e.g. "DocTrust Pro"). "pro" kept for compatibility. */
const ENTITLEMENT_IDS = ['DocTrust Pro', 'pro'];

function hasProEntitlement(customerInfo) {
  const active = customerInfo?.entitlements?.active;
  if (!active) return false;
  return ENTITLEMENT_IDS.some((id) => active[id] != null);
}

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
 * Transfers/merges anonymous subscription to this userId in RevenueCat.
 */
export async function revenueCatLogIn(userId) {
  if (!Purchases || !userId) return;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[RevenueCat] logIn ok', userId, 'entitlements:', customerInfo?.entitlements?.active ? Object.keys(customerInfo.entitlements.active) : []);
    }
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[RevenueCat] logIn failed', userId, e?.message);
    }
    throw e;
  }
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
 * Uses "DocTrust Pro" (or "pro") so it matches your RevenueCat entitlement identifier.
 * @returns {Promise<boolean>}
 */
export async function getRevenueCatIsPro() {
  if (!Purchases) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  return hasProEntitlement(customerInfo);
}

/**
 * Check PRO from a CustomerInfo object (e.g. after purchase or restore).
 * @param {import('react-native-purchases').CustomerInfo | null | undefined} customerInfo
 * @returns {boolean}
 */
export function hasProFromCustomerInfo(customerInfo) {
  return hasProEntitlement(customerInfo);
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
