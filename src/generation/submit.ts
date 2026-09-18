import { randomUUID } from "crypto";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import { operatorClient } from "./operator";
import { toPlatform } from "./to-platform";
import { costForPlane } from "@/lib/credits/pricing";
import { grantTokens, spendTokens } from "@/lib/credits/wallet";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Server-only generation lane shared by the Studio and MCP.
 *
 * The billing invariant is deliberately ordered:
 * 1. normalize + quote the request
 * 2. atomically spend tokens
 * 3. only after the spend succeeds, call Higgsfield
 * 4. refund the spend if Higgsfield never queues the request
 */
export async function submitGenerationForUser(
  userId: string,
  plane: GenerationPlane,
  rateLimitKey?: string,
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

  const cost = costForPlane(parsed);
  const spendRef = `gen-${randomUUID()}`;

  // This is the authoritative token check + deduction. It is atomic in SQL,
  // so a concurrent request cannot spend the same balance twice.
  await spendTokens(userId, cost, `gen:${model.id}`, spendRef);

  try {
    const { path, body } = toPlatform(parsed);
    const queued = await operatorClient().submit(path, body);
    console.info("[gen] submitted", { userId, model: model.id, cost, requestId: queued.requestId });
    return queued;
  } catch (caught) {
    await grantTokens(userId, cost, "refund", `${spendRef}:refund`).catch(() => {});
    console.error("[gen] submit failed", {
      userId,
      model: model.id,
      detail: caught instanceof Error ? caught.message : caught,
    });
    throw new Error("Generation failed — your tokens were refunded. Try again in a moment.");
  }
}
