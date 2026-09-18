import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "../reveal";
import "../landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing — free studio, pay the models directly",
  description:
    "Openfield is free and MIT licensed. Bring your own Higgsfield or MuAPI key and pay providers directly — no bundled credits, no markup.",
};

const TIERS = [
  {
    flag: "Available now",
    hot: false,
    name: "Open",
    price: "$0",
    per: "forever",
    blurb: "The full studio, self-hosted. Your keys, your bill, your data.",
    feats: [
      "Higgsfield tab — all 38 models",
      "MuAPI tab — curated 400+ catalog",
      "BYOK: id:secret + x-api-key",
      "Gallery, viewer, batch ×4, undo",
      "MIT source + self-host",
    ],
    cta: { label: "Open the studio", href: "/studio", lime: true },
  },
  {
    flag: "Early access",
    hot: true,
    name: "Creator",
    price: "$12",
    per: "/ month",
    blurb: "Hosted studio for solo storytellers shipping every week.",
    feats: [
      "Everything in Open, hosted",
      "Supabase login + cloud history",
      "Lip-sync studio included",
      "Priority render queue",
      "Email support",
    ],
    cta: { label: "Join the waitlist", href: "https://github.com/sahajiscoding/openfield", lime: true },
  },
  {
    flag: "Early access",
    hot: false,
    name: "Studio",
    price: "$49",
    per: "/ month",
    blurb: "For teams and client work — seats, shared vault, invoices.",
    feats: [
      "Everything in Creator",
      "5 seats included",
      "Shared team key vault",
      "Invoice billing",
      "Priority support",
    ],
    cta: { label: "Talk to us", href: "https://github.com/sahajiscoding/openfield", lime: false },
  },
];

const FAQS: Array<[string, string]> = [
  [
    "What do generations actually cost me?",
    "Whatever your provider charges your key — Openfield adds $0. A Seedance 2.5 run via the Higgsfield API is billed by Higgsfield; a Veo 3 run via MuAPI is billed by MuAPI. Check each run against your provider balance, which the studio surfaces where the API exposes it.",
  ],
  [
    "Do I need both keys?",
    "No. One key unlocks its tab: a Higgsfield id:secret powers the 38-model tab (Seedance, Kling, Soul…), a MuAPI key powers the 400+ catalog (Veo, Sora, Flux, lip sync…). Power users keep both and switch per shot.",
  ],
  [
    "Is my API key safe here?",
    "Keys live in httpOnly cookies the browser JS can't read, and every provider call runs in a server action — the browser never talks to Higgsfield or MuAPI directly. Remove a key anytime from the studio; it stops working immediately.",
  ],
  [
    "Can I self-host instead of paying?",
    "Yes — that's the Open tier. Clone the repo, set the env from .env.example, deploy anywhere Next.js runs. MIT licensed, no phone-home, no feature gates.",
  ],
  [
    "Can I cancel Creator or Studio?",
    "Anytime, in one click, and you keep the Open tier forever — including everything you generated. Paid plans are early access; nothing is charged until launch.",
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
          <Reveal><h1 id="pricing-h" className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)" }}>Free studio. Pay the models, <span style={{ color: "var(--of-lime)" }}>not us.</span></h1></Reveal>
          <Reveal><p className="of-lede">Openfield charges $0 for generation. You bring a provider key and pay that provider directly — no bundled credits, no markup, no subscription required to create.</p></Reveal>

          <div className="of-grid-3">
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
          <Reveal><h2 id="compare-h" className="of-h2">Openfield vs. closed subscriptions.</h2></Reveal>
          <Reveal><p className="of-lede">Typical closed AI-video platforms charge monthly subscriptions for bundled credits inside a locked ecosystem. Openfield inverts it: the studio is free, the models bill you directly.</p></Reveal>
          <Reveal>
            <div className="of-table" role="region" aria-label="Pricing comparison" tabIndex={0}>
              <table>
                <thead><tr><th scope="col"> </th><th scope="col">Openfield Open</th><th scope="col">Typical closed platform</th></tr></thead>
                <tbody>
                  <tr><td><strong>Studio license</strong></td><td><span className="of-pill of-pill--lime">$0 · MIT</span></td><td>≈ $8–120/mo per tier (check pricing pages)</td></tr>
                  <tr><td><strong>Generation billing</strong></td><td>Pay provider directly on your key</td><td>Bundled credits inside the subscription</td></tr>
                  <tr><td><strong>Your key</strong></td><td>Yours — portable, revocable</td><td>Locked to the platform</td></tr>
                  <tr><td><strong>Models</strong></td><td>38 Higgsfield + 400+ MuAPI in one gallery</td><td>Proprietary set only</td></tr>
                  <tr><td><strong>Self-host</strong></td><td><span className="of-pill of-pill--lime">Yes</span></td><td>No</td></tr>
                  <tr><td><strong>Source code</strong></td><td><span className="of-pill of-pill--lime">MIT</span></td><td>Closed</td></tr>
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
              <h2 id="cta-h" className="of-h2">Your first run costs whatever the model costs. Nothing else.</h2>
              <p>Sign in, paste a key when you have one, generate. Read <Link href="/byok">how BYOK works →</Link></p>
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
