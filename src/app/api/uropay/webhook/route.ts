import { NextResponse } from "next/server";

import {
  claimWebhookEvent,
  findOrderByTenantRef,
  grantTokens,
  markOrderPaid,
  setOrderStatus,
} from "@/lib/credits/wallet";
import { getUropayOrder, verifyUropayWebhook } from "@/lib/uropay/client";

/**
 * UroPay order-status webhook. Advisory by design: we verify the HMAC,
 * freshness, and eventId, then treat GET /v1/orders as authoritative and
 * credit idempotently. Always 200s on handled cases so UroPay stops retrying
 * what we already settled; 401/500 only for signature failures and crashes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();

  let event;
  try {
    event = verifyUropayWebhook(request.headers, raw);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  try {
    if (!(await claimWebhookEvent(event.eventId))) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  } catch {
    return NextResponse.json({ error: "store unavailable" }, { status: 500 });
  }

  try {
    if (event.status !== "PAID") {
      await setOrderStatus(event.tenantOrderRef, event.status.toLowerCase());
      return NextResponse.json({ ok: true, recorded: event.status });
    }

    // Authoritative lookup before moving money.
    const order = await getUropayOrder(event.orderId);
    if (order.status !== "PAID") {
      await setOrderStatus(event.tenantOrderRef, order.status.toLowerCase());
      return NextResponse.json({ ok: true, recorded: order.status });
    }

    const row = await findOrderByTenantRef(event.tenantOrderRef);
    if (!row) {
      console.error("[billing] webhook for unknown order", { tenantRef: event.tenantOrderRef });
      return NextResponse.json({ ok: true, unknown: true });
    }
    if (row.status === "paid") return NextResponse.json({ ok: true, already: true });
    if (Number(order.amount) !== Number(row.amount) || order.currency !== row.currency) {
      console.error("[billing] amount mismatch", { tenantRef: row.tenant_ref });
      return NextResponse.json({ ok: true, mismatch: true });
    }

    try {
      await grantTokens(row.user_id, row.tokens, "uropay", `topup:${row.tenant_ref}`);
    } catch (granted) {
      // Unique ledger ref already present → a duplicate delivery that slipped
      // past the event guard; confirm the order row and move on.
      console.error("[billing] grant race", { tenantRef: row.tenant_ref, detail: granted instanceof Error ? granted.message : granted });
    }
    await markOrderPaid(row.id, event.orderId);
    console.info("[billing] credited", { userId: row.user_id, tokens: row.tokens, tenantRef: row.tenant_ref });
    return NextResponse.json({ ok: true, credited: true });
  } catch (caught) {
    console.error("[billing] webhook failed", { detail: caught instanceof Error ? caught.message : caught });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
