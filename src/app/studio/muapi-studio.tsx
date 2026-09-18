"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getMuapiStatus, submitMuapiGeneration } from "@/lib/muapi/actions";
import { MUAPI_MODELS, getMuapiModel } from "@/lib/muapi/catalog";

type Tile = {
  id: string;
  model: string;
  prompt: string;
  url?: string;
  status: "running" | "completed" | "failed";
  error?: string;
  createdAt: number;
};

const LS_KEY = "openfield-muapi-history-v1";

function load(): Tile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Tile[];
    return Array.isArray(parsed) ? parsed.slice(0, 60) : [];
  } catch {
    return [];
  }
}

export function MuapiStudio({
  onNeedsKey,
  initialModelId,
  initialPrompt,
}: {
  onNeedsKey: () => void;
  initialModelId?: string;
  initialPrompt?: string;
}) {
  const validInitialModel =
    initialModelId && MUAPI_MODELS.some((m) => m.id === initialModelId)
      ? initialModelId
      : MUAPI_MODELS[0]!.id;
  const [modelId, setModelId] = useState(validInitialModel);
  const model = getMuapiModel(modelId);
  const [prompt, setPrompt] = useState(
    initialPrompt?.trim() ||
      "Neon monsoon over a night market, reflections chasing a rickshaw, anamorphic streaks"
  );
  const [aspect, setAspect] = useState<string>(model.aspects[0]!);
  const [duration, setDuration] = useState<number>(model.durations?.[0] ?? 5);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    setTiles(load());
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tiles.slice(0, 60)));
    } catch {
      // quota — history stays in memory
    }
  }, [tiles]);

  useEffect(() => {
    setAspect(model.aspects[0]!);
    setDuration(model.durations?.[0] ?? 5);
  }, [modelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && (!model.needsImage || imageUrl.trim().length > 0) && !busy,
    [prompt, model, imageUrl, busy]
  );

  async function poll(requestId: string, tileId: string) {
    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline && alive.current) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const s = await getMuapiStatus(requestId);
        if (s.status === "completed") {
          setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, status: "completed", url: s.url } : t)));
          return;
        }
        if (s.status === "failed") {
          setTiles((prev) =>
            prev.map((t) => (t.id === tileId ? { ...t, status: "failed", error: s.error ?? "MuAPI run failed" } : t))
          );
          return;
        }
      } catch (caught) {
        setTiles((prev) =>
          prev.map((t) =>
            t.id === tileId ? { ...t, status: "failed", error: caught instanceof Error ? caught.message : String(caught) } : t
          )
        );
        return;
      }
    }
    setTiles((prev) => (prev.some((t) => t.id === tileId && t.status === "running")
      ? prev.map((t) => (t.id === tileId ? { ...t, status: "failed", error: "Timed out waiting for MuAPI" } : t))
      : prev));
  }

  async function generate() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const tileId = `muapi-${Date.now()}`;
    setTiles((prev) => [{ id: tileId, model: model.label, prompt: prompt.trim(), status: "running", createdAt: Date.now() }, ...prev]);
    try {
      const queued = await submitMuapiGeneration({
        model: model.id,
        prompt: prompt.trim(),
        aspect_ratio: aspect,
        duration,
        image_url: imageUrl.trim() || null,
        generate_audio: true,
      });
      void poll(queued.request_id, tileId);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (message.includes("Missing MuAPI key")) onNeedsKey();
      setError(message);
      setTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, status: "failed", error: message } : t)));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="of-muapi">
      <aside className="of-muapi-side" aria-label="MuAPI composer">
        <h2>MuAPI gateway</h2>
        <p className="lede">400-model catalog via <code>x-api-key</code> — Veo, Sora, Kling, Flux, lip sync. Key pasted later, stored httpOnly.</p>

        <div>
          <label htmlFor="muapi-model">Model</label>
          <select id="muapi-model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {MUAPI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.blurb}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="muapi-prompt">Prompt</label>
          <textarea
            id="muapi-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate();
            }}
            placeholder="Describe the shot… (⌘/Ctrl + Enter)"
          />
        </div>

        <div className="of-muapi-row">
          <div>
            <label htmlFor="muapi-aspect">Aspect</label>
            <select id="muapi-aspect" value={aspect} onChange={(e) => setAspect(e.target.value)}>
              {model.aspects.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="muapi-dur">Duration</label>
            <select id="muapi-dur" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
              {(model.durations ?? [5]).map((d) => <option key={d} value={String(d)}>{d}s</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="muapi-img">Start frame / reference URL {model.needsImage ? "(required)" : "(optional)"}</label>
          <input
            id="muapi-img"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <button type="button" className="of-muapi-go" disabled={!canSubmit} onClick={() => void generate()}>
          {busy ? "Queued…" : "Generate ⏎"}
        </button>

        {error && <p className="of-muapi-err" role="alert">{error}</p>}
        <p className="lede">Polls <code>/predictions/&#123;id&#125;/result</code> every 2.5s. History persists locally.</p>
      </aside>

      <section className="of-muapi-grid" aria-label="MuAPI results" aria-live="polite">
        {tiles.length === 0 && (
          <div className="of-muapi-empty">
            <p><strong>No MuAPI runs yet.</strong></p>
            <p>Pick Veo 3 or Seedance 2.5, write a shot, press Generate.</p>
          </div>
        )}
        {tiles.map((t) => (
          <article key={t.id} className="of-muapi-tile">
            {t.status === "completed" && t.url ? (
              t.url.match(/\.(mp4|mov|webm)(\?|$)/i) || model.surface !== "image" ? (
                <video src={t.url} controls playsInline preload="metadata" />
              ) : (
                <img src={t.url} alt={t.prompt} loading="lazy" />
              )
            ) : (
              <div style={{ aspectRatio: "16/9", display: "grid", placeItems: "center", color: "#9aa08c", fontSize: 13 }}>
                {t.status === "running" ? "Rendering…" : `Failed — ${t.error ?? "unknown"}`}
              </div>
            )}
            <div className="meta"><b>{t.model}</b>{t.prompt}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
