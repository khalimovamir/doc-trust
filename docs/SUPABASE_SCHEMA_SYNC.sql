-- =============================================================================
-- AI Lawyer — синхронизация схемы Supabase с приложением
-- Запускай в Supabase SQL Editor после миграций, если что-то не совпадает.
-- Идемпотентно: можно запускать несколько раз.
-- =============================================================================

-- 1) analyses.contract_amount — в приложении передаётся строка (например "$1,200 per month").
--    Если колонка была jsonb, меняем на text (один раз).
do $$
declare
  col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'analyses' and column_name = 'contract_amount';
  if col_type = 'jsonb' then
    execute 'alter table public.analyses alter column contract_amount type text using (case when contract_amount is null then null when jsonb_typeof(contract_amount) = ''string'' then contract_amount #>> ''{}'' else contract_amount::text end)';
  end if;
end $$;

-- 2) Убедиться, что в analyses есть все нужные колонки (если таблица уже есть)
alter table public.analyses add column if not exists summary text;
alter table public.analyses add column if not exists document_type text;
alter table public.analyses add column if not exists parties jsonb default '[]';
alter table public.analyses add column if not exists contract_amount text;
alter table public.analyses add column if not exists payments jsonb default '[]';
alter table public.analyses add column if not exists key_dates jsonb default '[]';

-- 3) Индекс для быстрой выборки анализов по времени (History)
create index if not exists idx_analyses_created_at
  on public.analyses (created_at desc);

-- 4) Триггер updated_at для chats (если ещё нет)
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_chats_updated_at on public.chats;
create trigger trg_chats_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();

-- 5) document_versions: ограничить source допустимыми значениями (опционально)
-- Приложение передаёт только 'paste' | 'upload' | 'scan'. Проверку можно добавить:
-- alter table public.document_versions add constraint chk_source
--   check (source in ('paste', 'upload', 'scan'));
-- Раскомментируй, если нужна жёсткая проверка на уровне БД.

-- 6) chat_messages: политика DELETE (для кнопки Clear — удаление всех сообщений кроме первого)
drop policy if exists "chat_messages: delete own" on public.chat_messages;
create policy "chat_messages: delete own" on public.chat_messages for delete
  to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );

-- 7) chat_messages: колонка feedback (like/dislike) и политика UPDATE
alter table public.chat_messages
  add column if not exists feedback text check (feedback is null or feedback in ('like', 'dislike'));

drop policy if exists "chat_messages: update own" on public.chat_messages;
create policy "chat_messages: update own" on public.chat_messages for update
  to authenticated using (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
  );

-- 8) chat_messages: колонка image_url (URL изображения из Storage bucket chat-images)
alter table public.chat_messages
  add column if not exists image_url text;

-- 9) Feature Request (Settings -> Feature Request): таблицы и view
--    Если ещё не применял миграцию — выполни один раз: supabase/migrations/20260216000000_feature_requests.sql

-- Готово. Схема согласована с приложением.
