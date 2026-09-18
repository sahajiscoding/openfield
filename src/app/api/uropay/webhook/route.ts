import { NextResponse } from "next/server";

import {
  claimWebhookEvent,
  findOrderByProviderId,
  findOrderByTenantRef,
  findOrderByUtr,
  grantTokens,
  mapProviderStatus,
  markOrderPaid,
  setOrderStatus,
  setSubmittedUtr,
  type OrderRow,
} from "@/lib/credits/wallet";
import {
  getUropayOrderStatus,
  parseUropayWebhook,
  uropaySecret,
  verifyUropaySignature,
} from "@/lib/uropay/client";

/**
 * UroPay QR webhook. UroPay fires up to 3 calls per order:
 *  1) order.status.utrsubmitted — immediately on PATCH /order/update
 *  2) companion.sms.data — when the Android app sees the UPI credit SMS
 *  3) order.status.changed — COMPLETED or REVIEW_REQUIRED (~2 min, no SMS)
 *
 * Verify HMAC-SHA256(key=sha512(secret)) over the ordered JSON, dedupe by
 * X-Uropay-Webhook-Id, treat GET /order/status as authoritative, credit
 * idempotently. Always 200 on handled payloads so UroPay stops retrying;
 * 401 only for bad signatures.
 */

function rupeesMatch(rowInr: number, smsAmount: string | null): boolean {
  if (!smsAmount || smsAmount === "0" || smsAmount === "0.00") return true; // no companion app
  const v = Number(smsAmount);
  if (!Number.isFinite(v)) return false;
  return Math.abs(rowInr - v) < 0.005;
}

function paiseMatch(rowInr: number, paise: number | null): boolean {
  if (paise === null) return true;
  return Math.round(rowInr * 100) === paise;
}

async function creditRow(row: OrderRow, providerOrderId: string): Promise<void> {
  try {
    await grantTokens(row.user_id, row.tokens, "uropay", `topup:${row.tenant_ref}`);
  } catch (granted) {
    // Unique ledger ref → duplicate delivery past the event guard.
    console.error("[billing] grant race", {
      tenantRef: row.tenant_ref,
      detail: granted instanceof Error ? granted.message : granted,
    });
  }
  await markOrderPaid(row.id, providerOrderId);
  console.info("[billing] credited", {
    userId: row.user_id,
    tokens: row.tokens,
    tenantRef: row.tenant_ref,
  });
}

async function authoritativeCredit(row: OrderRow): Promise<boolean> {
  if (!row.uropay_order_id) return false;
  try {
    const provider = await getUropayOrderStatus(row.uropay_order_id);
    if (provider.orderStatus.toUpperCase() === "COMPLETED") {
      if (row.status !== "paid") await creditRow(row, row.uropay_order_id);
      return true;
    }
    const mapped = mapProviderStatus(provider.orderStatus);
    if (mapped !== row.status && mapped !== "paid") {
      await setOrderStatus(row.tenant_ref, mapped).catch(() => {});
    }
    return false;
  } catch (caught) {
    console.error("[billing] status lookup failed", {
      tenantRef: row.tenant_ref,
      detail: caught instanceof Error ? caught.message : caught,
    });
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  const signature = request.headers.get("x-uropay-signature") ?? "";
  const webhookId = request.headers.get("x-uropay-webhook-id") ?? "";
  if (!signature || !webhookId) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  let secret: string;
  try {
    secret = uropaySecret();
  } catch {
    console.error("[billing] webhook without UroPay secret configured");
    return NextResponse.json({ error: "payments not configured" }, { status: 500 });
  }
  if (!verifyUropaySignature(payload, secret, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  try {
    if (!(await claimWebhookEvent(webhookId))) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  } catch {
    return NextResponse.json({ error: "store unavailable" }, { status: 500 });
  }

  let event;
  try {
    event = parseUropayWebhook(payload);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  try {
    // 1) UTR pasted — record it, wait for SMS / status change.
    if (event.kind === "utr_submitted") {
      const row = await findOrderByTenantRef(event.merchantOrderId);
      if (!row) {
        console.error("[billing] UTR webhook for unknown order", {
          tenantRef: event.merchantOrderId,
        });
        return NextResponse.json({ ok: true, unknown: true });
      }
      if (row.status === "paid") return NextResponse.json({ ok: true, already: true });
      if (!paiseMatch(Number(row.amount), event.amount)) {
        console.error("[billing] amount mismatch (utr)", { tenantRef: row.tenant_ref });
        return NextResponse.json({ ok: true, mismatch: true });
      }
      if (event.submittedUTR) await setSubmittedUtr(row.tenant_ref, event.submittedUTR);
      else await setOrderStatus(row.tenant_ref, "utr_submitted").catch(() => {});
      return NextResponse.json({ ok: true, recorded: "UTR_SUBMITTED" });
    }

    // 2) SMS seen by the companion app — match, then confirm authoritatively.
    if (event.kind === "sms") {
      let row: OrderRow | null = null;
      if (event.uroPayOrderId) row = await findOrderByProviderId(event.uroPayOrderId);
      if (!row && event.merchantOrderId) row = await findOrderByTenantRef(event.merchantOrderId);
      if (!row && event.referenceNumber) row = await findOrderByUtr(event.referenceNumber);
      if (!row) {
        console.error("[billing] SMS webhook unmatched", {
          uroPayOrderId: event.uroPayOrderId,
          merchantOrderId: event.merchantOrderId,
        });
        return NextResponse.json({ ok: true, unknown: true });
      }
      if (row.status === "paid") return NextResponse.json({ ok: true, already: true });
      if (!rupeesMatch(Number(row.amount), event.amount)) {
        console.error("[billing] amount mismatch (sms)", { tenantRef: row.tenant_ref });
        return NextResponse.json({ ok: true, mismatch: true });
      }
      // Remember the UTR for later matching if we learned it from the SMS.
      if (event.referenceNumber && !row.submitted_utr && row.status === "pending") {
        await setSubmittedUtr(row.tenant_ref, event.referenceNumber).catch(() => {});
      }
      const completed = await authoritativeCredit(row);
      return NextResponse.json({ ok: true, credited: completed });
    }

    // 3) Status changed — COMPLETED credits, REVIEW_REQUIRED parks for manual review.
    const row =
      (await findOrderByTenantRef(event.merchantOrderId)) ??
      (await findOrderByProviderId(event.uroPayOrderId));
    if (!row) {
      console.error("[billing] status webhook for unknown order", {
        tenantRef: event.merchantOrderId,
      });
      return NextResponse.json({ ok: true, unknown: true });
    }
    if (row.status === "paid") return NextResponse.json({ ok: true, already: true });
    if (event.submittedUTR && !row.submitted_utr) {
      await setSubmittedUtr(row.tenant_ref, event.submittedUTR).catch(() => {});
    }
    if (event.orderStatus.toUpperCase() === "COMPLETED") {
      // Authoritative check before moving money.
      const completed = await authoritativeCredit(row);
      if (completed) return NextResponse.json({ ok: true, credited: true });
      // Provider flapped — fall through to record mapped status.
    }
    const mapped = mapProviderStatus(event.orderStatus);
    if (mapped === "paid") {
      await creditRow(row, row.uropay_order_id ?? event.uroPayOrderId);
      return NextResponse.json({ ok: true, credited: true });
    }
    await setOrderStatus(row.tenant_ref, mapped).catch(() => {});
    return NextResponse.json({ ok: true, recorded: event.orderStatus });
  } catch (caught) {
    console.error("[billing] webhook failed", {
      detail: caught instanceof Error ? caught.message : caught,
    });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
