"use server";

import { headers } from "next/headers";

import { getPack } from "@/lib/credits/packs";
import {
  attachProviderOrderSelf,
  cancelMyOrderSelf,
  createCheckoutSessionSelf,
  findOrderByTenantRef,
  getMyOrders,
  getTokenBalance,
  grantTokens,
  mapProviderStatus,
  markOrderPaid,
  setOrderStatus,
  type TokenOrder,
} from "@/lib/credits/wallet";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";
import { createUropayOrder, getUropayOrder } from "@/lib/uropay/client";

export async function getMyBalance(): Promise<number> {
  const user = await requireSessionUser();
  return getTokenBalance(user.id);
}

export async function getMyTokenOrders(): Promise<TokenOrder[]> {
  const user = await requireSessionUser();
  return getMyOrders(user.id);
}

/**
 * Start a UroPay hosted checkout. UroPay takes whole rupees and returns an
 * openUrl the customer completes payment on — no QR/UTR handling in-app.
 *
 * DB writes ride the SIGNED-IN USER's session through the migration-005
 * self-service RPCs (auth.uid()-bound) — no direct table rights and no
 * service-role INSERT involved, so RLS/42501 on uropay_orders cannot break
 * purchases. Money movement (grant on PAID) stays service-side.
 */
export async function buyTokenPack(packId: string): Promise<{ openUrl: string }> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  enforceRateLimit(`billing:${user.id}:${ip}`, 5, 60_000);

  const pack = getPack(packId);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const tenantRef = `of-${Date.now().toString(36)}-${user.id.slice(0, 8)}`;

  try {
    await createCheckoutSessionSelf({
      packId: pack.id,
      tokens: pack.tokens,
      amount: pack.inr,
      tenantRef,
    });

    const order = await createUropayOrder({
      tenantOrderRef: tenantRef,
      amountRupees: pack.inr,
      currency: "INR",
      returnUrl: `${site}/studio/billing?ref=${encodeURIComponent(tenantRef)}`,
      webhookUrl: `${site}/api/uropay/webhook`,
    });
    await attachProviderOrderSelf(tenantRef, order.id);
    if (!order.openUrl) throw new Error("Checkout closed immediately.");
    console.info("[billing] checkout started", {
      userId: user.id,
      pack: pack.id,
      tenantRef,
      uropayOrderId: order.id,
    });
    return { openUrl: order.openUrl };
  } catch (caught) {
    // Best-effort cancel of OUR OWN row through the self RPC (never throws
    // past this point — a failed cancel just leaves a pending row behind).
    await cancelMyOrderSelf(tenantRef).catch(() => {});
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.includes("Sign in")) throw caught;
    if (message.includes("Payments are not configured")) throw caught;
    // UroPay refusals, migration hints, and DB diagnostics are safe to
    // surface (no secrets in any of them).
    if (
      message.startsWith("UroPay") ||
      message.includes("005_billing_hardening") ||
      message.includes("Server misconfigured") ||
      message.includes("Write blocked") ||
      message.includes("Could not start checkout") ||
      message.includes("Could not link payment")
    ) {
      throw new Error(message);
    }
    console.error("[billing] checkout failed", { userId: user.id, tenantRef });
    throw new Error("Checkout could not start — try again in a moment.");
  }
}

export type PollResult = { status: string; credited: boolean };

/**
 * Poll authoritative provider status. Credits idempotently on PAID
 * (webhook is the primary path; polling covers missed/delayed webhooks).
 * NOTE: crediting (grant + mark-paid) runs on the service-role client by
 * design — moving money must stay server-verified. If THIS step 42501s while
 * checkout succeeds, the service credential (not the schema) is at fault.
 */
export async function pollOrderStatus(tenantRef: string): Promise<PollResult> {
  const user = await requireSessionUser();
  const row = await findOrderByTenantRef(tenantRef);
  if (!row || row.user_id !== user.id) throw new Error("Order not found.");
  if (row.status === "paid") return { status: "paid", credited: true };
  if (!row.uropay_order_id) return { status: row.status, credited: false };

  const provider = await getUropayOrder(row.uropay_order_id);
  const upper = provider.status.toUpperCase();
  if (upper === "PAID") {
    if (Number(provider.amount) !== Number(row.amount) || provider.currency !== row.currency) {
      console.error("[billing] amount mismatch", { tenantRef: row.tenant_ref });
      return { status: row.status, credited: false };
    }
    try {
      await grantTokens(row.user_id, row.tokens, "uropay", `topup:${row.tenant_ref}`);
    } catch {
      // Unique ledger ref → duplicate delivery; confirm row and move on.
    }
    await markOrderPaid(row.id, row.uropay_order_id);
    return { status: "paid", credited: true };
  }
  const mapped = mapProviderStatus(provider.status);
  if (mapped !== row.status) await setOrderStatus(tenantRef, mapped).catch(() => {});
  return { status: mapped, credited: false };
}
