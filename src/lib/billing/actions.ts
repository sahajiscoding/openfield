"use server";

import { headers } from "next/headers";

import { getPack } from "@/lib/credits/packs";
import {
  attachProviderOrder,
  createPendingOrder,
  getMyOrders,
  getTokenBalance,
  setOrderStatus,
  type TokenOrder,
} from "@/lib/credits/wallet";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { permissionDiagnosis } from "@/lib/supabase/admin";
import { requireSessionUser } from "@/lib/supabase/server";
import { createUropayOrder } from "@/lib/uropay/client";

export async function getMyBalance(): Promise<number> {
  const user = await requireSessionUser();
  return getTokenBalance(user.id);
}

export async function getMyTokenOrders(): Promise<TokenOrder[]> {
  const user = await requireSessionUser();
  return getMyOrders(user.id);
}

/** Start a UroPay checkout for a token pack. Returns the hosted openUrl. */
export async function buyTokenPack(packId: string): Promise<{ openUrl: string }> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  enforceRateLimit(`billing:${user.id}:${ip}`, 5, 60_000);

  const pack = getPack(packId);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const tenantRef = `of-${Date.now().toString(36)}-${user.id.slice(0, 8)}`;

  await createPendingOrder({
    userId: user.id,
    packId: pack.id,
    tokens: pack.tokens,
    amount: pack.inr,
    currency: "INR",
    tenantRef,
  });

  try {
    const order = await createUropayOrder({
      tenantOrderRef: tenantRef,
      amount: pack.inr,
      currency: "INR",
      customerEmail: user.email ?? undefined,
      returnUrl: `${site}/studio/billing?ref=${encodeURIComponent(tenantRef)}`,
      webhookUrl: `${site}/api/uropay/webhook`,
      metaData: { pack: pack.id, tokens: String(pack.tokens), user: user.id },
    });
    await attachProviderOrder(tenantRef, order.id);
    if (!order.openUrl) throw new Error("Checkout closed immediately.");
    console.info("[billing] checkout started", { userId: user.id, pack: pack.id, tenantRef });
    return { openUrl: order.openUrl };
  } catch (caught) {
    await setOrderStatus(tenantRef, "cancelled").catch(() => {});
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message.includes("Sign in")) throw caught;
    if (message.includes("Payments are not configured")) throw caught;
    // UroPay's own refusal (bad keys, amount below minimum…) is safe to show.
    if (message.startsWith("UroPay")) throw new Error(message);
    // Our order-row write failed — almost always the service key / RLS story.
    if (message.includes("Could not start checkout") || message.includes("Could not link payment")) {
      console.error("[billing] order-row write failed", { userId: user.id, tenantRef });
      throw new Error(`${permissionDiagnosis()} Then retry.`);
    }
    console.error("[billing] checkout failed", { userId: user.id, tenantRef });
    throw new Error("Checkout could not start — try again in a moment.");
  }
}
