/**
 * Operator credential helpers. Generation defaults to ONE server-side
 * Higgsfield key (HF_API_KEY, id:secret) with token billing — users never
 * paste keys for that path. A visitor can still bring their own key via the
 * studio's "Add key" pill: it lives only in that browser's localStorage,
 * rides a single server action, is format-checked here, and is never stored
 * or logged server-side. Personal-key runs skip the token spend because the
 * provider bills the key owner directly.
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
