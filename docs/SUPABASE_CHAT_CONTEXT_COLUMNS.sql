-- Add context columns for Details → Chat flow
-- Run in Supabase SQL Editor

alter table public.chats
  add column if not exists context_type text,
  add column if not exists context_title text,
  add column if not exists context_data jsonb;

alter table public.chat_messages
  add column if not exists context_ref text;
