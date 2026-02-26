/**
 * Doc Trust - In-app store review
 * - maybeRequestReview(): rate-limited (once per 30 days), e.g. after successful analysis.
 * - requestReviewFromSettings(): call when user taps "Rate the App" in Settings (no limit).
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_REQUEST_KEY = '@doctrust_last_review_request';
const MIN_DAYS_BETWEEN = 30;

export async function maybeRequestReview() {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    const raw = await AsyncStorage.getItem(LAST_REQUEST_KEY);
    const last = raw ? new Date(raw) : null;
    const now = new Date();
    if (last) {
      const days = (now - last) / (24 * 60 * 60 * 1000);
      if (days < MIN_DAYS_BETWEEN) return;
    }

    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_REQUEST_KEY, now.toISOString());
  } catch {
    // ignore
  }
}

/** Call when user explicitly taps "Rate the App" in Settings. Opens in-app review or store page. */
export async function requestReviewFromSettings() {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await StoreReview.requestReview();
  } catch {
    // ignore
  }
}
