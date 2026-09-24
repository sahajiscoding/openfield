import { NextResponse } from "next/server";
import { getOAuthSecret, verifyAuthorizationCode, createAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getOAuthSecret();
  } catch (caught) {
    console.error("[oauth] token failed", caught instanceof Error ? caught.message : caught);
    return NextResponse.json(
      { error: "server_error", error_description: "OAuth is not configured — try again later." },
      { status: 500 },
    );
  }

  let params: Record<string, string> = {};
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const json = await request.json();
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "string") params[k] = v;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const sp = new URLSearchParams(text);
      for (const [k, v] of sp.entries()) params[k] = v;
    } else {
      // Try both
      const text = await request.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          for (const [k, v] of Object.entries(json)) if (typeof v === "string") params[k] = v;
        } catch {
          const sp = new URLSearchParams(text);
          for (const [k, v] of sp.entries()) params[k] = v;
        }
      }
    }
  } catch {
    return NextResponse.json({ error: "invalid_request", error_description: "Failed to parse body" }, { status: 400 });
  }

  const grant_type = params.grant_type;

  if (grant_type === "authorization_code") {
    const code = params.code;
    const redirect_uri = params.redirect_uri;
    const client_id = params.client_id;
    const code_verifier = params.code_verifier;

    if (!code) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing code" }, { status: 400 });
    }

    const payload = verifyAuthorizationCode(code, secret, {
      client_id,
      redirect_uri,
      code_verifier,
    });

    if (!payload) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Invalid or expired code, or PKCE mismatch" }, { status: 400 });
    }

    // Create access token that MCP server will verify
    const accessToken = createAccessToken(
      {
        sub: payload.sub,
        email: payload.email,
        client_id: payload.client_id,
        scope: payload.scope,
        supabase_token: payload.access_token,
      },
      secret
    );

    // Optionally create refresh token (same as access token for simplicity, longer expiry)
    const refreshToken = createAccessToken(
      {
        sub: payload.sub,
        email: payload.email,
        client_id: payload.client_id,
        scope: payload.scope,
        supabase_token: payload.access_token,
      },
      secret
    );

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600 * 24,
        scope: payload.scope || "mcp",
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }
    );
  }

  if (grant_type === "refresh_token") {
    const refresh_token = params.refresh_token;
    if (!refresh_token) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing refresh_token" }, { status: 400 });
    }

    // Verify refresh token (it's actually an access token JWT)
    const { verifyAccessToken } = await import("@/lib/mcp/oauth");
    const payload = verifyAccessToken(refresh_token, secret);
    if (!payload) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Invalid refresh token" }, { status: 400 });
    }

    const newAccessToken = createAccessToken(
      {
        sub: payload.sub,
        email: payload.email,
        client_id: payload.client_id,
        scope: payload.scope,
        supabase_token: payload.supabase_token,
      },
      secret
    );

    return NextResponse.json(
      {
        access_token: newAccessToken,
        token_type: "Bearer",
        expires_in: 3600 * 24,
        scope: payload.scope || "mcp",
        refresh_token: refresh_token, // reuse
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: `Grant type ${grant_type} not supported` },
    { status: 400 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
