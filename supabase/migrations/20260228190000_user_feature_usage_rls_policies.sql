-- Ensure RLS policies for user_feature_usage (if missing: e.g. table created without initial migration)
alter table public.user_feature_usage enable row level security;

drop policy if exists "Users can read own feature usage" on public.user_feature_usage;
create policy "Users can read own feature usage"
  on public.user_feature_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own feature usage" on public.user_feature_usage;
create policy "Users can insert own feature usage"
  on public.user_feature_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own feature usage" on public.user_feature_usage;
create policy "Users can update own feature usage"
  on public.user_feature_usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
