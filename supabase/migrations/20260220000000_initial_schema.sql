-- AI Lawyer – initial schema: profiles, chats, documents/analyses, subscriptions
-- RLS: all user-scoped tables restricted to auth.uid()

-- Extensions
create extension if not exists "uuid-ossp";

-- ============== PROFILES ==============
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  age int,
  avatar_url text,
  preferred_language text default 'en',
  jurisdiction_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_id on public.profiles (id);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: create profile on signup (full_name left empty; user can set it later in Edit Profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, null);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============== CHATS ==============
create table public.chats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  context_type text,
  context_title text,
  context_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chats_user_id on public.chats (user_id);
create index idx_chats_updated_at on public.chats (user_id, updated_at desc);

alter table public.chats enable row level security;

create policy "Users can manage own chats"
  on public.chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null,
  content text not null,
  context_ref text,
  created_at timestamptz default now()
);

create index idx_chat_messages_chat_id on public.chat_messages (chat_id);

alter table public.chat_messages enable row level security;

create policy "Users can manage messages of own chats"
  on public.chat_messages for all
  using (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = auth.uid()
    )
  );

-- ============== DOCUMENTS & ANALYSES ==============
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  doc_type text not null default 'other',
  created_at timestamptz default now()
);

create index idx_documents_owner_id on public.documents (owner_id);

alter table public.documents enable row level security;

create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents (id) on delete cascade,
  source text not null,
  text_content text not null,
  created_at timestamptz default now()
);

create index idx_document_versions_document_id on public.document_versions (document_id);

alter table public.document_versions enable row level security;

create policy "Users can manage versions of own documents"
  on public.document_versions for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id and d.owner_id = auth.uid()
    )
  );

create table public.analyses (
  id uuid primary key default uuid_generate_v4(),
  document_version_id uuid not null references public.document_versions (id) on delete cascade,
  score int,
  critical_count int default 0,
  warning_count int default 0,
  tip_count int default 0,
  risks_count int default 0,
  tips_count int default 0,
  summary text,
  document_type text,
  parties jsonb default '[]',
  contract_amount jsonb,
  payments jsonb default '[]',
  key_dates jsonb default '[]',
  created_at timestamptz default now()
);

create index idx_analyses_document_version_id on public.analyses (document_version_id);

alter table public.analyses enable row level security;

create policy "Users can read analyses of own documents"
  on public.analyses for all
  using (
    exists (
      select 1 from public.document_versions dv
      join public.documents d on d.id = dv.document_id
      where dv.id = analyses.document_version_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.document_versions dv
      join public.documents d on d.id = dv.document_id
      where dv.id = analyses.document_version_id and d.owner_id = auth.uid()
    )
  );

create table public.analysis_issues (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  severity text not null,
  section text,
  title text not null,
  why_matters text,
  what_to_do text,
  order_index int not null default 0,
  created_at timestamptz default now()
);

create index idx_analysis_issues_analysis_id on public.analysis_issues (analysis_id);

alter table public.analysis_issues enable row level security;

create policy "Users can manage issues of own analyses"
  on public.analysis_issues for all
  using (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_issues.analysis_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_issues.analysis_id and d.owner_id = auth.uid()
    )
  );

create table public.analysis_guidance_items (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  priority text not null default 'medium',
  section text,
  text text not null,
  is_done boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz default now()
);

create index idx_analysis_guidance_items_analysis_id on public.analysis_guidance_items (analysis_id);

alter table public.analysis_guidance_items enable row level security;

create policy "Users can manage guidance of own analyses"
  on public.analysis_guidance_items for all
  using (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_guidance_items.analysis_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.analyses a
      join public.document_versions dv on dv.id = a.document_version_id
      join public.documents d on d.id = dv.document_id
      where a.id = analysis_guidance_items.analysis_id and d.owner_id = auth.uid()
    )
  );

-- ============== SUBSCRIPTIONS (read-only from app; writes via backend/service_role) ==============
create table public.subscription_products (
  id uuid primary key default uuid_generate_v4(),
  store text not null,
  is_active boolean not null default true,
  interval text,
  created_at timestamptz default now()
);

create table public.feature_catalog (
  id uuid primary key default uuid_generate_v4(),
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table public.plan_feature_limits (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now()
);

create table public.subscription_offers (
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null,
  status text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_offer_states (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null references public.subscription_offers (id) on delete cascade,
  dismissed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, offer_id)
);

create index idx_user_offer_states_user_offer on public.user_offer_states (user_id, offer_id);

-- RLS: users read own subscription and offer states; subscription tables are readable by all authenticated
alter table public.subscription_products enable row level security;
alter table public.feature_catalog enable row level security;
alter table public.plan_feature_limits enable row level security;
alter table public.subscription_offers enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_offer_states enable row level security;

create policy "Authenticated read subscription_products"
  on public.subscription_products for select to authenticated using (true);

create policy "Authenticated read feature_catalog"
  on public.feature_catalog for select to authenticated using (true);

create policy "Authenticated read plan_feature_limits"
  on public.plan_feature_limits for select to authenticated using (true);

create policy "Authenticated read subscription_offers"
  on public.subscription_offers for select to authenticated using (true);

create policy "Users read own user_subscriptions"
  on public.user_subscriptions for select using (auth.uid() = user_id);

create policy "Users read and insert/update own user_offer_states"
  on public.user_offer_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============== STORAGE: avatars ==============
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read avatars"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
