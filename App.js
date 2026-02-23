import React, { useState, useEffect } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { AnalysisProvider } from './src/context/AnalysisContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ensureI18n } from './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry, wrapRootComponent } from './src/lib/sentry';

initSentry();

const hasSupabaseConfig = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

function ConfigMissingScreen() {
  return (
    <View style={configMissingStyles.container}>
      <StatusBar style="dark" />
      <Text style={configMissingStyles.title}>Configuration missing</Text>
      <Text style={configMissingStyles.text}>
        This build has no backend configuration. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in
        expo.dev → Project → Environment variables (production), then rebuild the app.
      </Text>
    </View>
  );
}

const configMissingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

const navigationRefHolder = { current: null };

function StatusBarThemed() {
  const { colors, isDarkMode } = useTheme();
  return (
    <StatusBar
      style={isDarkMode ? 'light' : 'dark'}
      backgroundColor={colors.primaryBackground}
    />
  );
}

function App() {
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

  if (!hasSupabaseConfig) {
    return <ConfigMissingScreen />;
  }

  if (!i18nReady) return null;

  return (
    <ErrorBoundary navigationRef={navigationRefHolder}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBarThemed />
          <AuthProvider>
            <ProfileProvider>
              <SubscriptionProvider>
                <AnalysisProvider>
                  <AppNavigator onNavigationRefReady={(ref) => { navigationRefHolder.current = ref; }} />
                </AnalysisProvider>
              </SubscriptionProvider>
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default wrapRootComponent(App);
