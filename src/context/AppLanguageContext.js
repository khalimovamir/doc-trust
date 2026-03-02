/**
 * App language in App State.
 * - Guest: language in state + AsyncStorage (same key as i18n); analysis/chat get it from here via getAppLanguageCode().
 * - Auth: same + sync to Supabase profile.preferred_language; on load sync from profile once.
 * - When guest signs in: current language is written to profile (in App.js PendingLanguageSync).
 * - When app becomes active (e.g. return from system language settings): refresh from storage and for auth update profile.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import {
  ensureI18n,
  i18n,
  LAST_APP_LANGUAGE_KEY,
  SUPPORTED_LANGUAGES,
} from '../i18n';
import { updateProfile } from '../lib/profile';

const FALLBACK_LNG = 'en';

const AppLanguageContext = createContext({
  languageCode: FALLBACK_LNG,
  setAppLanguage: () => {},
});

function toSupported(code) {
  const c = (code || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(c) ? c : FALLBACK_LNG;
}

export function AppLanguageProvider({ children }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [languageCode, setLanguageCodeState] = useState(FALLBACK_LNG);
  const [loaded, setLoaded] = useState(false);
  const syncedFromProfileRef = useRef(false);

  const setAppLanguage = useCallback(
    async (code) => {
      const next = toSupported(code);
      setLanguageCodeState(next);
      await AsyncStorage.setItem(LAST_APP_LANGUAGE_KEY, next).catch(() => {});
      await i18n.changeLanguage(next);
      if (user?.id) {
        try {
          await updateProfile(user.id, { preferred_language: next });
        } catch (_) {}
      }
    },
    [user?.id]
  );

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_APP_LANGUAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const code = toSupported(raw);
        setLanguageCodeState(code);
        i18n.changeLanguage(code).catch(() => {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      syncedFromProfileRef.current = false;
      return;
    }
    if (!loaded || syncedFromProfileRef.current) return;
    const profileLang = profile?.preferred_language;
    if (profileLang == null || profileLang === '') return;
    const code = toSupported(profileLang);
    syncedFromProfileRef.current = true;
    setLanguageCodeState(code);
    AsyncStorage.setItem(LAST_APP_LANGUAGE_KEY, code).catch(() => {});
    i18n.changeLanguage(code).catch(() => {});
  }, [loaded, user?.id, profile?.preferred_language]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      let cancelled = false;
      ensureI18n()
        .then(() => {
          if (cancelled) return;
          return AsyncStorage.getItem(LAST_APP_LANGUAGE_KEY);
        })
        .then((raw) => {
          if (cancelled) return;
          const code = toSupported(raw);
          setLanguageCodeState(code);
          if (user?.id && code && profile?.preferred_language !== code) {
            updateProfile(user.id, { preferred_language: code }).catch(() => {});
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    });
    return () => sub?.remove?.();
  }, [user?.id, profile?.preferred_language]);

  return (
    <AppLanguageContext.Provider value={{ languageCode, setAppLanguage }}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  return useContext(AppLanguageContext);
}
