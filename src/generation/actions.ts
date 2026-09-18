"use server";

import { headers } from "next/headers";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import { createPlatformClient } from "./platform";
import type { StatusResult } from "./platform";
import { toPlatform } from "./to-platform";
import { costForPlane } from "@/lib/credits/pricing";
import { grantTokens, spendTokens } from "@/lib/credits/wallet";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";

/**
 * Generation runs on the operator's server-side Higgsfield key (HF_API_KEY).
 * Users pay in tokens; every submit spends up front and refunds on failure.
 */

function operatorClient() {
  const apiKey = process.env.HF_API_KEY?.trim();
  if (!apiKey) throw new Error("Generation is not configured yet — try again later.");
  const baseUrl = (process.env.HF_API_BASE_URL?.trim() || "https://api.higgsfield.ai").replace(
    /\/$/,
    "",
  );
  // createPlatformClient validates the id:secret shape via toAuthorizationHeader.
  return createPlatformClient({ apiKey, baseUrl });
}

async function callerKey(prefix: string): Promise<{ key: string; userId: string }> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  return { key: `${prefix}:${user.id}:${ip}`, userId: user.id };
}

export async function submitGeneration(plane: GenerationPlane) {
  const { key, userId } = await callerKey("gen:submit");
  enforceRateLimit(key, 10, 60_000);
  const model = getModel(plane.model);
  const parsed: GenerationPlane = {
    ...plane,
    settings: parseSettings(model, plane.settings),
  };
  const cost = costForPlane(parsed);
  const spendRef = `gen-${Date.now().toString(36)}-${userId.slice(0, 8)}`;
  // Throws "Insufficient tokens" before any provider call when short.
  await spendTokens(userId, cost, `gen:${plane.model}`, spendRef);
  try {
    const { path, body } = toPlatform(parsed);
    const queued = await operatorClient().submit(path, body);
    console.info("[gen] submitted", { userId, model: plane.model, cost, requestId: queued.requestId });
    return queued;
  } catch (caught) {
    // Attempts bill on most APIs, but a failed submit refunds here: users pay
    // only for requests the platform actually queued.
    await grantTokens(userId, cost, "refund", `${spendRef}:refund`).catch(() => {});
    console.error("[gen] submit failed", { userId, detail: caught instanceof Error ? caught.message : caught });
    throw new Error("Generation failed — your tokens were refunded. Try again in a moment.");
  }
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const { key } = await callerKey("gen:status");
  enforceRateLimit(key, 60, 60_000);
  const requestIds = parseRequestIds(data);
  const client = operatorClient();
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
