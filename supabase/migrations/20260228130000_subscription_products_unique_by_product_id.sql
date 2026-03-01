-- Allow multiple products per (store, interval), e.g. pro_yearly and pro_yearly_offer both manual+yearly.
-- Uniqueness by (store, product_id) so the same product_id is not duplicated per store.

drop index if exists public.idx_subscription_products_store_interval;

create unique index if not exists idx_subscription_products_store_product_id
  on public.subscription_products (store, product_id);
