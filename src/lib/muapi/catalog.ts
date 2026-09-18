/**
 * Curated MuAPI catalog — distilled from open-generative-ai's 420+ model
 * registry (packages/studio/src/models.js) into the ~36 endpoints that win
 * demos: Seedance, Kling, Veo, Sora, Wan, Hailuo, Pixverse, Flux, Nano Banana.
 *
 * Full registry stays upstream; this file is the source of truth for the
 * MuAPI provider tab in Openfield. `endpoint` is the MuAPI task name used as
 * POST /api/v1/{endpoint}.
 */

export type MuapiSurface = "image" | "video" | "lipsync";

export type MuapiModel = {
  id: string;
  label: string;
  surface: MuapiSurface;
  endpoint: string;
  aspects: readonly string[];
  durations?: readonly number[];
  needsImage?: boolean;
  blurb: string;
};

export const MUAPI_MODELS: readonly MuapiModel[] = [
  // ── Video · text-to-video ──────────────────────────────────────────────
  { id: "muapi-seedance-25", label: "Seedance 2.5", surface: "video", endpoint: "bytedance-seedance-2.5", aspects: ["16:9", "9:16", "1:1", "4:3", "3:4"], durations: [5, 10, 15], blurb: "ByteDance flagship · cheapest quality on the market" },
  { id: "muapi-seedance-20", label: "Seedance 2.0", surface: "video", endpoint: "bytedance-seedance-2.0", aspects: ["16:9", "9:16", "4:3", "3:4"], durations: [5, 10, 15], blurb: "Fast, reliable T2V workhorse" },
  { id: "muapi-kling-3", label: "Kling 3.0", surface: "video", endpoint: "kling-3.0-text-to-video", aspects: ["16:9", "9:16", "1:1"], durations: [5, 10], blurb: "Cinematic motion, strong faces" },
  { id: "muapi-veo-3", label: "Veo 3", surface: "video", endpoint: "google-veo-3-text-to-video", aspects: ["16:9", "9:16"], durations: [8], blurb: "Google native-audio cinema" },
  { id: "muapi-sora-2", label: "Sora 2", surface: "video", endpoint: "openai-sora-2-text-to-video", aspects: ["16:9", "9:16", "1:1"], durations: [5, 10], blurb: "OpenAI world-model look" },
  { id: "muapi-wan-26", label: "Wan 2.6", surface: "video", endpoint: "alibaba-wan-2.6-text-to-video", aspects: ["16:9", "9:16", "1:1"], durations: [5, 10], blurb: "Open-weight Alibaba motion" },
  { id: "muapi-hailuo-23", label: "Hailuo 2.3", surface: "video", endpoint: "minimax-hailuo-2.3-text-to-video", aspects: ["16:9", "9:16"], durations: [6, 10], blurb: "MiniMax expressive action" },
  { id: "muapi-pixverse-6", label: "PixVerse 6", surface: "video", endpoint: "pixverse-6-text-to-video", aspects: ["16:9", "9:16", "1:1"], durations: [5, 8], blurb: "Stylized viral clips" },
  { id: "muapi-grok-imagine", label: "Grok Imagine", surface: "video", endpoint: "xai-grok-imagine-text-to-video", aspects: ["16:9", "9:16", "1:1"], durations: [6, 10, 15], blurb: "xAI fun / normal / spicy modes" },
  // ── Video · image-to-video ─────────────────────────────────────────────
  { id: "muapi-kling-i2v", label: "Kling I2V", surface: "video", endpoint: "kling-2.1-image-to-video", aspects: ["16:9", "9:16"], durations: [5, 10], needsImage: true, blurb: "Animate any start frame" },
  { id: "muapi-veo-i2v", label: "Veo 3 I2V", surface: "video", endpoint: "google-veo-3-image-to-video", aspects: ["16:9", "9:16"], durations: [8], needsImage: true, blurb: "Still → cinema with audio" },
  { id: "muapi-seedance-i2v", label: "Seedance I2V", surface: "video", endpoint: "bytedance-seedance-2.0-image-to-video", aspects: ["16:9", "9:16", "4:3", "3:4"], durations: [5, 10, 15], needsImage: true, blurb: "Cheap image animation" },
  { id: "muapi-wan-i2v", label: "Wan I2V", surface: "video", endpoint: "alibaba-wan-2.2-image-to-video", aspects: ["16:9", "9:16"], durations: [5], needsImage: true, blurb: "Open I2V baseline" },
  // ── Image ──────────────────────────────────────────────────────────────
  { id: "muapi-flux-dev", label: "Flux Dev", surface: "image", endpoint: "flux-dev-text-to-image", aspects: ["1:1", "16:9", "9:16", "4:3", "3:4"], blurb: "Open image standard" },
  { id: "muapi-nano-banana-2", label: "Nano Banana 2", surface: "image", endpoint: "google-nano-banana-2-text-to-image", aspects: ["1:1", "16:9", "9:16", "4:3", "3:4"], blurb: "Gemini 3.1 Flash · 1K/2K/4K" },
  { id: "muapi-seedream-5", label: "Seedream 5.0", surface: "image", endpoint: "bytedance-seedream-5.0-text-to-image", aspects: ["1:1", "16:9", "9:16", "4:3", "3:4"], blurb: "ByteDance 4K stills" },
  { id: "muapi-ideogram-3", label: "Ideogram v3", surface: "image", endpoint: "ideogram-v3-text-to-image", aspects: ["1:1", "16:9", "9:16"], blurb: "Best text-in-image" },
  { id: "muapi-midjourney-7", label: "Midjourney v7", surface: "image", endpoint: "midjourney-v7-text-to-image", aspects: ["1:1", "16:9", "9:16"], blurb: "Taste-max stills" },
  { id: "muapi-gpt-image", label: "GPT Image", surface: "image", endpoint: "openai-gpt-image-text-to-image", aspects: ["1:1", "16:9", "9:16"], blurb: "Instruction-faithful edits" },
  { id: "muapi-flux-kontext", label: "Flux Kontext Edit", surface: "image", endpoint: "flux-kontext-pro-image-to-image", aspects: ["1:1", "16:9", "9:16"], needsImage: true, blurb: "Reference-guided edit" },
  { id: "muapi-nano-edit", label: "Nano Banana Edit", surface: "image", endpoint: "google-nano-banana-2-edit", aspects: ["1:1", "16:9", "9:16"], needsImage: true, blurb: "Up to 14 reference images" },
  // ── Lip sync ───────────────────────────────────────────────────────────
  { id: "muapi-infinitetalk", label: "Infinite Talk", surface: "lipsync", endpoint: "infinitetalk-image-to-video", aspects: ["16:9", "9:16", "1:1"], needsImage: true, blurb: "Portrait + audio → talking head" },
  { id: "muapi-ltx-lipsync", label: "LTX Lipsync", surface: "lipsync", endpoint: "ltx-2.3-lipsync", aspects: ["16:9", "9:16"], needsImage: true, blurb: "480p / 720p / 1080p sync" },
  { id: "muapi-sync", label: "Sync Lipsync", surface: "lipsync", endpoint: "sync-lipsync", aspects: ["16:9", "9:16"], needsImage: true, blurb: "Video + audio re-lip" },
];

export function getMuapiModel(id: string): MuapiModel {
  const found = MUAPI_MODELS.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown MuAPI model: ${id}`);
  return found;
}
