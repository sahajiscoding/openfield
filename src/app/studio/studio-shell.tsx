"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MODELS, getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { MUAPI_MODELS } from "@/lib/muapi/catalog";
import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";
import { createClient } from "@/lib/supabase/client";
import { clearMuapiKey, saveMuapiKey } from "@/lib/muapi/actions";

import { MuapiStudio } from "./muapi-studio";

type Provider = "higgsfield" | "muapi";

export function StudioShell({ email }: { email: string | undefined }) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("higgsfield");
  const [muapiKey, setMuapiKey] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [muapiInitialModel, setMuapiInitialModel] = useState<string | undefined>(undefined);
  const [muapiInitialPrompt, setMuapiInitialPrompt] = useState<string | undefined>(undefined);
  const queryApplied = useRef(false);

  /* Deep-link prefill from the landing composer (?provider=&model=&prompt=).
     Runs once on mount: validates the model against the real catalogs, loads
     the provider tab + prompt, then drops the query so refreshes don't replay. */
  useEffect(() => {
    if (queryApplied.current || typeof window === "undefined") return;
    queryApplied.current = true;
    const q = new URLSearchParams(window.location.search);
    const prompt = (q.get("prompt") ?? "").slice(0, 2000).trim();
    const model = q.get("model") ?? "";
    if (!prompt && !model) return;

    if (q.get("provider") === "muapi" || MUAPI_MODELS.some((m) => m.id === model)) {
      setProvider("muapi");
      if (model && MUAPI_MODELS.some((m) => m.id === model)) setMuapiInitialModel(model);
      if (prompt) setMuapiInitialPrompt(prompt);
    } else {
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
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signOut() {
    // Wipe provider keys first: they live in httpOnly cookies the browser
    // JS can't clear, and must not survive for the next profile on this machine.
    try {
      const { clearPlatformCredentials } = await import("@/generation/actions");
      await clearPlatformCredentials();
    } catch {
      // already empty — nothing to wipe
    }
    try {
      await clearMuapiKey();
    } catch {
      // already empty — nothing to wipe
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function saveKey() {
    setKeyMsg(null);
    try {
      await saveMuapiKey({ apiKey: muapiKey });
      setKeyMsg("MuAPI key saved (httpOnly cookie).");
      setMuapiKey("");
    } catch (caught) {
      setKeyMsg(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <div>
      <div className="of-studio-top" role="banner">
        <Link href="/" className="of-brand" aria-label="Back to Openfield home">
          <span className="of-mark" aria-hidden>○</span> Openfield
        </Link>
        <div className="of-provider-tabs" role="tablist" aria-label="Generation provider">
          <button role="tab" aria-selected={provider === "higgsfield"} onClick={() => setProvider("higgsfield")}>
            Higgsfield · 38
          </button>
          <button role="tab" aria-selected={provider === "muapi"} onClick={() => setProvider("muapi")}>
            MuAPI · 400+
          </button>
        </div>
        {provider === "muapi" && (
          <button
            type="button"
            onClick={() => setKeyOpen((v) => !v)}
            style={{ background: "transparent", border: "1px solid var(--of-line,#1d2124)", color: "var(--of-bone,#edeae0)", borderRadius: 999, padding: "9px 14px", font: "600 13px/1 var(--font-body)", cursor: "pointer" }}
          >
            MuAPI key
          </button>
        )}
        <div className="of-studio-user">
          <span title={email ?? ""}>{email ?? "Signed in"}</span>
          <Link
            href="/studio/security"
            style={{ color: "var(--of-smoke,#9aa08c)", fontSize: 13 }}
          >
            Security
          </Link>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>

      {keyOpen && provider === "muapi" && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1d2124", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#0c0e10" }}>
          <input
            type="password"
            placeholder="Paste MuAPI key (or set MUAPI_API_KEY on server)"
            value={muapiKey}
            onChange={(e) => setMuapiKey(e.target.value)}
            style={{ flex: "1 1 280px", background: "#08090a", border: "1px solid #1d2124", color: "#edeae0", borderRadius: 10, padding: "10px 12px", font: "500 14px/1.4 var(--font-body)" }}
          />
          <button type="button" onClick={() => void saveKey()} style={{ background: "#d4f921", border: "none", borderRadius: 999, padding: "10px 18px", font: "700 13px/1 var(--font-body)", cursor: "pointer" }}>
            Save key
          </button>
          <button type="button" onClick={() => void clearMuapiKey().then(() => setKeyMsg("MuAPI key cleared."))} style={{ background: "transparent", border: "1px solid #1d2124", color: "#edeae0", borderRadius: 999, padding: "10px 18px", font: "600 13px/1 var(--font-body)", cursor: "pointer" }}>
            Clear
          </button>
          {keyMsg && <span style={{ fontSize: 13, color: "#9aa08c" }}>{keyMsg}</span>}
        </div>
      )}

      {provider === "higgsfield" ? (
        <OpenHiggsfieldApp />
      ) : (
        <MuapiStudio
          onNeedsKey={() => setKeyOpen(true)}
          initialModelId={muapiInitialModel}
          initialPrompt={muapiInitialPrompt}
        />
      )}
    </div>
  );
}
