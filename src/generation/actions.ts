"use server";

import { cookies, headers } from "next/headers";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials";
import { createPlatformClient } from "./platform";
import type { StatusResult } from "./platform";
import { toPlatform } from "./to-platform";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";

async function callerKey(prefix: string): Promise<string> {
  const user = await requireSessionUser();
  const ip = clientIpFromHeaders(await headers());
  return `${prefix}:${user.id}:${ip}`;
}

export async function savePlatformCredentials(data: unknown) {
  const user = await requireSessionUser();
  const { apiKey } = parseCredentialInput(data);
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, encodeCredentials(apiKey), PLATFORM_KEY_COOKIE_OPTIONS);
  console.info("[auth] platform key saved", { userId: user.id });
}

export async function clearPlatformCredentials() {
  const user = await requireSessionUser();
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, "", { ...PLATFORM_KEY_COOKIE_OPTIONS, maxAge: 0 });
  console.info("[auth] platform key cleared", { userId: user.id });
}

export async function hasPlatformCredentials() {
  return (await readStoredCredentials()) !== null;
}

export async function submitGeneration(plane: GenerationPlane) {
  const user = await requireSessionUser({ verified: true });
  enforceRateLimit(await callerKey("gen:submit"), 10, 60_000);
  try {
    const model = getModel(plane.model);
    const parsed: GenerationPlane = {
      ...plane,
      settings: parseSettings(model, plane.settings),
    };
    const { path, body } = toPlatform(parsed);
    const queued = await createPlatformClient(await readCredentials()).submit(path, body);
    console.info("[gen] submitted", { userId: user.id, model: plane.model, requestId: queued.requestId });
    return queued;
  } catch (caught) {
    // MissingCredentialsError must reach the client (it opens the key modal);
    // everything else is logged server-side and flattened so provider internals
    // and key-validity signals never become an anonymous oracle.
    if (caught instanceof MissingCredentialsError) throw caught;
    console.error("[gen] submit failed", { userId: user.id, detail: caught instanceof Error ? caught.message : caught });
    throw new Error("Generation failed — try again; if it repeats, reconnect your key in the studio.");
  }
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  await requireSessionUser({ verified: true });
  enforceRateLimit(await callerKey("gen:status"), 60, 60_000);
  const requestIds = parseRequestIds(data);
  const client = createPlatformClient(await readCredentials());
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        return { requestId, status: await client.status(requestId) };
      } catch (caught) {
        console.error("[gen] status failed", { requestId, detail: caught instanceof Error ? caught.message : caught });
        return { requestId, error: "Status check failed — retrying." };
      }
    }),
  );
}

async function readStoredCredentials() {
  const jar = await cookies();
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value);
}

async function readCredentials() {
  const stored = await readStoredCredentials();
  if (!stored) throw new MissingCredentialsError();
  const baseUrl = process.env.HF_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing HF_API_BASE_URL");
  return { ...stored, baseUrl };
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
