"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/** Client-side mirror of the callback's safeNext: post-login stays on-origin. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/studio";
  }
  return raw;
}

/**
 * OAuth/magic-link return origin. Pinned to the canonical site URL when it
 * is configured, so signing in from a Vercel preview URL still returns to
 * production instead of stranding the session on the preview host.
 */
function siteOrigin(): string {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (canonical) return canonical;
  return window.location.origin;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: Error | null; notice?: string }>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const out = await fn();
      if (out.error) setError(out.error.message);
      else if (out.notice) setNotice(out.notice);
      else router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p className="of-error" role="alert">{error}</p>}
      {notice && <p className="of-ok" role="status">{notice}</p>}

      <div className="of-field">
        <label htmlFor="of-email">Email</label>
        <input
          id="of-email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {mode === "password" && (
        <div className="of-field">
          <label htmlFor="of-pass">Password</label>
          <input
            id="of-pass"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      <div className="of-login-actions">
        {mode === "magic" ? (
          <button
            type="button"
            className="of-btn of-btn--lime"
            disabled={busy || !email.trim()}
            onClick={() =>
              run(async () => {
                const supabase = createClient();
                const { error } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                  options: { emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
                });
                return { error, notice: error ? undefined : "Check your inbox — magic link is on its way." };
              })
            }
          >
            {busy ? "Sending…" : "Continue with magic link"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="of-btn of-btn--lime"
              disabled={busy || !email.trim() || !password}
              onClick={() =>
                run(async () => {
                  const supabase = createClient();
                  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                  return { error };
                })
              }
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              className="of-btn"
              disabled={busy || !email.trim() || !password}
              onClick={() =>
                run(async () => {
                  const supabase = createClient();
                  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
                  return { error: error, notice: error ? undefined : "Account created — check your inbox to confirm." };
                })
              }
            >
              Create account
            </button>
          </>
        )}

        <button
          type="button"
          className="of-btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const supabase = createClient();
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
              });
              return { error };
            })
          }
        >
          Continue with Google
        </button>

        <button type="button" className="of-btn of-btn--ghost" onClick={() => setMode(mode === "magic" ? "password" : "magic")}>
          {mode === "magic" ? "Use password instead" : "Use magic link instead"}
        </button>
      </div>

      <p className="of-fineprint">
        Protected by Supabase Auth. <Link href="/">← Back to Openfield</Link>
      </p>
      {mode === "password" && (
        <p className="of-fineprint">
          <Link href="/login/reset">Forgot your password?</Link>
        </p>
      )}
    </div>
  );
}
