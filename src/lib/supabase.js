/**
 * AI Lawyer - Supabase Client
 * Session persistence via AsyncStorage for React Native.
 * AppState listener refreshes tokens when app comes back to foreground.
 * When EXPO_PUBLIC_* are missing (e.g. EAS build without env vars), exports a no-op client so the app does not crash.
 */

import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

function normalizeEnv(value) {
  if (value == null) return '';
  const s = String(value).trim();
  return s === 'undefined' || s === 'null' ? '' : s;
}

const supabaseUrl = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const noopUnsub = { unsubscribe: () => {} };
const noopPromise = Promise.resolve({ data: { session: null }, error: null });

const stubSupabase = {
  auth: {
    getSession: () => noopPromise,
    onAuthStateChange: () => ({ data: { subscription: noopUnsub } }),
    signOut: () => Promise.resolve(),
    startAutoRefresh: () => {},
    stopAutoRefresh: () => {},
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signInWithIdToken: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    verifyOtp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    updateUser: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    setSession: () => Promise.resolve({ data: null, error: null }),
  },
  from: () => ({
    select: () => ({ single: () => noopPromise, maybeSingle: () => noopPromise }),
    insert: () => ({ select: () => noopPromise }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    delete: () => ({ eq: () => Promise.resolve(), in: () => Promise.resolve() }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) },
  rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
};

let client;

if (supabaseUrl.length > 0 && supabaseAnonKey.length > 0) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('Supabase createClient failed:', e?.message);
    }
    client = stubSupabase;
  }
} else {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      'Supabase credentials missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env or EAS env vars.'
    );
  }
  client = stubSupabase;
}

export const supabase = client;
