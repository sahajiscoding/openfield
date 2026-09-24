"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { Surface } from "@/generation/catalog";

import { Gallery } from "./gallery";
import type { ActiveRun } from "./openhiggsfield-app";
import type { GalleryView } from "./data";
import type { RunRecord } from "./history";
import { CloseIcon, SlidersIcon } from "./icons";

export type HistoryLayout = "grid" | "list";

/* Honest chip → view map. Our views are image/video/assets/favorites;
   chips are display names only, views stay the source of truth. */
const CHIPS: Array<{ label: string; view: GalleryView }> = [
  { label: "All", view: "assets" },
  { label: "Video", view: "video" },
  { label: "Image", view: "image" },
  { label: "Kept", view: "favorites" },
];

const CHIP_VIEWS = CHIPS.map((chip) => chip.view);

export function HistoryPanel({
  view,
  onView,
  surface,
  items,
  runs,
  freshIds,
  picked,
  galleryRef,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
  onStarter,
}: {
  view: GalleryView;
  onView: (next: GalleryView) => void;
  surface: Surface;
  items: RunRecord[];
  runs: ActiveRun[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  galleryRef: RefObject<HTMLDivElement | null>;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
  onStarter: (prompt: string) => void;
}) {
  const [layout, setLayout] = useState<HistoryLayout>("grid");
  const [howOpen, setHowOpen] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Roving-tabindex arrow keys, mirroring the Topbar tablist pattern. */
  const onChipsKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const from = CHIP_VIEWS.indexOf(view);
      const to =
        event.key === "ArrowRight"
          ? (from + 1) % CHIP_VIEWS.length
          : event.key === "ArrowLeft"
            ? (from - 1 + CHIP_VIEWS.length) % CHIP_VIEWS.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? CHIP_VIEWS.length - 1
                : -1;
      if (to < 0) return;
      event.preventDefault();
      onView(CHIP_VIEWS[to]!);
      chipsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
    },
    [onView, view],
  );

  /* Overlay owns Escape + initial focus while open. */
  useEffect(() => {
    if (!howOpen) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHowOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [howOpen]);

  return (
    <section className="ohf-hist" aria-label="History">
      <div className="ohf-hist-head">
        <div className="ohf-hist-tabs" role="tablist" aria-label="History panel">
          <button
            type="button"
            role="tab"
            aria-selected
            aria-controls="ohf-panel"
            id="ohf-hist-tab-history"
            className="ohf-hist-tab"
            data-active
          >
            History
          </button>
          <button
            type="button"
            className="ohf-hist-tab"
            onClick={() => setHowOpen(true)}
            aria-haspopup="dialog"
          >
            How it works
          </button>
        </div>

        <div className="ohf-hist-tools">
          <span className="ohf-hist-filter" aria-hidden title="Filter">
            <SlidersIcon size={15} />
          </span>
          <div className="ohf-hist-seg" role="group" aria-label="Gallery layout">
            <button
              type="button"
              className="ohf-hist-seg-btn"
              aria-pressed={layout === "list"}
              title="List view"
              onClick={() => setLayout("list")}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
              </svg>
              List
            </button>
            <button
              type="button"
              className="ohf-hist-seg-btn"
              aria-pressed={layout === "grid"}
              title="Grid view"
              onClick={() => setLayout("grid")}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1" />
                <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1" />
                <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1" />
                <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1" />
              </svg>
              Grid
            </button>
          </div>
        </div>
      </div>

      <div
        className="ohf-hist-chips"
        role="tablist"
        aria-label="History filter"
        ref={chipsRef}
        onKeyDown={onChipsKeyDown}
      >
        {CHIPS.map(({ label, view: id }) => {
          const selected = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`ohf-hist-chip-${id}`}
              aria-selected={selected}
              aria-controls="ohf-panel"
              tabIndex={selected ? 0 : -1}
              className="ohf-hist-chip"
              data-view={id}
              aria-label={id === "assets" ? "All runs" : id === "favorites" ? "Kept runs" : `${label} runs`}
              title={id === "assets" ? "All runs" : id === "favorites" ? "Kept runs" : undefined}
              onClick={() => onView(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="ohf-hist-body">
        <Gallery
          view={view}
          surface={surface}
          items={items}
          runs={runs}
          freshIds={freshIds}
          picked={picked}
          layout={layout}
          onOpen={onOpen}
          onPick={onPick}
          onReuse={onReuse}
          onFavorite={onFavorite}
          onDownload={onDownload}
          onDelete={onDelete}
          onStarter={onStarter}
          galleryRef={galleryRef}
        />
      </div>

      {howOpen && (
        <div
          className="ohf-hist-how"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ohf-hist-how-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setHowOpen(false);
          }}
        >
          <div className="ohf-hist-how-card">
            <button
              ref={closeRef}
              type="button"
              className="ohf-icon-btn ohf-hist-how-close"
              aria-label="Close how it works"
              onClick={() => setHowOpen(false)}
            >
              <CloseIcon size={13} />
            </button>
            <p className="ohf-hist-how-eyebrow">How it works</p>
            <h2 id="ohf-hist-how-title" className="ohf-hist-how-title">
              Make videos in one click
            </h2>
            <ol className="ohf-hist-how-steps">
              <li>
                <span className="ohf-hist-how-n">1</span>
                <div>
                  <h3>Add image</h3>
                  <p>Drop a start frame or describe the shot in the sidebar.</p>
                </div>
              </li>
              <li>
                <span className="ohf-hist-how-n">2</span>
                <div>
                  <h3>Choose preset</h3>
                  <p>Pick a model and dials — every run keeps its settings for reuse.</p>
                </div>
              </li>
              <li>
                <span className="ohf-hist-how-n">3</span>
                <div>
                  <h3>Get video</h3>
                  <p>Press Generate. Finished runs land here and stay in this browser.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
