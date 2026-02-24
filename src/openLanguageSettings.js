/**
 * AI Lawyer - Open OS Language & Region settings
 * Android: opens system Language / Locale settings.
 * iOS: tries to open Settings > General > Language & Region.
 */

import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/** iOS URLs for Settings > General > Language & Region (try multiple schemes) */
const IOS_LANGUAGE_REGION_URLS = [
  'App-prefs:root=General&path=INTERNATIONAL',
  'app-settings:root=General&path=INTERNATIONAL',
  'prefs:root=General&path=INTERNATIONAL',
];

/**
 * Opens the system Language & Region screen.
 * - Android: opens system Locale / Language settings.
 * - iOS: tries several URL schemes; falls back to app settings if all fail.
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
    for (const url of IOS_LANGUAGE_REGION_URLS) {
      try {
        await Linking.openURL(url);
        return;
      } catch (_) {}
    }
    try {
      await Linking.openSettings();
    } catch (_) {}
    return;
  }
}
