/**
 * Jurisdiction in App State.
 * - Always kept in memory and persisted to AsyncStorage (guest and auth).
 * - Onboarding / Settings: save selection here; for auth also sync to Supabase profile.
 * - Analysis, chat, compare: use jurisdictionCode from here (guest → from app state; auth → app state mirrors profile).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

const STORAGE_KEY = '@doctrust_jurisdiction';
const DEFAULT_CODE = 'US';

const JurisdictionContext = createContext({
  jurisdictionCode: DEFAULT_CODE,
  setJurisdictionCode: () => {},
});

export function JurisdictionProvider({ children }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [jurisdictionCode, setJurisdictionCodeState] = useState(DEFAULT_CODE);
  const [loaded, setLoaded] = useState(false);
  const syncedFromProfileRef = useRef(false);

  const setJurisdictionCode = useCallback((code) => {
    const next = code && typeof code === 'string' ? code : DEFAULT_CODE;
    setJurisdictionCodeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const code = raw && raw.trim() ? raw.trim() : DEFAULT_CODE;
        setJurisdictionCodeState(code);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      syncedFromProfileRef.current = false;
      return;
    }
    if (!loaded || syncedFromProfileRef.current) return;
    if (profile?.jurisdiction_code == null || profile.jurisdiction_code === '') return;
    syncedFromProfileRef.current = true;
    setJurisdictionCodeState(profile.jurisdiction_code);
    AsyncStorage.setItem(STORAGE_KEY, profile.jurisdiction_code).catch(() => {});
  }, [loaded, user?.id, profile?.jurisdiction_code]);

  return (
    <JurisdictionContext.Provider value={{ jurisdictionCode, setJurisdictionCode }}>
      {children}
    </JurisdictionContext.Provider>
  );
}

export function useJurisdiction() {
  return useContext(JurisdictionContext);
}
