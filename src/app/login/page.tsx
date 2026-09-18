import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "./login-form";
import "../landing.css";
import "./login.css";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Openfield with magic link, password, or Google via Supabase.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <div className="of-landing">
      <main className="of-login" aria-labelledby="login-h">
        <div className="of-login-card">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <h1 id="login-h">Sign in to the studio.</h1>
          <p className="lede">Magic link, password, or Google. Your generations stay yours.</p>
          <Suspense fallback={<p className="lede">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
