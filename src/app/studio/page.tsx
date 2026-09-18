import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";

import { StudioShell } from "./studio-shell";
import "./studio.css";
import "@/openhiggsfield/openhiggsfield.css";

export const metadata: Metadata = {
  title: "Studio",
  description: "Generate cinematic image and video with Seedance 2.5, Kling, Soul and 400+ MuAPI models.",
  alternates: { canonical: "/studio" },
};

export default async function StudioPage() {
  let email: string | undefined;
  try {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/studio");
    email = user.email ?? undefined;
  } catch {
    // Supabase env missing — render shell in demo mode with guidance.
    email = undefined;
  }
  return (
    <main aria-label="Openfield studio">
      <StudioShell email={email} />
    </main>
  );
}
