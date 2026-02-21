-- Feature requests from users (Settings -> Feature Request)
-- Anyone authenticated can read; author stored for each request; one vote per user per request.

create table public.feature_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  created_at timestamptz default now()
);

create index idx_feature_requests_created_at on public.feature_requests (created_at desc);

alter table public.feature_requests enable row level security;

create policy "Authenticated can read all feature_requests"
  on public.feature_requests for select to authenticated using (true);

create policy "Users can insert own feature_requests"
  on public.feature_requests for insert to authenticated
  with check (auth.uid() = user_id);

create table public.feature_request_votes (
  feature_request_id uuid not null references public.feature_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (feature_request_id, user_id)
);

create index idx_feature_request_votes_request_id on public.feature_request_votes (feature_request_id);

alter table public.feature_request_votes enable row level security;

create policy "Authenticated can read all feature_request_votes"
  on public.feature_request_votes for select to authenticated using (true);

create policy "Users can insert own vote"
  on public.feature_request_votes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own vote"
  on public.feature_request_votes for delete to authenticated
  using (auth.uid() = user_id);

-- View: feature requests with upvote count for listing
create or replace view public.feature_requests_with_votes as
select
  fr.id,
  fr.user_id,
  fr.title,
  fr.description,
  fr.created_at,
  coalesce((select count(*) from public.feature_request_votes v where v.feature_request_id = fr.id), 0)::int as upvotes
from public.feature_requests fr;

-- RLS: view uses underlying table policies (authenticated read feature_requests)
