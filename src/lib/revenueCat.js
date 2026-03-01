/**
 * RevenueCat integration (optional).
 * Install: npx expo install react-native-purchases
 * Then set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.
 * See docs/REVENUECAT.md for full setup.
 */

import { Platform } from 'react-native';

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (_) {
  // react-native-purchases not installed
}

const ENTITLEMENT_ID = 'pro';

export function isRevenueCatAvailable() {
  return Purchases != null;
}

/**
 * Configure RevenueCat. Call once at app launch (e.g. in AuthContext or root).
 * @param {string} [userId] - Optional; can call logIn(userId) after login instead.
 */
export async function configureRevenueCat(userId = null) {
  if (!Purchases) return;
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey) return;
  await Purchases.configure({ apiKey });
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
 * Get customer info (for debugging or syncing with Supabase).
 * @returns {Promise<import('react-native-purchases').CustomerInfo | null>}
 */
export async function getRevenueCatCustomerInfo() {
  if (!Purchases) return null;
  return await Purchases.getCustomerInfo();
}
