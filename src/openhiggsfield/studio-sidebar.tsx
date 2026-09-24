"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { parseSettings } from "@/generation/catalog";
import type { MediaRole, ModelEntry, Surface } from "@/generation/catalog";
import { assemblePlane } from "@/generation/plane";
import { MAX_BATCH, useActive } from "@/generation/stores/active";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { useSettings } from "@/generation/stores/settings";
import { costForPlane, tokensToUsd } from "@/lib/credits/pricing";

import { ApiKeyPill } from "./api-key-pill";
import { AssetPicker } from "./asset-picker";
import { PROMPT_PLACEHOLDERS, ROLE_LABELS, countSetting, describeModel } from "./data";
import type { RunRecord } from "./history";
import {
  ArrowUpIcon,
  CaretDownIcon,
  CloseIcon,
  MinusIcon,
  PanelLeftIcon,
  PlusIcon,
  WarningIcon,
} from "./icons";
import { MediaStrip, useMediaTray } from "./media-tray";
import { ModelIcon, modelIconSrc } from "./model-icon";
import { ModelPicker } from "./model-picker";
import { SettingPill, SettingPopover } from "./settings";

/* Overlay ids mirror the Composer: two fixed panels, or one setting addressed
   by its catalog key. */
const PICKER = "picker";
const ASSETS = "assets";
const SETTING = "setting:";

const PROMPT_MAX_HEIGHT = 168;
const STUDIO_COUNTS = Array.from({ length: MAX_BATCH }, (_, index) => index + 1);
const POPOVER_GAP = 8;

export type StudioMode = "create" | "edit";

function hasMediaRoles(model: ModelEntry): boolean {
  return Object.keys(model.roles).length > 0;
}

/* Slot chips are narrow — full labels ("Start frame") truncate, so slots
   carry one word while tooltips and aria keep the full role name. */
const ROLE_SHORT: Record<MediaRole, string> = {
  start: "Start",
  end: "End",
  reference: "Refs",
  video: "Video",
  audio: "Audio",
};

/* Royalty-free Pexels backdrops, one per model. Same pool as the landing
   featured rail (images.pexels.com pattern) — never fotachustudios /
   higgsfield / cloudfront URLs. Unknown ids fall through to the pool by hash,
   so every model gets art. */
const HERO_ART: Record<string, string> = {
  "seedance-2.5":
    "https://images.pexels.com/photos/3624368/pexels-photo-3624368.jpeg?auto=compress&cs=tinysrgb&w=640",
  "soul-2":
    "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=640",
  "kling-3-std":
    "https://images.pexels.com/photos/30548738/pexels-photo-30548738.jpeg?auto=compress&cs=tinysrgb&w=640",
  "qwen-image-3":
    "https://images.pexels.com/photos/2050297/pexels-photo-2050297.jpeg?auto=compress&cs=tinysrgb&w=640",
  "minimax-h3":
    "https://images.pexels.com/photos/35462271/pexels-photo-35462271.jpeg?auto=compress&cs=tinysrgb&w=640",
  "grok-imagine-2":
    "https://images.pexels.com/photos/6818644/pexels-photo-6818644.jpeg?auto=compress&cs=tinysrgb&w=640",
  "genjutsu-motion":
    "https://images.pexels.com/photos/3902726/pexels-photo-3902726.jpeg?auto=compress&cs=tinysrgb&w=640",
  "ideogram-4":
    "https://images.pexels.com/photos/8485065/pexels-photo-8485065.jpeg?auto=compress&cs=tinysrgb&w=640",
  "wan-3-prime":
    "https://images.pexels.com/photos/6431040/pexels-photo-6431040.jpeg?auto=compress&cs=tinysrgb&w=640",
  "recraft-4.1":
    "https://images.pexels.com/photos/8760862/pexels-photo-8760862.jpeg?auto=compress&cs=tinysrgb&w=640",
  "cinema-studio-4":
    "https://images.pexels.com/photos/7991303/pexels-photo-7991303.jpeg?auto=compress&cs=tinysrgb&w=640",
  "wan-3":
    "https://images.pexels.com/photos/9439261/pexels-photo-9439261.jpeg?auto=compress&cs=tinysrgb&w=640",
};

const HERO_POOL = Object.values(HERO_ART);

function heroArtFor(modelId: string): string {
  const direct = HERO_ART[modelId];
  if (direct) return direct;
  let hash = 0;
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) | 0;
  }
  return HERO_POOL[Math.abs(hash) % HERO_POOL.length]!;
}

function popoverWidth(id: string, model: ModelEntry): number {
  if (id === PICKER || id === ASSETS) return 560;
  if (id.startsWith(SETTING) && model.settings[id.slice(SETTING.length)]?.type === "enum") {
    return 216;
  }
  return 268;
}

export function StudioSidebar({
  surface,
  model,
  generating,
  error,
  focusNonce,
  history,
  notice,
  selection,
  selecting,
  outOfTokens,
  balance,
  onError,
  onGenerate,
  onCollapse,
}: {
  surface: Surface;
  model: ModelEntry;
  generating: boolean;
  error: string | null;
  focusNonce: number;
  history: RunRecord[];
  notice?: ReactNode;
  selection: ReactNode;
  selecting: boolean;
  outOfTokens?: boolean;
  /* Optional numeric balance for the footer line. Extra-only: the sidebar is
     still a drop-in for Composer when it is omitted. */
  balance?: number | null;
  onError: (message: string | null) => void;
  onGenerate: () => void;
  /* Collapse control: hides the whole sidebar to give the grid room. */
  onCollapse: () => void;
}) {
  const setModel = useActive((state) => state.setModel);
  const batch = useActive((state) => state.batch);
  const setBatch = useActive((state) => state.setBatch);
  const imagePrompt = useImagePrompt();
  const videoPrompt = useVideoPrompt();
  const prompt = surface === "image" ? imagePrompt : videoPrompt;
  const settings = useSettings();
  const values = parseSettings(model, settings.byModel[model.id] ?? {});
  const tray = useMediaTray(model, onError);

  const [mode, setMode] = useState<StudioMode>(() =>
    hasMediaRoles(model) ? "edit" : "create",
  );
  const [overlay, setOverlay] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [shortcut, setShortcut] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const promptEmpty = prompt.text.trim().length === 0;
  const blocked = outOfTokens === true;
  const disabled = promptEmpty || blocked;

  const native = countSetting(model);
  const counts = native ? native.counts : STUDIO_COUNTS;
  const batchValue = native ? Number(values[native.key]) || counts[0]! : batch;
  const settingKeys = Object.keys(model.settings).filter((key) => key !== native?.key);

  function setBatchValue(next: number) {
    if (!native) {
      setBatch(next);
      return;
    }
    settings.set(model.id, { [native.key]: native.kind === "enum" ? String(next) : next });
  }

  /* Live quote: reassembles the plane off the same stores the submit path
     reads, so the button always quotes what the press will spend. */
  const estimate = useMemo(() => {
    try {
      return costForPlane(assemblePlane());
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id, prompt.text, settings.byModel, tray.items, batchValue]);

  useEffect(() => {
    if (!overlay) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOverlay(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverlay(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [overlay]);

  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    const grow = () => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, PROMPT_MAX_HEIGHT)}px`;
    };
    grow();
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      grow();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [prompt.text]);

  useEffect(() => {
    if (focusNonce > 0) promptRef.current?.focus();
  }, [focusNonce]);

  useEffect(() => {
    if (selecting) setOverlay(null);
  }, [selecting]);

  useEffect(() => {
    setShortcut(/Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? "⌘↵" : "Ctrl↵");
  }, []);

  function toggle(next: string, trigger: HTMLElement) {
    if (overlay === next) {
      setOverlay(null);
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    const strip = wrap.querySelector(".ohf-strip");
    const ceiling = strip
      ? Math.min(triggerBox.top, strip.getBoundingClientRect().top)
      : triggerBox.top;
    const available = wrap.clientWidth;
    const width = Math.min(popoverWidth(next, model), available);
    setAnchor({
      x: Math.round(Math.max(0, Math.min(triggerBox.left - wrapBox.left, available - width))),
      y: Math.round(wrapBox.bottom - ceiling + POPOVER_GAP),
    });
    setOverlay(next);
  }

  const settingKey = overlay?.startsWith(SETTING) ? overlay.slice(SETTING.length) : null;
  const costLabel =
    estimate !== null
      ? `${estimate} token${estimate === 1 ? "" : "s"} · $${tokensToUsd(estimate).toFixed(2)}`
      : null;
  const generateLabel =
    estimate !== null && estimate > 0
      ? `Generate · ${estimate} token${estimate === 1 ? "" : "s"}`
      : batchValue > 1
        ? `Generate ${batchValue} results`
        : "Generate";
  const generateTip = blocked
    ? "Out of tokens — top up to generate"
    : disabled
      ? "Write a prompt first"
      : `${generateLabel} · ${shortcut ?? "⌘↵"}`;

  return (
    <aside
      className="ohf-side"
      aria-label={surface === "image" ? "Image studio controls" : "Video studio controls"}
      data-selecting={selecting}
    >
      <div
        className="ohf-side-scroll ohf-scroll"
        ref={wrapRef}
        style={{ "--ohf-pop-x": `${anchor.x}px`, "--ohf-pop-y": `${anchor.y}px` } as CSSProperties}
      >
        {notice}

        {error && (
          <div className="ohf-alert" role="alert">
            <span className="ohf-alert-ic">
              <WarningIcon />
            </span>
            <span className="ohf-alert-text">{error}</span>
            <button
              type="button"
              className="ohf-icon-btn ohf-icon-btn--ghost"
              aria-label="Dismiss error"
              title="Dismiss error"
              onClick={() => onError(null)}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        <div className="ohf-side-head">
          <div className="ohf-side-title-row">
            <h2 className="ohf-side-title">
              {surface === "image" ? "Image studio" : "Video studio"}
            </h2>
            <button
              type="button"
              className="ohf-icon-btn ohf-side-collapse"
              aria-label="Hide controls sidebar"
              title="Hide controls — the grid gets the room"
              onClick={onCollapse}
            >
              <PanelLeftIcon size={14} />
            </button>
          </div>
          <div className="ohf-side-tabs" role="tablist" aria-label="Model mode">
            {(["create", "edit"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                className="ohf-side-tab"
                title={id === "create" ? "Models that start from a prompt" : "Models that take media inputs"}
                onClick={() => setMode(id)}
              >
                {id === "create" ? "Create" : "Edit"}
              </button>
            ))}
          </div>
        </div>

        {settingKey && <SettingPopover model={model} settingKey={settingKey} values={values} />}
        {overlay === ASSETS && (
          <AssetPicker
            model={model}
            items={tray.items}
            uploads={tray.uploads}
            history={history}
            staged={tray.staged}
            uploading={tray.uploading}
            onUpload={tray.begin}
            onApply={tray.apply}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === PICKER && (
          <ModelPicker
            selectedId={model.id}
            surface={surface}
            modeFilter={mode}
            onPick={(next) => {
              setModel(next.id);
              setMode(hasMediaRoles(next) ? "edit" : "create");
              setOverlay(null);
            }}
            onClose={() => setOverlay(null)}
          />
        )}

        <section className="ohf-side-hero" aria-label="Selected model">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ohf-side-hero-art" src={heroArtFor(model.id)} alt="" loading="lazy" />
          <span className="ohf-side-hero-shade" aria-hidden />
          <div className="ohf-side-hero-body">
            <span className="ohf-side-hero-kicker">
              {modelIconSrc(model.id) ? (
                <ModelIcon modelId={model.id} size={14} />
              ) : null}
              <span className="ohf-side-hero-name">{model.label}</span>
            </span>
            <p className="ohf-side-hero-desc">{describeModel(model)}</p>
            {costLabel && <p className="ohf-side-hero-cost">~{costLabel} per run</p>}
            <button
              type="button"
              className="ohf-side-hero-change"
              aria-expanded={overlay === PICKER}
              aria-haspopup="dialog"
              onClick={(event) => toggle(PICKER, event.currentTarget)}
            >
              Change
              <CaretDownIcon />
            </button>
          </div>
        </section>

        <section className="ohf-side-refs" aria-label="Reference inputs">
          <div className="ohf-side-section-head">
            <h3 className="ohf-side-section-title">References</h3>
            {tray.uploading && <span className="ohf-spinner" aria-label="Uploading" />}
          </div>
          {tray.input}
          {tray.roles.length === 0 ? (
            <p className="ohf-side-refs-hint">
              This model starts from a prompt — switch to Edit for models that take media.
            </p>
          ) : (
            <div className="ohf-side-slots">
              {tray.roles.map((role) => {
                const used = tray.items.filter((item) => item.role === role).length;
                const max = model.roles[role] ?? 0;
                return (
                  <button
                    key={role}
                    type="button"
                    className="ohf-side-slot"
                    aria-haspopup="dialog"
                    aria-expanded={overlay === ASSETS}
                    aria-label={`${ROLE_LABELS[role]} — ${used} of ${max} attached`}
                    title={`${ROLE_LABELS[role]} — ${used}/${max}`}
                    onClick={(event) => toggle(ASSETS, event.currentTarget)}
                  >
                    <PlusIcon size={14} />
                    <span className="ohf-side-slot-name">{ROLE_SHORT[role]}</span>
                    <span className="ohf-side-slot-count">
                      {used}/{max}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="ohf-side-slot ohf-side-slot--assets"
                aria-haspopup="dialog"
                aria-expanded={overlay === ASSETS}
                aria-label="Open asset library"
                title="Browse uploads and past generations"
                onClick={(event) => toggle(ASSETS, event.currentTarget)}
              >
                <PlusIcon size={14} />
                <span className="ohf-side-slot-name">Assets</span>
              </button>
            </div>
          )}
          <MediaStrip model={model} />
        </section>

        <section className="ohf-side-prompt" aria-label="Prompt">
          <label className="ohf-side-section-title" htmlFor="ohf-side-prompt-field">
            Describe your shot
          </label>
          <textarea
            id="ohf-side-prompt-field"
            ref={promptRef}
            className="ohf-prompt ohf-side-field"
            rows={3}
            value={prompt.text}
            placeholder={PROMPT_PLACEHOLDERS[surface]}
            aria-label="Prompt"
            onPointerDown={() => setOverlay(null)}
            onFocus={() => setOverlay(null)}
            onChange={(event) => prompt.setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (!disabled) onGenerate();
              }
            }}
          />
        </section>

        <section className="ohf-side-settings" aria-label="Settings">
          <div className="ohf-side-pills">
            {settingKeys.map((key) => (
              <SettingPill
                key={key}
                model={model}
                settingKey={key}
                values={values}
                open={overlay === `${SETTING}${key}`}
                onOpen={(trigger) => toggle(`${SETTING}${key}`, trigger)}
              />
            ))}
            <BatchStepper value={batchValue} counts={counts} onChange={setBatchValue} />
          </div>
        </section>

        <span className="ohf-side-generate-slot ohf-tip" data-tip={generateTip}>
          <button
            type="button"
            className="ohf-side-generate"
            disabled={disabled}
            data-busy={generating && !blocked}
            aria-label={blocked ? "Out of tokens — top up to generate" : generateLabel}
            onClick={onGenerate}
          >
            {generating && !blocked && <span className="ohf-generate-sheen" aria-hidden />}
            <span className="ohf-generate-glyph" aria-hidden>
              <ArrowUpIcon size={15} />
            </span>
            <span className="ohf-generate-label">{generateLabel}</span>
            {shortcut && <kbd className="ohf-kbd">{shortcut}</kbd>}
          </button>
        </span>

        {selection}

        <footer className="ohf-side-foot">
          <p className="ohf-side-balance" role="status">
            {balance !== null && balance !== undefined ? (
              <>
                <strong>{balance} tokens</strong>
                <span> · ${tokensToUsd(balance).toFixed(2)}</span>
              </>
            ) : blocked ? (
              "Out of tokens — top up to keep generating."
            ) : (
              "1 token = $0.01 of provider cost."
            )}{" "}
            <a href="/studio/billing" className="ohf-side-topup">
              Top up
            </a>
          </p>
          <ApiKeyPill />
        </footer>
      </div>
    </aside>
  );
}

function BatchStepper({
  value,
  counts,
  onChange,
}: {
  value: number;
  counts: number[];
  onChange: (next: number) => void;
}) {
  const index = Math.max(0, counts.indexOf(value));
  const last = counts.length - 1;
  const max = counts[last]!;
  const label = `Batch size — ${value} result${value > 1 ? "s" : ""} per press`;

  const step = (delta: number) => {
    const next = counts[Math.min(last, Math.max(0, index + delta))]!;
    if (next !== value) onChange(next);
  };

  return (
    <div className="ohf-batch ohf-tip" data-tip={label}>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label="Fewer results"
        disabled={index <= 0}
        onClick={() => step(-1)}
      >
        <MinusIcon size={12} />
      </button>
      <span
        className="ohf-batch-value"
        role="spinbutton"
        tabIndex={0}
        aria-label="Batch size"
        aria-valuemin={counts[0]}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}`}
        onKeyDown={(event) => {
          const delta =
            event.key === "ArrowUp" || event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowDown" || event.key === "ArrowLeft"
                ? -1
                : 0;
          if (delta !== 0) {
            event.preventDefault();
            step(delta);
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            onChange(counts[0]!);
          }
          if (event.key === "End") {
            event.preventDefault();
            onChange(max);
          }
        }}
      >
        {value}
        <span className="ohf-batch-max" aria-hidden>
          /{max}
        </span>
      </span>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label="More results"
        disabled={index >= last}
        onClick={() => step(1)}
      >
        <PlusIcon size={12} />
      </button>
    </div>
  );
}
