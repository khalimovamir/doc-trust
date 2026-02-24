/**
 * AI Lawyer - Open OS Language & Region settings
 * Android: opens system Language / Locale settings.
 * iOS: tries to open Settings > General > Language & Region.
 */

import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/** iOS URL for Settings > General > Language & Region (may be restricted on App Store) */
const IOS_LANGUAGE_REGION_URL = 'prefs:root=General&path=INTERNATIONAL';

/**
 * Opens the system Language & Region screen.
 * - Android: opens system Locale / Language settings.
 * - iOS: tries prefs URL for Language & Region; falls back to app settings if blocked.
 * @returns {Promise<void>}
 */
export async function openLanguageSettings() {
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCALE_SETTINGS
      );
      return;
    } catch (_) {
      try {
        await Linking.openSettings();
      } catch (_) {}
    }
    return;
  }
  if (Platform.OS === 'ios') {
    try {
      await Linking.openURL(IOS_LANGUAGE_REGION_URL);
      return;
    } catch (_) {}
    try {
      await Linking.openSettings();
    } catch (_) {}
    return;
  }
}
