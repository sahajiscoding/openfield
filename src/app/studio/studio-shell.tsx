"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { MODELS, getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";
import { createClient } from "@/lib/supabase/client";

export function StudioShell({ email, balance }: { email: string | undefined; balance: number }) {
  const router = useRouter();
  const queryApplied = useRef(false);

  /* Deep-link prefill from the landing composer (?model=&prompt=).
     Runs once on mount: validates the model against the catalog, loads the
     prompt, then drops the query so refreshes don't replay. */
  useEffect(() => {
    if (queryApplied.current || typeof window === "undefined") return;
    queryApplied.current = true;
    const q = new URLSearchParams(window.location.search);
    const prompt = (q.get("prompt") ?? "").slice(0, 2000).trim();
    const model = q.get("model") ?? "";
    if (!prompt && !model) return;

    if (model && MODELS.some((entry) => entry.id === model)) {
      try {
        useActive.getState().setModel(model);
      } catch {
        // unknown model — keep the persisted one
      }
    }
    if (prompt) {
      const surface = (() => {
        try {
          return model ? getModel(model).surface : useActive.getState().surface;
        } catch {
          return useActive.getState().surface;
        }
      })();
      (surface === "image" ? useImagePrompt : useVideoPrompt).getState().setText(prompt);
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    /* One viewport, two rows: the bar and the work. `.of-studio-frame` hands
       the studio every pixel the bar does not use, so the docked composer (and
       with it Generate) always sits inside the fold. */
    <div className="of-studio-frame">
      <div className="of-studio-top" role="banner">
        <Link href="/" className="of-brand" aria-label="Back to Openfield home">
          <span className="of-mark" aria-hidden>○</span> Openfield
        </Link>
        <Link
          href="/pricing#packs"
          title="Top up tokens"
          style={{
            background: balance <= 0 ? "transparent" : "var(--of-lime,#d4f921)",
            border: "1px solid var(--of-lime,#d4f921)",
            color: balance <= 0 ? "var(--of-lime,#d4f921)" : "#131600",
            borderRadius: 999,
            padding: "9px 16px",
            font: "700 13px/1 var(--font-body)",
            textDecoration: "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {balance <= 0 ? "Out of tokens — top up" : `${balance} tokens`}
        </Link>
        <div className="of-studio-user">
          <span title={email ?? ""}>{email ?? "Signed in"}</span>
          <Link href="/studio/billing" style={{ color: "var(--of-smoke,#9aa08c)", fontSize: 13 }}>
            Billing
          </Link>
          <Link
            href="/studio/security"
            style={{ color: "var(--of-smoke,#9aa08c)", fontSize: 13 }}
          >
            Security
          </Link>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>

      <OpenHiggsfieldApp initialBalance={balance} />
    </div>
  );
}
