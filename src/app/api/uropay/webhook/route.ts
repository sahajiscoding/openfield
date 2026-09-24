import { NextResponse } from "next/server";

import { creditPaidOrder } from "@/lib/billing/confirm";
import {
  claimWebhookEvent,
  findOrderByTenantRef,
  mapProviderStatus,
  pruneWebhookEvents,
  setOrderStatus,
} from "@/lib/credits/wallet";
import { getUropayOrder, verifyUropayWebhook } from "@/lib/uropay/client";

/**
 * UroPay tenant webhook (hosted-checkout API, MUN parity).
 *
 * Verify the HMAC (separate UROPAY_WEBHOOK_SECRET) + replay window, dedupe by
 * eventId, then treat GET /v1/orders as authoritative and credit
 * idempotently. 401 only for signature failures; anything else that needs a
 * retry answers 500 so UroPay re-delivers.
 */

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  switch (value.trim().toUpperCase()) {
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REVIEW_REQUIRED":
      return "review";
    case "UTR_SUBMITTED":
      return "utr_submitted";
    default:
      return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();

  let event;
  try {
    event = verifyUropayWebhook(request.headers, raw);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const webhookStatus = normalizeStatus(event.status);
  if (!webhookStatus) {
    return NextResponse.json({ error: "unknown order status" }, { status: 400 });
  }

  try {
    if (!(await claimWebhookEvent(event.eventId))) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    // Opportunistic retention: keep the replay-guard table bounded. Fire and
    // forget — prune failures are logged inside, never fail the webhook.
    void pruneWebhookEvents().catch(() => {});
  } catch {
    return NextResponse.json({ error: "store unavailable" }, { status: 500 });
  }

  try {
    const row = await findOrderByTenantRef(event.tenantOrderRef);
    if (!row) {
      console.error("[billing] webhook for unknown order", { tenantRef: event.tenantOrderRef });
      return NextResponse.json({ ok: true, unknown: true });
    }
    if (row.uropay_order_id && row.uropay_order_id !== event.orderId) {
      console.error("[billing] webhook order ID mismatch", { tenantRef: row.tenant_ref });
      return NextResponse.json({ ok: true, mismatch: true });
    }
    if (row.status === "paid") return NextResponse.json({ ok: true, already: true });

    // Authoritative lookup before moving money. The webhook body is only a
    // wake-up call: whatever it claims, the GET result below is what the row
    // is reconciled with. A mismatch is logged for diagnostics but never
    // drops the update — otherwise a webhook that arrives ahead of provider
    // propagation (common in TEST) would stall the order until a poll.
    //
    // The mapping is the shared mapProviderStatus from wallet.ts — the same
    // one the status poll uses — so both paths agree on what PENDING,
    // COMPLETED, or an unknown provider string means. (The strict local
    // normalizeStatus above stays for the webhook body itself, where an
    // unrecognized status is a 400.)
    const order = await getUropayOrder(event.orderId);
    const authoritative = mapProviderStatus(order.status);
    if (authoritative !== webhookStatus) {
      console.error("[billing] webhook/authoritative status mismatch — trusting authoritative", {
        tenantRef: row.tenant_ref,
        webhookStatus,
        authoritative,
      });
    }
    if (authoritative !== "paid") {
      await setOrderStatus(row.tenant_ref, authoritative).catch(() => {});
      return NextResponse.json({ ok: true, recorded: authoritative });
    }

    if (Number(order.amount) !== Number(row.amount) || order.currency !== row.currency) {
      console.error("[billing] amount mismatch", { tenantRef: row.tenant_ref });
      return NextResponse.json({ ok: true, mismatch: true });
    }

    // The SAME crediting path the status poll uses — one grant function, one
    // ledger reference, so a webhook and a poll racing each other still credit
    // once (the second sees ALREADY_GRANTED and confirms the row).
    await creditPaidOrder({ ...row, uropay_order_id: event.orderId }, row.user_id);
    return NextResponse.json({ ok: true, credited: true });
  } catch (caught) {
    console.error("[billing] webhook failed", { detail: caught instanceof Error ? caught.message : caught });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
