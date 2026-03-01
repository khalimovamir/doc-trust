-- document_check usage: store in user_feature_usage and increment when user opens analysis result (not only on save)
-- So get_feature_usage returns document_check from user_feature_usage like other features

-- One-time backfill: set document_check usage from current month analyses count
insert into public.user_feature_usage (user_id, feature, period_start, used_count)
select d.owner_id, 'document_check', (date_trunc('month', now()))::date, count(*)::int
from public.analyses a
join public.document_versions dv on dv.id = a.document_version_id
join public.documents d on d.id = dv.document_id
where a.created_at >= date_trunc('month', now())
group by d.owner_id
on conflict (user_id, feature, period_start)
do update set used_count = greatest(public.user_feature_usage.used_count, excluded.used_count);

create or replace function public.get_feature_usage(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'document_check', coalesce((
      select u.used_count from user_feature_usage u
      where u.user_id = p_user_id and u.feature = 'document_check'
        and u.period_start = (date_trunc('month', now()))::date
    ), 0),
    'document_compare', coalesce((
      select u.used_count from user_feature_usage u
      where u.user_id = p_user_id and u.feature = 'document_compare'
        and u.period_start = (date_trunc('month', now()))::date
    ), 0),
    'ai_lawyer', coalesce((
      select u.used_count from user_feature_usage u
      where u.user_id = p_user_id and u.feature = 'ai_lawyer'
        and u.period_start = (date_trunc('month', now()))::date
    ), 0)
  );
$$;
