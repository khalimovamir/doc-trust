/**
 * AI Lawyer - Verify Code Screen
 * Enter 6-digit OTP sent to email (Supabase), then go to Change Password
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import IconButton from '../components/IconButton';
import { verifyPasswordResetOtp, sendPasswordResetOtp } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

const RESEND_COUNTDOWN_START = 60;

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl },
    title: { fontFamily, fontSize: 28, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginBottom: spacing.xxl },
    button: { marginTop: spacing.sm },
    buttonFullWidth: { marginHorizontal: 0 },
    resendRow: { marginTop: spacing.xl, alignItems: 'center' },
    resendText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    resendNumber: { color: colors.primary, fontWeight: '500' },
    resendLink: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.primary },
  };
}

export default function VerifyCodeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const { setPendingPasswordReset } = useAuth();
  const email = route?.params?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(RESEND_COUNTDOWN_START);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleVerifyCode = async () => {
    const trimmedCode = code.trim().replace(/\s/g, '');
    if (!trimmedCode || !email) {
      setError(t('auth.errorCodeRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      setPendingPasswordReset(true);
      await verifyPasswordResetOtp(email, trimmedCode);
      navigation.navigate('ChangePassword');
    } catch (e) {
      setPendingPasswordReset(false);
      setError(e?.message || t('auth.invalidCode'));
      Alert.alert(t('auth.verificationFailed'), e?.message || t('auth.checkCodeAgain'));
    } finally {
      setLoading(false);
    }
  };
  const handleResendCode = async () => {
    if (resendSeconds > 0) return;
    setError('');
    try {
      await sendPasswordResetOtp(email);
      setResendSeconds(RESEND_COUNTDOWN_START);
    } catch (e) {
      Alert.alert(t('auth.resendFailed'), e?.message || t('auth.couldNotResend'));
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { color: colors.primaryText },
      headerTintColor: colors.primaryText,
      headerLeft: () => (
        <IconButton icon={ChevronLeft} onPress={() => navigation.goBack()} size={36} iconSize={22} />
      ),
    });
  }, [navigation, colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t('screens.verifyCode')}</Text>
          <Text style={styles.subtitle}>{t('auth.verifyCodeSubtitle')}</Text>

          <FormInput
            label={t('auth.verificationCodeLabel')}
            placeholder={t('auth.verificationCodePlaceholder')}
            value={code}
            onChangeText={(val) => { setCode(val.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            keyboardType="number-pad"
            error={error}
          />

          <PrimaryButton
            title={loading ? t('auth.verifying') : t('auth.verifyCodeButton')}
            onPress={handleVerifyCode}
            disabled={loading}
            containerStyle={[styles.button, styles.buttonFullWidth]}
          />

          <View style={styles.resendRow}>
            {resendSeconds > 0 ? (
              <Text style={styles.resendText}>
                {t('auth.resendInSeconds', { count: resendSeconds })}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
                <Text style={styles.resendLink}>{t('auth.resendCode')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

