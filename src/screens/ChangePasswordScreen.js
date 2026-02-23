/**
 * AI Lawyer - Change Password Screen
 * Set new password after OTP verification (Supabase updateUser)
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
import { Eye, EyeOff } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import IconButton from '../components/IconButton';
import { updatePassword } from '../lib/auth';

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

export default function ChangePasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [repeatPasswordVisible, setRepeatPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [repeatPasswordError, setRepeatPasswordError] = useState('');

  const handleChangePassword = async () => {
    setPasswordError('');
    setRepeatPasswordError('');
    if (!password || password.length < 6) {
      setPasswordError(t('auth.errorPasswordMin'));
      return;
    }
    if (password !== repeatPassword) {
      setRepeatPasswordError(t('auth.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      navigation.navigate('Done');
    } catch (e) {
      setRepeatPasswordError(e?.message || t('auth.couldNotUpdatePassword'));
      Alert.alert(t('common.error'), e?.message || t('auth.changePasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.primaryBackground },
      headerTitleStyle: { color: colors.primaryText },
      headerTintColor: colors.primaryText,
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
          <Text style={styles.title}>{t('auth.changePasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.newPasswordSubtitle')}</Text>

          <FormInput
            label={t('auth.createPasswordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={(val) => { setPassword(val); setPasswordError(''); }}
            secureTextEntry={!passwordVisible}
            rightIcon={
              passwordVisible ? (
                <EyeOff size={24} color={colors.secondaryText} strokeWidth={2} />
              ) : (
                <Eye size={24} color={colors.secondaryText} strokeWidth={2} />
              )
            }
            onRightIconPress={() => setPasswordVisible((v) => !v)}
            error={passwordError}
          />
          <FormInput
            label={t('auth.repeatPasswordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={repeatPassword}
            onChangeText={(val) => { setRepeatPassword(val); setRepeatPasswordError(''); }}
            secureTextEntry={!repeatPasswordVisible}
            rightIcon={
              repeatPasswordVisible ? (
                <EyeOff size={24} color={colors.secondaryText} strokeWidth={2} />
              ) : (
                <Eye size={24} color={colors.secondaryText} strokeWidth={2} />
              )
            }
            onRightIconPress={() => setRepeatPasswordVisible((v) => !v)}
            error={repeatPasswordError}
          />

          <PrimaryButton
            title={loading ? t('auth.updating') : t('auth.changePasswordButton')}
            onPress={handleChangePassword}
            disabled={loading}
            containerStyle={[styles.button, styles.buttonFullWidth]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

