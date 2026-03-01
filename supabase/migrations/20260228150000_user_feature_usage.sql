-- user_feature_usage: track usage for document_compare and ai_lawyer (document_check derived from analyses count)
create table if not exists public.user_feature_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  period_start date not null,
  used_count int not null default 0,
  primary key (user_id, feature, period_start)
);

create index if not exists idx_user_feature_usage_user_period on public.user_feature_usage (user_id, period_start);

alter table public.user_feature_usage enable row level security;

create policy "Users can read own feature usage"
  on public.user_feature_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own feature usage"
  on public.user_feature_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own feature usage"
  on public.user_feature_usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Returns current month usage: document_check (from analyses count), document_compare, ai_lawyer (from user_feature_usage)
create or replace function public.get_feature_usage(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'document_check', coalesce((
      select count(*)::int from analyses a
      join document_versions dv on dv.id = a.document_version_id
      join documents d on d.id = dv.document_id
      where d.owner_id = p_user_id
        and a.created_at >= date_trunc('month', now())
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

-- Increment usage for a feature in the current month (for document_compare, ai_lawyer)
create or replace function public.increment_feature_usage(p_user_id uuid, p_feature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := (date_trunc('month', now()))::date;
begin
  if p_user_id is null or p_feature is null then
    return;
  end if;
  insert into user_feature_usage (user_id, feature, period_start, used_count)
  values (p_user_id, p_feature, v_period, 1)
  on conflict (user_id, feature, period_start)
  do update set used_count = user_feature_usage.used_count + 1;
end;
$$;

grant execute on function public.get_feature_usage(uuid) to authenticated;
grant execute on function public.increment_feature_usage(uuid, text) to authenticated;
