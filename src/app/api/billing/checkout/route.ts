import { NextResponse } from "next/server";

import { buyTokenPack } from "@/lib/billing/actions";

/**
 * Hosted checkout: returns { openUrl } for the UroPay payment page.
 * Failures arrive as readable { error } strings.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let packId: unknown;
  try {
    packId = ((await request.json()) as { packId?: unknown }).packId;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (typeof packId !== "string" || !packId) {
    return NextResponse.json({ error: "Choose a pack." }, { status: 400 });
  }

  try {
    const { openUrl } = await buyTokenPack(packId);
    return NextResponse.json({ ok: true, openUrl });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (/minified react error|server components render/i.test(message)) {
      return NextResponse.json({ error: "Checkout failed — try again in a moment." }, { status: 500 });
    }
    if (message.includes("Sign in") || message.includes("Verify your email")) {
      return NextResponse.json({ error: message, code: "auth" }, { status: 401 });
    }
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message || "Checkout failed — try again." }, { status });
  }
}
