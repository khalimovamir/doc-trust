/**
 * Doc Trust - In-app store review (rate limiting)
 * Call after positive moments (e.g. successful analysis or comparison).
 * Uses AsyncStorage to show at most once per 30 days.
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
