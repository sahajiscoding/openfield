import { NextResponse } from "next/server";

import { saveOnboarding, skipOnboarding } from "@/lib/onboarding/actions";

/**
 * Plain-JSON sibling to the onboarding server actions. Same logic, but a
 * fetch transport: failures arrive as readable { error } strings instead of
 * redacted RSC errors, so users (and logs) see the actual cause.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: {
    op?: unknown;
    useCase?: unknown;
    referralSource?: unknown;
    experience?: unknown;
    dob?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  try {
    if (body.op === "skip") {
      await skipOnboarding();
      return NextResponse.json({ ok: true });
    }
    if (body.op === "save") {
      await saveOnboarding({
        useCase: body.useCase,
        referralSource: body.referralSource,
        experience: body.experience,
        dob: body.dob ?? null,
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown operation." }, { status: 400 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const status = message.includes("Sign in") ? 401 : 500;
    return NextResponse.json({ error: message || "Couldn't save — try again." }, { status });
  }
}
