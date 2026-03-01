/**
 * AI Lawyer - Guest App State Context
 * Local state for guest users: feature usage limits and offer state (Limited Offer).
 * Values match Supabase plan_feature_limits (free tier) and user_offer_states.
 * Persisted to AsyncStorage so guest data survives app restarts.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGuest } from './GuestContext';
import { POST_LOGOUT_USAGE_KEY, GUEST_OFFER_STATE_KEY, GUEST_FEATURE_USAGE_KEY, GUEST_SUBSCRIPTION_KEY } from '../lib/guestStorage';
import { getPlanFeatureLimits, getActiveOffers } from '../lib/subscription';

/** Free tier limits from plan_feature_limits (scan_document 1, document_check 5, document_compare 2, ai_lawyer 10) */
const FREE_TIER_LIMITS = {
  scan_document: 1,
  document_check: 5,
  document_compare: 2,
  ai_lawyer: 10,
};

const LIMITED_OFFER_ID = 'b82a740f-a7f4-4f8c-8891-029191150d36';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Build guest offer state: id, no user_id, time from subscription_offers (duration_seco → expires_at). */
function buildDefaultOfferState(offer) {
  const startedAt = new Date().toISOString();
  const durationSec = offer?.duration_seco ?? 86400;
  const expiresAt = new Date(Date.now() + durationSec * 1000).toISOString();
  return {
    id: generateId(),
    user_id: null,
    offer_id: LIMITED_OFFER_ID,
    started_at: startedAt,
    expires_at: expiresAt,
    dismissed_at: null,
    redeemed_at: null,
    created_at: startedAt,
    next_show_at: null,
  };
}

const DEFAULT_GUEST_SUBSCRIPTION = { tier: 'free', status: 'inactive', product_id: null, offer_id: null };

const GuestAppStateContext = createContext({
  guestUsage: {},
  guestOfferState: null,
  guestSubscription: null,
  setGuestOfferState: () => {},
  setGuestSubscription: () => {},
  decrementGuestUsage: () => {},
  refreshGuestState: () => {},
});

export function GuestAppStateProvider({ children }) {
  const { isGuest } = useGuest();
  const [guestUsage, setGuestUsage] = useState({ ...FREE_TIER_LIMITS });
  const guestUsageRef = useRef({ ...FREE_TIER_LIMITS });
  const [guestOfferState, setGuestOfferStateState] = useState(null);
  const [guestSubscription, setGuestSubscriptionState] = useState(() => ({ ...DEFAULT_GUEST_SUBSCRIPTION }));
  const guestOfferStateRef = useRef(null);
  const hasFetchedFreeTierFromApiRef = useRef(false);

  useEffect(() => {
    guestUsageRef.current = guestUsage;
  }, [guestUsage]);

  const persistUsage = useCallback((usage) => {
    AsyncStorage.setItem(GUEST_FEATURE_USAGE_KEY, JSON.stringify(usage)).catch(() => {});
  }, []);

  const persistOfferState = useCallback((state) => {
    AsyncStorage.setItem(GUEST_OFFER_STATE_KEY, state ? JSON.stringify(state) : '').catch(() => {});
  }, []);

  const persistSubscription = useCallback((sub) => {
    AsyncStorage.setItem(GUEST_SUBSCRIPTION_KEY, sub ? JSON.stringify(sub) : '').catch(() => {});
  }, []);

  const loadPersisted = useCallback(async () => {
    try {
      const [usageRaw, offerRaw, postLogoutRaw, subRaw] = await Promise.all([
        AsyncStorage.getItem(GUEST_FEATURE_USAGE_KEY),
        AsyncStorage.getItem(GUEST_OFFER_STATE_KEY),
        AsyncStorage.getItem(POST_LOGOUT_USAGE_KEY),
        AsyncStorage.getItem(GUEST_SUBSCRIPTION_KEY),
      ]);
      const merged = { ...FREE_TIER_LIMITS };
      if (usageRaw) {
        try {
          Object.assign(merged, JSON.parse(usageRaw));
        } catch (_) {}
      }
      if (postLogoutRaw) {
        try {
          const post = JSON.parse(postLogoutRaw);
          if (post && typeof post === 'object') {
            Object.assign(merged, post);
          }
        } catch (_) {}
      }
      setGuestUsage(merged);
      persistUsage(merged);
      if (offerRaw) {
        try {
          const parsed = JSON.parse(offerRaw);
          guestOfferStateRef.current = parsed;
          setGuestOfferStateState(parsed);
        } catch (_) {}
      }
      if (subRaw) {
        try {
          const parsed = JSON.parse(subRaw);
          if (parsed && typeof parsed === 'object' && (parsed.tier || parsed.status != null)) {
            setGuestSubscriptionState({ ...DEFAULT_GUEST_SUBSCRIPTION, ...parsed });
          }
        } catch (_) {}
      }
      return { hadPersistedUsage: !!(usageRaw || postLogoutRaw) };
    } catch (_) {
      return { hadPersistedUsage: false };
    }
  }, [persistUsage]);

  useEffect(() => {
    if (!isGuest) {
      setGuestUsage({ ...FREE_TIER_LIMITS });
      setGuestOfferStateState(null);
      setGuestSubscriptionState({ ...DEFAULT_GUEST_SUBSCRIPTION });
      guestOfferStateRef.current = null;
      hasFetchedFreeTierFromApiRef.current = false;
      return;
    }
    let cancelled = false;
    loadPersisted().then(({ hadPersistedUsage }) => {
      if (cancelled || hadPersistedUsage || hasFetchedFreeTierFromApiRef.current) return;
      hasFetchedFreeTierFromApiRef.current = true;
      getPlanFeatureLimits()
        .then((lims) => {
          if (!lims || !Array.isArray(lims) || cancelled) return;
          const free = {};
          lims.filter((l) => l.tier === 'free').forEach((l) => {
            free[l.feature] = l.monthly_limit ?? 0;
          });
          if (Object.keys(free).length >= 4) {
            setGuestUsage((prev) => ({ ...prev, ...free }));
            persistUsage({ ...FREE_TIER_LIMITS, ...free });
          }
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [isGuest, loadPersisted, persistUsage]);

  const setGuestOfferState = useCallback(
    (stateOrUpdater) => {
      setGuestOfferStateState((prev) => {
        const next = typeof stateOrUpdater === 'function' ? stateOrUpdater(prev) : stateOrUpdater;
        guestOfferStateRef.current = next;
        if (next) persistOfferState(next);
        return next;
      });
    },
    [persistOfferState]
  );

  useEffect(() => {
    guestOfferStateRef.current = guestOfferState;
  }, [guestOfferState]);

  const ensureGuestOfferState = useCallback(async () => {
    if (guestOfferStateRef.current) return guestOfferStateRef.current;
    const offers = await getActiveOffers().catch(() => []);
    const offer = Array.isArray(offers) ? offers.find((o) => o.id === LIMITED_OFFER_ID) : null;
    const state = buildDefaultOfferState(offer);
    persistOfferState(state);
    guestOfferStateRef.current = state;
    setGuestOfferStateState(state);
    return state;
  }, [persistOfferState]);

  const decrementGuestUsage = useCallback(
    async (feature) => {
      const prev = guestUsageRef.current;
      const current = prev[feature];
      if (current == null || current <= 0) return;
      const next = { ...prev, [feature]: current - 1 };
      await AsyncStorage.setItem(GUEST_FEATURE_USAGE_KEY, JSON.stringify(next)).catch(() => {});
      setGuestUsage(next);
    },
    []
  );

  const refreshGuestState = useCallback(() => {
    if (isGuest) loadPersisted();
  }, [isGuest, loadPersisted]);

  const setGuestSubscription = useCallback(
    (subOrUpdater) => {
      setGuestSubscriptionState((prev) => {
        const next = typeof subOrUpdater === 'function' ? subOrUpdater(prev) : subOrUpdater;
        const normalized = next ? { ...DEFAULT_GUEST_SUBSCRIPTION, ...next } : { ...DEFAULT_GUEST_SUBSCRIPTION };
        persistSubscription(normalized);
        return normalized;
      });
    },
    [persistSubscription]
  );

  useEffect(() => {
    if (isGuest && guestOfferState == null) {
      AsyncStorage.getItem(GUEST_OFFER_STATE_KEY).then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              if (!parsed.id) {
                parsed.id = generateId();
                persistOfferState(parsed);
              }
              setGuestOfferStateState(parsed);
            } else {
              throw new Error('invalid');
            }
          } catch (_) {
            getActiveOffers().then((offers) => {
              const offer = Array.isArray(offers) ? offers.find((o) => o.id === LIMITED_OFFER_ID) : null;
              const state = buildDefaultOfferState(offer);
              setGuestOfferStateState(state);
              persistOfferState(state);
            }).catch(() => {
              setGuestOfferStateState(buildDefaultOfferState(null));
              persistOfferState(buildDefaultOfferState(null));
            });
          }
        } else {
          getActiveOffers().then((offers) => {
            const offer = Array.isArray(offers) ? offers.find((o) => o.id === LIMITED_OFFER_ID) : null;
            const state = buildDefaultOfferState(offer);
            setGuestOfferStateState(state);
            persistOfferState(state);
          }).catch(() => {
            const state = buildDefaultOfferState(null);
            setGuestOfferStateState(state);
            persistOfferState(state);
          });
        }
      }).catch(() => {
        const state = buildDefaultOfferState(null);
        setGuestOfferStateState(state);
        persistOfferState(state);
      });
    }
  }, [isGuest, guestOfferState == null, persistOfferState]);

  return (
    <GuestAppStateContext.Provider
      value={{
        guestUsage,
        guestOfferState,
        guestSubscription,
        setGuestOfferState,
        setGuestSubscription,
        ensureGuestOfferState,
        decrementGuestUsage,
        refreshGuestState,
        FREE_TIER_LIMITS,
        LIMITED_OFFER_ID,
      }}
    >
      {children}
    </GuestAppStateContext.Provider>
  );
}

export function useGuestAppState() {
  return useContext(GuestAppStateContext);
}
