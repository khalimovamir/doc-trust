-- Feature requests: use PostgreSQL enum for status instead of text + check.

-- Create enum type
do $$ begin
  create type public.feature_request_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null; -- type already exists
end $$;

-- Drop policy that depends on status (must drop before altering column type)
drop policy if exists "Users see approved or own feature_requests" on public.feature_requests;

-- Drop default and check before changing type (text default can't auto-cast to enum)
alter table public.feature_requests
  alter column status drop default;

alter table public.feature_requests
  drop constraint if exists feature_requests_status_check;

-- Change column type from text to enum
alter table public.feature_requests
  alter column status type public.feature_request_status
  using status::text::public.feature_request_status;

-- Restore default for new rows
alter table public.feature_requests
  alter column status set default 'pending'::public.feature_request_status;

-- Recreate RLS policy (same rule, status now enum)
create policy "Users see approved or own feature_requests"
  on public.feature_requests for select to authenticated
  using (status = 'approved'::public.feature_request_status or user_id = auth.uid());
