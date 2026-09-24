import { NextResponse } from "next/server";
import { createClientId, getBaseUrl, getOAuthSecret } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Registration body must be JSON." },
      { status: 400, headers: corsHeaders },
    );
  }

  const rawRedirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  const redirectUris = rawRedirectUris.filter((value): value is string => typeof value === "string");

  if (!redirectUris.length || redirectUris.length !== rawRedirectUris.length) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must contain at least one valid URI." },
      { status: 400, headers: corsHeaders },
    );
  }

  for (const redirectUri of redirectUris) {
    try {
      const parsed = new URL(redirectUri);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        return NextResponse.json(
          { error: "invalid_redirect_uri", error_description: "Redirect URIs must use HTTPS, except localhost development URIs." },
          { status: 400, headers: corsHeaders },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "Every redirect URI must be an absolute URI." },
        { status: 400, headers: corsHeaders },
      );
    }
  }

  const responseTypes = Array.isArray(body.response_types)
    ? body.response_types.filter((value): value is string => typeof value === "string")
    : ["code"];
  const grantTypes = Array.isArray(body.grant_types)
    ? body.grant_types.filter((value): value is string => typeof value === "string")
    : ["authorization_code"];

  if (!responseTypes.includes("code") || !grantTypes.includes("authorization_code")) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Openfield MCP OAuth supports authorization_code with response type code." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Openfield MCP uses public PKCE clients; token_endpoint_auth_method must be none." },
      { status: 400, headers: corsHeaders },
    );
  }

  const applicationType = body.application_type === "native" ? "native" : "web";
  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 120)
      : "MCP client";
  const clientUri = typeof body.client_uri === "string" ? body.client_uri : undefined;

  let secret: string;
  try {
    secret = getOAuthSecret();
  } catch (caught) {
    console.error("[oauth] register failed", caught instanceof Error ? caught.message : caught);
    return NextResponse.json(
      { error: "server_error", error_description: "OAuth is not configured — try again later." },
      { status: 500, headers: corsHeaders },
    );
  }

  const clientId = createClientId(
    {
      client_name: clientName,
      redirect_uris: redirectUris,
      response_types: responseTypes,
      grant_types: grantTypes,
      token_endpoint_auth_method: "none",
      application_type: applicationType,
      client_uri: clientUri,
    },
    secret,
  );

  const base = getBaseUrl(request);

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      response_types: ["code"],
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "none",
      application_type: applicationType,
      ...(clientUri ? { client_uri: clientUri } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      registration_client_uri: `${base}/api/mcp/oauth/register`,
      scope: "mcp",
    },
    { status: 201, headers: { ...corsHeaders, "Cache-Control": "no-store" } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}
