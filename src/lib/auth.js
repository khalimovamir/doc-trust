/**
 * AI Lawyer - Auth helpers (Supabase)
 * Email/password, Google OAuth, Apple (native id_token), Forgot password (OTP)
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Send 6-digit OTP to email (forgot password)
 * Uses Supabase "Reset password" template (Auth > Email > Reset password)
 * In template body use {{ .Token }} for 6-digit code (not {{ .ConfirmationURL }})
 */
export async function sendPasswordResetOtp(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
  return data;
}

/**
 * Verify 6-digit OTP (recovery type for password reset)
 * type: 'recovery' — for reset password flow, not sign-in
 */
export async function verifyPasswordResetOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'recovery',
  });
  if (error) throw error;
  return data;
}

/**
 * Update current user password (call after verifyOtp in forgot-password flow)
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

/**
 * Sign in with Google (OAuth)
 * Redirect URL must be added in Supabase Dashboard: Auth > URL Configuration
 * e.g. ai-lawyer://google-auth or exp://... for dev
 */
export async function signInWithGoogle() {
  const redirectUrl = Linking.createURL('google-auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No auth URL returned');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type !== 'success' || !result.url) return null;
  const url = result.url;
  const fragment = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
    return (await supabase.auth.getSession()).data.session;
  }
  return null;
}

/**
 * Sign in with Apple (iOS only; uses native id_token → Supabase signInWithIdToken)
 * Requires: Supabase Dashboard Auth → Apple provider with iOS bundle ID as Client ID.
 * Requires: "Sign in with Apple" capability (expo-apple-authentication plugin).
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }
  const hasAppleAuth = await AppleAuthentication.isAvailableAsync();
  if (!hasAppleAuth) {
    throw new Error('Sign in with Apple is not available on this device.');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const { identityToken } = credential;
  if (!identityToken) {
    throw new Error('No identity token from Apple.');
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });
  if (error) throw error;
  if (credential.fullName) {
    const givenName = credential.fullName?.givenName ?? '';
    const familyName = credential.fullName?.familyName ?? '';
    const fullName = [givenName, familyName].filter(Boolean).join(' ') || null;
    if (fullName && data?.user) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName || undefined,
          family_name: familyName || undefined,
        },
      });
    }
  }
  return data?.session ?? null;
}
