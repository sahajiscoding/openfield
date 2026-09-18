import { NextResponse } from "next/server";

import { MODELS } from "@/generation/catalog";
import { TOKEN_PACKS } from "@/lib/credits/packs";
import { serviceClient } from "@/lib/supabase/admin";
import { getBaseUrl, getOAuthSecret, verifyAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";

function reply(id: unknown, result: unknown, init?: ResponseInit) {
  return NextResponse.json({ jsonrpc: "2.0", id, result }, init);
}

function unauthorizedResponse(request: Request) {
  const base = getBaseUrl(request);
  const resourceMetadata = `${base}/api/mcp/.well-known/oauth-protected-resource`;

  return NextResponse.json(
    { error: "Bearer authentication required" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer realm="openfield", resource_metadata="${resourceMetadata}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function GET(request: Request) {
  const base = getBaseUrl(request);
  return NextResponse.json(
    {
      name: "openfield",
      version: "1.0.0",
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      // Hint for MCP clients that support OAuth discovery via GET
      _meta: {
        auth: {
          type: "oauth",
          authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
          token_endpoint: `${base}/api/mcp/oauth/token`,
          protected_resource_metadata: `${base}/api/mcp/.well-known/oauth-protected-resource`,
          authorization_server_metadata: `${base}/api/mcp/.well-known/oauth-authorization-server`,
        },
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return unauthorizedResponse(request);
  }

  // Try to verify as Supabase token directly (legacy manual flow)
  let supabaseToken = token;
  let userId: string | null = null;

  const { data: directData, error: directError } = await serviceClient().auth.getUser(token);
  if (!directError && directData.user) {
    userId = directData.user.id;
  } else {
    // Try to verify as our OAuth JWT access token
    const secret = getOAuthSecret();
    const oauthPayload = verifyAccessToken(token, secret);
    if (oauthPayload && oauthPayload.supabase_token) {
      supabaseToken = oauthPayload.supabase_token;
      const { data: oauthData, error: oauthError } = await serviceClient().auth.getUser(supabaseToken);
      if (!oauthError && oauthData.user) {
        userId = oauthData.user.id;
      } else {
        // If supabase token inside JWT is expired, we still have user id from JWT, allow? For better UX, allow JWT even if inner token expired, as long as JWT valid
        // But we should try to verify via serviceClient anyway - if fails, we can still trust JWT if it's valid and not expired, as it was issued by us
        // For now, trust JWT payload
        userId = oauthPayload.sub;
      }
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Invalid access token" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer error="invalid_token", error_description="Invalid or expired token"`,
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown; method?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON-RPC request" }, { status: 400 });

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (body.method === "initialize") {
    return reply(
      body.id,
      {
        protocolVersion: "2025-06-18",
        serverInfo: { name: "openfield", version: "1.0.0" },
        capabilities: { tools: {} },
      },
      { headers: corsHeaders }
    );
  }
  if (body.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202, headers: corsHeaders });
  }
  if (body.method === "tools/list") {
    return reply(
      body.id,
      {
        tools: [
          {
            name: "openfield_models",
            description: "List Openfield image and video models (38 Higgsfield models).",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "openfield_pricing",
            description: "List current Openfield token packs and per-model pricing.",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      },
      { headers: corsHeaders }
    );
  }
  if (body.method === "tools/call") {
    const params = (body as { params?: { name?: string } }).params;
    if (params?.name === "openfield_models") {
      return reply(
        body.id,
        {
          content: [
            {
              type: "text",
              text: JSON.stringify(MODELS.map((model) => ({ id: model.id, label: model.label, surface: model.surface }))),
            },
          ],
        },
        { headers: corsHeaders }
      );
    }
    if (params?.name === "openfield_pricing") {
      return reply(
        body.id,
        { content: [{ type: "text", text: JSON.stringify(TOKEN_PACKS) }] },
        { headers: corsHeaders }
      );
    }
  }
  return reply(body.id, { error: { code: -32601, message: "Method not found" } }, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
