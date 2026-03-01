-- Backfill user_feature_usage: create 4 rows per user for current period (for all existing users)
-- So existing users get limits without waiting for first get_feature_usage call in the app.

insert into public.user_feature_usage (user_id, feature, period_start, used_count, remaining_count)
select p.id, pfl.feature, (date_trunc('month', now()))::date, 0,
  case when pfl.is_unlimited then null else pfl.monthly_limit end
from public.profiles p
join public.plan_feature_limits pfl
  on pfl.tier = coalesce((select s.tier from public.user_subscriptions s where s.user_id = p.id), 'free')
  and pfl.feature in ('scan_document', 'document_check', 'document_compare', 'ai_lawyer')
on conflict (user_id, feature, period_start) do nothing;
