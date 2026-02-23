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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

if (supabaseUrl && supabaseAnonKey) {
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
} else {
  if (__DEV__) {
    console.warn(
      'Supabase credentials missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env or EAS env vars.'
    );
  }
  client = stubSupabase;
}

export const supabase = client;
