-- Openfield · onboarding quiz responses
-- Run in Supabase → SQL Editor AFTER 002. Safe to re-run.

-- One row per user. No RLS policies on purpose: anon and authenticated
-- keys see NOTHING; only the service role (server actions) reads/writes.
create table if not exists public.onboarding_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  use_case text not null,
  referral_source text not null,
  experience text not null,
  dob date,
  skipped boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.onboarding_responses enable row level security;
