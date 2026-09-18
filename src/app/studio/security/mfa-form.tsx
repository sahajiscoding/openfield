"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type TotpFactor = { id: string; friendly_name?: string | null; status: string };

/** Opt-in TOTP second factor: enroll → verify → manage, unenroll anytime. */
export function MfaForm() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function refresh() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setMessage({ kind: "err", text: error.message });
      return;
    }
    setFactors((data?.totp ?? []) as TotpFactor[]);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function enroll() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Openfield" });
      if (error || !data) {
        setMessage({ kind: "err", text: error?.message ?? "Enrollment failed." });
        return;
      }
      setEnrollId(data.id);
      setSecret(data.totp.secret);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!enrollId || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId: enrollId });
      if (challenge.error || !challenge.data) {
        setMessage({ kind: "err", text: challenge.error?.message ?? "Challenge failed." });
        return;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (error) {
        setMessage({ kind: "err", text: error.message });
        return;
      }
      setMessage({ kind: "ok", text: "Second factor verified and active." });
      setEnrollId(null);
      setSecret(null);
      setCode("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(factorId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) setMessage({ kind: "err", text: error.message });
      else {
        setMessage({ kind: "ok", text: "Second factor removed." });
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <div>
      {message && (
        <p className={message.kind === "ok" ? "of-ok" : "of-error"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {verified.length > 0 ? (
        <div>
          <p className="lede">Active second factors:</p>
          {verified.map((f) => (
            <p key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
              <span className="of-pill of-pill--lime">TOTP ✓</span>
              <span style={{ color: "var(--of-smoke)" }}>{f.friendly_name ?? f.id.slice(0, 8)}</span>
              <button type="button" className="of-btn" disabled={busy} onClick={() => void unenroll(f.id)}>
                Remove
              </button>
            </p>
          ))}
        </div>
      ) : (
        <p className="lede">No second factor yet. Add one so a stolen password alone isn&apos;t enough.</p>
      )}

      {!enrollId ? (
        <div className="of-login-actions">
          <button type="button" className="of-btn" disabled={busy} onClick={() => void enroll()}>
            {busy ? "Starting…" : "Add authenticator app"}
          </button>
        </div>
      ) : (
        <div>
          <p className="lede">Scan this secret into your authenticator app (1Password, Apple Passwords, Authy…), then enter the 6-digit code:</p>
          <p className="of-mock-prompt" style={{ wordBreak: "break-all", fontSize: 13 }} aria-label="TOTP secret">
            {secret}
          </p>
          <div className="of-field">
            <label htmlFor="of-mfa-code">6-digit code</label>
            <input
              id="of-mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="of-login-actions">
            <button type="button" className="of-btn of-btn--lime" disabled={busy || !code.trim()} onClick={() => void verify()}>
              {busy ? "Verifying…" : "Verify and activate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
