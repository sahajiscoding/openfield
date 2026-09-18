import { NextResponse } from "next/server";
import { getBaseUrl, generateRandomString } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    const text = await request.text().catch(() => "");
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // ignore
      }
    }
  }

  const clientId = (body.client_id as string) || `openfield-mcp-${generateRandomString(8)}`;
  const clientSecret = generateRandomString(24);
  const redirectUris = (body.redirect_uris as string[]) || (body.redirect_uri ? [body.redirect_uri as string] : []);

  const response = {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: redirectUris.length ? redirectUris : undefined,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: "mcp",
    client_name: (body.client_name as string) || "MCP Client",
  };

  return NextResponse.json(response, {
    status: 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store",
    },
  });
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

export async function GET(request: Request) {
  const base = getBaseUrl(request);
  return NextResponse.json(
    {
      message: "Use POST to register",
      registration_endpoint: `${base}/api/mcp/oauth/register`,
    },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
