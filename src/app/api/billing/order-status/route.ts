import { NextResponse } from "next/server";

import { pollOrderStatus } from "@/lib/billing/actions";
import { isAllowedOrigin } from "@/lib/rate-limit";

/**
 * Poll authoritative UroPay status for our tenant ref. Credits idempotently
 * when the provider reports COMPLETED (covers missed webhooks).
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref")?.trim();
  if (!ref) return NextResponse.json({ error: "Missing ?ref= order reference." }, { status: 400 });
  try {
    const result = await pollOrderStatus(ref);
    return NextResponse.json({ ok: true, ...result });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.includes("Sign in")) {
      return NextResponse.json({ error: message, code: "auth" }, { status: 401 });
    }
    return NextResponse.json({ error: message || "Could not check status." }, { status: 500 });
  }
}
