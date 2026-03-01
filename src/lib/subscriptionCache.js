/**
 * Doc Trust - Local cache for subscription data (Supabase mirror).
 * Usage, subscription, products, limits, offers so the app works two-way and offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_PREFIX = '@doctrust_usage_';
const SUBSCRIPTION_PREFIX = '@doctrust_subscription_';
const PRODUCTS_KEY = '@doctrust_products';
const LIMITS_KEY = '@doctrust_limits';
const OFFERS_KEY = '@doctrust_offers';
const FEATURES_KEY = '@doctrust_features';

function safeJsonParse(raw, fallback) {
  try {
    if (raw == null || raw === '') return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function getCachedUsage(userId) {
  if (!userId) return null;
  const raw = await AsyncStorage.getItem(USAGE_PREFIX + userId);
  return safeJsonParse(raw, null);
}

export async function setCachedUsage(userId, usage) {
  if (!userId || !usage) return;
  await AsyncStorage.setItem(USAGE_PREFIX + userId, JSON.stringify(usage));
}

export async function getCachedSubscription(userId) {
  if (!userId) return null;
  const raw = await AsyncStorage.getItem(SUBSCRIPTION_PREFIX + userId);
  return safeJsonParse(raw, null);
}

export async function setCachedSubscription(userId, sub) {
  if (!userId) return;
  await AsyncStorage.setItem(SUBSCRIPTION_PREFIX + userId, JSON.stringify(sub));
}

export async function getCachedProducts() {
  const raw = await AsyncStorage.getItem(PRODUCTS_KEY);
  return safeJsonParse(raw, null);
}

export async function setCachedProducts(list) {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(list || []));
}

export async function getCachedLimits() {
  const raw = await AsyncStorage.getItem(LIMITS_KEY);
  return safeJsonParse(raw, null);
}

export async function setCachedLimits(list) {
  await AsyncStorage.setItem(LIMITS_KEY, JSON.stringify(list || []));
}

export async function getCachedOffers() {
  const raw = await AsyncStorage.getItem(OFFERS_KEY);
  return safeJsonParse(raw, null);
}

export async function setCachedOffers(list) {
  await AsyncStorage.setItem(OFFERS_KEY, JSON.stringify(list || []));
}

export async function getCachedFeatures() {
  const raw = await AsyncStorage.getItem(FEATURES_KEY);
  return safeJsonParse(raw, null);
}

export async function setCachedFeatures(list) {
  await AsyncStorage.setItem(FEATURES_KEY, JSON.stringify(list || []));
}
