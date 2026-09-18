"use client";

import { useState } from "react";

import { buyTokenPack } from "@/lib/billing/actions";

export function BuyPackForm({ packId, label }: { packId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const { openUrl } = await buyTokenPack(packId);
      window.location.assign(openUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
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
          {error}
        </p>
      )}
    </div>
  );
}
