"use client";

import { useState } from "react";

import { tokensToUsd } from "@/lib/credits/pricing";

export type ModelRate = {
  modelId: string;
  label: string;
  kind: "video" | "image";
  usd: number;
  tokens30s: number;
};

const PREVIEW_COUNT = 8;

/**
 * Full rate card with a collapsed preview — the list is long (40+ models),
 * so only the first rows show until the visitor asks for more.
 */
export function ModelRates({ rates }: { rates: ModelRate[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rates : rates.slice(0, PREVIEW_COUNT);
  const hidden = rates.length - PREVIEW_COUNT;

  return (
    <div>
      <div className="of-table" role="region" aria-label="Token rate card" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Type</th>
              <th scope="col">Tokens</th>
              <th scope="col">≈ USD</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.modelId}>
                <td><strong>{r.label}</strong></td>
                <td>
                  <span className="of-pill">{r.kind === "video" ? "30s · 720p" : "1 image"}</span>
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{r.tokens30s}</td>
                <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--of-smoke)" }}>
                  ${tokensToUsd(r.tokens30s).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            className="of-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Show fewer models ↑" : `See all ${rates.length} models ↓`}
          </button>
        </div>
      )}
    </div>
  );
}
