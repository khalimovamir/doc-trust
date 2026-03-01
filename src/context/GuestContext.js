/**
 * AI Lawyer - Guest Mode Context
 * Tracks whether user chose "Skip" and uses app without registration.
 * Persisted in AsyncStorage so next app open goes directly to Home.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = '@doctrust_guest_mode';

const GuestContext = createContext({
  isGuest: false,
  isLoaded: false,
  setGuestMode: () => {},
  clearGuestMode: () => {},
});

export function GuestProvider({ children }) {
  const [isGuest, setIsGuestState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(GUEST_MODE_KEY)
      .then((value) => {
        if (!cancelled) {
          setIsGuestState(value === 'true');
        }
      })
      .catch(() => {
        if (!cancelled) setIsGuestState(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const setGuestMode = useCallback((value) => {
    setIsGuestState(!!value);
    AsyncStorage.setItem(GUEST_MODE_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const clearGuestMode = useCallback(() => {
    setIsGuestState(false);
    AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => {});
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, isLoaded, setGuestMode, clearGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  return useContext(GuestContext);
}
