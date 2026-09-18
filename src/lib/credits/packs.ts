/** Token packs sold through UroPay (INR — UroPay settles in rupees). */

export type TokenPack = {
  id: string;
  name: string;
  inr: number;
  tokens: number;
  tag?: string;
  blurb: string;
};

export const TOKEN_PACKS: readonly TokenPack[] = [
  { id: "starter", name: "Starter", inr: 199, tokens: 200, blurb: "~7 Seedance 2.5 clips (5s, 720p). Taste everything." },
  { id: "creator", name: "Creator", inr: 499, tokens: 550, tag: "Most popular", blurb: "~19 Seedance 2.5 clips. A month of serious shipping." },
  { id: "studio", name: "Studio", inr: 1499, tokens: 1800, tag: "20% bonus", blurb: "~62 clips. Client work without watching the meter." },
  { id: "scale", name: "Scale", inr: 4999, tokens: 6500, tag: "30% bonus", blurb: "~223 clips. Production volume, best per-token rate." },
];

export function getPack(id: string): TokenPack {
  const pack = TOKEN_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown token pack: ${id}`);
  return pack;
}
