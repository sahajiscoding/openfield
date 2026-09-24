import { createPlatformClient } from "./platform";

export function platformBaseUrl(): string {
  return (process.env.HF_API_BASE_URL?.trim() || "https://api.higgsfield.ai").replace(/\/$/, "");
}

export function operatorClient() {
  const apiKey = process.env.HF_API_KEY?.trim();
  if (!apiKey) throw new Error("Generation is not configured yet — try again later.");
  return createPlatformClient({ apiKey, baseUrl: platformBaseUrl() });
}
