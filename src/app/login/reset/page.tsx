import type { Metadata } from "next";
import Link from "next/link";

import { ResetForm } from "./reset-form";
import "../../landing.css";
import "../login.css";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Get a single-use reset link for your Openfield account.",
  alternates: { canonical: "/login/reset" },
};

export default function ResetPage() {
  return (
    <div className="of-landing">
      <main className="of-login" aria-labelledby="reset-h">
        <div className="of-login-card">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <h1 id="reset-h">Reset your password.</h1>
          <p className="lede">One link, one hour, one use — then it dies.</p>
          <ResetForm />
        </div>
      </main>
    </div>
  );
}
