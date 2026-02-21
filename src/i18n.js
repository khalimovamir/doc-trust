/**
 * AI Lawyer - i18n (device language, supported locales, last-app-language)
 * Language is chosen in device settings (e.g. "Language & region" on Android).
 * First open: app uses device language if supported, else English.
 * If user had a supported language applied, then changes device to unsupported:
 * app keeps the last applied language (does not fall back to English).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ru from './locales/ru.json';
import de from './locales/de.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import ar from './locales/ar.json';

const FALLBACK_LNG = 'en';

/** Supported app languages (device "Language & region" → one of these). */
export const SUPPORTED_LANGUAGES = ['en', 'ru', 'de', 'ko', 'es', 'pt', 'fr', 'it', 'nl', 'ar'];

const LAST_APP_LANGUAGE_KEY = 'i18n.lastAppLanguage';

const BUNDLED = {
  en: { translation: en },
  ru: { translation: ru },
  de: { translation: de },
  ko: { translation: ko },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
  it: { translation: it },
  nl: { translation: nl },
  ar: { translation: ar },
};

/**
 * @returns {{ languageTag: string, languageCode: string }}
 */
export function getEffectiveSystemLocale() {
  const locales = Localization.getLocales();
  const first = locales?.[0];
  const languageTag = (first?.languageTag || first?.locale || 'en').replace(/_/g, '-');
  const languageCode = (first?.languageCode || languageTag.split('-')[0] || 'en').toLowerCase();
  return {
    languageTag: languageTag || 'en',
    languageCode: languageCode || 'en',
  };
}

/**
 * Map device language to a supported app language code.
 * @param {string} deviceCode - e.g. "pt" from pt-BR, "ar" from ar-SA
 * @returns {string} Supported code or empty if not supported
 */
function toSupportedCode(deviceCode) {
  const code = (deviceCode || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : '';
}

let initDone = false;

/**
 * Initialize i18next with all bundled locales and set language by device + last-app logic.
 * Call on app start and when AppState becomes "active".
 *
 * Logic:
 * - First open (no stored): use device language if supported, else English.
 * - Later: if device language is supported → use it and remember; if not supported → keep last remembered language.
 */
export async function ensureI18n() {
  if (!initDone) {
    initDone = true;
    await i18n.use(initReactI18next).init({
      resources: BUNDLED,
      lng: FALLBACK_LNG,
      fallbackLng: FALLBACK_LNG,
      supportedLngs: SUPPORTED_LANGUAGES,
      useSuspense: false,
      escapeValue: false,
      react: { useSuspense: false },
    });
  }

  const { languageCode } = getEffectiveSystemLocale();
  const deviceSupported = toSupportedCode(languageCode);
  const lastStored = await AsyncStorage.getItem(LAST_APP_LANGUAGE_KEY);

  let langToUse;
  if (deviceSupported) {
    langToUse = deviceSupported;
    await AsyncStorage.setItem(LAST_APP_LANGUAGE_KEY, deviceSupported);
  } else if (lastStored && SUPPORTED_LANGUAGES.includes(lastStored)) {
    langToUse = lastStored;
  } else {
    langToUse = FALLBACK_LNG;
    await AsyncStorage.setItem(LAST_APP_LANGUAGE_KEY, FALLBACK_LNG);
  }

  await i18n.changeLanguage(langToUse);
}

/**
 * Current app language code for API calls (analysis, chat).
 * @returns {string} e.g. "en", "ru", "es"
 */
export function getAppLanguageCode() {
  const lng = i18n.language;
  if (lng && typeof lng === 'string') {
    const code = lng.split('-')[0].toLowerCase();
    if (code && SUPPORTED_LANGUAGES.includes(code)) return code;
    return code || FALLBACK_LNG;
  }
  return FALLBACK_LNG;
}

export { i18n };
