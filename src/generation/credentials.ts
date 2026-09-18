/**
 * Operator credential helpers. Generation runs on ONE server-side Higgsfield
 * key (HF_API_KEY, id:secret) — users never paste keys. There is no per-user
 * key storage anywhere in this codebase by design (challenge requirement).
 */

export function toAuthorizationHeader(apiKey: string): string {
  return `Key ${requireIdAndSecret(apiKey)}`;
}

function requireIdAndSecret(apiKey: string): string {
  const colon = apiKey.indexOf(":");
  if (colon <= 0 || colon === apiKey.length - 1) {
    throw new Error("HF_API_KEY must be id:secret");
  }
  return apiKey;
}
