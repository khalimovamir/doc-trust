-- RPC: grant (or refresh) manual subscription for a user by product_id.
-- Used when user "subscribes" from Subscription screen (pro_monthly/pro_yearly) or Limited Offer sheet (pro_yearly_offer).
-- Writes to user_subscriptions; RLS allows only SELECT for users, so function is security definer.

create or replace function public.grant_manual_subscription(
  p_user_id uuid,
  p_product_id text,
  p_offer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_id required');
  end if;

  insert into public.user_subscriptions (user_id, tier, status, updated_at)
  values (p_user_id, 'pro', 'active', now())
  on conflict (user_id) do update set
    tier = 'pro',
    status = 'active',
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.grant_manual_subscription(uuid, text, uuid) from anon;
grant execute on function public.grant_manual_subscription(uuid, text, uuid) to authenticated;
