/**
 * AI Lawyer - Subscription API (Supabase)
 * Reads: user_subscriptions, subscription_products, feature_catalog,
 * plan_feature_limits, subscription_offers, user_offer_states
 * Writes: user_offer_states only (per_user offer start)
 * user_subscriptions is read-only (writes via service_role on server)
 */

import { supabase } from './supabase';

const PRO_STATUSES = ['active', 'trialing', 'grace_period'];
const STORE_MANUAL = 'manual';

/**
 * Check if user has PRO
 */
export function isProStatus(sub) {
  if (!sub) return false;
  return sub.tier === 'pro' && PRO_STATUSES.includes(sub.status);
}

/**
 * Get user subscription
 */
export async function getUserSubscription(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no row
    throw error;
  }
  return data;
}

/**
 * Get active subscription products (PRO plans)
 */
export async function getSubscriptionProducts(store = STORE_MANUAL) {
  const { data, error } = await supabase
    .from('subscription_products')
    .select('*')
    .eq('store', store)
    .eq('is_active', true)
    .order('interval');
  if (error) throw error;
  return data || [];
}

/**
 * Get feature catalog
 */
export async function getFeatureCatalog() {
  const { data, error } = await supabase
    .from('feature_catalog')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

/**
 * Get plan feature limits (FREE vs PRO)
 */
export async function getPlanFeatureLimits() {
  const { data, error } = await supabase
    .from('plan_feature_limits')
    .select('*');
  if (error) throw error;
  return data || [];
}

/**
 * Get active subscription offers (is_active, within starts_at/ends_at window)
 */
export async function getActiveOffers() {
  const now = new Date();
  const { data, error } = await supabase
    .from('subscription_offers')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  const list = (data || []).filter((o) => {
    if (o.starts_at && new Date(o.starts_at) > now) return false;
    if (o.ends_at && new Date(o.ends_at) < now) return false;
    return true;
  });
  list.sort((a, b) => {
    const aEnd = a.ends_at ? new Date(a.ends_at).getTime() : Infinity;
    const bEnd = b.ends_at ? new Date(b.ends_at).getTime() : Infinity;
    return aEnd - bEnd;
  });
  return list;
}

/**
 * Get or create user offer state for per_user offer
 * Returns existing or newly created state; trigger sets expires_at
 */
export async function ensureUserOfferState(userId, offerId) {
  if (!userId || !offerId) return null;
  const { data: existing } = await supabase
    .from('user_offer_states')
    .select('*')
    .eq('user_id', userId)
    .eq('offer_id', offerId)
    .single();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from('user_offer_states')
    .insert({ user_id: userId, offer_id: offerId })
    .select()
    .single();
  if (error) throw error;
  return created;
}

/**
 * Dismiss offer (user closed without buying)
 */
export async function dismissUserOffer(userId, offerId) {
  if (!userId || !offerId) return;
  await supabase
    .from('user_offer_states')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('offer_id', offerId);
}

/**
 * Apply offer discount to price_cents (for display on Subscription screen)
 */
export function applyOfferDiscount(priceCents, offer) {
  if (!offer) return priceCents;
  if (offer.discount_type === 'percent' && (offer.discount_perc != null)) {
    return Math.round(priceCents * (1 - Number(offer.discount_perc) / 100));
  }
  if (offer.discount_type === 'fixed' && (offer.discount_cent != null)) {
    return Math.max(0, priceCents - Number(offer.discount_cent));
  }
  return priceCents;
}
