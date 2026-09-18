/**
 * Token packs sold through UroPay (INR — UroPay settles in rupees).
 *
 * THE single source of truth for what a pack costs and what it grants. Price,
 * token count, badge, description, ordering, the highlighted card and the
 * button label all live here, and every surface that shows packs renders
 * `TokenPacksGrid` (src/app/pricing/token-packs.tsx), which reads this list.
 * The landing page and /pricing therefore cannot drift apart: editing one
 * array changes both, and changing a pack's order or badge here changes the
 * order and badge everywhere.
 *
 * Money movement stays server-side: the checkout action only accepts an id
 * from this file (getPack) and re-reads tokens/amount from these values, so a
 * tampered request cannot invent a price.
 *
 * Pack values intentionally unchanged: ₹199 → 200 · ₹499 → 550 ·
 * ₹1499 → 1800 · ₹4999 → 6500.
 */

export type TokenPack = {
  id: string;
  /** Internal tier name (also the checkout `pack_id`). */
  name: string;
  /** Whole rupees — the amount UroPay is asked to charge. */
  inr: number;
  /** Tokens granted when the payment confirms (1 token = $0.01 of API cost). */
  tokens: number;
  /** Card badge, e.g. "Most popular" / "20% bonus". Omitted = no badge. */
  tag?: string;
  blurb: string;
  /** The card the layouts mark as recommended. Data, never array position. */
  highlight?: boolean;
};

export const TOKEN_PACKS: readonly TokenPack[] = [
  { id: "starter", name: "Starter", inr: 199, tokens: 200, blurb: "~7 Seedance 2.5 clips (5s, 720p). Taste everything." },
  {
    id: "creator",
    name: "Creator",
    inr: 499,
    tokens: 550,
    tag: "Most popular",
    blurb: "~19 Seedance 2.5 clips. A month of serious shipping.",
    highlight: true,
  },
  { id: "studio", name: "Studio", inr: 1499, tokens: 1800, tag: "20% bonus", blurb: "~62 clips. Client work without watching the meter." },
  { id: "scale", name: "Scale", inr: 4999, tokens: 6500, tag: "30% bonus", blurb: "~223 clips. Production volume, best per-token rate." },
];

/** The one the layouts feature — derived, so no page picks its own favourite. */
export const FEATURED_PACK_ID = TOKEN_PACKS.find((pack) => pack.highlight)?.id ?? TOKEN_PACKS[0]?.id ?? "";

export function getPack(id: string): TokenPack {
  const pack = TOKEN_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown token pack: ${id}`);
  return pack;
}

/** Button label — one derivation, so every surface offers the same words. */
export function packCtaLabel(pack: TokenPack): string {
  return `Buy ${pack.tokens} tokens`;
}
