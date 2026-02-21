/**
 * AI Lawyer - Sign Up Screen
 * Email + password sign up via Supabase
 */

import React, { useState, useMemo } from 'react';
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
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import IconButton from '../components/IconButton';
import { signUpWithEmail } from '../lib/auth';
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
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.md, alignItems: 'center' },
    footerText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    footerLink: { color: colors.primary },
  };
}

export default function SignUpScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    setEmailError('');
    setPasswordError('');
    if (!trimmedEmail) {
      setEmailError(t('auth.errorEmailRequired'));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError(t('auth.errorEmailInvalid'));
      return;
    }
    if (!password) {
      setPasswordError(t('auth.errorPasswordRequired'));
      return;
    }
    if (password.length < 6) {
      setPasswordError(t('auth.errorPasswordMin'));
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(trimmedEmail, password);
      // Session updates → AuthContext → navigator switches to AppStack automatically
    } catch (e) {
      setPasswordError(e?.message || t('auth.signUpFailed'));
      Alert.alert(t('auth.signUpError'), e?.message || t('auth.couldNotCreateAccount'));
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = () => {
    navigation.navigate('SignIn');
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
          <Text style={styles.title}>{t('auth.signUpTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>

          <FormInput
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(val) => { setEmail(val); setEmailError(''); }}
            keyboardType="email-address"
            error={emailError}
          />
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

          <PrimaryButton
            title={loading ? t('auth.creatingAccount') : t('auth.signUpButton')}
            onPress={handleSignUp}
            disabled={loading}
            containerStyle={[styles.button, styles.buttonFullWidth]}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.haveAccount')}{' '}
            <Text style={styles.footerLink} onPress={handleSignIn}>
              {t('auth.signInLinkText')}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

