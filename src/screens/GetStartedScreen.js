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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { fontFamily, useTheme } from '../theme';
import { signInWithGoogle, signInWithApple } from '../lib/auth';

const LOGO_SIZE = 88;
const LOGO_GAP = 12;
const TITLE_SIZE = 32;
const TITLE_GAP = 40;
const BUTTON_HEIGHT = 56;
const BUTTON_RADIUS = 16;
const BUTTON_PADDING_H = 16;
const BUTTON_GAP = 12;
const ICON_SIZE = 24;
const LEGAL_PADDING = 16;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: LEGAL_PADDING, paddingVertical: 24 },
    column: { alignItems: 'center', width: '100%' },
    logo: { width: LOGO_SIZE, height: LOGO_SIZE, marginBottom: LOGO_GAP },
    appName: { fontFamily, fontSize: TITLE_SIZE, fontWeight: '400', color: colors.primaryText, marginBottom: TITLE_GAP },
    buttonApple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', height: BUTTON_HEIGHT, width: '100%', backgroundColor: colors.secondary, borderRadius: BUTTON_RADIUS, paddingHorizontal: BUTTON_PADDING_H, marginBottom: BUTTON_GAP },
    buttonAppleText: { fontFamily, fontSize: 16, fontWeight: '400', color: '#ffffff', marginLeft: 12 },
    buttonOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', height: BUTTON_HEIGHT, width: '100%', backgroundColor: colors.secondaryBackground, borderRadius: BUTTON_RADIUS, borderWidth: 1, borderColor: colors.tertiary, paddingHorizontal: BUTTON_PADDING_H, marginBottom: BUTTON_GAP },
    buttonLast: { marginBottom: 0 },
    signInRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    signInText: { fontFamily, fontSize: 14, color: colors.secondaryText },
    signInLink: { fontFamily, fontSize: 14, color: colors.primary },
    buttonOutlineText: { fontFamily, fontSize: 16, fontWeight: '400', color: colors.primaryText, marginLeft: 12 },
    icon: { width: ICON_SIZE, height: ICON_SIZE },
    legal: { paddingHorizontal: LEGAL_PADDING, paddingBottom: LEGAL_PADDING, paddingTop: 24 },
    legalText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center' },
    legalLink: { color: colors.primary },
  };
}

export default function GetStartedScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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
  const handlePrivacyPolicy = () => {};
  const handleTermsOfUse = () => {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
              {appleLoading ? (
                <ActivityIndicator size="small" color="#ffffff" style={styles.icon} />
              ) : (
                <Image
                  source={require('../../assets/icon-apple.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.buttonAppleText}>
                {appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={handleGoogle}
            activeOpacity={0.8}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.primaryText} style={styles.icon} />
            ) : (
              <Image
                source={require('../../assets/icon-google.png')}
                style={styles.icon}
                resizeMode="contain"
              />
            )}
            <Text style={styles.buttonOutlineText}>
              {googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutline, styles.buttonLast]}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <Mail size={ICON_SIZE} color={colors.primaryText} strokeWidth={2} />
            <Text style={styles.buttonOutlineText}>{t('auth.continueWithEmail')}</Text>
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

