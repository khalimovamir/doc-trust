/**
 * AI Lawyer - Subscription Context
 * Provides: isPro, subscription, products, features, limits, offers
 * and helpers for per_user offer timer
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getUserSubscription,
  getSubscriptionProducts,
  getFeatureCatalog,
  getPlanFeatureLimits,
  getActiveOffers,
  ensureUserOfferState,
  isProStatus,
} from '../lib/subscription';

const SubscriptionContext = createContext({
  isPro: false,
  subscription: null,
  products: [],
  features: [],
  limits: {},
  offers: [],
  isLoading: true,
  refreshSubscription: () => {},
  ensureOfferState: async () => null,
});

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [features, setFeatures] = useState([]);
  const [limits, setLimits] = useState({});
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setProducts([]);
      setFeatures([]);
      setLimits({});
      setOffers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [sub, prods, feats, lims, offs] = await Promise.all([
        getUserSubscription(user.id),
        getSubscriptionProducts(),
        getFeatureCatalog(),
        getPlanFeatureLimits(),
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
      setOffers(offs || []);
    } catch (e) {
      console.warn('Subscription load failed:', e?.message);
      setSubscription(null);
      setProducts([]);
      setFeatures([]);
      setLimits({});
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureOfferState = useCallback(
    async (offerId) => {
      if (!user?.id || !offerId) return null;
      try {
        return await ensureUserOfferState(user.id, offerId);
      } catch (e) {
        console.warn('ensureOfferState failed:', e?.message);
        return null;
      }
    },
    [user?.id],
  );

  const isPro = isProStatus(subscription);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        subscription,
        products,
        features,
        limits,
        offers,
        isLoading,
        refreshSubscription: load,
        ensureOfferState,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
