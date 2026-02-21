/**
 * AI Lawyer - Enter Email Screen
 * Forgot password: send 6-digit OTP to email via Supabase
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { sendPasswordResetOtp } from '../lib/auth';
import { isValidEmail } from '../lib/validation';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl },
    title: { fontFamily, fontSize: 28, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginBottom: spacing.xxl },
    button: { marginTop: spacing.sm },
    buttonFullWidth: { marginHorizontal: 0 },
  };
}

export default function EnterEmailScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.errorEmailRequired'));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError(t('auth.errorEmailInvalid'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetOtp(trimmedEmail);
      navigation.navigate('VerifyCode', { email: trimmedEmail });
    } catch (e) {
      setError(e?.message || t('auth.sendCodeError'));
      Alert.alert(t('common.error'), e?.message || t('auth.couldNotSendCode'));
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>{t('auth.enterEmailTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.enterEmailSubtitle')}</Text>

          <FormInput
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(val) => { setEmail(val); setError(''); }}
            keyboardType="email-address"
            error={error}
          />

          <PrimaryButton
            title={loading ? t('auth.sending') : t('auth.sendCode')}
            onPress={handleGetCode}
            disabled={loading}
            containerStyle={[styles.button, styles.buttonFullWidth]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

