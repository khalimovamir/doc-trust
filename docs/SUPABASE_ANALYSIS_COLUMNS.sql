-- Add columns to analyses for full API result (summary, document_type, etc.)
-- Run in Supabase SQL Editor
alter table public.analyses add column if not exists summary text;
alter table public.analyses add column if not exists document_type text;
alter table public.analyses add column if not exists parties jsonb default '[]';
alter table public.analyses add column if not exists contract_amount text;
alter table public.analyses add column if not exists payments jsonb default '[]';
alter table public.analyses add column if not exists key_dates jsonb default '[]';
