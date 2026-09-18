import type { Metadata } from "next";
import Link from "next/link";

import { UpdatePasswordForm } from "./update-password-form";
import "../../landing.css";
import "../login.css";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your Openfield account.",
  alternates: { canonical: "/login/update-password" },
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <div className="of-landing">
      <main className="of-login" aria-labelledby="upw-h">
        <div className="of-login-card">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <h1 id="upw-h">Choose a new password.</h1>
          <p className="lede">Setting it signs this session in with the new credential.</p>
          <UpdatePasswordForm />
        </div>
      </main>
    </div>
  );
}
