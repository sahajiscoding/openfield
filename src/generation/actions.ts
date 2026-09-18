"use server";

import { headers } from "next/headers";

import type { GenerationPlane } from "./catalog/types";
import type { StatusResult } from "./platform";
import { operatorClient } from "./operator";
import { submitGenerationForUser } from "./submit";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { requireSessionUser } from "@/lib/supabase/server";

/**
 * Generation runs on the operator's server-side Higgsfield key (HF_API_KEY).
 * Users pay in tokens; every submit spends up front and refunds on failure.
 */

async function callerKey(prefix: string): Promise<{ key: string; userId: string }> {
  const user = await requireSessionUser({ verified: true });
  const ip = clientIpFromHeaders(await headers());
  return { key: `${prefix}:${user.id}:${ip}`, userId: user.id };
}

export async function submitGeneration(plane: GenerationPlane) {
  const { key, userId } = await callerKey("gen:submit");
  enforceRateLimit(key, 10, 60_000);
  return submitGenerationForUser(userId, plane);
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
