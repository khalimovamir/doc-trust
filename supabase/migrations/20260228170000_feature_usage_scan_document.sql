-- Add scan_document to get_feature_usage (Scanner uses scan_document limit 1, recorded in user_feature_usage)
create or replace function public.get_feature_usage(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'scan_document', coalesce((
      select u.used_count from user_feature_usage u
      where u.user_id = p_user_id and u.feature = 'scan_document'
        and u.period_start = (date_trunc('month', now()))::date
    ), 0),
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
