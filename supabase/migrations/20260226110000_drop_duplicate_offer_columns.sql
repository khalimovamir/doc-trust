-- Remove duplicate columns from subscription_offers.
-- Keep: discount_perc, discount_cent, duration_seco, applies_to_int (used in app and triggers).
-- Drop: discount_percent, discount_cents, duration_seconds, applies_to_interval (duplicates).

alter table public.subscription_offers
  drop column if exists discount_percent,
  drop column if exists discount_cents,
  drop column if exists duration_seconds,
  drop column if exists applies_to_interval;
