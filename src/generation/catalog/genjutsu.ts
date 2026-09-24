import type { ModelEntry } from "./types";

/**
 * Higgsfield-exclusive Genjutsu family (released 09/17/2026).
 *
 * Motion Transfer re-imagines a reference video (new character, product, or
 * outfit performing the same motion); Object Swap replaces an object inside
 * it. Both are video-in → video-out on the SAME endpoint shape:
 *   POST /higgsfiled/genjutsu/<motion-transfer|object-swap>/v1.0
 *   { prompt, video_url, image_urls?, resolution }
 * ("higgsfiled" is the official spelling — keep it exactly.)
 *
 * Billing is per INPUT-video second ($0.318 @480p / $0.681 @720p, 50% sale =
 * $0.159 / $0.3405), rounded up per second. The quote below uses the
 * duration setting as the EXPECTED input length — tell the user to match it
 * to their clip. Resolution defaults to 720p, so the rate is the 720p sale
 * figure; the operator reconciles against invoices.
 */

const genjutsuSettings = {
  resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  /** Expected reference-clip length in seconds — the billable quantity. */
  duration: { type: "range", min: 1, max: 30, default: 5 },
} as const satisfies ModelEntry["settings"];

export const genjutsuMotion: ModelEntry = {
  id: "genjutsu-motion",
  surface: "video",
  label: "Genjutsu Motion Transfer",
  roles: { video: 1, reference: 8 },
  settings: genjutsuSettings,
};

export const genjutsuSwap: ModelEntry = {
  id: "genjutsu-swap",
  surface: "video",
  label: "Genjutsu Object Swap",
  roles: { video: 1, reference: 8 },
  settings: genjutsuSettings,
};
