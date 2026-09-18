import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "../reveal";
import "../landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — BYOK free, Pro keyless",
  description:
    "Two ways to generate on Openfield: BYOK — bring your own key and pay providers directly, free forever. Pro — no key needed, paid models included on our Higgsfield key.",
};

const TIERS = [
  {
    flag: "Available now",
    hot: false,
    name: "BYOK",
    price: "$0",
    per: "forever",
    blurb: "Bring your own key. The studio is free; you pay your provider directly per run.",
    feats: [
      "Full studio: 38 Higgsfield + 400+ MuAPI catalog",
      "Higgsfield id:secret or MuAPI x-api-key",
      "Provider bills your key — $0 to us",
      "httpOnly key storage, revoke anytime",
      "MIT source + self-hostable",
    ],
    cta: { label: "Start with your key", href: "/byok", lime: true },
  },
  {
    flag: "Early access",
    hot: true,
    name: "Pro",
    price: "$12",
    per: "/ month",
    blurb: "No key needed. Paid models included, running on our Higgsfield API key.",
    feats: [
      "Everything in BYOK, keyless",
      "Paid models unlocked: Seedance 2.5, Kling 3 Pro, Soul Cinema",
      "Runs on our Higgsfield key — nothing to paste",
      "Priority render queue + higher limits",
      "Email support",
    ],
    cta: { label: "Join the waitlist", href: "https://github.com/sahajiscoding/openfield", lime: true },
  },
];

const FAQS: Array<[string, string]> = [
  [
    "What's the difference between BYOK and Pro?",
    "BYOK is free forever: you connect your own Higgsfield or MuAPI key and that provider bills you per run — Openfield takes nothing. Pro is keyless: you pay us a flat monthly price and generate on our Higgsfield API key, with paid models included. Pro is in early access; until launch, all generation runs via BYOK and nothing is charged.",
  ],
  [
    "Which models are 'paid' models?",
    "The flagship Higgsfield endpoints — Seedance 2.5 (including face inputs), Kling 3 Pro / 4K, Soul Cinema. On BYOK you pay your provider's per-run rate for these; on Pro they're included in the plan up to fair-use limits.",
  ],
  [
    "Do I need a key on Pro?",
    "No — that's the point of Pro. Generation runs on our Higgsfield key, so there's nothing to paste, rotate, or top up. You can still connect your own MuAPI key alongside Pro for the 400+ extended catalog (Veo, Sora, lip sync).",
  ],
  [
    "Is my API key safe on BYOK?",
    "Keys live in httpOnly cookies the browser JS can't read, and every provider call runs in a server action — the browser never talks to Higgsfield or MuAPI directly. Remove a key anytime from the studio; it stops working immediately.",
  ],
  [
    "Can I self-host?",
    "Yes — MIT licensed, no phone-home, no feature gates. Clone the repo, set the env from .env.example, deploy anywhere Next.js runs. Self-hosting follows the BYOK path: connect keys per user, or set server defaults via env.",
  ],
  [
    "Will I be charged for Pro today?",
    "No. Pro is early access — the waitlist collects interest and nothing is charged until launch. BYOK stays free forever regardless.",
  ],
];

export default function PricingPage() {
  return (
    <div className="of-landing">
      <header className="of-nav">
        <div className="of-wrap of-nav-inner">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <nav className="of-nav-links" aria-label="Primary">
            <Link href="/#how">How it works</Link>
            <Link href="/pricing" aria-current="page">Pricing</Link>
            <Link href="/byok">BYOK</Link>
            <Link href="/#open-source">Open source</Link>
          </nav>
          <Link href="/login" className="of-btn of-btn--ghost of-btn--nav-sign">Sign in</Link>
          <Link href="/studio" className="of-btn of-btn--lime">Open studio →</Link>
        </div>
      </header>

      <main>
        <section className="of-wrap of-section" aria-labelledby="pricing-h" style={{ paddingTop: 72 }}>
          <Reveal><p className="of-kicker">Pricing</p></Reveal>
          <Reveal><h1 id="pricing-h" className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)" }}>Your key, or <span style={{ color: "var(--of-lime)" }}>ours.</span></h1></Reveal>
          <Reveal><p className="of-lede">BYOK is free forever — bring a provider key and pay that provider directly. Pro is keyless — a flat monthly price with paid models included on our Higgsfield API key.</p></Reveal>

          <div className="of-split">
            {TIERS.map((t, i) => (
              <Reveal key={t.name} as="article" className={`of-card of-tier${t.hot ? " of-tier--hot" : ""}`} delay={i * 90}>
                <span className={`of-flag${t.hot ? " of-flag--lime" : ""}`}>{t.flag}</span>
                <h3 style={{ fontSize: 24 }}>{t.name}</h3>
                <p className="of-price">{t.price} <span className="of-per">{t.per}</span></p>
                <p>{t.blurb}</p>
                <ul className="of-feats">
                  {t.feats.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={t.cta.href} className={`of-btn${t.cta.lime ? " of-btn--lime" : ""}`} style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                  {t.cta.label}
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="of-wrap of-section" aria-labelledby="compare-h">
          <Reveal><p className="of-kicker">Compare</p></Reveal>
          <Reveal><h2 id="compare-h" className="of-h2">BYOK vs. Pro.</h2></Reveal>
          <Reveal><p className="of-lede">Same studio, same gallery — the plans differ only in whose key pays for the pixels.</p></Reveal>
          <Reveal>
            <div className="of-table" role="region" aria-label="Plan comparison" tabIndex={0}>
              <table>
                <thead><tr><th scope="col"> </th><th scope="col">BYOK · $0</th><th scope="col">Pro · $12/mo</th></tr></thead>
                <tbody>
                  <tr><td><strong>Key needed</strong></td><td>Yours — <code>id:secret</code> or <code>x-api-key</code></td><td><span className="of-pill of-pill--lime">None — ours</span></td></tr>
                  <tr><td><strong>Paid models</strong><br />Seedance 2.5, Kling 3 Pro, Soul Cinema</td><td>At your provider&apos;s per-run rate</td><td><span className="of-pill of-pill--lime">Included</span> (fair use)</td></tr>
                  <tr><td><strong>Generation billing</strong></td><td>Provider bills your key directly</td><td>Flat monthly, on our Higgsfield key</td></tr>
                  <tr><td><strong>Studio + gallery</strong></td><td>Full — 38 + 400+ models, batch ×4, viewer</td><td>Full — same studio</td></tr>
                  <tr><td><strong>Queue</strong></td><td>Standard</td><td>Priority + higher limits</td></tr>
                  <tr><td><strong>Support</strong></td><td>Community (GitHub)</td><td>Email</td></tr>
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
              <p className="of-kicker">Start free</p>
              <h2 id="cta-h" className="of-h2">Bring a key today. Go keyless when Pro lands.</h2>
              <p>BYOK works right now — no card, no waitlist. Read <Link href="/byok">how keys work →</Link></p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">Open the studio →</Link>
                <Link href="/byok" className="of-btn">How keys work</Link>
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
          <Link href="/byok">BYOK</Link>
          <Link href="/studio">Studio</Link>
        </span>
      </footer>
    </div>
  );
}
