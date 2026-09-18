import { FEATURED_PACK_ID, TOKEN_PACKS, packCtaLabel, type TokenPack } from "@/lib/credits/packs";

import { Reveal } from "../reveal";
import { BuyPackForm } from "./buy-form";

/**
 * The token-pack grid — the ONLY place packs are laid out.
 *
 * Both `/` (homepage pricing section) and `/pricing` render this component
 * against the same `TOKEN_PACKS` array, so price, token count, badge, blurb,
 * ordering, the featured card and the button label are identical by
 * construction. The buy button posts the pack id straight from the canonical
 * list to the shared checkout endpoint (`POST /api/billing/checkout`), which
 * re-reads tokens/amount from `getPack` — one source of truth on both sides of
 * the wire. Editing packs.ts is the only way to change what is sold.
 */
export function TokenPacksGrid({
  packs = TOKEN_PACKS,
  animate = true,
}: {
  packs?: readonly TokenPack[];
  /* The studio's own surfaces render the same cards without the scroll reveal. */
  animate?: boolean;
}) {
  return (
    <div id="packs" className="of-fx-grid of-token-packs-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
      {packs.map((pack) => {
        const className = `of-card of-tier${pack.id === FEATURED_PACK_ID ? " of-tier--hot" : ""}`;
        const body = (
          <>
            {pack.tag && <span className="of-flag of-flag--lime">{pack.tag}</span>}
            <h3 style={{ fontSize: 27 }}>₹{pack.inr}</h3>
            <p className="of-price" style={{ fontSize: 44 }}>
              {pack.tokens} <span className="of-per">tokens</span>
            </p>
            <p>{pack.blurb}</p>
            <BuyPackForm packId={pack.id} label={packCtaLabel(pack)} />
          </>
        );
        return animate ? (
          <Reveal key={pack.id} as="article" className={className}>
            {body}
          </Reveal>
        ) : (
          <article key={pack.id} className={className}>
            {body}
          </article>
        );
      })}
    </div>
  );
}
