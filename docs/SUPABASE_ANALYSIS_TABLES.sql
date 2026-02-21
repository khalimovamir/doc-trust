-- =========================
-- AI Lawyer - analysis_issues & analysis_guidance_items
-- Run in Supabase SQL Editor if tables don't exist or need schema
-- =========================

-- ---------- analysis_issues (Red Flags) ----------
create table if not exists public.analysis_issues (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  severity text not null default 'tip',
  section text,
  title text not null default '',
  why_matters text,
  what_to_do text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_issues_analysis on public.analysis_issues(analysis_id);

-- ---------- analysis_guidance_items ----------
create table if not exists public.analysis_guidance_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  priority text not null default 'medium',
  section text,
  text text not null default '',
  is_done boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_guidance_analysis on public.analysis_guidance_items(analysis_id);

-- ---------- RLS ----------
alter table public.analysis_issues enable row level security;
alter table public.analysis_guidance_items enable row level security;

-- Users can manage issues/guidance for analyses they own (via document -> document_version -> analysis)
drop policy if exists "analysis_issues: insert via analysis owner" on public.analysis_issues;
create policy "analysis_issues: insert via analysis owner" on public.analysis_issues for insert
  to authenticated with check (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "analysis_issues: select via analysis owner" on public.analysis_issues;
create policy "analysis_issues: select via analysis owner" on public.analysis_issues for select
  to authenticated using (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "analysis_guidance_items: insert via analysis owner" on public.analysis_guidance_items;
create policy "analysis_guidance_items: insert via analysis owner" on public.analysis_guidance_items for insert
  to authenticated with check (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "analysis_guidance_items: select via analysis owner" on public.analysis_guidance_items;
create policy "analysis_guidance_items: select via analysis owner" on public.analysis_guidance_items for select
  to authenticated using (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "analysis_guidance_items: update via analysis owner" on public.analysis_guidance_items;
create policy "analysis_guidance_items: update via analysis owner" on public.analysis_guidance_items for update
  to authenticated using (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_id and d.owner_id = auth.uid()
    )
  );
