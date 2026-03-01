-- All three functions for user_feature_usage: column "feature" (not feature_key), no used_count.
-- Run this in Supabase SQL Editor to fix get_feature_usage and align ensure/decrement.

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
    values (p_user_id, r.feature, v_period, case when r.is_unlimited then null else r.monthly_limit end)
    on conflict (user_id, feature, period_start) do nothing;
  end loop;
end;
$$;

create or replace function public.decrement_feature_usage(p_user_id uuid, p_feature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := (date_trunc('month', now()))::date;
begin
  if p_user_id is null or p_feature is null then return; end if;
  perform public.ensure_user_feature_usage(p_user_id);
  update user_feature_usage
  set remaining_count = remaining_count - 1
  where user_id = p_user_id
    and feature::text = p_feature
    and period_start = v_period
    and remaining_count is not null
    and remaining_count > 0;
end;
$$;

create or replace function public.get_feature_usage(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return jsonb_build_object('scan_document', null, 'document_check', null, 'document_compare', null, 'ai_lawyer', null);
  end if;
  perform public.ensure_user_feature_usage(p_user_id);
  return (
    select jsonb_build_object(
      'scan_document', (select u.remaining_count from user_feature_usage u where u.user_id = p_user_id and u.feature::text = 'scan_document' and u.period_start = (date_trunc('month', now()))::date),
      'document_check', (select u.remaining_count from user_feature_usage u where u.user_id = p_user_id and u.feature::text = 'document_check' and u.period_start = (date_trunc('month', now()))::date),
      'document_compare', (select u.remaining_count from user_feature_usage u where u.user_id = p_user_id and u.feature::text = 'document_compare' and u.period_start = (date_trunc('month', now()))::date),
      'ai_lawyer', (select u.remaining_count from user_feature_usage u where u.user_id = p_user_id and u.feature::text = 'ai_lawyer' and u.period_start = (date_trunc('month', now()))::date)
    )
  );
end;
$$;
