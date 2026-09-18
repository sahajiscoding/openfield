import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import "../../landing.css";
import "../../login/login.css";

import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Security",
  description: "Manage your Openfield second factor and account security.",
  alternates: { canonical: "/studio/security" },
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  try {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/studio/security");
    void user;
  } catch {
    redirect("/login?next=/studio/security&error=missing_env");
  }
  return (
    <div className="of-landing">
      <main className="of-login" aria-labelledby="sec-h">
        <div className="of-login-card">
          <Link href="/studio" className="of-brand" aria-label="Back to studio">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <h1 id="sec-h">Account security.</h1>
          <p className="lede">Provider keys live in httpOnly cookies and wipe on sign-out. Add TOTP below.</p>
          <MfaForm />
          <p className="of-fineprint"><Link href="/studio">← Back to studio</Link></p>
        </div>
      </main>
    </div>
  );
}
