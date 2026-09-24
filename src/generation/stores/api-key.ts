import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/**
 * Bring-your-own Higgsfield key (the "Add key" pill).
 *
 * Stored ONLY in this browser's localStorage — it is never written to the
 * database, a cookie, or the server. Each generation carries it to the
 * server action, which uses it for that platform call instead of the
 * operator key (and skips the token spend: the provider bills the key
 * owner directly).
 */

const STORE_NAME = "openfield.api-key.v1";
export const MAX_KEY_LENGTH = 300;

type ApiKeyState = {
  key: string;
  setKey: (key: string) => void;
  clearKey: () => void;
};

/** id:secret, the same shape the server requires (see credentials.ts). */
export function isValidApiKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) return false;
  const colon = trimmed.indexOf(":");
  return colon > 0 && colon < trimmed.length - 1 && !/\s/.test(trimmed);
}

export function normalizeApiKey(value: string): string {
  return value.trim();
}

export const useApiKey = create<ApiKeyState>()(
  persist(
    (set) => ({
      key: "",
      setKey: (key) => set({ key }),
      clearKey: () => set({ key: "" }),
    }),
    { name: STORE_NAME, storage: browserStorage(), partialize: (state) => ({ key: state.key }) },
  ),
);

/** The key for this browser, or null when the operator key + tokens apply. */
export function personalKey(): string | null {
  const key = useApiKey.getState().key.trim();
  return key && isValidApiKey(key) ? key : null;
}
