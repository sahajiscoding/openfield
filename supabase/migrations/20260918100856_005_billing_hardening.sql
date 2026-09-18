-- Openfield · billing hardening + self-service checkout RPCs
-- Run in Supabase → SQL Editor AFTER 002 (works whether or not either 003
-- file was applied). Safe to re-run: every statement below is idempotent
-- (IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE / convergent
-- REVOKE-then-GRANT). Wrapped in one transaction for atomicity.
--
-- WHAT THIS FIXES
-- 1) Checkout no longer depends on direct service-role table writes. The buy
--    flow moves into SECURITY DEFINER RPCs that run as the table owner and
--    authorize with auth.uid(), callable by the signed-in user over the anon
--    key. A 42501 on INSERT/UPDATE of uropay_orders can no longer break
--    purchases at the application layer.
-- 2) Defensive NO FORCE ROW LEVEL SECURITY on every money table. FORCE RLS
--    is the one database state that makes even a valid, honored service_role
--    credential fail with 42501 on tables that carry no policies. None of the
--    earlier repo migrations set it, but live databases drift (dashboard
--    toggles, advisor one-click fixes, other tooling) — this clears it
--    deterministically. It is also load-bearing for the RPCs below: under
--    FORCE RLS even SECURITY DEFINER bodies (running as the table owner)
--    are policy-checked and would be denied.
-- 3) Closes the advisor-flagged hole: spend_credits/grant_credits were left
--    EXECUTE TO PUBLIC (the Postgres default on CREATE FUNCTION), so any
--    anonymous browser client could mint unlimited credits for itself
--    (grant_credits with its own user id) or burn another user's balance
--    (spend_credits with a victim's user id). After this file only
--    service_role may execute them.
-- 4) Self-sufficiency: re-applies the submitted_utr column and the widened
--    status check, so the schema converges even if 003_uropay_qr.sql was
--    never applied (the repo contains TWO 003 files — see note below).
--
-- MIGRATION-NUMBER NOTE: the repo contains 003_onboarding.sql AND
-- 003_uropay_qr.sql. Do NOT rename either file if it was already applied:
-- ordered runners (Supabase CLI) record applied filenames, and renames
-- require `supabase migration repair` to resync history. Manual SQL-Editor
-- runs are unaffected by the duplicate prefix. This file uses the next free
-- prefix (005), so it sorts after 004_onboarding_policies.sql in every
-- workflow. No data is touched (no backfill needed: no existing rows carry
-- the new states, and tenant_ref uniqueness already holds).
--
-- SECURITY MODEL AFTER THIS FILE
-- - anon / authenticated: NO table rights on the four money tables, NO
--   EXECUTE on spend_credits/grant_credits, EXECUTE ONLY on the five
--   self-service RPCs (which bind every write to auth.uid()).
-- - service_role: EXECUTE on spend/grant (generation spend, refunds,
--   webhook/poll crediting) + EXECUTE on the self RPCs + direct table
--   access for reads and webhook/poll writes. No secrets are stored here.

BEGIN;

-- 0) Converge the QR schema even if 003_uropay_qr.sql was skipped.
ALTER TABLE public.uropay_orders
  ADD COLUMN IF NOT EXISTS submitted_utr text;

ALTER TABLE public.uropay_orders
  DROP CONSTRAINT IF EXISTS uropay_orders_status_check;

ALTER TABLE public.uropay_orders
  ADD CONSTRAINT uropay_orders_status_check
  CHECK (status IN ('pending', 'utr_submitted', 'review', 'paid', 'failed', 'expired', 'cancelled'));

CREATE INDEX IF NOT EXISTS uropay_orders_utr_idx
  ON public.uropay_orders (submitted_utr) WHERE submitted_utr IS NOT NULL;

-- 1) RLS on everywhere; FORCE RLS off everywhere (FORCE would 42501 even
--    service_role and even SECURITY DEFINER bodies on policy-less tables).
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uropay_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uropay_events  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_wallets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uropay_orders  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uropay_events  NO FORCE ROW LEVEL SECURITY;

-- 2) No direct client access to money tables. (RLS with zero policies already
--    denies anon/authenticated; explicit REVOKEs keep that true even if a
--    permissive policy is ever added by mistake. Nothing in the app reads or
--    writes these tables as anon/authenticated — all legacy access is
--    service-role, all new access is SECURITY DEFINER.)
REVOKE ALL ON TABLE public.credit_wallets FROM anon, authenticated;
REVOKE ALL ON TABLE public.credit_ledger  FROM anon, authenticated;
REVOKE ALL ON TABLE public.uropay_orders  FROM anon, authenticated;
REVOKE ALL ON TABLE public.uropay_events   FROM anon, authenticated;

-- 3) Money-moving RPCs: service_role ONLY. (CREATE grants EXECUTE TO PUBLIC
--    by default and 002 never revoked it — that is the advisor finding and
--    the unlimited-mint hole. REVOKE FROM PUBLIC also strips anon,
--    authenticated, and service_role itself, so re-grant service_role.)
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text, text) TO service_role;

-- 4) Self-service checkout RPCs. Every write is bound to auth.uid() — the
--    platform-verified JWT subject, never a client-supplied user id — so a
--    caller can only ever create, read, attach, submit, or cancel ITS OWN
--    order row. Canonical pack values (tokens/amount) are enforced by the
--    server action (packs.ts allowlist); the RPCs additionally reject
--    non-positive values and malformed references.

CREATE OR REPLACE FUNCTION public.create_checkout_session(
  p_pack_id text, p_tokens integer, p_amount numeric, p_tenant_ref text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_pack_id IS NULL OR btrim(p_pack_id) = '' THEN
    RAISE EXCEPTION 'invalid pack';
  END IF;
  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'invalid tokens';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  IF p_tenant_ref IS NULL OR p_tenant_ref !~ '^of-[a-z0-9-]{1,80}$' THEN
    RAISE EXCEPTION 'invalid order reference';
  END IF;
  INSERT INTO public.uropay_orders (user_id, pack_id, tokens, amount, currency, status, tenant_ref)
  VALUES (auth.uid(), btrim(p_pack_id), p_tokens, p_amount, 'INR', 'pending', p_tenant_ref)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_provider_order(
  p_tenant_ref text, p_provider_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_provider_id IS NULL OR btrim(p_provider_id) = '' THEN
    RAISE EXCEPTION 'invalid provider order';
  END IF;
  UPDATE public.uropay_orders
  SET uropay_order_id = btrim(p_provider_id)
  WHERE tenant_ref = p_tenant_ref
    AND user_id = auth.uid()
    AND status = 'pending'
    AND uropay_order_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found or not attachable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_utr(
  p_tenant_ref text, p_utr text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_utr text := btrim(COALESCE(p_utr, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF v_utr !~ '^[A-Za-z0-9]{6,22}$' THEN
    RAISE EXCEPTION 'invalid UTR';
  END IF;
  UPDATE public.uropay_orders
  SET submitted_utr = v_utr, status = 'utr_submitted'
  WHERE tenant_ref = p_tenant_ref
    AND user_id = auth.uid()
    AND status IN ('pending', 'utr_submitted', 'review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found or not updatable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_order(
  p_tenant_ref text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  UPDATE public.uropay_orders
  SET status = 'cancelled'
  WHERE tenant_ref = p_tenant_ref
    AND user_id = auth.uid()
    AND status IN ('pending', 'utr_submitted', 'review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found or not cancellable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_order(
  p_tenant_ref text
)
RETURNS TABLE (
  id uuid, pack_id text, tokens integer, amount numeric, currency text,
  status text, uropay_order_id text, tenant_ref text, submitted_utr text,
  created_at timestamptz, paid_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o.id, o.pack_id, o.tokens, o.amount, o.currency, o.status,
         o.uropay_order_id, o.tenant_ref, o.submitted_utr, o.created_at, o.paid_at
  FROM public.uropay_orders AS o
  WHERE o.tenant_ref = p_tenant_ref
    AND o.user_id = auth.uid();
END;
$$;

-- 5) Least-privilege EXECUTE, converged on every run. (CREATE OR REPLACE
--    preserves pre-existing grants, so REVOKE-then-GRANT each time; otherwise
--    a rerun after a manual GRANT TO PUBLIC would silently keep the hole.)
REVOKE ALL ON FUNCTION public.create_checkout_session(text, integer, numeric, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_provider_order(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_utr(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_my_order(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_order(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_checkout_session(text, integer, numeric, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_provider_order(text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_utr(text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_order(text)
  TO authenticated, service_role;

COMMIT;
