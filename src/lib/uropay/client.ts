import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * UroPay Merchant API v1 (https://api.uropai.in/documentation).
 * Server-only: signing secret never leaves Vercel env.
 */

const BASE_URL = (process.env.UROPAY_BASE_URL ?? "https://api.uropai.in").replace(/\/$/, "");

function creds(): { key: string; secret: string } {
  const key = process.env.UROPAY_API_KEY?.trim();
  const secret = process.env.UROPAY_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("Payments are not configured yet — the operator must add UROPAY_API_KEY / UROPAY_API_SECRET in Vercel.");
  }
  return { key, secret };
}

function signRequest(
  method: string,
  path: string,
  query: string,
  rawBody: string,
  secret: string,
): { timestamp: string; nonce: string; signature: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID();
  const canonical = [method, path, timestamp, nonce, query, rawBody].join("\n");
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");
  return { timestamp, nonce, signature };
}

function signedHeaders(
  method: string,
  path: string,
  query: string,
  rawBody: string,
): Record<string, string> {
  const { key, secret } = creds();
  const { timestamp, nonce, signature } = signRequest(method, path, query, rawBody, secret);
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

async function readEnvelope(res: Response, what: string): Promise<UropayOrder> {
  const json = (await res.json().catch(() => null)) as {
    code?: number;
    status?: string;
    message?: string;
    data?: UropayOrder;
  } | null;
  if (!res.ok || !json || json.status !== "success" || !json.data) {
    throw new Error(`UroPay ${what} failed (${res.status}): ${(json?.message ?? "unknown").slice(0, 160)}`);
  }
  return json.data;
}

export async function createUropayOrder(input: {
  tenantOrderRef: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  returnUrl?: string;
  webhookUrl?: string;
  metaData?: Record<string, string>;
}): Promise<UropayOrder> {
  const path = "/v1/orders";
  const body = JSON.stringify({
    tenantOrderRef: input.tenantOrderRef,
    amount: input.amount,
    currency: input.currency,
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
    ...(input.metaData ? { metaData: input.metaData } : {}),
  });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: signedHeaders("POST", path, "", body),
    body,
  });
  return readEnvelope(res, "order");
}

/** Authoritative status — webhooks are advisory; this is truth. */
export async function getUropayOrder(orderId: string): Promise<UropayOrder> {
  const path = `/v1/orders/${encodeURIComponent(orderId)}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: signedHeaders("GET", path, "", ""),
    cache: "no-store",
  });
  return readEnvelope(res, "lookup");
}

export type UropayWebhookEvent = {
  eventId: string;
  orderId: string;
  tenantOrderRef: string;
  status: string;
  amountCaptured: number;
  currency: string;
  environment: string;
};

/**
 * Verify an inbound order-status webhook. Per docs the request is signed with
 * path '/tenant-webhook' and an empty query string; we additionally enforce
 * timestamp freshness and compare in constant time.
 */
export function verifyUropayWebhook(headers: Headers, rawBody: string): UropayWebhookEvent {
  const { secret } = creds();
  const timestamp = headers.get("x-timestamp") ?? "";
  const nonce = headers.get("x-nonce") ?? "";
  const signature = headers.get("x-signature") ?? "";
  if (!timestamp || !nonce || !signature) throw new Error("Missing webhook signature headers.");

  const ts = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || now - ts > 300 || ts - now > 30) {
    throw new Error("Stale webhook timestamp.");
  }

  const canonical = ["POST", "/tenant-webhook", timestamp, nonce, "", rawBody].join("\n");
  const expected = createHmac("sha256", secret).update(canonical).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
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
    typeof payload.orderId !== "string" ||
    typeof payload.tenantOrderRef !== "string" ||
    typeof payload.status !== "string"
  ) {
    throw new Error("Malformed webhook payload.");
  }
  return {
    eventId: payload.eventId,
    orderId: payload.orderId,
    tenantOrderRef: payload.tenantOrderRef,
    status: payload.status,
    amountCaptured: typeof payload.amount_captured === "number" ? payload.amount_captured : 0,
    currency: typeof payload.currency === "string" ? payload.currency : "",
    environment: typeof payload.environment === "string" ? payload.environment : "",
  };
}
