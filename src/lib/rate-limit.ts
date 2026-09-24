/**
 * Minimal in-memory sliding-window rate limiter for Server Actions and
 * Route Handlers. Best-effort on serverless (each isolate holds its own
 * buckets), so limits are a speed bump for casual abuse, not a DDoS wall —
 * pair with provider-side quotas and Vercel/Supabase platform limits.
 */

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.reset) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS / 2) break;
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterMs: current.reset - now };
  }
  current.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

/** Throws a user-safe error when the caller is over budget. */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new Error("Too many requests — wait a moment and try again.");
  }
}

/** Best-effort client IP behind Vercel/proxies. Never a secret, only a key. */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return (headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

/**
 * Same-origin guard for cookie-authenticated route handlers (CSRF).
 *
 * Compares the Origin header (falling back to Referer) against the deployed
 * site host. Requests with neither header (curl, server-to-server, some
 * privacy modes) are allowed through — they carry no ambient authority to
 * abuse and the session cookie is what matters. A present-but-foreign origin
 * is a cross-site forgery attempt and is refused.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = (origin ?? referer ?? "").trim();
  if (!candidate) return true;
  let candidateHost = "";
  try {
    candidateHost = new URL(candidate).host.toLowerCase();
  } catch {
    return false;
  }
  // Same-origin = the page that sent the request lives on this host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "").split(",")[0]!.trim().toLowerCase();
  if (host && candidateHost === host) return true;
  // Otherwise fall back to the canonical site URL (covers proxies that
  // rewrite Host, and keeps localhost dev working).
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!site) return true; // Unconfigured: nothing to compare against.
  try {
    return candidateHost === new URL(site).host.toLowerCase();
  } catch {
    return true;
  }
}
