import { createClient as createUserClient } from "@/lib/supabase/server";
import { permissionDiagnosis, serviceClient, serviceKeyKind } from "@/lib/supabase/admin";

/**
 * Wallet access — two lanes:
 *
 * 1) SERVICE lane (service-role client): balance reads, spend/grant RPCs,
 *    order lookups, webhook + poll writes. Money MOVEMENT still requires a
 *    honored service credential.
 *
 * 2) SELF lane (signed-in user's own JWT via the anon key): checkout record,
 *    provider-id attach, UTR submit, cancel, and own-order read. These call
 *    the SECURITY DEFINER RPCs from migration 005, which bind every write to
 *    auth.uid() — so the buy flow no longer needs direct table rights and a
 *    42501 on uropay_orders cannot break purchases. Never import this module
 *    client-side (server actions / route handlers only).
 */

function adminClient() {
  return serviceClient();
}

/** Permission-shaped failures name the deployed key KIND, never its value. */
function billingPermissionError(): Error {
  // Server logs are owner-only: key KIND (not value) is safe to record here.
  console.error("[billing] permission failure", { keyKind: serviceKeyKind() });
  return new Error(permissionDiagnosis());
}

function isPermissionFailure(error: { code?: string; message: string }): boolean {
  return (
    error.code === "42501" ||
    /permission denied|row-level|policy[^a-z]|rls/i.test(error.message)
  );
}

function isMissingRelation(error: { code?: string; message: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the table/i.test(error.message)
  );
}

function isMissingFunction(error: { code?: string; message: string }): boolean {
  return (
    error.code === "PGRST202" ||
    /could not find the function/i.test(error.message)
  );
}

const MIGRATION_005_HINT =
  "Database function missing — run supabase/migrations/005_billing_hardening.sql in Supabase SQL Editor, then retry.";

/** Call a self-service RPC as the signed-in user (auth.uid()-bound, 005). */
async function userRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    if (isMissingFunction(error)) throw new Error(MIGRATION_005_HINT);
    if (isMissingRelation(error)) {
      throw new Error("Database table missing — run migrations 002 and 005 in Supabase SQL Editor, then retry.");
    }
    // Remaining messages are our own RAISE strings (no secrets in them).
    throw new Error(error.message.slice(0, 160));
  }
  return data as T;
}

export async function getTokenBalance(userId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not read token balance.");
  }
  return data?.balance ?? 0;
}

/** Atomically spend; throws "Insufficient tokens" when the wallet is short. */
export async function spendTokens(
  userId: string,
  amount: number,
  reason: string,
  ref: string | null,
): Promise<number> {
  const { data, error } = await adminClient().rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref,
  });
  if (error) {
    if (error.message.includes("insufficient")) throw new Error("Insufficient tokens — top up to keep generating.");
    if (isPermissionFailure(error)) throw billingPermissionError();
    if (isMissingFunction(error)) throw new Error(MIGRATION_005_HINT);
    throw new Error("Billing error — try again.");
  }
  return data as number;
}

/** Atomically grant (top-ups, refunds). Refunds reuse spend refs safely. */
export async function grantTokens(
  userId: string,
  amount: number,
  reason: string,
  ref: string | null,
): Promise<number> {
  const { data, error } = await adminClient().rpc("grant_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref,
  });
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    if (isMissingFunction(error)) throw new Error(MIGRATION_005_HINT);
    throw new Error("Billing error — contact support with your order id.");
  }
  return data as number;
}

export type TokenOrder = {
  id: string;
  pack_id: string;
  tokens: number;
  amount: number;
  currency: string;
  status: string;
  uropay_order_id: string | null;
  tenant_ref: string;
  submitted_utr: string | null;
  created_at: string;
};

export async function getMyOrders(userId: string, limit = 10): Promise<TokenOrder[]> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,submitted_utr,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not load orders.");
  }
  return (data ?? []) as TokenOrder[];
}

export type OrderRow = TokenOrder & { user_id: string; paid_at: string | null };

/**
 * Legacy service-lane checkout record. Prefer createCheckoutSessionSelf for
 * new flows (user JWT, no direct table rights required).
 */
export async function createPendingOrder(row: {
  userId: string;
  packId: string;
  tokens: number;
  amount: number;
  currency: string;
  tenantRef: string;
}): Promise<void> {
  const { error } = await adminClient().from("uropay_orders").insert({
    user_id: row.userId,
    pack_id: row.packId,
    tokens: row.tokens,
    amount: row.amount,
    currency: row.currency,
    status: "pending",
    tenant_ref: row.tenantRef,
  });
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    // Name the cause so "Could not start checkout" is actionable: missing
    // migration ("relation does not exist") vs RLS vs constraint. No secrets.
    const code = (error as { code?: string }).code ?? "db";
    throw new Error(`Could not start checkout (${code}: ${error.message.slice(0, 160)}).`);
  }
}

/** Self-lane checkout record: order row owned by auth.uid(), no table rights needed. */
export async function createCheckoutSessionSelf(row: {
  packId: string;
  tokens: number;
  amount: number;
  tenantRef: string;
}): Promise<string> {
  const id = await userRpc<string>("create_checkout_session", {
    p_pack_id: row.packId,
    p_tokens: row.tokens,
    p_amount: row.amount,
    p_tenant_ref: row.tenantRef,
  });
  return id;
}

/** Self-lane provider-id attach (ownership + pending + unset enforced in SQL). */
export async function attachProviderOrderSelf(tenantRef: string, uropayOrderId: string): Promise<void> {
  try {
    await userRpc<null>("attach_provider_order", {
      p_tenant_ref: tenantRef,
      p_provider_id: uropayOrderId,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (
      message.includes("Server misconfigured") ||
      message.includes("Write blocked") ||
      message.includes("005_billing_hardening") ||
      message.includes("Sign in")
    ) {
      throw caught;
    }
    throw new Error("Could not link payment order.");
  }
}

/** Self-lane UTR submit (ownership + updatable-status enforced in SQL). */
export async function submitUtrSelf(tenantRef: string, utr: string): Promise<void> {
  await userRpc<null>("submit_utr", { p_tenant_ref: tenantRef, p_utr: utr });
}

/** Self-lane cancel (best-effort in failure paths — not-found is swallowed by callers). */
export async function cancelMyOrderSelf(tenantRef: string): Promise<void> {
  await userRpc<null>("cancel_my_order", { p_tenant_ref: tenantRef });
}

/** Self-lane own-order read (row is pre-filtered to auth.uid() inside SQL). */
export async function getMyOrderSelf(tenantRef: string): Promise<OrderRow | null> {
  const { data, error } = await (await createUserClient()).rpc("get_my_order", {
    p_tenant_ref: tenantRef,
  });
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    if (isMissingFunction(error)) throw new Error(MIGRATION_005_HINT);
    throw new Error("Could not load order.");
  }
  const rows = (data ?? []) as OrderRow[];
  return rows[0] ?? null;
}

export async function findOrderByTenantRef(tenantRef: string): Promise<OrderRow | null> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,user_id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,submitted_utr,created_at,paid_at")
    .eq("tenant_ref", tenantRef)
    .maybeSingle();
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not load order.");
  }
  return (data ?? null) as OrderRow | null;
}

export async function findOrderByProviderId(uroPayOrderId: string): Promise<OrderRow | null> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,user_id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,submitted_utr,created_at,paid_at")
    .eq("uropay_order_id", uroPayOrderId)
    .maybeSingle();
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not load order.");
  }
  return (data ?? null) as OrderRow | null;
}

/** Match a companion-SMS webhook whose order ids arrived null. */
export async function findOrderByUtr(utr: string): Promise<OrderRow | null> {
  const clean = utr.trim();
  if (!clean) return null;
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,user_id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,submitted_utr,created_at,paid_at")
    .eq("submitted_utr", clean)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not load order.");
  }
  return (data ?? null) as OrderRow | null;
}

export async function setSubmittedUtr(tenantRef: string, utr: string): Promise<void> {
  const { error } = await adminClient()
    .from("uropay_orders")
    .update({ submitted_utr: utr.trim(), status: "utr_submitted" })
    .eq("tenant_ref", tenantRef);
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not save UTR.");
  }
}

export async function attachProviderOrder(tenantRef: string, uropayOrderId: string): Promise<void> {
  const { error } = await adminClient()
    .from("uropay_orders")
    .update({ uropay_order_id: uropayOrderId })
    .eq("tenant_ref", tenantRef);
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not link payment order.");
  }
}

const UPDATABLE = new Set(["pending", "utr_submitted", "review", "paid", "failed", "expired", "cancelled"]);

/** UroPay provider status → our row status (hosted /v1/orders vocabulary). */
export function mapProviderStatus(provider: string): string {
  switch (provider.toUpperCase()) {
    case "PAID":
    case "COMPLETED":
      return "paid";
    case "FAILED":
      return "failed";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "PENDING":
    case "CREATED":
    case "UPDATED":
      return "pending";
    case "REVIEW_REQUIRED":
      return "review";
    case "UTR_SUBMITTED":
      return "utr_submitted";
    default:
      return "pending";
  }
}

export async function setOrderStatus(tenantRef: string, status: string): Promise<void> {
  if (!UPDATABLE.has(status)) return;
  const { error } = await adminClient().from("uropay_orders").update({ status }).eq("tenant_ref", tenantRef);
  if (error && isPermissionFailure(error)) throw billingPermissionError();
}

/**
 * Confirm payment. Accepts the QR-lifecycle pre-paid states — NOT just
 * "pending": by credit time the row is usually "utr_submitted" (UTR pasted)
 * or "review" (SMS timeout), and restricting to "pending" silently skipped
 * the update while tokens had already been granted.
 */
export async function markOrderPaid(orderId: string, uropayOrderId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), uropay_order_id: uropayOrderId })
    .eq("id", orderId)
    .in("status", ["pending", "utr_submitted", "review"])
    .select("id");
  if (error) {
    if (isPermissionFailure(error)) throw billingPermissionError();
    throw new Error("Could not confirm order.");
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Webhook replay guard: true when this eventId is seen for the first time.
 * Only a unique-violation (23505) means "duplicate". Any other failure is
 * thrown so the webhook answers 500 and the provider RETRIES — previously
 * every failure (including 42501) was swallowed as "deduped", silently
 * dropping payments that were never processed.
 */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const { error } = await adminClient().from("uropay_events").insert({ event_id: eventId });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  if (isPermissionFailure(error)) throw billingPermissionError();
  if (isMissingRelation(error)) {
    throw new Error("Database table missing — run migrations 002 and 005 in Supabase SQL Editor, then retry.");
  }
  throw new Error("Could not record webhook event.");
}
