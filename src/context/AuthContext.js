/**
 * AI Lawyer - Auth Context
 * Tracks Supabase session: null = not logged in, object = logged in.
 * While restoring session on app start we show nothing (isLoading = true).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
  pendingPasswordReset: false,
  setPendingPasswordReset: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s }, error }) => {
        if (error || !s?.user) {
          setSession(null);
          if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh_token')) {
            supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
        } else {
          setSession(s);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        const msg = err?.message || '';
        if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid')) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setSession(null);
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (event === 'SIGNED_OUT' || !s?.user) {
          setSession(null);
        } else {
          setSession(s);
        }
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signOut,
        pendingPasswordReset,
        setPendingPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
