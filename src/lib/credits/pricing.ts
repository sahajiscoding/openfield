import { MODELS, getModel } from "@/generation/catalog";
import type { GenerationPlane } from "@/generation/catalog/types";
import { countSetting } from "@/openhiggsfield/data";

/**
 * Token pricing — the ONE place money math lives.
 *
 * 1 token = $0.01 of provider cost. Video rates are the official Higgsfield
 * API sale prices ($/second, higgsfield.ai/higgsfield-api, Sep 2026).
 * Image rates are the official per-image API prices.
 *
 * IMPORTANT: a team-provided key can carry different rates (e.g. a custom
 * Seedance 2.5 figure). If the console shows other numbers, change them
 * here — every quote, deduction, and pricing-page row derives from this file.
 */
export const TOKENS_PER_USD = 100;

/** $/second for video models, keyed by catalog id. */
const VIDEO_USD_PER_SEC: Record<string, number> = {
  "seedance-2.5": 0.0864,
  "seedance-2.5-edit": 0.0864,
  "seedance-2.5-extend": 0.0864,
  "seedance-2": 0.0985,
  "seedance-2-fast": 0.0985,
  "seedance-2-mini": 0.0985,
  "kling-3-turbo": 0.042,
  "kling-3-std": 0.042,
  "kling-3-pro": 0.042,
  "kling-3-4k": 0.042,
  "kling-3-motion-std": 0.042,
  "kling-3-motion-pro": 0.042,
  "kling-2.6": 0.035,
  "kling-2.5": 0.021,
  "kling-o1": 0.042,
  "kling-o3": 0.042,
  "ltx-2.5-fast": 0.09,
  "ltx-2.5-pro": 0.12,
  "minimax-h3": 0.0715,
  "minimax-hailuo-2.3": 0.0467,
  "pixverse-6": 0.0978,
  "grok-imagine-video-1.5": 0.08,
  "wan-2.6": 0.1,
  "wan-2.7": 0.1,
  "wan-3": 0.03,
  "wan-3-prime": 0.0476,
  "happy-horse-1": 0.077,
  "happy-horse-1.1": 0.077,
  // Genjutsu bills per INPUT-video second at the 720p sale rate (conservative:
  // the quote uses the duration setting as the expected clip length).
  "genjutsu-motion": 0.3405,
  "genjutsu-swap": 0.3405,
  // Cinema Studio 4.0 is token-metered; the explore floor rate is the quote.
  "cinema-studio-4": 0.2057,
  // Unlisted on the public rate card — conservative defaults, adjust on invoice.
  "flux-3": 0.05,
  dop: 0.05,
};

/** $/image for image models, keyed by catalog id. */
const IMAGE_USD_PER_IMAGE: Record<string, number> = {
  "soul-2": 0.0032,
  "soul-standard": 0.0938,
  "grok-imagine-2": 0.04,
  "ideogram-4": 0.03,
  "recraft-4.1": 0.035,
  "qwen-image-3": 0.04,
  "z-image-turbo": 0.015,
  // Marketing Studio 2.0 at the 2k sale rate (covers 1k too: both quote 2
  // tokens; 4k-high is not offered — see marketing-studio.ts).
  "marketing-studio": 0.0167,
  // Flare/Sunburst are token-metered estimates — from-price floor.
  "marketing-flare": 0.02,
  "marketing-sunburst": 0.02,
  // Unlisted on the public rate card — conservative default.
  "flux-2": 0.02,
};

const DEFAULT_VIDEO_USD_PER_SEC = 0.05;
const DEFAULT_IMAGE_USD = 0.02;

export function usdPerSecond(modelId: string): number {
  return VIDEO_USD_PER_SEC[modelId] ?? DEFAULT_VIDEO_USD_PER_SEC;
}

export function usdPerImage(modelId: string): number {
  return IMAGE_USD_PER_IMAGE[modelId] ?? DEFAULT_IMAGE_USD;
}

function batchCount(modelId: string, settings: Record<string, unknown>): number {
  try {
    const native = countSetting(getModel(modelId));
    if (!native) return 1;
    const n = Number(settings[native.key]);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  } catch {
    return 1;
  }
}

/** Token quote for one submitGeneration call (includes native batch count). */
export function costForPlane(plane: GenerationPlane): number {
  const model = getModel(plane.model);
  const batch = batchCount(plane.model, plane.settings as Record<string, unknown>);
  if (model.surface === "image") {
    return Math.max(1, Math.ceil(usdPerImage(model.id) * TOKENS_PER_USD)) * batch;
  }
  const duration =
    typeof plane.settings.duration === "number" && plane.settings.duration > 0
      ? plane.settings.duration
      : 5;
  return Math.max(1, Math.ceil(usdPerSecond(model.id) * duration * TOKENS_PER_USD)) * batch;
}

export function tokensToUsd(tokens: number): number {
  return tokens / TOKENS_PER_USD;
}

/** Display rows for /pricing: 720p · 16:9 · 30s video, 1 image. */
export function rateCard(): Array<{
  modelId: string;
  label: string;
  kind: "video" | "image";
  usd: number;
  tokens30s: number;
}> {
  return MODELS.map((m) => {
    if (m.surface === "image") {
      const usd = usdPerImage(m.id);
      return { modelId: m.id, label: m.label, kind: "image" as const, usd, tokens30s: Math.max(1, Math.ceil(usd * TOKENS_PER_USD)) };
    }
    const usd = usdPerSecond(m.id) * 30;
    return { modelId: m.id, label: m.label, kind: "video" as const, usd, tokens30s: Math.max(1, Math.ceil(usd * TOKENS_PER_USD)) };
  });
}
