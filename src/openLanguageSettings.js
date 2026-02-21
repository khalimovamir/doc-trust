/**
 * AI Lawyer - Open OS language / app locale settings
 * Android 33+: try APP_LOCALE_SETTINGS, fallback to app settings.
 * iOS: open app settings.
 */

import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';

/**
 * Opens the system screen where the user can change language.
 * - Android 13+: tries APP_LOCALE_SETTINGS (per-app language), then app settings.
 * - iOS: opens app settings.
 * @returns {Promise<void>}
 */
export async function openLanguageSettings() {
  if (Platform.OS === 'android') {
    try {
      const applicationId = Application.applicationId;
      if (applicationId && Platform.Version >= 33) {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APP_LOCALE_SETTINGS,
          { data: `package:${applicationId}` }
        );
        return;
      }
    } catch (_) {
      // Fall through to openSettings
    }
    await Linking.openSettings();
    return;
  }
  if (Platform.OS === 'ios') {
    await Linking.openSettings();
    return;
  }
  await Linking.openSettings();
}
