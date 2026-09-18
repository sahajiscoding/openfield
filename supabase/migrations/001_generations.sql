-- Openfield · Supabase schema
-- Run in Supabase → SQL Editor. Safe to re-run (IF NOT EXISTS).

-- Optional cloud mirror of generations. The studio works without it
-- (IndexedDB is primary); server writes best-effort and never block UI.
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'higgsfield' check (provider in ('higgsfield', 'muapi')),
  model text not null,
  prompt text not null default '',
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  urls text[] not null default '{}',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

drop policy if exists "own rows" on public.generations;
create policy "own rows" on public.generations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

-- Upload bucket for start/end/reference frames (fallback when Vercel Blob
-- token is absent). Public read so generation APIs can fetch the URLs.
insert into storage.buckets (id, name, public)
values ('openfield-uploads', 'openfield-uploads', true)
on conflict (id) do nothing;

drop policy if exists "authenticated upload" on storage.objects;
create policy "authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'openfield-uploads');

drop policy if exists "public read uploads" on storage.objects;
create policy "public read uploads" on storage.objects
  for select using (bucket_id = 'openfield-uploads');

drop policy if exists "own deletes" on storage.objects;
create policy "own deletes" on storage.objects
  for delete to authenticated using (bucket_id = 'openfield-uploads');
