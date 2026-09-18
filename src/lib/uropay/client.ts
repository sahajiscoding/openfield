import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * UroPay hosted-checkout API (https://api.uropai.in).
 *
 * Mirrors the proven MUN-AI-APP integration (same operator account family):
 * HMAC-signed requests, whole-rupee amounts, hosted openUrl checkout.
 *
 * Flow: POST /v1/orders → redirect customer to openUrl → provider fires the
 * tenant webhook on status change → GET /v1/orders/:id is authoritative.
 *
 * Server-only: API + webhook secrets never leave server env.
 */

const BASE_URL = (process.env.UROPAY_BASE_URL ?? "https://api.uropai.in").replace(/\/$/, "");

function creds(): { key: string; secret: string } {
  const key = process.env.UROPAY_API_KEY?.trim();
  const secret = process.env.UROPAY_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error(
      "Payments are not configured yet — the operator must add UROPAY_API_KEY / UROPAY_API_SECRET in Vercel.",
    );
  }
  return { key, secret };
}

function webhookSecret(): string {
  const secret = process.env.UROPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Payments are not configured yet — the operator must add UROPAY_WEBHOOK_SECRET in Vercel.",
    );
  }
  return secret;
}

/** HMAC-SHA256 over METHOD, path, timestamp, nonce, query, body (MUN parity). */
function signedHeaders(
  method: string,
  path: string,
  query: string,
  rawBody: string,
): Record<string, string> {
  const { key, secret } = creds();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID();
  const canonical = [method, path, timestamp, nonce, query, rawBody].join("\n");
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");
  return {
    "X-Api-Key": key,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}

export type UropayOrder = {
  id: string;
  tenantOrderRef: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";
  amount: number;
  currency: string;
  openUrl?: string;
  createdAt?: string;
};

/** UroPay expects whole rupees (₹199 → 199, NOT paise). */
export async function createUropayOrder(input: {
  tenantOrderRef: string;
  amountRupees: number;
  currency: string;
  returnUrl?: string;
  webhookUrl?: string;
}): Promise<UropayOrder> {
  if (!Number.isInteger(input.amountRupees) || input.amountRupees <= 0) {
    throw new Error("Invalid payment amount.");
  }
  const path = "/v1/orders";
  const body: Record<string, unknown> = {
    tenantOrderRef: input.tenantOrderRef,
    amount: input.amountRupees,
    currency: input.currency,
    ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
  };
  const rawBody = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: signedHeaders("POST", path, "", rawBody),
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
    data?: UropayOrder | null;
  } | null;
  if (!res.ok) {
    const detail =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.error === "string" && json.error) ||
      `UroPay order creation failed (${res.status}).`;
    throw new Error(`UroPay order failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  if (!json?.data?.id || !json.data.openUrl) {
    throw new Error("UroPay response did not contain an order ID and checkout URL.");
  }
  return json.data;
}

/** Authoritative status — webhooks are advisory; this is truth. */
export async function getUropayOrder(orderId: string): Promise<UropayOrder> {
  if (!orderId) throw new Error("UroPay order ID is required.");
  const path = `/v1/orders/${encodeURIComponent(orderId)}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: signedHeaders("GET", path, "", ""),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as {
    message?: unknown;
    error?: unknown;
    data?: UropayOrder | null;
  } | null;
  if (!res.ok) {
    const detail =
      (typeof json?.message === "string" && json.message) ||
      (typeof json?.error === "string" && json.error) ||
      `UroPay status lookup failed (${res.status}).`;
    throw new Error(`UroPay status failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  if (!json?.data) throw new Error("UroPay status response was invalid.");
  return json.data;
}

export type UropayWebhookEvent = {
  eventId: string;
  orderId: string;
  tenantOrderRef: string;
  status: string;
  amountCaptured: number | null;
  currency: string;
  environment: string;
};

/**
 * Verify an inbound tenant webhook. Signed with the SEPARATE webhook secret
 * over POST /tenant-webhook + empty query + the RAW body bytes; enforce the
 * 5-minute replay window and compare in constant time (MUN parity).
 */
export function verifyUropayWebhook(headers: Headers, rawBody: string): UropayWebhookEvent {
  const secret = webhookSecret();
  const timestamp = headers.get("x-timestamp") ?? "";
  const nonce = headers.get("x-nonce") ?? "";
  const signature = headers.get("x-signature") ?? "";
  if (!timestamp || !nonce || !signature) throw new Error("Missing webhook signature headers.");

  const ts = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || ts <= 0 || Math.abs(now - ts) > 300) {
    throw new Error("Stale webhook timestamp.");
  }

  const canonical = ["POST", "/tenant-webhook", timestamp, nonce, "", rawBody].join("\n");
  const expected = createHmac("sha256", secret).update(canonical).digest("hex");
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(signature, "hex");
    b = Buffer.from(expected, "hex");
  } catch {
    throw new Error("Invalid webhook signature.");
  }
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid webhook signature.");
  }

  const payload = JSON.parse(rawBody) as {
    eventId?: unknown;
    orderId?: unknown;
    tenantOrderRef?: unknown;
    status?: unknown;
    amount_captured?: unknown;
    currency?: unknown;
    environment?: unknown;
  };
  if (
    typeof payload.eventId !== "string" ||
    !payload.eventId.trim() ||
    typeof payload.orderId !== "string" ||
    !payload.orderId.trim() ||
    typeof payload.tenantOrderRef !== "string" ||
    !payload.tenantOrderRef.trim() ||
    typeof payload.status !== "string" ||
    !payload.status.trim()
  ) {
    throw new Error("Malformed webhook payload.");
  }
  const amountCaptured =
    payload.amount_captured === null ||
    payload.amount_captured === undefined ||
    payload.amount_captured === ""
      ? null
      : Number(payload.amount_captured);
  return {
    eventId: payload.eventId.trim(),
    orderId: payload.orderId.trim(),
    tenantOrderRef: payload.tenantOrderRef.trim(),
    status: payload.status.trim(),
    amountCaptured: amountCaptured !== null && Number.isFinite(amountCaptured) ? amountCaptured : null,
    currency: typeof payload.currency === "string" ? payload.currency : "",
    environment: typeof payload.environment === "string" ? payload.environment : "",
  };
}
