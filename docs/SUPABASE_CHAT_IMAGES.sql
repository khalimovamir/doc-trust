-- =============================================================================
-- AI Lawyer — изображения в чате (chat_messages.image_url + bucket chat-images)
-- 1) Выполни этот SQL в Supabase SQL Editor.
-- 2) Создай bucket в Dashboard: Storage → New bucket → Name: chat-images, Public: true
--    (чтобы getPublicUrl возвращал URL без подписи).
-- =============================================================================

-- 1) Колонка image_url в chat_messages (URL изображения после загрузки в Storage)
alter table public.chat_messages
  add column if not exists image_url text;

-- 2) Политики Storage для bucket "chat-images"
-- Путь файла: {user_id}/{chat_id}/{uuid}.jpg — так RLS по первому сегменту = user_id.
-- Создай bucket в Dashboard: Storage → New bucket → Name: chat-images, Public: true (чтобы URL были доступны без подписи).

-- Разрешить вставку только в свою папку (user_id = auth.uid())
drop policy if exists "chat-images: insert own" on storage.objects;
create policy "chat-images: insert own" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Разрешить чтение своих файлов
drop policy if exists "chat-images: select own" on storage.objects;
create policy "chat-images: select own" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Разрешить удаление своих файлов
drop policy if exists "chat-images: delete own" on storage.objects;
create policy "chat-images: delete own" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
