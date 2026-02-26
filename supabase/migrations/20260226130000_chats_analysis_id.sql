-- Link chats to document analysis so we can find existing chat for a document
alter table public.chats
  add column if not exists analysis_id uuid references public.analyses (id) on delete set null;

create index if not exists idx_chats_analysis_id on public.chats (user_id, analysis_id)
  where analysis_id is not null;

comment on column public.chats.analysis_id is 'When set, this chat is tied to this document analysis (from Details).';
