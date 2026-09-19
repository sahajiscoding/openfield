import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base = getBaseUrl(request);
  const issuer = base;
  const authBase = `${base}/api/mcp/oauth`;

  const metadata = {
    issuer,
    authorization_endpoint: `${authBase}/authorize`,
    token_endpoint: `${authBase}/token`,
    registration_endpoint: `${authBase}/register`,
    scopes_supported: ["mcp"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    authorization_response_iss_parameter_supported: true,
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
