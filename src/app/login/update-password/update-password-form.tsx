"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!live) return;
        if (!data.user) setError("This reset link is invalid or expired — request a fresh one.");
        else setReady(true);
      })
      .catch(() => {
        if (live) setError("Could not verify this reset link — request a fresh one.");
      });
    return () => {
      live = false;
    };
  }, []);

  async function save() {
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        router.push("/studio");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!ready && !error) return <p className="lede">Verifying reset link…</p>;

  return (
    <div>
      {error && <p className="of-error" role="alert">{error}</p>}
      {ready && (
        <>
          <div className="of-field">
            <label htmlFor="of-new-pass">New password</label>
            <input
              id="of-new-pass"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="of-field">
            <label htmlFor="of-new-pass-2">Confirm new password</label>
            <input
              id="of-new-pass-2"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat it"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
            />
          </div>
          <div className="of-login-actions">
            <button type="button" className="of-btn of-btn--lime" disabled={busy || !password} onClick={() => void save()}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
