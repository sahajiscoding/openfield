"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isValidApiKey, normalizeApiKey, useApiKey } from "@/generation/stores/api-key";

import { VIEWS, VIEW_LABELS, type GalleryView } from "./data";
import { AssetsIcon, CloseIcon, HeartIcon, ImageIcon, KeyIcon, VideoIcon } from "./icons";

const VIEW_ICONS: Record<GalleryView, () => React.ReactNode> = {
  image: () => <ImageIcon />,
  video: () => <VideoIcon />,
  assets: () => <AssetsIcon />,
  favorites: () => <HeartIcon size={15} />,
};

export function Topbar({
  view,
  onView,
  busy,
}: {
  view: GalleryView;
  onView: (next: GalleryView) => void;
  busy: boolean;
}) {  const tabsRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  /* The indicator is measured rather than derived from equal columns, so it
     morphs to each label's real width instead of padding the short ones. */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    let live = true;
    const measure = () => {
      const active = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (live && active) setThumb({ x: active.offsetLeft, w: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    // Inter swaps in after first paint and the labels resize under it.
    void document.fonts.ready.then(measure);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [view]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const from = VIEWS.indexOf(view);
      const to =
        event.key === "ArrowRight"
          ? (from + 1) % VIEWS.length
          : event.key === "ArrowLeft"
            ? (from - 1 + VIEWS.length) % VIEWS.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? VIEWS.length - 1
                : -1;
      if (to < 0) return;
      event.preventDefault();
      onView(VIEWS[to]!);
      tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
    },
    [onView, view],
  );

  return (
    <div className="ohf-topbar">
      <h1 className="ohf-sr">Openfield — Open-source AI video studio</h1>

      <div className="ohf-bar ohf-enter-1">
        <div
          className="ohf-tabs"
          role="tablist"
          aria-label="Gallery scope"
          ref={tabsRef}
          onKeyDown={onKeyDown}
        >
          <span
            className="ohf-thumb"
            data-ready={thumb !== null}
            aria-hidden
            style={
              {
                "--thumb-x": `${thumb?.x ?? 0}px`,
                "--thumb-w": `${thumb?.w ?? 0}px`,
              } as React.CSSProperties
            }
          />
          {VIEWS.map((id) => {
            const selected = view === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`ohf-tab-${id}`}
                aria-selected={selected}
                aria-controls="ohf-panel"
                tabIndex={selected ? 0 : -1}
                className="ohf-tab"
                data-view={id}
                /* Favorites is the one scope that goes icon-only on a narrow
                   pill, so its name is stated rather than left to the mark. */
                aria-label={VIEW_LABELS[id]}
                title={id === "favorites" ? VIEW_LABELS[id] : undefined}
                onClick={() => onView(id)}
              >
                {VIEW_ICONS[id]()}
                <span className="ohf-tab-label">{VIEW_LABELS[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The visitor's own Higgsfield key (upstream's "Add key" pill): while
          set, generations run on it and bill the key owner instead of tokens. */}
      <div className="ohf-bar ohf-enter-1">
        <ApiKeyPill />
      </div>

      {/* The lamp is the studio's liveness: it moves only while runs are in
          flight. Generation bills tokens on the operator key — see #pricing. */}
      <div className="ohf-bar ohf-enter-1">
        <span
          className="ohf-key"
          data-busy={busy}
          data-ready={true}
          role="status"
          aria-label={busy ? "Rendering runs" : "Studio ready"}
          title="Token balance lives in the top bar — top up at #pricing"
        >
          <span className="ohf-key-text">{busy ? "Rendering" : "Ready"}</span>
          <span className="ohf-lamp" />
        </span>
      </div>
    </div>
  );
}

/**
 * "Add key" pill: the visitor's own Higgsfield key (id:secret from the
 * Higgsfield console). Persisted in this browser only; handed to the server
 * action per generation and never stored server-side. While set, runs bill
 * the key instead of tokens — including with a zero token balance.
 */
function ApiKeyPill() {
  const key = useApiKey((state) => state.key);
  const setKey = useApiKey((state) => state.setKey);
  const clearKey = useApiKey((state) => state.clearKey);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const has = key.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  function save() {
    if (!isValidApiKey(draft)) {
      setError("That doesn't look like a key — paste id:secret from the Higgsfield console.");
      return;
    }
    setKey(normalizeApiKey(draft));
    setDraft("");
    setError(null);
    setOpen(false);
  }

  return (
    <div className="ohf-keywrap" ref={wrapRef}>
      <button
        type="button"
        className="ohf-keybtn"
        data-set={has}
        aria-expanded={open}
        aria-label={has ? "Higgsfield API key set — edit or remove" : "Add your Higgsfield API key"}
        title={
          has
            ? "Personal Higgsfield key set — generations bill your key, not tokens"
            : "Add your Higgsfield key — generations bill your key, not tokens"
        }
        onClick={() => {
          setDraft(key);
          setError(null);
          setOpen((value) => !value);
        }}
      >
        <KeyIcon />
        <span className="ohf-keybtn-label">{has ? "Key set" : "Add key"}</span>
        <span className="ohf-lamp" aria-hidden />
      </button>

      {open && (
        <div className="ohf-keypanel" role="dialog" aria-label="Higgsfield API key">
          <div className="ohf-keypanel-head">
            <strong>Higgsfield API key</strong>
            <button
              type="button"
              className="ohf-icon-btn ohf-icon-btn--ghost"
              aria-label="Close key panel"
              onClick={() => setOpen(false)}
            >
              <CloseIcon size={12} />
            </button>
          </div>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="id:secret"
            aria-label="Higgsfield API key (id:secret)"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
          />
          {error && (
            <p className="ohf-keypanel-error" role="alert">
              {error}
            </p>
          )}
          <p className="ohf-keypanel-hint">
            From the Higgsfield console. Stored only in this browser — while set, runs bill
            your key instead of tokens, even at zero balance.
          </p>
          <div className="ohf-keypanel-actions">
            {has && (
              <button
                type="button"
                className="ohf-keypanel-clear"
                onClick={() => {
                  clearKey();
                  setDraft("");
                  setError(null);
                  setOpen(false);
                }}
              >
                Remove
              </button>
            )}
            <button type="button" className="ohf-cta" onClick={save}>
              Save key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
