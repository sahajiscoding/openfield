import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Wallet access. Service-role ONLY (server actions / route handlers) —
 * RLS exposes no wallet rows to anon/authenticated keys, so every balance
 * move funnels through the atomic RPCs below. Never import client-side.
 */

let admin: SupabaseClient | null = null;

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("Token billing is not configured — set SUPABASE_SERVICE_ROLE_KEY.");
  }
  admin ??= createClient(url, service, { auth: { persistSession: false } });
  return admin;
}

export async function getTokenBalance(userId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not read token balance.");
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
  if (error) throw new Error("Billing error — contact support with your order id.");
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
  created_at: string;
};

export async function getMyOrders(userId: string, limit = 10): Promise<TokenOrder[]> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load orders.");
  return (data ?? []) as TokenOrder[];
}

export type OrderRow = TokenOrder & { user_id: string; paid_at: string | null };

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
  if (error) throw new Error("Could not start checkout.");
}

export async function findOrderByTenantRef(tenantRef: string): Promise<OrderRow | null> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .select("id,user_id,pack_id,tokens,amount,currency,status,uropay_order_id,tenant_ref,created_at,paid_at")
    .eq("tenant_ref", tenantRef)
    .maybeSingle();
  if (error) throw new Error("Could not load order.");
  return (data ?? null) as OrderRow | null;
}

export async function attachProviderOrder(tenantRef: string, uropayOrderId: string): Promise<void> {
  const { error } = await adminClient()
    .from("uropay_orders")
    .update({ uropay_order_id: uropayOrderId })
    .eq("tenant_ref", tenantRef);
  if (error) throw new Error("Could not link payment order.");
}

const TERMINAL = new Set(["paid", "failed", "expired", "cancelled"]);

export async function setOrderStatus(tenantRef: string, status: string): Promise<void> {
  if (!TERMINAL.has(status)) return;
  await adminClient().from("uropay_orders").update({ status }).eq("tenant_ref", tenantRef);
}

export async function markOrderPaid(orderId: string, uropayOrderId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("uropay_orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), uropay_order_id: uropayOrderId })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error("Could not confirm order.");
  return (data?.length ?? 0) > 0;
}

/** Webhook replay guard: true when this eventId is seen for the first time. */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const { error } = await adminClient().from("uropay_events").insert({ event_id: eventId });
  return !error;
}
