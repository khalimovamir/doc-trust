-- Allow anonymous (guest) users to read subscription_products and subscription_offers
-- so that Limited Offer price and offer data load from Supabase for guests.

create policy "Anon read subscription_products"
  on public.subscription_products for select to anon using (true);

create policy "Anon read subscription_offers"
  on public.subscription_offers for select to anon using (true);
