/**
 * AI Lawyer - Subscription API (Supabase + local cache for two-way / offline)
 * Reads: user_subscriptions, subscription_products, feature_catalog,
 * plan_feature_limits, subscription_offers, user_offer_states
 * Writes: user_offer_states only (per_user offer start)
 * user_subscriptions is read-only (writes via service_role on server)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { GUEST_OFFER_STATE_KEY, GUEST_FEATURE_USAGE_KEY, POST_LOGOUT_USAGE_KEY } from './guestStorage';
import {
  getCachedUsage,
  setCachedUsage,
  getCachedSubscription,
  setCachedSubscription,
  getCachedProducts,
  setCachedProducts,
  getCachedLimits,
  setCachedLimits,
  getCachedOffers,
  setCachedOffers,
  getCachedFeatures,
  setCachedFeatures,
} from './subscriptionCache';

const PRO_STATUSES = ['active', 'trialing', 'grace_period'];
const STORE_MANUAL = 'manual';

/** Limited offer id used for guest offer state sync (same as GuestAppStateContext). */
const LIMITED_OFFER_ID = 'b82a740f-a7f4-4f8c-8891-029191150d36';

/** Default free-tier remaining (for merging guest usage; matches plan_feature_limits free). */
const FREE_TIER_USAGE_DEFAULT = { scan_document: 1, document_check: 5, document_compare: 2, ai_lawyer: 10 };

/**
 * Check if user has PRO
 */
export function isProStatus(sub) {
  if (!sub) return false;
  return sub.tier === 'pro' && PRO_STATUSES.includes(sub.status);
}

/**
 * Get user subscription. Saves to local cache on success; returns cache on failure.
 */
export async function getUserSubscription(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        await setCachedSubscription(userId, null);
        return null;
      }
      throw error;
    }
    await setCachedSubscription(userId, data);
    return data;
  } catch (e) {
    return await getCachedSubscription(userId);
  }
}

/**
 * Get active subscription products (PRO plans). Caches on success; returns cache on failure.
 */
export async function getSubscriptionProducts(store = STORE_MANUAL) {
  try {
    const { data, error } = await supabase
      .from('subscription_products')
      .select('*')
      .eq('store', store)
      .eq('is_active', true)
      .order('interval');
    if (error) throw error;
    const list = data || [];
    await setCachedProducts(list);
    return list;
  } catch (e) {
    const cached = await getCachedProducts();
    return Array.isArray(cached) ? cached : [];
  }
}

/**
 * Get feature catalog. Caches on success; returns cache on failure.
 */
export async function getFeatureCatalog() {
  try {
    const { data, error } = await supabase
      .from('feature_catalog')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    const list = data || [];
    await setCachedFeatures(list);
    return list;
  } catch (e) {
    const cached = await getCachedFeatures();
    return Array.isArray(cached) ? cached : [];
  }
}

/**
 * Get plan feature limits (FREE vs PRO). Caches on success; returns cache on failure.
 */
export async function getPlanFeatureLimits() {
  try {
    const { data, error } = await supabase
      .from('plan_feature_limits')
      .select('*');
    if (error) throw error;
    const list = data || [];
    await setCachedLimits(list);
    return list;
  } catch (e) {
    const cached = await getCachedLimits();
    return Array.isArray(cached) ? cached : [];
  }
}

/**
 * Get active subscription offers (is_active, within starts_at/ends_at window). Caches on success; returns cache on failure.
 */
export async function getActiveOffers() {
  const now = new Date();
  try {
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
    await setCachedOffers(list);
    return list;
  } catch (e) {
    const cached = await getCachedOffers();
    return Array.isArray(cached) ? cached : [];
  }
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
 * Start next show window for recurring per_user offer (when now >= next_show_at).
 * Returns updated state or null. Call when offer has recurrence_hidden_seco and state.next_show_at is due.
 */
export async function startNextOfferWindow(offerId) {
  if (!offerId) return null;
  const { data, error } = await supabase.rpc('start_next_offer_window', { p_offer_id: offerId });
  if (error) {
    console.warn('startNextOfferWindow failed:', error?.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
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
 * Fetch all user_offer_states for a user (for persisting to guest storage on logout).
 */
export async function getUserOfferStates(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_offer_states')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.warn('getUserOfferStates failed:', error?.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Sync guest offer state from AsyncStorage to Supabase (on login: guest → user).
 * Reads GUEST_OFFER_STATE_KEY and upserts into user_offer_states with user_id.
 */
export async function syncGuestOfferStateToSupabase(userId) {
  if (!userId) return;
  try {
    const raw = await AsyncStorage.getItem(GUEST_OFFER_STATE_KEY);
    if (!raw) return;
    const guest = JSON.parse(raw);
    if (!guest || !guest.offer_id) return;
    const row = {
      user_id: userId,
      offer_id: guest.offer_id,
      dismissed_at: guest.dismissed_at || null,
      next_show_at: guest.next_show_at || null,
      expires_at: guest.expires_at || null,
    };
    await supabase.from('user_offer_states').upsert(row, {
      onConflict: 'user_id,offer_id',
    });
  } catch (e) {
    console.warn('syncGuestOfferStateToSupabase failed:', e?.message);
  }
}

/**
 * Persist current user's offer states to guest storage (on logout: user → guest).
 * So when user continues as guest again, they see the same offer state.
 */
export async function persistOfferStatesForPostLogout(userId) {
  if (!userId) return;
  try {
    const rows = await getUserOfferStates(userId);
    if (rows.length === 0) return;
    const preferred = rows.find((r) => r.offer_id === LIMITED_OFFER_ID) || rows[0];
    const guestState = {
      id: preferred.id || null,
      user_id: null,
      offer_id: preferred.offer_id,
      started_at: preferred.started_at || preferred.created_at || new Date().toISOString(),
      expires_at: preferred.expires_at || null,
      dismissed_at: preferred.dismissed_at || null,
      redeemed_at: null,
      created_at: preferred.created_at || new Date().toISOString(),
      next_show_at: preferred.next_show_at || null,
    };
    await AsyncStorage.setItem(GUEST_OFFER_STATE_KEY, JSON.stringify(guestState));
  } catch (e) {
    console.warn('persistOfferStatesForPostLogout failed:', e?.message);
  }
}

/**
 * Sync guest feature usage from AsyncStorage to Supabase (on login: guest → user).
 * Reads GUEST_FEATURE_USAGE_KEY and POST_LOGOUT_USAGE_KEY, merges with free-tier defaults, then upserts user_feature_usage (no RPC, same as offer states).
 */
export async function syncGuestUsageToSupabase(userId) {
  if (!userId) return;
  try {
    const [guestRaw, postLogoutRaw] = await Promise.all([
      AsyncStorage.getItem(GUEST_FEATURE_USAGE_KEY),
      AsyncStorage.getItem(POST_LOGOUT_USAGE_KEY),
    ]);
    const merged = { ...FREE_TIER_USAGE_DEFAULT };
    if (guestRaw) {
      try {
        Object.assign(merged, JSON.parse(guestRaw));
      } catch (_) {}
    }
    if (postLogoutRaw) {
      try {
        const post = JSON.parse(postLogoutRaw);
        if (post && typeof post === 'object') Object.assign(merged, post);
      } catch (_) {}
    }
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    const periodStr = periodStart.toISOString().slice(0, 10);
    const remaining = (key) => Math.max(0, Number(merged[key]) ?? FREE_TIER_USAGE_DEFAULT[key] ?? 0);
    const rows = [
      { user_id: userId, feature: 'scan_document', period_start: periodStr, remaining_count: remaining('scan_document') },
      { user_id: userId, feature: 'document_check', period_start: periodStr, remaining_count: remaining('document_check') },
      { user_id: userId, feature: 'document_compare', period_start: periodStr, remaining_count: remaining('document_compare') },
      { user_id: userId, feature: 'ai_lawyer', period_start: periodStr, remaining_count: remaining('ai_lawyer') },
    ];
    await supabase.from('user_feature_usage').upsert(rows, {
      onConflict: 'user_id,feature,period_start',
    });
  } catch (e) {
    console.warn('syncGuestUsageToSupabase failed:', e?.message);
  }
}

/**
 * Parse percentage from offer subtitle (e.g. "50%", "50% OFF") for fallback discount.
 */
function parsePercentFromSubtitle(subtitle) {
  if (subtitle == null || typeof subtitle !== 'string') return null;
  const match = subtitle.match(/(\d+)\s*%?/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

/**
 * Grant manual subscription (pro) for user — calls RPC to write user_subscriptions.
 * productId: 'pro_yearly_offer' | 'pro_monthly' | 'pro_yearly'
 * offerId: optional, for Limited Offer (user_offer_states.redeemed_at can be set elsewhere)
 */
export async function grantManualSubscription(userId, productId, offerId = null) {
  if (!userId || !productId) {
    return { ok: false, error: 'userId and productId required' };
  }
  const { data, error } = await supabase.rpc('grant_manual_subscription', {
    p_user_id: userId,
    p_product_id: productId,
    p_offer_id: offerId || null,
  });
  if (error) throw error;
  return data || { ok: false };
}

const DEFAULT_USAGE = { scan_document: null, document_check: null, document_compare: null, ai_lawyer: null };

function parseUsageResponse(data) {
  const raw = Array.isArray(data) ? data[0] : data;
  let row = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const keys = Object.keys(raw);
    if (keys.length === 1) {
      const val = raw[keys[0]];
      if (val && typeof val === 'object' && 'scan_document' in val) row = val;
    }
    if (row === raw && (raw.get_feature_usage != null || raw.scan_document != null)) {
      row = raw.get_feature_usage ?? raw;
    }
  }
  return {
    scan_document: row?.scan_document != null ? Number(row.scan_document) : null,
    document_check: row?.document_check != null ? Number(row.document_check) : null,
    document_compare: row?.document_compare != null ? Number(row.document_compare) : null,
    ai_lawyer: row?.ai_lawyer != null ? Number(row.ai_lawyer) : null,
  };
}

/**
 * Get current period remaining counts for limit checks.
 * Saves to local cache on success; returns cache on failure.
 * Returns { scan_document, document_check, document_compare, ai_lawyer } (number = remaining, null = unlimited).
 */
export async function getFeatureUsage(userId) {
  if (!userId) return { ...DEFAULT_USAGE };
  try {
    const { data, error } = await supabase.rpc('get_feature_usage', { p_user_id: userId });
    if (error) {
      console.warn('getFeatureUsage failed:', error?.message);
      const cached = await getCachedUsage(userId);
      return cached || { ...DEFAULT_USAGE };
    }
    const usage = parseUsageResponse(data);
    await setCachedUsage(userId, usage);
    return usage;
  } catch (e) {
    const cached = await getCachedUsage(userId);
    return cached || { ...DEFAULT_USAGE };
  }
}

/**
 * Decrement remaining usage for a feature (use when user performs scan, check, compare, ai_lawyer).
 */
export async function decrementFeatureUsage(userId, feature) {
  if (!userId || !feature) return;
  await supabase.rpc('decrement_feature_usage', {
    p_user_id: userId,
    p_feature: feature,
  });
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
  const perc = parsePercentFromSubtitle(offer.subtitle);
  if (perc != null) {
    return Math.round(priceCents * (1 - perc / 100));
  }
  return priceCents;
}
