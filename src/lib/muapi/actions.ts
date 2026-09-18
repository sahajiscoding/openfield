"use server";

import { cookies } from "next/headers";

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

export async function saveMuapiKey(data: unknown) {
  const raw =
    typeof data === "object" && data !== null
      ? ((data as Record<string, unknown>).apiKey ?? (data as Record<string, unknown>).api_key)
      : null;
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Enter a MuAPI key");
  const jar = await cookies();
  jar.set(MUAPI_KEY_COOKIE, encodeMuapiKey(raw.trim()), { ...MUAPI_KEY_COOKIE_OPTIONS });
}

export async function clearMuapiKey() {
  const jar = await cookies();
  jar.set(MUAPI_KEY_COOKIE, "", { ...MUAPI_KEY_COOKIE_OPTIONS, maxAge: 0 });
}

export async function hasMuapiKey(): Promise<boolean> {
  const jar = await cookies();
  if (decodeMuapiKey(jar.get(MUAPI_KEY_COOKIE)?.value)) return true;
  return Boolean(process.env.MUAPI_API_KEY?.trim());
}

async function readMuapiKey(): Promise<string> {
  const jar = await cookies();
  const stored = decodeMuapiKey(jar.get(MUAPI_KEY_COOKIE)?.value);
  if (stored) return stored.apiKey;
  const env = process.env.MUAPI_API_KEY?.trim();
  if (env) return env;
  throw new MissingMuapiKeyError();
}

export async function submitMuapiGeneration(input: MuapiSubmit) {
  return muapiSubmit(await readMuapiKey(), input);
}

export async function getMuapiStatus(requestId: string) {
  return muapiStatus(await readMuapiKey(), requestId);
}
