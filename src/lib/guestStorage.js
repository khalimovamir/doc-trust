/**
 * Keys and helpers for guest/post-logout persistence.
 * Used so that after logout → continue as guest, the user keeps the same limits and offer state (no free reset).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const POST_LOGOUT_USAGE_KEY = '@doctrust_post_logout_usage';
export const GUEST_OFFER_STATE_KEY = '@doctrust_guest_offer_state';
export const GUEST_FEATURE_USAGE_KEY = '@doctrust_guest_feature_usage';
export const GUEST_SUBSCRIPTION_KEY = '@doctrust_guest_subscription';

export async function clearPostLogoutUsage() {
  await AsyncStorage.removeItem(POST_LOGOUT_USAGE_KEY);
}
