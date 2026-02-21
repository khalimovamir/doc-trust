import React, { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { AnalysisProvider } from './src/context/AnalysisContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ensureI18n } from './src/i18n';

function StatusBarThemed() {
  const { colors, isDarkMode } = useTheme();
  return (
    <StatusBar
      style={isDarkMode ? 'light' : 'dark'}
      backgroundColor={colors.primaryBackground}
    />
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    ensureI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ensureI18n();
    });
    return () => sub?.remove?.();
  }, []);

  if (!i18nReady) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarThemed />
        <AuthProvider>
          <ProfileProvider>
            <SubscriptionProvider>
              <AnalysisProvider>
                <AppNavigator />
              </AnalysisProvider>
            </SubscriptionProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
