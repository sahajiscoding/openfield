import { getMuapiModel } from "./catalog";

export const MUAPI_KEY_COOKIE = "muapi_key";
export const MUAPI_KEY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export class MissingMuapiKeyError extends Error {
  constructor() {
    super("Missing MuAPI key");
    this.name = "MissingMuapiKeyError";
  }
}

export function encodeMuapiKey(apiKey: string): string {
  return JSON.stringify({ apiKey });
}

export function decodeMuapiKey(raw: string | undefined): { apiKey: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const apiKey = (parsed as { apiKey?: unknown }).apiKey;
    if (typeof apiKey !== "string" || !apiKey.trim()) return null;
    return { apiKey: apiKey.trim() };
  } catch {
    return null;
  }
}

export type MuapiSubmit = {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  duration?: number;
  resolution?: string;
  image_url?: string | null;
  images_list?: string[];
  generate_audio?: boolean;
};

export type MuapiQueued = { request_id: string; status: string };
export type MuapiStatus =
  | { requestId: string; status: "completed"; url: string }
  | { requestId: string; status: "failed" | "processing" | "queued"; error?: string };

function baseUrl(): string {
  return (process.env.MUAPI_BASE_URL ?? "https://api.muapi.ai").replace(/\/$/, "");
}

function headers(apiKey: string) {
  return { "Content-Type": "application/json", "x-api-key": apiKey };
}

/** Server-side only — never import from a client component. */
export async function muapiSubmit(apiKey: string, input: MuapiSubmit): Promise<MuapiQueued> {
  const model = getMuapiModel(input.model);
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    ...(input.aspect_ratio ? { aspect_ratio: input.aspect_ratio } : {}),
    ...(typeof input.duration === "number" ? { duration: input.duration } : {}),
    ...(input.resolution ? { resolution: input.resolution } : {}),
    ...(typeof input.generate_audio === "boolean" ? { generate_audio: input.generate_audio } : {}),
    ...(input.image_url ? { image_url: input.image_url } : { image_url: null }),
    ...(input.images_list?.length ? { images_list: input.images_list } : {}),
  };
  const res = await fetch(`${baseUrl()}/api/v1/${model.endpoint}`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MuAPI submit failed (${res.status}) ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { request_id?: string; id?: string; status?: string };
  const request_id = data.request_id ?? data.id;
  if (!request_id) throw new Error("MuAPI response missing request_id");
  return { request_id, status: data.status ?? "queued" };
}

/** Server-side poll of GET /api/v1/predictions/{id}/result (MuAPI two-step). */
export async function muapiStatus(apiKey: string, requestId: string): Promise<MuapiStatus> {
  const res = await fetch(`${baseUrl()}/api/v1/predictions/${encodeURIComponent(requestId)}/result`, {
    headers: headers(apiKey),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { requestId, status: "failed", error: `MuAPI status ${res.status} ${text.slice(0, 160)}` };
  }
  const data = (await res.json()) as {
    status?: string;
    outputs?: string[];
    url?: string;
    output?: { url?: string };
    error?: unknown;
  };
  const s = String(data.status ?? "").toLowerCase();
  if (s === "completed" || s === "succeeded" || s === "success") {
    const url = data.outputs?.[0] ?? data.url ?? data.output?.url;
    if (!url) return { requestId, status: "failed", error: "MuAPI completed without a URL" };
    return { requestId, status: "completed", url };
  }
  if (s === "failed" || s === "error") {
    return { requestId, status: "failed", error: typeof data.error === "string" ? data.error : "MuAPI run failed" };
  }
  return { requestId, status: "processing" };
}

export async function muapiUpload(apiKey: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${baseUrl()}/api/v1/upload_file`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`MuAPI upload failed (${res.status})`);
  const data = (await res.json()) as { url?: string; file_url?: string; data?: { url?: string } };
  const url = data.url ?? data.file_url ?? data.data?.url;
  if (!url) throw new Error("MuAPI upload returned no URL");
  return url;
}
