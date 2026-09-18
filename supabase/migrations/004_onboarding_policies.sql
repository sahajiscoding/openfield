-- Openfield · self-service onboarding rows
-- Run in Supabase → SQL Editor AFTER 003. Safe to re-run.
--
-- Quiz answers belong to the signed-in user, so they are written AS that
-- user (anon key + session JWT → `authenticated` role) instead of through
-- the service key. Money tables (wallets, ledger, orders) stay service-only.

drop policy if exists "own onboarding rows" on public.onboarding_responses;
create policy "own onboarding rows" on public.onboarding_responses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
