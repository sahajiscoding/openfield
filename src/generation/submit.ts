import { randomUUID } from "crypto";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import { toAuthorizationHeader } from "./credentials";
import { operatorClient, platformBaseUrl } from "./operator";
import { createPlatformClient } from "./platform";
import { toPlatform } from "./to-platform";
import { costForPlane } from "@/lib/credits/pricing";
import { grantTokens, spendTokens } from "@/lib/credits/wallet";
import { enforceRateLimit } from "@/lib/rate-limit";

/** A caller-supplied Higgsfield key, validated to id:secret shape. Never logged. */
export function personalClient(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed || trimmed.length > 300) throw new Error("Invalid API key.");
  // Throws unless the value is id:secret — the only validation possible
  // without spending one of the owner's calls.
  toAuthorizationHeader(trimmed);
  return createPlatformClient({ apiKey: trimmed, baseUrl: platformBaseUrl() });
}

/**
 * Server-only generation lane shared by the Studio and MCP.
 *
 * The billing invariant is deliberately ordered:
 * 1. normalize + quote the request
 * 2. atomically spend tokens (SKIPPED for a personal key — the provider
 *    bills the key owner directly, so there is nothing to spend or refund)
 * 3. only after the spend succeeds, call Higgsfield
 * 4. refund the spend if Higgsfield never queues the request
 */
export async function submitGenerationForUser(
  userId: string,
  plane: GenerationPlane,
  rateLimitKey?: string,
  personalKey?: string,
) {
  if (rateLimitKey) enforceRateLimit(rateLimitKey, 6, 60_000);

  const model = getModel(plane.model);
  const parsed: GenerationPlane = {
    ...plane,
    model: model.id,
    prompt: { text: plane.prompt.text.trim().slice(0, 2000) },
    settings: parseSettings(model, plane.settings),
  };
  if (!parsed.prompt.text) throw new Error("Prompt is required.");

  const client = personalKey ? personalClient(personalKey) : operatorClient();
  const cost = personalKey ? 0 : costForPlane(parsed);
  const spendRef = `gen-${randomUUID()}`;

  // This is the authoritative token check + deduction. It is atomic in SQL,
  // so a concurrent request cannot spend the same balance twice.
  // A personal key skips it entirely: billing happens on the owner's
  // Higgsfield account, so there is no spend to make and none to refund.
  let spent = false;
  if (!personalKey) {
    await spendTokens(userId, cost, `gen:${model.id}`, spendRef);
    spent = true;
  }

  try {
    const { path, body } = toPlatform(parsed);
    const queued = await client.submit(path, body);
    console.info("[gen] submitted", { userId, model: model.id, cost, requestId: queued.requestId });
    return queued;
  } catch (caught) {
    if (spent) await grantTokens(userId, cost, "refund", `${spendRef}:refund`).catch(() => {});
    console.error("[gen] submit failed", {
      userId,
      model: model.id,
      detail: caught instanceof Error ? caught.message : caught,
    });
    if (personalKey) throw caught instanceof Error ? caught : new Error(String(caught));
    throw new Error("Generation failed — your tokens were refunded. Try again in a moment.");
  }
}
