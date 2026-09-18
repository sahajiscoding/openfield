"use client";

import Link from "next/link";
import { useState } from "react";

export function BuyPackForm({ packId, label }: { packId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  async function buy() {
    setBusy(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        openUrl?: unknown;
        error?: unknown;
        code?: unknown;
      };
      if (!res.ok || typeof data.openUrl !== "string" || !data.openUrl) {
        if (data.code === "auth") {
          setNeedsAuth(true);
          setError("Sign in to buy tokens.");
        } else {
          setError(
            typeof data.error === "string" && data.error
              ? data.error
              : "Checkout failed — try again in a moment.",
          );
        }
        setBusy(false);
        return;
      }
      window.location.assign(data.openUrl);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void buy()}
        disabled={busy}
        className="of-btn of-btn--lime"
        style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
      >
        {busy ? "Opening checkout…" : label}
      </button>
      {error && (
        <p className="of-error" role="alert" style={{ marginTop: 10 }}>
          {error}{" "}
          {needsAuth && <Link href="/login?next=/pricing">Sign in →</Link>}
        </p>
      )}
    </div>
  );
}
