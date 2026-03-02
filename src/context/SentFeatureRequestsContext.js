/**
 * IDs of feature requests the user has sent (while authenticated).
 * Persisted in AsyncStorage so when they switch to guest they can still open Feature Request
 * and see the list (read-only); we use this to know whether to show "sign in" dialog on Settings tap.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@doctrust_sent_feature_request_ids';

const SentFeatureRequestsContext = createContext({
  sentIds: [],
  hasSentIdeas: false,
  addSentId: () => {},
});

export function SentFeatureRequestsProvider({ children }) {
  const [sentIds, setSentIds] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        try {
          const arr = raw ? JSON.parse(raw) : [];
          setSentIds(Array.isArray(arr) ? arr : []);
        } catch (_) {
          setSentIds([]);
        }
      })
      .catch(() => setSentIds([]))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const addSentId = useCallback((id) => {
    if (!id) return;
    setSentIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const hasSentIdeas = sentIds.length > 0;

  return (
    <SentFeatureRequestsContext.Provider value={{ sentIds, hasSentIdeas, addSentId }}>
      {children}
    </SentFeatureRequestsContext.Provider>
  );
}

export function useSentFeatureRequests() {
  return useContext(SentFeatureRequestsContext);
}
