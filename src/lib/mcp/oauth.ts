import { createHmac, randomBytes, createHash } from "crypto";

const DEFAULT_ISSUER = "https://openfieldai.vercel.app";

export function getBaseUrl(req?: Request): string {
  // Prefer env, then request host, then default
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl.replace(/\/$/, "") : `https://${envUrl}`;
  }
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) {
      // Avoid localhost http issues but keep https for prod
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        return `http://${host}`;
      }
      return `${proto}://${host}`;
    }
  }
  return DEFAULT_ISSUER;
}

/**
 * Signing key for MCP authorization codes, access tokens, and client ids.
 *
 * Fail-closed in production: falling back to the Supabase service key would
 * repurpose a database credential as a JWT key, and the hardcoded dev string
 * is public to anyone who read this repo — either would let an attacker forge
 * MCP tokens. In development the fallbacks below keep `npm run dev` working
 * with a loud warning.
 */
export function getOAuthSecret(): string {
  const raw = process.env.OAUTH_SECRET?.trim().replace(/^["']|["']$/g, "").trim();
  if (raw) {
    if (raw.length < 32) {
      console.warn("[oauth] OAUTH_SECRET is set but shorter than 32 characters — use 32+ random bytes.");
    }
    return raw;
  }
  const prod =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (prod) {
    throw new Error(
      "Server misconfigured: set OAUTH_SECRET (32+ random bytes) in Vercel and redeploy.",
    );
  }
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service) {
    console.warn("[oauth] OAUTH_SECRET unset — dev-only fallback to the service key. Set OAUTH_SECRET.");
    return service;
  }
  console.warn("[oauth] OAUTH_SECRET unset — dev-only fallback to an insecure placeholder. Set OAUTH_SECRET.");
  return "openfield-dev-oauth-secret-please-set-OAUTH_SECRET";
}

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(base64, "base64");
}

export function signJwt(payload: Record<string, unknown>, secret: string, expiresInSec: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  const sigB64 = base64urlEncode(sig);
  return `${data}.${sigB64}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = base64urlEncode(createHmac("sha256", secret).update(data).digest());
    if (expectedSig !== sigB64) return null;
    const payloadJson = base64urlDecode(payloadB64).toString("utf-8");
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function generateRandomString(length = 32): string {
  return base64urlEncode(randomBytes(length));
}

export function sha256Base64Url(input: string): string {
  return base64urlEncode(createHash("sha256").update(input).digest());
}

// Authorization code payload
export type AuthCodePayload = {
  sub: string; // user id
  email?: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  // We store the supabase access token encrypted? For simplicity, store it in code payload
  // In production, you'd store a reference and look up, but JWT approach is okay for demo
  access_token: string; // supabase access token
  // for PKCE S256
};

export function createAuthorizationCode(payload: AuthCodePayload, secret: string): string {
  // 10 minute expiry
  return signJwt(payload as unknown as Record<string, unknown>, secret, 600);
}

export function verifyAuthorizationCode(
  code: string,
  secret: string,
  opts: { client_id?: string; redirect_uri?: string; code_verifier?: string }
): AuthCodePayload | null {
  const payload = verifyJwt(code, secret) as AuthCodePayload | null;
  if (!payload) return null;
  if (opts.client_id && payload.client_id !== opts.client_id) return null;
  if (opts.redirect_uri && payload.redirect_uri !== opts.redirect_uri) return null;

  // PKCE verification
  if (payload.code_challenge) {
    if (!opts.code_verifier) return null;
    const method = payload.code_challenge_method || "S256";
    let computed: string;
    if (method === "S256") {
      computed = sha256Base64Url(opts.code_verifier);
    } else {
      // plain
      computed = base64urlEncode(opts.code_verifier);
    }
    if (computed !== payload.code_challenge) return null;
  }

  return payload;
}

// Access token payload (what we return to MCP client, and what MCP server verifies)
export type AccessTokenPayload = {
  sub: string;
  email?: string;
  client_id: string;
  scope?: string;
  // we also embed the original supabase access token so MCP server can verify user via supabase
  supabase_token: string;
};

export function createAccessToken(payload: AccessTokenPayload, secret: string): string {
  // 1 hour expiry, but MCP clients will use it until expiry, then need refresh or re-auth
  // We also set longer expiry for better UX: 24h
  return signJwt(payload as unknown as Record<string, unknown>, secret, 3600 * 24);
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload | null {
  const payload = verifyJwt(token, secret) as AccessTokenPayload | null;
  if (!payload) return null;
  return payload;
}


export type RegisteredClient = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  response_types: string[];
  grant_types: string[];
  token_endpoint_auth_method: "none";
  application_type: "web" | "native";
  client_uri?: string;
};

export function createClientId(
  client: Omit<RegisteredClient, "client_id">,
  secret: string,
): string {
  return signJwt(
    {
      typ: "mcp-client",
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      response_types: client.response_types,
      grant_types: client.grant_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      application_type: client.application_type,
      client_uri: client.client_uri,
    },
    secret,
    60 * 60 * 24 * 365,
  );
}

export function verifyClientId(clientId: string, secret: string): RegisteredClient | null {
  const payload = verifyJwt(clientId, secret);
  if (!payload || payload.typ !== "mcp-client") return null;
  if (!Array.isArray(payload.redirect_uris) || payload.redirect_uris.some((uri) => typeof uri !== "string")) return null;
  if (payload.token_endpoint_auth_method !== "none") return null;

  return {
    client_id: clientId,
    client_name: typeof payload.client_name === "string" ? payload.client_name : "MCP client",
    redirect_uris: payload.redirect_uris as string[],
    response_types: Array.isArray(payload.response_types) ? payload.response_types.filter((v): v is string => typeof v === "string") : ["code"],
    grant_types: Array.isArray(payload.grant_types) ? payload.grant_types.filter((v): v is string => typeof v === "string") : ["authorization_code"],
    token_endpoint_auth_method: "none",
    application_type: payload.application_type === "native" ? "native" : "web",
    client_uri: typeof payload.client_uri === "string" ? payload.client_uri : undefined,
  };
}
