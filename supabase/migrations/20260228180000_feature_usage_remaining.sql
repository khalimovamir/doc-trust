-- user_feature_usage: 4 rows per user per period (scan_document, document_check, document_compare, ai_lawyer)
-- Value = remaining from plan_feature_limits; decrement on use (no more "used_count" increment).

-- Add remaining_count (nullable: null = unlimited)
alter table public.user_feature_usage
  add column if not exists remaining_count int;

-- Backfill remaining_count from plan_feature_limits and used_count for current period
-- Free: remaining = monthly_limit - used_count; Pro: null (unlimited)
update public.user_feature_usage u
set remaining_count = case
  when us.tier = 'pro' then null
  else greatest(0, coalesce(pfl.monthly_limit, 0) - u.used_count)
end
from public.user_subscriptions us, public.plan_feature_limits pfl
where u.user_id = us.user_id
  and pfl.tier = us.tier and pfl.feature = u.feature
  and u.period_start = (date_trunc('month', now()))::date;

-- Users without subscription (free): remaining = limit - used
update public.user_feature_usage u
set remaining_count = greatest(0, coalesce(pfl.monthly_limit, 0) - u.used_count)
from public.plan_feature_limits pfl
where pfl.tier = 'free' and pfl.feature = u.feature
  and u.period_start = (date_trunc('month', now()))::date
  and u.user_id not in (select user_id from public.user_subscriptions)
  and u.remaining_count is null;

-- Ensure 4 rows per user for current period with initial remaining from plan_feature_limits
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

  select coalesce((select s.tier from user_subscriptions s where s.user_id = p_user_id), 'free') into v_tier;

  for r in
    select pfl.feature, pfl.monthly_limit, pfl.is_unlimited
    from plan_feature_limits pfl
    where pfl.tier = v_tier
      and pfl.feature in ('scan_document', 'document_check', 'document_compare', 'ai_lawyer')
  loop
    insert into user_feature_usage (user_id, feature, period_start, used_count, remaining_count)
    values (
      p_user_id,
      r.feature,
      v_period,
      0,
      case when r.is_unlimited then null else r.monthly_limit end
    )
    on conflict (user_id, feature, period_start) do nothing;
  end loop;
end;
$$;

-- Decrement remaining by 1 when user uses a feature (only if not unlimited and remaining > 0)
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
    and feature = p_feature
    and period_start = v_period
    and remaining_count is not null
    and remaining_count > 0;
end;
$$;

-- get_feature_usage: ensure rows exist, then return remaining per feature (remaining_count; null = unlimited)
create or replace function public.get_feature_usage(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return jsonb_build_object(
      'scan_document', null, 'document_check', null,
      'document_compare', null, 'ai_lawyer', null);
  end if;

  perform public.ensure_user_feature_usage(p_user_id);

  return (
    select jsonb_build_object(
      'scan_document', (select u.remaining_count from user_feature_usage u
        where u.user_id = p_user_id and u.feature = 'scan_document'
          and u.period_start = (date_trunc('month', now()))::date),
      'document_check', (select u.remaining_count from user_feature_usage u
        where u.user_id = p_user_id and u.feature = 'document_check'
          and u.period_start = (date_trunc('month', now()))::date),
      'document_compare', (select u.remaining_count from user_feature_usage u
        where u.user_id = p_user_id and u.feature = 'document_compare'
          and u.period_start = (date_trunc('month', now()))::date),
      'ai_lawyer', (select u.remaining_count from user_feature_usage u
        where u.user_id = p_user_id and u.feature = 'ai_lawyer'
          and u.period_start = (date_trunc('month', now()))::date)
    )
  );
end;
$$;

grant execute on function public.ensure_user_feature_usage(uuid) to authenticated;
grant execute on function public.decrement_feature_usage(uuid, text) to authenticated;
