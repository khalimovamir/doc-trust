import React, { useState, useEffect } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { GuestProvider, useGuest } from './src/context/GuestContext';
import { GuestAppStateProvider, useGuestAppState } from './src/context/GuestAppStateContext';
import { OnboardingJurisdictionProvider, useOnboardingJurisdiction } from './src/context/OnboardingJurisdictionContext';
import { ensureUserOfferState, dismissUserOffer } from './src/lib/subscription';
import { clearPostLogoutUsage } from './src/lib/guestStorage';
import { migrateGuestChatsToSupabase } from './src/lib/guestChatStorage';
import { migrateGuestAnalysesToSupabase } from './src/lib/guestAnalysisStorage';
import { createChat, addChatMessage } from './src/lib/chat';
import { saveDocumentWithAnalysis } from './src/lib/documents';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { useAuth } from './src/context/AuthContext';
import { updateProfile } from './src/lib/profile';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { AnalysisProvider } from './src/context/AnalysisContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ensureI18n } from './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';

function getSupabaseUrl() {
  const v = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return typeof v === 'string' ? v.trim() : '';
}
function getSupabaseKey() {
  const v = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return typeof v === 'string' ? v.trim() : '';
}

const hasSupabaseConfig = !!(getSupabaseUrl() && getSupabaseKey());

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

const LIMITED_OFFER_ID = 'b82a740f-a7f4-4f8c-8891-029191150d36';

/** When user signs in: sync guest offer state to Supabase, then clear guest mode. */
function SyncGuestOnSignIn() {
  const { user } = useAuth();
  const { isGuest, clearGuestMode } = useGuest();
  const { guestOfferState } = useGuestAppState();
  const syncedRef = React.useRef(false);

  useEffect(() => {
    if (!user?.id) {
      syncedRef.current = false;
      return;
    }
    clearPostLogoutUsage();
    if (!isGuest) return;
    if (syncedRef.current) return;
    syncedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        await ensureUserOfferState(user.id, LIMITED_OFFER_ID);
        if (guestOfferState?.dismissed_at) {
          await dismissUserOffer(user.id, LIMITED_OFFER_ID);
        }
      } catch (e) {
        if (!cancelled) console.warn('Guest offer sync failed:', e?.message);
      }
      try {
        await migrateGuestChatsToSupabase(user.id, { createChat, addChatMessage });
      } catch (e) {
        if (!cancelled) console.warn('Guest chats migrate failed:', e?.message);
      }
      try {
        await migrateGuestAnalysesToSupabase(user.id, { saveDocumentWithAnalysis });
      } catch (e) {
        if (!cancelled) console.warn('Guest analyses migrate failed:', e?.message);
      }
      if (!cancelled) clearGuestMode();
    })();
    return () => { cancelled = true; };
  }, [user?.id, isGuest, clearGuestMode, guestOfferState?.dismissed_at]);
  return null;
}

/** After sign-in, writes pending onboarding jurisdiction to Supabase profile and clears it. */
function PendingJurisdictionSync({ children }) {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, refreshProfile } = useProfile();
  const { pendingJurisdiction, clearPendingJurisdiction } = useOnboardingJurisdiction();

  useEffect(() => {
    if (!user?.id || profileLoading || profile == null || !pendingJurisdiction) return;
    let cancelled = false;
    updateProfile(user.id, { jurisdiction_code: pendingJurisdiction })
      .then(() => {
        if (!cancelled) {
          clearPendingJurisdiction();
          return refreshProfile();
        }
      })
      .catch((e) => {
        if (!cancelled) console.warn('Pending jurisdiction sync failed:', e?.message);
      });
    return () => { cancelled = true; };
  }, [user?.id, profileLoading, profile, pendingJurisdiction, refreshProfile, clearPendingJurisdiction]);

  return children;
}

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
    ensureI18n()
      .then(() => setI18nReady(true))
      .catch(() => setI18nReady(true));
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
            <GuestProvider>
              <SyncGuestOnSignIn />
              <GuestAppStateProvider>
                <OnboardingJurisdictionProvider>
                  <ProfileProvider>
                    <PendingJurisdictionSync>
                      <SubscriptionProvider>
                        <AnalysisProvider>
                          <AppNavigator onNavigationRefReady={(ref) => { navigationRefHolder.current = ref; }} />
                        </AnalysisProvider>
                      </SubscriptionProvider>
                    </PendingJurisdictionSync>
                  </ProfileProvider>
                </OnboardingJurisdictionProvider>
              </GuestAppStateProvider>
            </GuestProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
