import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * UroPay QR flow (https://api.uropay.me).
 *
 * UroPay is NOT an aggregator / hosted checkout. It generates a UPI QR for a
 * direct-to-merchant VPA payment; the companion Android app reads the UPI
 * credit SMS and fires webhooks. No cards, netbanking, wallets or EMI.
 *
 * Flow: POST /order/generate → customer pays in any UPI app → customer pastes
 * the 12-digit UTR → PATCH /order/update → poll GET /order/status/:id →
 * webhook confirms COMPLETED (or REVIEW_REQUIRED after ~2 min without SMS).
 *
 * Server-only: API secret never leaves server env. The status endpoint needs
 * no auth header per docs and may be called client-side via our own API.
 */

const BASE_URL = (process.env.UROPAY_BASE_URL ?? "https://api.uropay.me").replace(/\/$/, "");

function creds(): { key: string; secret: string; hashedSecret: string } {
  const key = process.env.UROPAY_API_KEY?.trim();
  const secret = process.env.UROPAY_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error(
      "Payments are not configured yet — the operator must add UROPAY_API_KEY / UROPAY_API_SECRET in Vercel.",
    );
  }
  // Docs: Authorization: Bearer sha512(plain secret hex). Never send plain secret.
  const hashedSecret = createHash("sha512").update(secret).digest("hex");
  return { key, secret, hashedSecret };
}

export function uropaySecret(): string {
  return creds().secret;
}

function authHeaders(): Record<string, string> {
  const { key, hashedSecret } = creds();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": key,
    Authorization: `Bearer ${hashedSecret}`,
  };
}

function optionalVpa(): { vpa?: string; vpaName?: string } {
  const vpa = process.env.UROPAY_VPA?.trim();
  const vpaName = process.env.UROPAY_VPA_NAME?.trim();
  return {
    ...(vpa ? { vpa } : {}),
    ...(vpaName ? { vpaName } : {}),
  };
}

// ---------- order endpoints ----------

export type UropayGenerateData = {
  uroPayOrderId: string;
  orderStatus: string;
  upiString: string;
  qrCode: string;
  amountInRupees: string;
};

export async function generateUropayOrder(input: {
  amountPaise: number;
  merchantOrderId: string;
  customerName: string;
  customerEmail: string;
  transactionNote?: string;
  notes?: Record<string, string>;
}): Promise<UropayGenerateData> {
  const body = JSON.stringify({
    ...optionalVpa(),
    amount: input.amountPaise,
    merchantOrderId: input.merchantOrderId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    ...(input.transactionNote ? { transactionNote: input.transactionNote } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  });
  const res = await fetch(`${BASE_URL}/order/generate`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  const json = (await res.json().catch(() => null)) as {
    code?: number;
    status?: string;
    message?: string;
    data?: UropayGenerateData;
  } | null;
  if (!res.ok || !json || json.status !== "success" || !json.data?.uroPayOrderId) {
    throw new Error(
      `UroPay order failed (${res.status}): ${(json?.message ?? "unknown").slice(0, 200)}`,
    );
  }
  return json.data;
}

export type UropayUpdateData = {
  uroPayOrderId: string;
  orderStatus: string;
};

export async function updateUropayOrder(input: {
  uroPayOrderId: string;
  referenceNumber: string;
}): Promise<UropayUpdateData> {
  const body = JSON.stringify({
    uroPayOrderId: input.uroPayOrderId,
    referenceNumber: input.referenceNumber,
  });
  const res = await fetch(`${BASE_URL}/order/update`, {
    method: "PATCH",
    headers: authHeaders(),
    body,
  });
  const json = (await res.json().catch(() => null)) as {
    code?: number;
    status?: string;
    message?: string;
    data?: UropayUpdateData;
  } | null;
  if (!res.ok || !json || json.status !== "success" || !json.data?.uroPayOrderId) {
    throw new Error(
      `UroPay UTR update failed (${res.status}): ${(json?.message ?? "unknown").slice(0, 200)}`,
    );
  }
  return json.data;
}

export type UropayStatusData = {
  uroPayOrderId: string;
  orderStatus: string;
};

/** Authoritative status. Per docs no auth header is required (pollable). */
export async function getUropayOrderStatus(uroPayOrderId: string): Promise<UropayStatusData> {
  const res = await fetch(`${BASE_URL}/order/status/${encodeURIComponent(uroPayOrderId)}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    code?: number;
    status?: string;
    message?: string;
    data?: UropayStatusData;
  } | null;
  if (!res.ok || !json || json.status !== "success" || !json.data?.orderStatus) {
    throw new Error(
      `UroPay status failed (${res.status}): ${(json?.message ?? "unknown").slice(0, 200)}`,
    );
  }
  return json.data;
}

// ---------- review queue (UTR fraud prevention) ----------

async function authedJson(path: string, method: string, body?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    ...(body ? { body } : {}),
  });
  const json = (await res.json().catch(() => null)) as {
    code?: number;
    status?: string;
    message?: string;
    data?: unknown;
  } | null;
  if (!res.ok || !json || json.status !== "success") {
    throw new Error(
      `UroPay review failed (${res.status}): ${(json?.message ?? "unknown").slice(0, 200)}`,
    );
  }
  return json.data;
}

export function listReviewOrders(): Promise<unknown> {
  return authedJson("/order/review", "GET");
}

export function approveReviewOrder(id: string): Promise<unknown> {
  return authedJson(`/order/review/${encodeURIComponent(id)}/approve`, "POST", "{}");
}

export function rejectReviewOrder(id: string): Promise<unknown> {
  return authedJson(`/order/review/${encodeURIComponent(id)}/reject`, "POST", "{}");
}

// ---------- webhook verification ----------
//
// Signature: hex(HMAC-SHA256(key=sha512(secret_hex), data=raw JSON bytes)).
// Key ORDER matters — reconstruct in the documented order before hashing.
// Three cases by event: companion.sms.data → Case 1; order.status.utrsubmitted
// → Case 2b; any other order-status event → Case 2a.

const FIXED_TAIL = ["uroPayOrderId", "merchantOrderId", "detectedAt", "environment"] as const;

function buildTransactionPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const fixedSet = new Set<string>([...FIXED_TAIL, "event"]);
  const ordered: Record<string, unknown> = {};
  if ("event" in payload) ordered.event = payload.event;
  const middle = Object.keys(payload)
    .filter((k) => !fixedSet.has(k))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const k of middle) ordered[k] = payload[k];
  for (const k of FIXED_TAIL) ordered[k] = (payload as Record<string, unknown>)[k] ?? null;
  return ordered;
}

function buildOrderStatusPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    event: payload.event,
    uroPayOrderId: payload.uroPayOrderId,
    merchantOrderId: payload.merchantOrderId,
    orderStatus: payload.orderStatus,
    submittedUTR: (payload.submittedUTR ?? null) as unknown,
    environment: payload.environment,
  };
}

function buildUtrSubmittedPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    event: payload.event,
    uroPayOrderId: payload.uroPayOrderId,
    merchantOrderId: payload.merchantOrderId,
    orderStatus: payload.orderStatus,
    submittedUTR: (payload.submittedUTR ?? null) as unknown,
    amount: payload.amount,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerVPA: (payload.customerVPA ?? null) as unknown,
    environment: payload.environment,
    utrSubmittedAt: (payload.utrSubmittedAt ?? null) as unknown,
  };
}

function orderedForVerify(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.event === "order.status.utrsubmitted") return buildUtrSubmittedPayload(payload);
  if ("orderStatus" in payload) return buildOrderStatusPayload(payload);
  return buildTransactionPayload(payload);
}

export function verifyUropaySignature(
  payload: Record<string, unknown>,
  secret: string,
  signature: string,
): boolean {
  const ordered = orderedForVerify(payload);
  const hashedSecret = createHash("sha512").update(secret).digest("hex");
  const raw = JSON.stringify(ordered);
  const computed = createHmac("sha256", hashedSecret).update(raw).digest("hex");
  const a = Buffer.from(signature.trim().toLowerCase(), "utf8");
  const b = Buffer.from(computed.toLowerCase(), "utf8");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export type UropayWebhook =
  | {
      kind: "sms";
      event: "companion.sms.data";
      amount: string | null;
      referenceNumber: string | null;
      from: string | null;
      vpa: string | null;
      uroPayOrderId: string | null;
      merchantOrderId: string | null;
      detectedAt: string | null;
      environment: string;
    }
  | {
      kind: "utr_submitted";
      event: "order.status.utrsubmitted";
      uroPayOrderId: string;
      merchantOrderId: string;
      orderStatus: string;
      submittedUTR: string | null;
      amount: number | null;
      customerName: string | null;
      customerEmail: string | null;
      customerVPA: string | null;
      environment: string;
      utrSubmittedAt: string | null;
    }
  | {
      kind: "status_changed";
      event: string;
      uroPayOrderId: string;
      merchantOrderId: string;
      orderStatus: string;
      submittedUTR: string | null;
      environment: string;
    };

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** Parse after signature verification. Throws on malformed payloads. */
export function parseUropayWebhook(payload: Record<string, unknown>): UropayWebhook {
  const event = typeof payload.event === "string" ? payload.event : "";
  if (event === "companion.sms.data") {
    return {
      kind: "sms",
      event,
      amount: str(payload.amount),
      referenceNumber: str(payload.referenceNumber),
      from: str(payload.from),
      vpa: str(payload.vpa),
      uroPayOrderId: str(payload.uroPayOrderId),
      merchantOrderId: str(payload.merchantOrderId),
      detectedAt: str(payload.detectedAt),
      environment: typeof payload.environment === "string" ? payload.environment : "",
    };
  }
  if (event === "order.status.utrsubmitted") {
    if (typeof payload.uroPayOrderId !== "string" || typeof payload.merchantOrderId !== "string") {
      throw new Error("Malformed UTR-submitted webhook.");
    }
    return {
      kind: "utr_submitted",
      event,
      uroPayOrderId: payload.uroPayOrderId,
      merchantOrderId: payload.merchantOrderId,
      orderStatus: typeof payload.orderStatus === "string" ? payload.orderStatus : "",
      submittedUTR: str(payload.submittedUTR),
      amount: typeof payload.amount === "number" ? payload.amount : null,
      customerName: str(payload.customerName),
      customerEmail: str(payload.customerEmail),
      customerVPA: str(payload.customerVPA),
      environment: typeof payload.environment === "string" ? payload.environment : "",
      utrSubmittedAt: str(payload.utrSubmittedAt),
    };
  }
  if (typeof payload.uroPayOrderId === "string" && typeof payload.merchantOrderId === "string") {
    return {
      kind: "status_changed",
      event: event || "order.status.changed",
      uroPayOrderId: payload.uroPayOrderId,
      merchantOrderId: payload.merchantOrderId,
      orderStatus: typeof payload.orderStatus === "string" ? payload.orderStatus : "",
      submittedUTR: str(payload.submittedUTR),
      environment: typeof payload.environment === "string" ? payload.environment : "",
    };
  }
  throw new Error("Malformed webhook payload.");
}
