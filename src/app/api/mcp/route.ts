import { NextResponse } from "next/server";

import { MODELS } from "@/generation/catalog";
import { TOKEN_PACKS } from "@/lib/credits/packs";
import { serviceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function reply(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

export async function GET() {
  return NextResponse.json({ name: "openfield", version: "1.0.0", protocolVersion: "2025-06-18", capabilities: { tools: {} } });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Bearer authentication required" }, { status: 401 });

  const { data: { user }, error } = await serviceClient().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Invalid access token" }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown; method?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON-RPC request" }, { status: 400 });
  if (body.method === "initialize") {
    return reply(body.id, { protocolVersion: "2025-06-18", serverInfo: { name: "openfield", version: "1.0.0" }, capabilities: { tools: {} } });
  }
  if (body.method === "notifications/initialized") return new NextResponse(null, { status: 202 });
  if (body.method === "tools/list") {
    return reply(body.id, { tools: [
      { name: "openfield_models", description: "List Openfield image and video models.", inputSchema: { type: "object", properties: {} } },
      { name: "openfield_pricing", description: "List current Openfield token packs.", inputSchema: { type: "object", properties: {} } },
    ] });
  }
  if (body.method === "tools/call") {
    const params = (body as { params?: { name?: string } }).params;
    if (params?.name === "openfield_models") return reply(body.id, { content: [{ type: "text", text: JSON.stringify(MODELS.map((model) => ({ id: model.id, label: model.label, surface: model.surface }))) }] });
    if (params?.name === "openfield_pricing") return reply(body.id, { content: [{ type: "text", text: JSON.stringify(TOKEN_PACKS) }] });
  }
  return reply(body.id, { error: { code: -32601, message: "Method not found" } });
}
