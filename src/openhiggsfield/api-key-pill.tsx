"use client";

import { useEffect, useRef, useState } from "react";

import { isValidApiKey, normalizeApiKey, useApiKey } from "@/generation/stores/api-key";

import { CloseIcon, KeyIcon } from "./icons";

/**
 * "Add key" pill: the visitor's own Higgsfield key (id:secret from the
 * Higgsfield console). Persisted in this browser only; handed to the server
 * action per generation and never stored server-side. While set, runs bill
 * the key instead of tokens — including with a zero token balance.
 */
export function ApiKeyPill() {
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
