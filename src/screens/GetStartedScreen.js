/**
 * AI Lawyer - Get Started Screen
 * Logo, app name, auth buttons (Apple — not yet, Google, Email), legal disclaimer
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { fontFamily, useTheme } from '../theme';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useGuest } from '../context/GuestContext';
import { useSubscription } from '../context/SubscriptionContext';
import { openPrivacyPolicy, openTermsOfUse } from '../lib/legalUrls';
import { signInWithGoogle, signInWithApple } from '../lib/auth';
import { syncGuestToUserData } from '../lib/guestSync';
import { revenueCatLogIn } from '../lib/revenueCat';

const LOGO_SIZE = 88;
const LOGO_GAP = 20;
const TITLE_SIZE = 32;
const TITLE_GAP = 30;
const BUTTON_HEIGHT = 56;
const BUTTON_RADIUS = 16;
const BUTTON_PADDING_H = 16;
const BUTTON_GAP = 12;
const ICON_SIZE = 24;
const PAGE_PADDING = 20;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: PAGE_PADDING, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.primaryBackground },
    skipButton: { height: 32, borderRadius: 16, backgroundColor: colors.alternate, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    skipButtonText: { fontFamily, fontSize: 16, fontWeight: '600', color: colors.primaryText },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: PAGE_PADDING, paddingTop: 8, paddingBottom: PAGE_PADDING },
    column: { alignItems: 'center', width: '100%' },
    logo: { width: LOGO_SIZE, height: LOGO_SIZE, marginBottom: LOGO_GAP, borderRadius: 20, overflow: 'hidden' },
    appName: { fontFamily, fontSize: TITLE_SIZE, fontWeight: '600', color: colors.primaryText, marginBottom: TITLE_GAP },
    buttonApple: { position: 'relative', height: BUTTON_HEIGHT, width: '100%', backgroundColor: colors.secondary, borderRadius: BUTTON_RADIUS, paddingHorizontal: BUTTON_PADDING_H, marginBottom: BUTTON_GAP, justifyContent: 'center' },
    buttonOutline: { position: 'relative', height: BUTTON_HEIGHT, width: '100%', backgroundColor: colors.secondaryBackground, borderRadius: BUTTON_RADIUS, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: BUTTON_PADDING_H, marginBottom: BUTTON_GAP, justifyContent: 'center' },
    buttonLast: { marginBottom: 0 },
    buttonIconLeft: { position: 'absolute', left: BUTTON_PADDING_H, top: 0, bottom: 0, justifyContent: 'center' },
    buttonTextCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    buttonAppleText: { fontFamily, fontSize: 16, fontWeight: '400', color: '#ffffff' },
    buttonOutlineText: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText },
    signInRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    signInText: { fontFamily, fontSize: 14, color: colors.secondaryText },
    signInLink: { fontFamily, fontSize: 14, color: colors.primary },
    icon: { width: ICON_SIZE, height: ICON_SIZE },
    legal: { paddingHorizontal: PAGE_PADDING, paddingBottom: PAGE_PADDING + 12, paddingTop: 24 },
    legalText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center' },
    legalLink: { color: colors.primary },
  };
}

export default function GetStartedScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const { setGuestMode, clearGuestMode } = useGuest();
  const { refreshSubscription } = useSubscription();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const fromSettings = route?.params?.fromSettings === true;
  const appleButtonContentColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

  const syncTimeoutRef = React.useRef(null);
  // When guest signs in from Get Started (opened via Settings), sync guest data to Supabase, clear guest mode, go to Home
  React.useEffect(() => {
    if (!fromSettings || !user?.id) return;
    let cancelled = false;
    clearGuestMode();
    (async () => {
      await syncGuestToUserData(user.id);
      await revenueCatLogIn(user.id).catch(() => {});
      if (cancelled) return;
      syncTimeoutRef.current = setTimeout(() => {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
        refreshSubscription?.();
      }, 50);
    })();
    return () => {
      cancelled = true;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [fromSettings, user?.id, navigation, clearGuestMode, refreshSubscription]);

  const handleApple = async () => {
    if (Platform.OS !== 'ios') return;
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (e) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(t('getStarted.appleSignInTitle'), e?.message || t('getStarted.appleSignInFailed'));
    } finally {
      setAppleLoading(false);
    }
  };
  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert(t('getStarted.googleSignInTitle'), e?.message || t('getStarted.googleSignInFailed'));
    } finally {
      setGoogleLoading(false);
    }
  };
  const handleEmail = () => {
    navigation.navigate('SignUp');
  };
  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };
  const handlePrivacyPolicy = () => openPrivacyPolicy();
  const handleTermsOfUse = () => openTermsOfUse();
  const handleSkip = () => {
    setGuestMode(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {!fromSettings && (
        <View style={styles.appBar}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>{t('getStarted.skip')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{t('common.appName')}</Text>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.buttonApple}
              onPress={handleApple}
              activeOpacity={0.8}
              disabled={appleLoading}
            >
              <View style={styles.buttonIconLeft}>
                {appleLoading ? (
                  <ActivityIndicator size="small" color={appleButtonContentColor} style={styles.icon} />
                ) : (
                  <Image
                    source={require('../../assets/icon-apple.png')}
                    style={[styles.icon, { tintColor: appleButtonContentColor }]}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.buttonTextCenter}>
                <Text style={[styles.buttonAppleText, { color: appleButtonContentColor }]}>
                  {appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={handleGoogle}
            activeOpacity={0.8}
            disabled={googleLoading}
          >
            <View style={styles.buttonIconLeft}>
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.primaryText} style={styles.icon} />
              ) : (
                <Image
                  source={require('../../assets/icon-google.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.buttonTextCenter}>
              <Text style={styles.buttonOutlineText}>
                {googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutline, styles.buttonLast]}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIconLeft}>
              <Mail size={ICON_SIZE} color={colors.primaryText} strokeWidth={2} />
            </View>
            <View style={styles.buttonTextCenter}>
              <Text style={styles.buttonOutlineText}>{t('auth.continueWithEmail')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <Text style={styles.signInText}>{t('auth.haveAccount')} </Text>
            <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
              <Text style={styles.signInLink}>{t('auth.signInLinkText')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.legal}>
        <Text style={styles.legalText}>
          {t('getStarted.legalByTapping')}{' '}
          <Text style={styles.legalLink} onPress={handlePrivacyPolicy}>
            {t('subscription.privacyPolicy')}
          </Text>{' '}
          {t('getStarted.and')}{' '}
          <Text style={styles.legalLink} onPress={handleTermsOfUse}>
            {t('subscription.termsOfUse')}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

