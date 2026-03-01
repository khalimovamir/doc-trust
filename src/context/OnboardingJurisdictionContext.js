/**
 * AI Lawyer - Onboarding Jurisdiction Context
 * Stores jurisdiction selected during onboarding (before auth).
 * After sign-in, this value is written to the user's Supabase profile.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const OnboardingJurisdictionContext = createContext({
  pendingJurisdiction: null,
  setPendingJurisdiction: () => {},
  clearPendingJurisdiction: () => {},
});

export function OnboardingJurisdictionProvider({ children }) {
  const [pendingJurisdiction, setPendingJurisdictionState] = useState(null);

  const setPendingJurisdiction = useCallback((code) => {
    setPendingJurisdictionState(code ?? null);
  }, []);

  const clearPendingJurisdiction = useCallback(() => {
    setPendingJurisdictionState(null);
  }, []);

  return (
    <OnboardingJurisdictionContext.Provider
      value={{ pendingJurisdiction, setPendingJurisdiction, clearPendingJurisdiction }}
    >
      {children}
    </OnboardingJurisdictionContext.Provider>
  );
}

export function useOnboardingJurisdiction() {
  return useContext(OnboardingJurisdictionContext);
}
