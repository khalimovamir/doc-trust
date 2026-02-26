/**
 * AI Lawyer - Open app language settings.
 * Android 13+: "App languages" for this app (ACTION_APP_LOCALE_SETTINGS).
 * Android <13: system Locale settings, then app settings fallback.
 * iOS: opens app settings (Settings → Doc Trust). With CFBundleDevelopmentRegion and
 *      CFBundleLocalizations in app.json, iOS shows "Language" on that screen —
 *      user taps it to open the app language picker (Suggested / Other languages).
 */

import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';

const ANDROID_TIRAMISU = 33;

/**
 * Opens the app language settings.
 * - Android 13+: direct "App languages" for this app.
 * - Android <13: system Locale, then openSettings() fallback.
 * - iOS: Linking.openSettings() → Settings → Doc Trust → user taps "Language".
 */
export async function openLanguageSettings() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= ANDROID_TIRAMISU) {
      try {
        const applicationId = Application.applicationId;
        if (applicationId) {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.APP_LOCALE_SETTINGS,
            { data: `package:${applicationId}` }
          );
          return;
        }
      } catch (_) {}
    }
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
      await Linking.openSettings();
    } catch (_) {}
  }
}
