import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base = getBaseUrl(request);
  const authBase = `${base}/api/mcp/oauth`;

  // Root discovery should point to MCP auth server
  const metadata = {
    issuer: base,
    authorization_endpoint: `${authBase}/authorize`,
    token_endpoint: `${authBase}/token`,
    registration_endpoint: `${authBase}/register`,
    scopes_supported: ["mcp", "openid", "profile", "email"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
