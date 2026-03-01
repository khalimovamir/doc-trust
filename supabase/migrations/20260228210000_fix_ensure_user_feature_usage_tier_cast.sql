-- Fix: plan_feature_limits.tier (and feature) may be enum; cast to text for comparison

create or replace function public.ensure_user_feature_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := (date_trunc('month', now()))::date;
  v_tier text;
  r record;
begin
  if p_user_id is null then return; end if;

  select coalesce((select s.tier::text from user_subscriptions s where s.user_id = p_user_id), 'free') into v_tier;

  for r in
    select pfl.feature, pfl.monthly_limit, pfl.is_unlimited
    from plan_feature_limits pfl
    where pfl.tier::text = v_tier
      and pfl.feature::text in ('scan_document', 'document_check', 'document_compare', 'ai_lawyer')
  loop
    insert into user_feature_usage (user_id, feature, period_start, remaining_count)
    values (
      p_user_id,
      r.feature,
      v_period,
      case when r.is_unlimited then null else r.monthly_limit end
    )
    on conflict (user_id, feature, period_start) do nothing;
  end loop;
end;
$$;
