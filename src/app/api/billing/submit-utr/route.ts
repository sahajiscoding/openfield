import { NextResponse } from "next/server";

import { submitUtr } from "@/lib/billing/actions";

export async function POST(request: Request): Promise<NextResponse> {
  let body: { tenantRef?: unknown; utr?: unknown };
  try {
    body = (await request.json()) as { tenantRef?: unknown; utr?: unknown };
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (typeof body.tenantRef !== "string" || !body.tenantRef) {
    return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  }
  try {
    const result = await submitUtr(body.tenantRef, body.utr);
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.includes("Sign in") || message.includes("Verify your email")) {
      return NextResponse.json({ error: message, code: "auth" }, { status: 401 });
    }
    return NextResponse.json({ error: message || "Could not submit UTR." }, { status: 500 });
  }
}
