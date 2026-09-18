import type { Metadata } from "next";
import Link from "next/link";

import { TOKEN_PACKS } from "@/lib/credits/packs";
import { TOKENS_PER_USD, rateCard, tokensToUsd } from "@/lib/credits/pricing";
import { LandingNav } from "../nav";
import { Reveal } from "../reveal";
import "../landing.css";

import { BuyPackForm } from "./buy-form";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — pay per generation in tokens",
  description:
    "No subscriptions. 1 token = $0.01 of Higgsfield API cost — Seedance 2.5 at 720p 16:9 for 30 seconds is 260 tokens. Top up with UroPay.",
};

const FAQS: Array<[string, string]> = [
  [
    "What is a token?",
    "One token equals $0.01 of Higgsfield API cost. Every model has a public per-second (video) or per-image rate taken from the official Higgsfield API rate card — the studio spends tokens when you press Generate and refunds automatically if the submit fails.",
  ],
  [
    "What does 720p · 16:9 · 30 seconds cost?",
    "Seedance 2.5: 260 tokens (~$2.60). Kling 3.0: 126 tokens (~$1.26). Wan 3.0 Prime: 143 tokens (~$1.43). MiniMax H3: 215 tokens (~$2.15). Soul 2 images are 1 token each. The full table below quotes every model the same way.",
  ],
  [
    "Do tokens expire?",
    "No — tokens never expire and there is no subscription meter. Failed submits refund instantly; only queued platform requests spend.",
  ],
  [
    "How do I pay?",
    "UroPay hosted checkout in INR: pick a pack, pay on the secure payment page, and tokens land automatically when the payment confirms. Order history lives at /studio/billing.",
  ],
  [
    "Where do I see my balance?",
    "The studio top bar always shows your live token count (it turns into a top-up prompt at zero), and /studio/billing lists every order and its status.",
  ],
  [
    "Can I self-host instead?",
    "Yes — MIT licensed, no phone-home. Clone the repo, add your own HF_API_KEY plus Supabase and UroPay credentials from .env.example, deploy anywhere Next.js runs.",
  ],
];

export default function PricingPage() {
  const rates = rateCard();

  return (
    <div className="of-landing">
      <LandingNav current="pricing" />

      <main>
        <section className="of-wrap of-section" aria-labelledby="pricing-h" style={{ paddingTop: 72 }}>
          <Reveal><p className="of-kicker">Pricing</p></Reveal>
          <Reveal><h1 id="pricing-h" className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)" }}>No subscriptions. <span style={{ color: "var(--of-lime)" }}>Just tokens.</span></h1></Reveal>
          <Reveal><p className="of-lede">1 token = $0.01 of Higgsfield API cost. Top up with UroPay, spend per generation, refund on failure. Nothing else to understand.</p></Reveal>

          <div id="packs" className="of-fx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {TOKEN_PACKS.map((p, i) => (
              <Reveal key={p.id} as="article" className={`of-card of-tier${i === 1 ? " of-tier--hot" : ""}`}>
                {p.tag && <span className="of-flag of-flag--lime">{p.tag}</span>}
                <h3 style={{ fontSize: 27 }}>₹{p.inr}</h3>
                <p className="of-price" style={{ fontSize: 44 }}>{p.tokens} <span className="of-per">tokens</span></p>
                <p>{p.blurb}</p>
                <BuyPackForm packId={p.id} label={`Buy ${p.tokens} tokens`} />
              </Reveal>
            ))}
          </div>
          <p className="of-pack-note">Secure checkout via <strong>UroPay</strong> — pay on the hosted page, tokens land automatically. They never expire.</p>
        </section>

        <section className="of-wrap of-section" aria-labelledby="rates-h">
          <Reveal><p className="of-kicker">Rate card</p></Reveal>
          <Reveal><h2 id="rates-h" className="of-h2">Every model, quoted the same way.</h2></Reveal>
          <Reveal><p className="of-lede">Video rows: 720p · 16:9 · 30 seconds. Image rows: 1 image. Rates mirror the official Higgsfield API card ({TOKENS_PER_USD} tokens per $1).</p></Reveal>
          <Reveal>
            <div className="of-table" role="region" aria-label="Token rate card" tabIndex={0}>
              <table>
                <thead>
                  <tr><th scope="col">Model</th><th scope="col">Type</th><th scope="col">Tokens</th><th scope="col">≈ USD</th></tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.modelId}>
                      <td><strong>{r.label}</strong></td>
                      <td>
                        <span className="of-pill">{r.kind === "video" ? "30s · 720p" : "1 image"}</span>
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{r.tokens30s}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--of-smoke)" }}>
                        ${tokensToUsd(r.tokens30s).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section className="of-wrap of-section" aria-labelledby="faq-h">
          <Reveal><p className="of-kicker">FAQ</p></Reveal>
          <Reveal><h2 id="faq-h" className="of-h2">Asked in every demo.</h2></Reveal>
          <div style={{ display: "grid", gap: 12, marginTop: 26 }}>
            {FAQS.map(([q, a], i) => (
              <Reveal key={q} delay={i * 60}>
                <details className="of-faq">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="of-wrap" aria-labelledby="cta-h">
          <div className="of-cta">
            <div>
              <p className="of-kicker">Start generating</p>
              <h2 id="cta-h" className="of-h2">Grab tokens. Ship your first Seedance run.</h2>
              <p>Sign in, top up once, and a 720p 30-second Seedance 2.5 clip is 260 tokens.</p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">Open the studio →</Link>
                <Link href="#packs" className="of-btn">See packs</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="of-wrap of-footer">
        <span>© 2026 Openfield · MIT · An open Higgsfield alternative</span>
        <span className="right">
          <a href="https://github.com/sahajiscoding/openfield" rel="noopener">GitHub</a>
          <Link href="/pricing">Pricing</Link>
          <Link href="/studio">Studio</Link>
        </span>
      </footer>
    </div>
  );
}
