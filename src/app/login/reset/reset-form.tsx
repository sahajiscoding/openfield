"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`,
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="of-ok" role="status">Check your inbox — the reset link expires in 1 hour and works once.</p>;
  }

  return (
    <div>
      {error && <p className="of-error" role="alert">{error}</p>}
      <div className="of-field">
        <label htmlFor="of-reset-email">Email</label>
        <input
          id="of-reset-email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="of-login-actions">
        <button type="button" className="of-btn of-btn--lime" disabled={busy || !email.trim()} onClick={() => void send()}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </div>
      <p className="of-fineprint"><Link href="/login">← Back to sign in</Link></p>
    </div>
  );
}
