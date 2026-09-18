"use server";

import { headers } from "next/headers";

import { confirmOrderWithProvider } from "@/lib/billing/confirm";
import { getPack } from "@/lib/credits/packs";
import {
  attachProviderOrderSelf,
  cancelMyOrderSelf,
  createCheckoutSessionSelf,
  getMyOrderSelf,
  getMyOrders,
  getTokenBalance,
  type TokenOrder,
} from "@/lib/credits/wallet";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";
import { createUropayOrder } from "@/lib/uropay/client";

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
      // Back to the status page for THIS order. The reference only says which
      // order to look up — the page reads the state from our database and the
      // provider, never from whatever the return URL happens to carry.
      returnUrl: `${site}/billing/payment/${encodeURIComponent(tenantRef)}`,
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
 * Poll authoritative provider status for the SIGNED-IN user's own order.
 * Credits idempotently on PAID (the webhook is the primary path; polling
 * covers missed/delayed webhooks).
 *
 * The read rides the migration-005 self lane (`get_my_order`), which filters on
 * auth.uid() inside SQL: another user's reference simply returns no row, so
 * there is no service-role lookup and no ownership comparison for the caller to
 * forget. Crediting itself still runs on the service-role client — moving money
 * must stay server-verified.
 */
export async function pollOrderStatus(tenantRef: string): Promise<PollResult> {
  const user = await requireSessionUser();
  const row = await getMyOrderSelf(tenantRef);
  if (!row) throw new Error("Order not found.");
  return confirmOrderWithProvider(row, user.id);
}
