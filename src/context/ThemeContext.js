/**
 * AI Lawyer - Theme Context (Light / Dark Mode)
 * Persists preference in AsyncStorage and provides colors to the app.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/colors';

const THEME_STORAGE_KEY = '@ai_lawyer_dark_mode';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        setIsDarkModeState(value === 'true');
      })
      .finally(() => setLoaded(true));
  }, []);

  const setDarkMode = (value) => {
    setIsDarkModeState(!!value);
    AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'true' : 'false');
  };

  // Синхронизируем системный color scheme с темой приложения,
  // чтобы нативные диалоги (Alert) и меню (UIMenu) отображались в тёмном/светлом виде.
  useEffect(() => {
    if (!loaded) return;
    Appearance.setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [loaded, isDarkMode]);

  const colors = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode]
  );

  const value = useMemo(
    () => ({ colors, isDarkMode, setDarkMode, themeLoaded: loaded }),
    [colors, isDarkMode, loaded]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
