/**
 * AI Lawyer - Subscription Context
 * Provides: isPro, subscription, products, features, limits, offers
 * and helpers for per_user offer timer + Subscription Bottom Sheet
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SubscriptionBottomSheet from '../components/SubscriptionBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useGuest } from './GuestContext';
import { useGuestAppState } from './GuestAppStateContext';
import {
  getUserSubscription,
  getSubscriptionProducts,
  getFeatureCatalog,
  getPlanFeatureLimits,
  getActiveOffers,
  ensureUserOfferState,
  dismissUserOffer,
  getFeatureUsage,
  decrementFeatureUsage as decrementFeatureUsageApi,
  isProStatus,
  syncGuestOfferStateToSupabase,
  syncGuestUsageToSupabase,
  persistOfferStatesForPostLogout,
  grantManualSubscription,
} from '../lib/subscription';
import { POST_LOGOUT_USAGE_KEY, GUEST_SUBSCRIPTION_KEY } from '../lib/guestStorage';

const SubscriptionContext = createContext({
  isPro: false,
  subscription: null,
  products: [],
  features: [],
  limits: {},
  usage: {},
  offers: [],
  isLoading: true,
  refreshSubscription: () => {},
  ensureOfferState: async () => null,
  canUseFeature: () => true,
  openSubscriptionIfLimitReached: () => true,
  decrementFeatureUsage: () => {},
  dismissOffer: () => {},
  persistUsageForPostLogout: () => {},
  setGuestSubscription: () => {},
  openSubscriptionBottomSheet: () => {},
  closeSubscriptionBottomSheet: () => {},
});

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const { isGuest, clearGuestMode } = useGuest();
  const {
    guestUsage,
    guestOfferState,
    guestSubscription,
    setGuestOfferState,
    setGuestSubscription,
    ensureGuestOfferState,
    decrementGuestUsage,
    refreshGuestState,
    LIMITED_OFFER_ID,
  } = useGuestAppState();
  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [features, setFeatures] = useState([]);
  const [limits, setLimits] = useState({});
  const [usage, setUsage] = useState({});
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionSheetVisible, setSubscriptionSheetVisible] = useState(false);
  const [subscriptionSheetParams, setSubscriptionSheetParams] = useState({ offerId: null, offerProductId: null });

  const effectiveUsage = isGuest ? guestUsage : usage;
  const effectiveSubscription = isGuest ? guestSubscription : subscription;

  const openSubscriptionBottomSheet = useCallback((params = {}) => {
    setSubscriptionSheetParams({
      offerId: params.offerId ?? null,
      offerProductId: params.offerProductId ?? null,
    });
    setSubscriptionSheetVisible(true);
  }, []);

  const closeSubscriptionBottomSheet = useCallback(() => {
    setSubscriptionSheetVisible(false);
    setSubscriptionSheetParams({ offerId: null, offerProductId: null });
  }, []);

  const load = useCallback(async () => {
    if (isGuest && !user?.id) {
      setSubscription(null);
      try {
        const [prods, feats, lims, offs] = await Promise.all([
          getSubscriptionProducts(),
          getFeatureCatalog(),
          getPlanFeatureLimits(),
          getActiveOffers(),
        ]);
        setProducts(prods);
        setFeatures(feats);
        const limitsMap = {};
        (lims || []).forEach((l) => {
          const key = `${l.tier}_${l.feature}`;
          limitsMap[key] = l;
        });
        setLimits(limitsMap);
        setOffers(offs || []);
      } catch (e) {
        console.warn('Subscription load (guest) failed:', e?.message);
      }
      setIsLoading(false);
      return;
    }
    if (!user?.id) {
      setSubscription(null);
      setProducts([]);
      setFeatures([]);
      setLimits({});
      setUsage({});
      setOffers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [sub, prods, feats, lims, usageData, offs] = await Promise.all([
        getUserSubscription(user.id),
        getSubscriptionProducts(),
        getFeatureCatalog(),
        getPlanFeatureLimits(),
        getFeatureUsage(user.id),
        getActiveOffers(),
      ]);
      setSubscription(sub);
      setProducts(prods);
      setFeatures(feats);
      const limitsMap = {};
      (lims || []).forEach((l) => {
        const key = `${l.tier}_${l.feature}`;
        limitsMap[key] = l;
      });
      setLimits(limitsMap);
      setUsage(usageData || {});
      setOffers(offs || []);
    } catch (e) {
      console.warn('Subscription load failed:', e?.message);
      setSubscription(null);
      setProducts([]);
      setFeatures([]);
      setLimits({});
      setUsage({});
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isGuest]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureOfferState = useCallback(
    async (offerId) => {
      if (isGuest && !user?.id) {
        if (offerId === LIMITED_OFFER_ID) {
          return ensureGuestOfferState();
        }
        return null;
      }
      if (!user?.id || !offerId) return null;
      try {
        return await ensureUserOfferState(user.id, offerId);
      } catch (e) {
        console.warn('ensureOfferState failed:', e?.message);
        return null;
      }
    },
    [user?.id, isGuest, LIMITED_OFFER_ID, ensureGuestOfferState],
  );

  const isPro = isProStatus(effectiveSubscription);

  const canUseFeature = useCallback(
    (feature) => {
      if (isPro) return true;
      const remaining = effectiveUsage[feature];
      if (remaining == null) return true; // unlimited
      return remaining > 0;
    },
    [isPro, effectiveUsage]
  );

  const decrementFeatureUsage = useCallback(
    (feature) => {
      if (isGuest && !user?.id) {
        return decrementGuestUsage(feature);
      }
      if (user?.id) {
        return decrementFeatureUsageApi(user.id, feature).then(() => load()).catch(() => {});
      }
      return Promise.resolve();
    },
    [isGuest, user?.id, decrementGuestUsage, load],
  );

  const openSubscriptionIfLimitReached = useCallback(
    (feature, _navigation) => {
      if (canUseFeature(feature)) return true;
      openSubscriptionBottomSheet();
      return false;
    },
    [canUseFeature, openSubscriptionBottomSheet]
  );

  const refreshSubscription = useCallback(() => {
    if (isGuest) refreshGuestState();
    load();
  }, [isGuest, refreshGuestState, load]);

  const dismissOffer = useCallback(
    (offerId) => {
      if (isGuest && !user?.id) {
        setGuestOfferState((prev) =>
          prev && prev.offer_id === offerId
            ? { ...prev, dismissed_at: new Date().toISOString() }
            : prev
        );
        return;
      }
      if (user?.id && offerId) {
        dismissUserOffer(user.id, offerId).catch(() => {});
      }
    },
    [isGuest, user?.id, setGuestOfferState]
  );

  /** When user logs in while in guest mode: sync guest offer state, usage and subscription to Supabase, then clear guest mode. */
  useEffect(() => {
    if (!user?.id || !isGuest) return;
    let cancelled = false;
    (async () => {
      await Promise.all([
        syncGuestOfferStateToSupabase(user.id),
        syncGuestUsageToSupabase(user.id),
      ]);
      if (guestSubscription?.tier === 'pro' && !cancelled) {
        await grantManualSubscription(user.id, guestSubscription.product_id || 'pro_yearly', guestSubscription.offer_id ?? undefined).catch(() => {});
      }
      if (!cancelled) clearGuestMode();
    })();
    return () => { cancelled = true; };
  }, [user?.id, isGuest, clearGuestMode, guestSubscription?.tier, guestSubscription?.product_id, guestSubscription?.offer_id]);

  /** Persist current usage, offer states and subscription so that after logout → guest the user keeps the same state (no free reset). */
  const persistUsageForPostLogout = useCallback(async () => {
    if (isGuest || !user?.id) return;
    const toSave = {
      scan_document: usage.scan_document,
      document_check: usage.document_check,
      document_compare: usage.document_compare,
      ai_lawyer: usage.ai_lawyer,
    };
    await AsyncStorage.setItem(POST_LOGOUT_USAGE_KEY, JSON.stringify(toSave));
    await persistOfferStatesForPostLogout(user.id);
    if (subscription && typeof subscription === 'object') {
      const subSnapshot = {
        tier: subscription.tier,
        status: subscription.status,
        product_id: subscription.product_id ?? null,
        offer_id: subscription.offer_id ?? null,
      };
      await AsyncStorage.setItem(GUEST_SUBSCRIPTION_KEY, JSON.stringify(subSnapshot));
    }
  }, [isGuest, user?.id, usage.scan_document, usage.document_check, usage.document_compare, usage.ai_lawyer, subscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        subscription: effectiveSubscription,
        products,
        features,
        limits,
        usage: effectiveUsage,
        offers,
        isLoading,
        refreshSubscription,
        ensureOfferState,
        canUseFeature,
        openSubscriptionIfLimitReached,
        decrementFeatureUsage,
        dismissOffer,
        persistUsageForPostLogout,
        setGuestSubscription,
        guestOfferState: isGuest ? guestOfferState : null,
        openSubscriptionBottomSheet,
        closeSubscriptionBottomSheet,
      }}
    >
      {children}
      <SubscriptionBottomSheet
        visible={subscriptionSheetVisible}
        onClose={closeSubscriptionBottomSheet}
        offerId={subscriptionSheetParams.offerId}
        offerProductId={subscriptionSheetParams.offerProductId}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
