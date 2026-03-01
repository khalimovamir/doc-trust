/**
 * AI Lawyer - Sign In Screen
 * Email + password via Supabase, Forgot password?, Sign In, Sign Up link
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { fontFamily, spacing, useTheme } from '../theme';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import IconButton from '../components/IconButton';
import { CommonActions } from '@react-navigation/native';
import { signInWithEmail } from '../lib/auth';
import { isValidEmail } from '../lib/validation';

function createStyles(colors) {
  return {
    container: { flex: 1, backgroundColor: colors.primaryBackground },
    keyboardView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl },
    title: { fontFamily, fontSize: 28, fontWeight: '700', color: colors.primaryText, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText, textAlign: 'center', marginBottom: spacing.xxl },
    forgotLink: { alignSelf: 'flex-start', marginBottom: spacing.lg },
    forgotLinkText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.primary },
    button: { marginTop: spacing.sm },
    buttonFullWidth: { marginHorizontal: 0 },
    footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.md, alignItems: 'center' },
    footerText: { fontFamily, fontSize: 14, fontWeight: '400', color: colors.secondaryText },
    footerLink: { color: colors.primary },
  };
}

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create(createStyles(colors)), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSignIn = async () => {
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
    setLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      // If we're in AppStack (guest opened SignIn from Settings), go to Home
      const root = navigation.getParent();
      const routeNames = root?.getState()?.routeNames ?? [];
      if (routeNames.includes('Home')) {
        root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
      }
    } catch (e) {
      setPasswordError(e?.message || t('auth.signInFailed'));
      Alert.alert(t('auth.signInError'), e?.message || t('auth.couldNotSignIn'));
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    navigation.navigate('EnterEmail');
  };
  const handleSignUp = () => {
    navigation.navigate('SignUp');
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
          <Text style={styles.title}>{t('auth.signInTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>

          <FormInput
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={(val) => { setEmail(val); setEmailError(''); }}
            keyboardType="email-address"
            error={emailError}
          />
          <FormInput
            label={t('auth.passwordLabel')}
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

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
            <Text style={styles.forgotLinkText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <PrimaryButton
            title={loading ? t('auth.signingIn') : t('auth.signInButton')}
            onPress={handleSignIn}
            disabled={loading}
            containerStyle={[styles.button, styles.buttonFullWidth]}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.noAccount')}{' '}
            <Text style={styles.footerLink} onPress={handleSignUp}>
              {t('auth.signUpLinkText')}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

