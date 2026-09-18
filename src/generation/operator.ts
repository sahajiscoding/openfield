import { createPlatformClient } from "./platform";

export function operatorClient() {
  const apiKey = process.env.HF_API_KEY?.trim();
  if (!apiKey) throw new Error("Generation is not configured yet — try again later.");
  const baseUrl = (process.env.HF_API_BASE_URL?.trim() || "https://api.higgsfield.ai").replace(
    /\/$/,
    "",
  );
  return createPlatformClient({ apiKey, baseUrl });
}
