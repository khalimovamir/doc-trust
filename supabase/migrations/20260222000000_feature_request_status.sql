-- Feature requests: moderation (status), visibility, max 2 per user.

-- Status: pending = under review, approved = visible to all, rejected = hidden from public (author still sees)
alter table public.feature_requests
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected'));

-- Visibility: users see approved ideas OR their own (any status)
drop policy if exists "Authenticated can read all feature_requests" on public.feature_requests;
create policy "Users see approved or own feature_requests"
  on public.feature_requests for select to authenticated
  using (status = 'approved' or user_id = auth.uid());

-- Max 2 feature requests per user
create or replace function public.check_feature_request_limit()
returns trigger language plpgsql as $$
declare
  cnt int;
begin
  select count(*) into cnt from public.feature_requests where user_id = new.user_id;
  if cnt >= 2 then
    raise exception 'FEATURE_REQUEST_LIMIT: maximum 2 ideas per user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_feature_requests_limit on public.feature_requests;
create trigger trg_feature_requests_limit
  before insert on public.feature_requests
  for each row execute function public.check_feature_request_limit();

-- RPC: drop first (return type changed), then recreate with status and filter
drop function if exists public.get_feature_requests_with_votes();

create or replace function public.get_feature_requests_with_votes()
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  upvotes int
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    fr.id,
    fr.user_id,
    fr.title,
    fr.description,
    fr.status,
    fr.created_at,
    coalesce((select count(*)::int from public.feature_request_votes v where v.feature_request_id = fr.id), 0) as upvotes
  from public.feature_requests fr
  where fr.status = 'approved' or fr.user_id = auth.uid()
  order by fr.created_at desc;
$$;

revoke all on function public.get_feature_requests_with_votes() from anon;
grant execute on function public.get_feature_requests_with_votes() to authenticated;
