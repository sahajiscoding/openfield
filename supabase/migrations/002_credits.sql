-- Openfield · token billing (credits) + UroPay orders
-- Run in Supabase → SQL Editor AFTER 001. Safe to re-run.

-- Wallets: one row per user. No RLS policies on purpose: anon and
-- authenticated keys see NOTHING; only the service role (server actions,
-- webhook route) touches these tables through the RPCs below.
create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.credit_wallets enable row level security;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create unique index if not exists credit_ledger_ref_uidx
  on public.credit_ledger (ref) where ref is not null;
create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);
alter table public.credit_ledger enable row level security;

create table if not exists public.uropay_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text not null,
  tokens integer not null check (tokens > 0),
  amount numeric not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  uropay_order_id text,
  tenant_ref text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists uropay_orders_provider_uidx
  on public.uropay_orders (uropay_order_id) where uropay_order_id is not null;
create index if not exists uropay_orders_user_created_idx
  on public.uropay_orders (user_id, created_at desc);
alter table public.uropay_orders enable row level security;

-- Webhook replay guard: one row per delivery group, insert-once.
create table if not exists public.uropay_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);
alter table public.uropay_events enable row level security;

-- Atomic spend. SECURITY DEFINER is required (callers have no table
-- rights); locked down with fixed search_path and amount validation.
create or replace function public.spend_credits(
  p_user_id uuid, p_amount integer, p_reason text, p_ref text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;
  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;
  select balance into v_balance
  from public.credit_wallets where user_id = p_user_id for update;
  if v_balance < p_amount then
    raise exception 'insufficient tokens: balance % < cost %', v_balance, p_amount;
  end if;
  update public.credit_wallets
  set balance = balance - p_amount, updated_at = now()
  where user_id = p_user_id;
  insert into public.credit_ledger (user_id, delta, reason, ref)
  values (p_user_id, -p_amount, p_reason, p_ref);
  return v_balance - p_amount;
end;
$$;

create or replace function public.grant_credits(
  p_user_id uuid, p_amount integer, p_reason text, p_ref text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;
  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;
  update public.credit_wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;
  insert into public.credit_ledger (user_id, delta, reason, ref)
  values (p_user_id, p_amount, p_reason, p_ref);
  return v_balance;
end;
$$;
