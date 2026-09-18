import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMyBalance } from "@/lib/billing/actions";
import { getSessionUser } from "@/lib/supabase/server";

import { StudioShell } from "./studio-shell";
import "./studio.css";
import "@/openhiggsfield/openhiggsfield.css";

export const metadata: Metadata = {
  title: "Studio",
  description: "Generate cinematic image and video with Seedance 2.5, Kling 3, Soul and 30+ Higgsfield models. Pay per generation in tokens.",
  alternates: { canonical: "/studio" },
};

export default async function StudioPage() {
  // Fail closed: any auth misconfiguration sends the visitor to /login
  // instead of rendering an ungated shell.
  let email: string | undefined;
  try {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/studio");
    email = user.email ?? undefined;
  } catch {
    redirect("/login?next=/studio&error=missing_env");
  }
  const balance = await getMyBalance().catch(() => 0);
  return (
    <main aria-label="Openfield studio">
      <StudioShell email={email} balance={balance} />
    </main>
  );
}
