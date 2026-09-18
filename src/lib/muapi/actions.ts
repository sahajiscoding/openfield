"use server";

import { cookies, headers } from "next/headers";

import {
  MUAPI_KEY_COOKIE,
  MUAPI_KEY_COOKIE_OPTIONS,
  MissingMuapiKeyError,
  decodeMuapiKey,
  encodeMuapiKey,
  muapiStatus,
  muapiSubmit,
  type MuapiSubmit,
} from "@/lib/muapi/client";
import { getMuapiModel } from "@/lib/muapi/catalog";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";

async function callerKey(prefix: string): Promise<string> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  return `${prefix}:${user.id}:${ip}`;
}

export async function saveMuapiKey(data: unknown) {
  const user = await requireSessionUser();
  const raw =
    typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).apiKey ?? (data as Record<string, unknown>).api_key)
      : null;
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Enter a MuAPI key");
  const jar = await cookies();
  jar.set(MUAPI_KEY_COOKIE, encodeMuapiKey(raw.trim()), { ...MUAPI_KEY_COOKIE_OPTIONS });
  console.info("[auth] muapi key saved", { userId: user.id });
}

export async function clearMuapiKey() {
  const user = await requireSessionUser();
  const jar = await cookies();
  jar.set(MUAPI_KEY_COOKIE, "", { ...MUAPI_KEY_COOKIE_OPTIONS, maxAge: 0 });
  console.info("[auth] muapi key cleared", { userId: user.id });
}

/**
 * Per-browser status only: true when THIS browser holds a key cookie.
 * Deliberately ignores the server env default so /byok never reveals
 * operator configuration to strangers.
 */
export async function hasMuapiKey(): Promise<boolean> {
  const jar = await cookies();
  return decodeMuapiKey(jar.get(MUAPI_KEY_COOKIE)?.value) !== null;
}

async function readMuapiKey(): Promise<string> {
  const jar = await cookies();
  const stored = decodeMuapiKey(jar.get(MUAPI_KEY_COOKIE)?.value);
  if (stored) return stored.apiKey;
  const env = process.env.MUAPI_API_KEY?.trim();
  if (env) return env;
  throw new MissingMuapiKeyError();
}

function assertHttpsUrl(value: unknown, field: string): void {
  if (value === null || value === undefined) return;
  let parsed: URL;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new Error(`Invalid ${field}: must be an https URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`Invalid ${field}: must be an https URL.`);
  }
}

function validateMuapiInput(input: MuapiSubmit): void {
  const model = getMuapiModel(input.model);
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) throw new Error("Prompt is required.");
  if (prompt.length > 4000) throw new Error("Prompt is too long (max 4000 characters).");
  if (input.aspect_ratio !== undefined && !model.aspects.includes(input.aspect_ratio)) {
    throw new Error("Invalid aspect ratio for this model.");
  }
  if (
    input.duration !== undefined &&
    model.durations !== undefined &&
    !model.durations.includes(input.duration)
  ) {
    throw new Error("Invalid duration for this model.");
  }
  if (input.resolution !== undefined && typeof input.resolution !== "string") {
    throw new Error("Invalid resolution.");
  }
  assertHttpsUrl(input.image_url, "image_url");
  for (const url of input.images_list ?? []) assertHttpsUrl(url, "images_list entry");
}

export async function submitMuapiGeneration(input: MuapiSubmit) {
  const user = await requireSessionUser({ verified: true });
  enforceRateLimit(await callerKey("muapi:submit"), 10, 60_000);
  validateMuapiInput(input);
  try {
    const queued = await muapiSubmit(await readMuapiKey(), input);
    console.info("[gen] muapi submitted", { userId: user.id, model: input.model, requestId: queued.request_id });
    return queued;
  } catch (caught) {
    if (caught instanceof MissingMuapiKeyError) throw caught;
    console.error("[gen] muapi submit failed", { userId: user.id, detail: caught instanceof Error ? caught.message : caught });
    throw new Error("Generation failed — try again; if it repeats, reconnect your key in the studio.");
  }
}

export async function getMuapiStatus(requestId: string) {
  await requireSessionUser({ verified: true });
  enforceRateLimit(await callerKey("muapi:status"), 60, 60_000);
  if (typeof requestId !== "string" || !requestId || requestId.length > 256) {
    throw new Error("Invalid request id.");
  }
  const status = await muapiStatus(await readMuapiKey(), requestId);
  // Flatten provider error text: the tile shows a generic failure while the
  // detail stays in server logs, so statuses can't oracle key validity.
  if (status.status === "failed" && status.error) {
    console.error("[gen] muapi status failed", { requestId, detail: status.error });
    return { ...status, error: "Run failed — try again with adjusted settings." };
  }
  return status;
}
