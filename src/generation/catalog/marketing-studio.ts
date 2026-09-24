import type { ModelEntry } from "./types";

/**
 * Marketing Studio image family (released 09/01/2026).
 *
 * Direct generation/editing only (enhance_prompt=false). The preset flow
 * (preset catalog fetch → preset_id + enhance_prompt=true, +10% on 2.0)
 * needs a preset picker UI first — tracked as future work, so no preset
 * fields are exposed here.
 *
 *   POST /marketing-studio/image            (2.0 Alpha)
 *   POST /marketing-studio/image/flare      (2.5 Flare, +quality)
 *   POST /marketing-studio/image/sunburst   (2.5 Sunburst, +quality)
 *   { prompt, resolution, aspect_ratio, enhance_prompt: false,
 *     quality?, image_urls? }
 * Omit image_urls for generation; pass product/model images for editing
 * (Flare/Sunburst accept up to 16). Resolution default is 2k upstream —
 * this catalog defaults 1k to keep the quote low.
 *
 * Pricing note: 2.0 costs $0.0121 @1k / $0.0167 @2k (25% sale); $0.5414
 * @4k-high is deliberately NOT offered (45× outlier — would need
 * per-resolution pricing). Flare/Sunburst are token-metered estimates
 * reconciled on completion; the flat rate below is the from-price floor.
 */

const MARKETING_ASPECT = [
  "auto",
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
] as const;

const MARKETING_RESOLUTION = ["1k", "2k"] as const;

const QUALITY = ["low", "medium", "high", "xhigh", "max"] as const;

export const marketingStudio: ModelEntry = {
  id: "marketing-studio",
  surface: "image",
  label: "Marketing Studio Image",
  roles: { reference: 4 },
  settings: {
    aspectRatio: { type: "enum", values: MARKETING_ASPECT, default: "auto" },
    resolution: { type: "enum", values: MARKETING_RESOLUTION, default: "1k" },
  },
};

function marketing25(id: string, label: string): ModelEntry {
  return {
    id,
    surface: "image",
    label,
    roles: { reference: 8 },
    settings: {
      aspectRatio: { type: "enum", values: MARKETING_ASPECT, default: "auto" },
      resolution: { type: "enum", values: MARKETING_RESOLUTION, default: "1k" },
      quality: { type: "enum", values: QUALITY, default: "high" },
    },
  };
}

export const marketingFlare = marketing25("marketing-flare", "Marketing Studio 2.5 Flare");

export const marketingSunburst = marketing25(
  "marketing-sunburst",
  "Marketing Studio 2.5 Sunburst",
);
