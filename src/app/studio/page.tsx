import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTokenBalance } from "@/lib/credits/wallet";
import { hasCompletedOnboardingFor } from "@/lib/onboarding/status";
import { getSessionUser } from "@/lib/supabase/server";

import { StudioShell } from "./studio-shell";
import "./studio.css";
import "@/openhiggsfield/openhiggsfield.css";

export const metadata: Metadata = {
  title: "Studio",
  description: "Generate cinematic image and video with Seedance 2.5, Kling 3, Soul and 30+ Higgsfield models. Pay per generation in tokens.",
  alternates: { canonical: "/studio" },
};

/**
 * Studio first paint.
 *
 * This route is the whole reason the app feels slow if it is careless: it is
 * the one page people click into expecting to land *in* a tool. Three things
 * used to run one after another before a single byte reached the browser —
 * a session read, then a wallet read that re-read the session to authorize
 * itself, then an onboarding check that re-read the session a third time. Each
 * hop is a Supabase round trip, so ~5 network calls of latency stacked in
 * front of the HTML.
 *
 * Now: the session is read once, and the two independent reads that follow
 * (wallet balance, quiz answer) run together in one `Promise.all`. Neither
 * waits on the other, and neither re-authenticates. The authorization is
 * unchanged — signed out still redirects, and the wallet is still read
 * server-side; there is simply no duplicated work.
 */
export default async function StudioPage() {
  // Fail closed: any auth misconfiguration sends the visitor to /login
  // instead of rendering an ungated shell.
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    user = await getSessionUser();
  } catch {
    // Only the "env missing / client construction failed" path lands here —
    // redirect() is called outside any try so its own NEXT_REDIRECT signal is
    // never swallowed and re-pointed at the wrong destination.
    redirect("/login?next=/studio&error=missing_env");
  }
  if (!user) redirect("/login?next=/studio");
  const email = user.email ?? undefined;

  const [balance, onboarded] = await Promise.all([
    getTokenBalance(user.id).catch(() => 0),
    // First visit: answer four onboarding questions before generating.
    hasCompletedOnboardingFor(user.id),
  ]);
  if (!onboarded) redirect("/onboarding?next=/studio");

  return (
    <main aria-label="Openfield studio">
      <StudioShell email={email} balance={balance} />
    </main>
  );
}
