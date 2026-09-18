import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { hasCompletedOnboarding } from "@/lib/onboarding/actions";
import { getSessionUser } from "@/lib/supabase/server";
import "../landing.css";
import "../login/login.css";
import "./quiz.css";

import { QuizForm } from "./quiz-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — quick questions",
  description: "Four quick questions so Openfield can point you at the right models.",
  alternates: { canonical: "/onboarding" },
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login?next=/onboarding");
  if (await hasCompletedOnboarding()) redirect("/studio");

  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/studio";

  return (
    <div className="of-landing">
      <main className="of-login" aria-labelledby="quiz-h">
        <div className="of-login-card of-quiz-card">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <h1 id="quiz-h">Welcome in. Four quick ones.</h1>
          <p className="lede">So the studio can point you at the right models first.</p>
          <QuizForm next={safeNext} />
        </div>
      </main>
    </div>
  );
}
