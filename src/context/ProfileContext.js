/**
 * AI Lawyer - Profile Context
 * Loads and caches profile from Supabase profiles table
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getProfile } from '../lib/profile';

const ProfileContext = createContext({
  profile: null,
  isLoading: true,
  refreshProfile: () => {},
});

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const p = await getProfile(user.id);
      setProfile(p);
    } catch (e) {
      console.warn('Profile load failed:', e?.message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
