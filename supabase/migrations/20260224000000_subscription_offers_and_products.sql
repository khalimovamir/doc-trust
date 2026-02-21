-- Subscription offers (full schema like UI) and subscription_products pricing
-- Enums and columns to match subscription_offers table and app (Temporary Discount, 50% OFF, countdown).

-- ============== ENUMS ==============
do $$ begin
  create type public.offer_disc as enum ('percent', 'fixed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_mo as enum ('global', 'per_user');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_inte as enum ('monthly', 'yearly');
exception
  when duplicate_object then null;
end $$;

-- ============== SUBSCRIPTION_OFFERS (add columns if table exists with only id, is_active, created_at) ==============
alter table public.subscription_offers
  add column if not exists code text,
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists discount_type public.offer_disc not null default 'percent',
  add column if not exists discount_perc int2,
  add column if not exists discount_cent int4,
  add column if not exists mode public.offer_mo not null default 'global',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists duration_seco int4,
  add column if not exists applies_to_int public.plan_inte;

create unique index if not exists idx_subscription_offers_code
  on public.subscription_offers (code) where code is not null;

-- ============== SUBSCRIPTION_PRODUCTS (price columns for Subscription screen and offer modal) ==============
alter table public.subscription_products
  add column if not exists price_cents int4,
  add column if not exists currency text default 'USD',
  add column if not exists trial_days int2 default 0;

create unique index if not exists idx_subscription_products_store_interval
  on public.subscription_products (store, interval);

-- ============== USER_OFFER_STATES: set expires_at when inserting (per_user offer timer) ==============
create or replace function public.set_user_offer_expires_at()
returns trigger language plpgsql as $$
declare
  dur int4;
begin
  select o.duration_seco into dur
  from public.subscription_offers o
  where o.id = new.offer_id;
  if dur is not null and dur > 0 then
    new.expires_at := now() + (dur || ' seconds')::interval;
  end if;
  return new;
end;
$$;

drop trigger if exists set_user_offer_expires_at on public.user_offer_states;
create trigger set_user_offer_expires_at
  before insert on public.user_offer_states
  for each row execute function public.set_user_offer_expires_at();

-- ============== FEATURE_CATALOG & PLAN_FEATURE_LIMITS (for offer comparison table) ==============
alter table public.feature_catalog
  add column if not exists feature text,
  add column if not exists title text,
  add column if not exists description text;

alter table public.plan_feature_limits
  add column if not exists tier text,
  add column if not exists feature text,
  add column if not exists is_unlimited boolean default false,
  add column if not exists monthly_limit int4;
