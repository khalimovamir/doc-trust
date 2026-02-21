-- =========================
-- DOC TRUST - Chat Tables
-- For persisting AI Lawyer chat history
-- =========================

-- ---------- chats ----------
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chats_user on public.chats(user_id);
create index if not exists idx_chats_updated on public.chats(user_id, updated_at desc);

-- ---------- chat_messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  feedback text check (feedback is null or feedback in ('like', 'dislike'))
);

create index if not exists idx_chat_messages_chat on public.chat_messages(chat_id, created_at);

-- ---------- set_updated_at (если ещё нет) ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_chats_updated_at on public.chats;
create trigger trg_chats_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.chats enable row level security;
alter table public.chats force row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;

drop policy if exists "chats: select own" on public.chats;
create policy "chats: select own" on public.chats for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "chats: insert own" on public.chats;
create policy "chats: insert own" on public.chats for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "chats: update own" on public.chats;
create policy "chats: update own" on public.chats for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "chats: delete own" on public.chats;
create policy "chats: delete own" on public.chats for delete
  to authenticated using (user_id = auth.uid());

-- messages: user can only access messages from their chats
drop policy if exists "chat_messages: select own" on public.chat_messages;
create policy "chat_messages: select own" on public.chat_messages for select
  to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );

drop policy if exists "chat_messages: insert own" on public.chat_messages;
create policy "chat_messages: insert own" on public.chat_messages for insert
  to authenticated with check (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );

-- allow deleting messages only from the user's own chats (for Clear = delete all except first)
drop policy if exists "chat_messages: delete own" on public.chat_messages;
create policy "chat_messages: delete own" on public.chat_messages for delete
  to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );

-- allow updating messages (e.g. feedback like/dislike) only in own chats
drop policy if exists "chat_messages: update own" on public.chat_messages;
create policy "chat_messages: update own" on public.chat_messages for update
  to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );
