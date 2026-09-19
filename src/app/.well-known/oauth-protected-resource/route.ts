import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const base = getBaseUrl(request);
  return NextResponse.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [`${base}/api/mcp/.well-known/oauth-authorization-server`],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp"],
      resource_name: "Openfield MCP",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
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
