import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side wallet/ledger/order/onboarding writes.
 * RLS exposes none of those tables, so only this key can touch them.
 */

export type ServiceKeyKind = "secret" | "legacy-jwt" | "publishable" | "missing" | "unknown";

function rawServiceKey(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  // Pasted keys often carry whitespace or wrapping quotes — strip both.
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

/** What KIND of value is deployed — without ever revealing the value. */
export function serviceKeyKind(): ServiceKeyKind {
  const key = rawServiceKey();
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("eyJ")) return "legacy-jwt";
  return "unknown";
}

let admin: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const service = rawServiceKey();
  if (!url || !service) {
    throw new Error("Billing is not configured — set SUPABASE_SERVICE_ROLE_KEY.");
  }
  admin ??= createClient(url, service, { auth: { persistSession: false } });
  return admin;
}

/**
 * Leak-free diagnosis for permission failures. Safe to show: it names the
 * KIND of deployed key, never any part of the value.
 */
export function permissionDiagnosis(): string {
  switch (serviceKeyKind()) {
    case "publishable":
      return "Server misconfigured: the service slot holds a publishable key (sb_publishable_), which cannot bypass row security. Paste the sb_secret_ key into SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.";
    case "missing":
      return "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is empty in Vercel. Add it and redeploy.";
    case "unknown":
      return "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY doesn't look like a Supabase secret — re-paste the full sb_secret_ value in Vercel and redeploy.";
    default:
      return "Database refused the write — confirm the sb_secret_ key belongs to THIS Supabase project and redeploy.";
  }
}
