-- =========================
-- AI Lawyer - Subscription Seed Data
-- Run after the main schema (PREMIUM/PRO) migration.
-- For set_updated_at trigger, create first if missing:
--
--   create or replace function public.set_updated_at()
--   returns trigger language plpgsql as $$
--   begin new.updated_at := now(); return new; end; $$;
--

-- ---------- Feature catalog (feature is primary key) ----------
insert into public.feature_catalog (feature, title, description, sort_order) values
  ('document_check', 'Unlimited document checking', 'Scan, detect, and understand', 0),
  ('document_compare', 'Unlimited document comparing', 'Compare and detect differences', 1),
  ('ai_lawyer', 'Smart AI Lawyer assistant', 'Ask anything, anytime', 2)
on conflict (feature) do update set title = excluded.title, description = excluded.description, sort_order = excluded.sort_order;

-- ---------- Plan limits (FREE vs PRO) ----------
insert into public.plan_feature_limits (tier, feature, is_unlimited, monthly_limit) values
  ('free', 'document_check', false, 3),
  ('free', 'document_compare', false, 1),
  ('free', 'ai_lawyer', false, 0),
  ('pro', 'document_check', true, null),
  ('pro', 'document_compare', true, null),
  ('pro', 'ai_lawyer', true, null)
on conflict (tier, feature) do update set is_unlimited = excluded.is_unlimited, monthly_limit = excluded.monthly_limit;

-- ---------- Subscription products (store = 'manual' for in-app display before IAP) ----------
insert into public.subscription_products (store, product_id, tier, interval, display_name, price_cents, currency, trial_days, is_active) values
  ('manual', 'pro_monthly', 'pro', 'monthly', 'AI Lawyer Premium - Monthly', 299, 'USD', 3, true),
  ('manual', 'pro_yearly', 'pro', 'yearly', 'AI Lawyer Premium - Yearly', 2599, 'USD', 3, true)
on conflict (store, product_id) do update set
  display_name = excluded.display_name,
  price_cents = excluded.price_cents,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active;

-- ---------- Limited offer: 50% OFF, per_user, 24h timer ----------
insert into public.subscription_offers (code, title, subtitle, discount_type, discount_percent, mode, duration_seconds, is_active) values
  ('LIMITED_50', 'Limited Offer!', '50% OFF', 'percent', 50, 'per_user', 86400, true)
on conflict (code) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  discount_percent = excluded.discount_percent,
  duration_seconds = excluded.duration_seconds,
  is_active = excluded.is_active;
