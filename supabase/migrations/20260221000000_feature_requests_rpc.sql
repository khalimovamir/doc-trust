-- Replace view with RPC so Supabase doesn't show UNRESTRICTED (views can't have RLS).
-- Only authenticated users can call the RPC; data still filtered by base table RLS.

create or replace function public.get_feature_requests_with_votes()
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
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
    fr.created_at,
    coalesce((select count(*)::int from public.feature_request_votes v where v.feature_request_id = fr.id), 0) as upvotes
  from public.feature_requests fr
  order by fr.created_at desc;
$$;

-- Only authenticated users can call this (no anon access)
revoke all on function public.get_feature_requests_with_votes() from anon;
grant execute on function public.get_feature_requests_with_votes() to authenticated;

-- Drop the view so it no longer appears as UNRESTRICTED
drop view if exists public.feature_requests_with_votes;
