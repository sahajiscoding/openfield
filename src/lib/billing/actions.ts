"use server";

import { headers } from "next/headers";

import { getPack } from "@/lib/credits/packs";
import {
  attachProviderOrder,
  createPendingOrder,
  findOrderByTenantRef,
  getMyOrders,
  getTokenBalance,
  grantTokens,
  mapProviderStatus,
  markOrderPaid,
  setOrderStatus,
  setSubmittedUtr,
  type TokenOrder,
} from "@/lib/credits/wallet";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";
import {
  generateUropayOrder,
  getUropayOrderStatus,
  updateUropayOrder,
} from "@/lib/uropay/client";

export async function getMyBalance(): Promise<number> {
  const user = await requireSessionUser();
  return getTokenBalance(user.id);
}

export async function getMyTokenOrders(): Promise<TokenOrder[]> {
  const user = await requireSessionUser();
  return getMyOrders(user.id);
}

export type QrCheckout = {
  qrCode: string;
  upiString: string;
  uroPayOrderId: string;
  tenantRef: string;
  amountInRupees: string;
};

/**
 * Start a UroPay QR checkout. UroPay is direct-UPI (no hosted page): this
 * generates a QR the customer scans in any UPI app, then pastes the UTR.
 * Amount is sent in paise per docs (₹199 → 19900).
 */
export async function buyTokenPack(packId: string): Promise<QrCheckout> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  enforceRateLimit(`billing:${user.id}:${ip}`, 5, 60_000);

  const pack = getPack(packId);
  const tenantRef = `of-${Date.now().toString(36)}-${user.id.slice(0, 8)}`;

  try {
    await createPendingOrder({
      userId: user.id,
      packId: pack.id,
      tokens: pack.tokens,
      amount: pack.inr,
      currency: "INR",
      tenantRef,
    });

    const customerEmail = user.email ?? "";
    const customerName =
      customerEmail.split("@")[0]?.replace(/[^\w ._-]/g, "").slice(0, 60) || "Openfield User";
    const order = await generateUropayOrder({
      amountPaise: Math.round(pack.inr * 100),
      merchantOrderId: tenantRef,
      customerName,
      customerEmail,
      transactionNote: `Openfield ${pack.id} ${pack.tokens} tokens`,
      notes: { pack: pack.id, tokens: String(pack.tokens), user: user.id },
    });
    await attachProviderOrder(tenantRef, order.uroPayOrderId);
    console.info("[billing] QR generated", {
      userId: user.id,
      pack: pack.id,
      tenantRef,
      uroPayOrderId: order.uroPayOrderId,
    });
    return {
      qrCode: order.qrCode,
      upiString: order.upiString,
      uroPayOrderId: order.uroPayOrderId,
      tenantRef,
      amountInRupees: order.amountInRupees,
    };
  } catch (caught) {
    await setOrderStatus(tenantRef, "cancelled").catch(() => {});
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.includes("Sign in")) throw caught;
    if (message.includes("Payments are not configured")) throw caught;
    // UroPay refusals and DB diagnostics are safe to surface (no secrets).
    if (
      message.startsWith("UroPay") ||
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

function cleanUtr(utr: unknown): string {
  const s = typeof utr === "string" ? utr.trim().replace(/\s+/g, "") : "";
  if (!/^[A-Za-z0-9]{6,22}$/.test(s)) {
    throw new Error("Enter the 12-digit UPI reference number from your payment app.");
  }
  return s;
}

/** Customer pastes the UTR after paying. Moves the order to UTR_SUBMITTED. */
export async function submitUtr(tenantRef: string, utr: unknown): Promise<{ orderStatus: string }> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  enforceRateLimit(`billing:utr:${user.id}:${ip}`, 10, 60_000);

  const referenceNumber = cleanUtr(utr);
  const row = await findOrderByTenantRef(tenantRef);
  if (!row || row.user_id !== user.id) throw new Error("Order not found.");
  if (row.status === "paid") return { orderStatus: "COMPLETED" };
  if (!row.uropay_order_id) throw new Error("Order not ready — regenerate the QR.");
  if (!["pending", "utr_submitted", "review"].includes(row.status)) {
    throw new Error(`Order is ${row.status} — start a new checkout.`);
  }

  try {
    const updated = await updateUropayOrder({
      uroPayOrderId: row.uropay_order_id,
      referenceNumber,
    });
    await setSubmittedUtr(tenantRef, referenceNumber);
    return { orderStatus: updated.orderStatus };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.startsWith("UroPay")) throw new Error(message);
    throw new Error("Could not submit UTR — check the number and try again.");
  }
}

export type PollResult = { status: string; credited: boolean };

/**
 * Poll authoritative provider status. Credits idempotently on COMPLETED
 * (webhook is the primary path; polling covers missed/delayed webhooks).
 */
export async function pollOrderStatus(tenantRef: string): Promise<PollResult> {
  const user = await requireSessionUser();
  const row = await findOrderByTenantRef(tenantRef);
  if (!row || row.user_id !== user.id) throw new Error("Order not found.");
  if (row.status === "paid") return { status: "paid", credited: true };
  if (!row.uropay_order_id) return { status: row.status, credited: false };

  const provider = await getUropayOrderStatus(row.uropay_order_id);
  const upper = provider.orderStatus.toUpperCase();
  if (upper === "COMPLETED") {
    try {
      await grantTokens(row.user_id, row.tokens, "uropay", `topup:${row.tenant_ref}`);
    } catch {
      // Unique ledger ref → duplicate delivery; confirm row and move on.
    }
    await markOrderPaid(row.id, row.uropay_order_id);
    return { status: "paid", credited: true };
  }
  const mapped = mapProviderStatus(provider.orderStatus);
  if (mapped !== row.status) await setOrderStatus(tenantRef, mapped).catch(() => {});
  return { status: mapped, credited: false };
}
