import type { ModelEntry } from "./types";

/**
 * Cinema Studio 4.0 (released 09/18/2026, Higgsfield exclusive).
 * Cinematic text-to-video with automatic scene direction and optional
 * visual references.
 *
 *   POST /higgsfield/cinema-studio/4.0
 *   { prompt, duration, resolution, aspect_ratio, generate_audio,
 *     image_url?, image_urls?, video_url? }
 * Text params are per the official TS example; reference fields follow the
 * sibling Genjutsu video endpoints (image_url / image_urls / video_url).
 *
 * Billing is token-metered (input + generated seconds × pixels × 24fps),
 * roughly $0.2057+/sec — the quote below uses that floor rate.
 * Duration range 4–30s and resolutions 480p–720p are per the rate card.
 */

export const cinemaStudio4: ModelEntry = {
  id: "cinema-studio-4",
  surface: "video",
  label: "Cinema Studio 4.0",
  roles: { start: 1, reference: 8, video: 1 },
  settings: {
    aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
    resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    generateAudio: { type: "boolean", default: true },
  },
};
