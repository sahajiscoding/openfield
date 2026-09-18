import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side wallet/ledger/order/onboarding writes.
 * RLS exposes none of those tables, so only this key can touch them.
 */

export type ServiceKeyKind =
  | "secret"
  | "legacy-service"
  | "legacy-anon"
  | "publishable"
  | "missing"
  | "unknown";

function rawServiceKey(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  // Pasted keys often carry whitespace or wrapping quotes — strip both.
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

/** Read the unsigned role claim of a legacy JWT (payload is not secret). */
function legacyRole(key: string): string | null {
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { role?: unknown };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/** What KIND of value is deployed — without ever revealing the value. */
export function serviceKeyKind(): ServiceKeyKind {
  const key = rawServiceKey();
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("eyJ")) {
    const role = legacyRole(key);
    if (role === "service_role") return "legacy-service";
    if (role === "anon") return "legacy-anon";
    return "unknown";
  }
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
    case "legacy-anon":
      return "Server misconfigured: the service slot holds a legacy anon key (role \"anon\"), which cannot bypass row security. Paste the sb_secret_ key — or the legacy service_role key — into SUPABASE_SERVICE_ROLE_KEY in Vercel and redeploy.";
    case "legacy-service":
    case "secret":
      // 42501 with a secret-shaped key means the gateway didn't recognize the
      // value (typo, rotation, wrong project) and ran the request as anonymous,
      // which RLS then blocked. The shape check can't catch that — only a
      // fresh copy from the dashboard can.
      return "Write blocked (ref 42501): the deployed secret isn't recognized, so the request ran as anonymous. In Supabase → API Keys confirm the key still exists, Copy it with the button (don't retype), replace SUPABASE_SERVICE_ROLE_KEY in Vercel on all environments, and redeploy. Last resort: use the legacy service_role JWT instead.";
  }
}
