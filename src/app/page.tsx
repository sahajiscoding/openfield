import type { Metadata } from "next";
import Link from "next/link";

import { ComposerMock } from "./composer-mock";
import { LandingNav } from "./nav";
import { ModelRates } from "./model-rates";
import { TokenPacksGrid } from "./pricing/token-packs";
import { Reveal } from "./reveal";
import "./landing.css";

import { rateCard } from "@/lib/credits/pricing";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Openfield — the open-source Higgsfield alternative",
  description:
    "One prompt bar for cinematic AI image and video. Seedance 2.5, Kling 3, Genjutsu, Cinema Studio 4.0, Supabase sign-in. Pay per generation in tokens.",
};

const PROVIDERS = [
  "Seedance 2.5", "Kling 3.0", "Genjutsu", "Cinema Studio 4.0", "Wan 3.0 Prime", "MiniMax H3", "Hailuo 2.3",
  "LTX 2.5", "PixVerse 6", "Grok Imagine", "Ideogram 4.0", "Recraft 4.1", "Soul 2", "Soul Standard",
  "Marketing Studio",
];

const FX = [
  { t: "Floating fall", d: "Zero-gravity portrait drop", c: "of-fx--1" },
  { t: "High flip", d: "Gymnastic camera orbit", c: "of-fx--2" },
  { t: "Burning man", d: "Ember transformation", c: "of-fx--3" },
  { t: "Studio slide", d: "Seamless backdrop glide", c: "of-fx--4" },
  { t: "Incline", d: "Impossible-slope walk", c: "of-fx--5" },
  { t: "Eyes in", d: "Surreal close-up zoom", c: "of-fx--6" },
  { t: "Melting", d: "Slow surreal dissolve", c: "of-fx--7" },
  { t: "Wild ride", d: "FPV chase momentum", c: "of-fx--8" },
];

export default function LandingPage() {
  const rates = rateCard();
  return (
    <div className="of-landing">
      <LandingNav />

      <main>
        <section className="of-wrap of-hero" aria-labelledby="hero-h">
          <div>
            <span className="of-eyebrow"><span className="dot" aria-hidden /> $50K Higgsfield-challenge entry · MIT</span>
            <h1 id="hero-h" className="of-h1">The open studio for <em>cinematic</em> <span className="of-hero-ai">AI</span> videos.</h1>
            <p className="of-sub">
              Openfield is the open Higgsfield client — <strong>one prompt bar</strong>, per-model settings,
              every finished run in one gallery — behind <strong>Supabase sign-in</strong>.
              Top up tokens once. Generate by the second.
            </p>
            <div className="of-cta-row">
              <Link href="/studio" className="of-btn of-btn--lime">Start creating — it&apos;s open</Link>
              <Link href="/#pricing" className="of-btn">See token rates</Link>
            </div>
            <div className="of-meta-row" aria-label="Studio facts">
              <span><b>44</b> Higgsfield models</span>
              <span><b>1¢</b> per token</span>
              <span><b>≤2s</b> first paint</span>
              <span><b>100%</b> MIT</span>
            </div>
          </div>

          <ComposerMock />
        </section>

        <div className="of-marquee" aria-hidden>
          <div className="of-marquee-track">
            {[0, 1].map((copy) => (
              <span key={copy}>{PROVIDERS.map((p) => <span key={`${copy}-${p}`}>{p}<i> ✦ </i></span>)}</span>
            ))}
          </div>
        </div>

        <section id="how" className="of-wrap of-section" aria-labelledby="how-h">
          <Reveal><p className="of-kicker">How it works</p></Reveal>
          <Reveal><h2 id="how-h" className="of-h2">Sign in. Top up. Direct the scene.</h2></Reveal>
          <Reveal><p className="of-lede">No subscriptions, no credits casino. One token is $0.01 of Higgsfield API cost — spend per generation, refund on failure.</p></Reveal>
          <div className="of-grid-3">
            <Reveal as="article" className="of-card"><span className="n">01</span><h3>Sign in with Supabase</h3><p>Magic link, password, or Google OAuth. Sessions refresh at the edge; <code>/studio</code> is gated until you&apos;re in.</p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">02</span><h3>Grab tokens</h3><p>UroPay packs in INR — pay on the hosted checkout. 720p 16:9 30s of Seedance 2.5 is 260 tokens. Balance lives in the studio top bar.</p></Reveal>
            <Reveal as="article" className="of-card" delay={180}><span className="n">03</span><h3>One bar, every model</h3><p>The catalog is the source of truth: pick a model, the settings rail and media roles render themselves. <code>⌘/Ctrl + Enter</code> submits.</p></Reveal>
          </div>
        </section>

        <section id="effects" className="of-wrap of-section" aria-labelledby="fx-h">
          <Reveal><p className="of-kicker">Effects</p></Reveal>
          <Reveal><h2 id="fx-h" className="of-h2">Viral presets,minus the paywall.</h2></Reveal>
          <Reveal><p className="of-lede">The Higgsfield effects wall, recreated as intent-made art direction. Every preset is one click from your own start frame in the studio.</p></Reveal>
          <div className="of-fx-grid">
            {FX.map((f, i) => (
              <Reveal key={f.t} delay={(i % 4) * 70}>
                <article className={`of-fx ${f.c}`}>
                  <span className="grain" aria-hidden />
                  <div><h3>{f.t}</h3><p>{f.d}</p><Link href="/studio" aria-label={`Recreate ${f.t} in the studio`}>Recreate →</Link></div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="models" className="of-wrap of-section" aria-labelledby="models-h">
          <Reveal><p className="of-kicker">Models</p></Reveal>
          <Reveal><h2 id="models-h" className="of-h2">One API. One gallery.</h2></Reveal>
          <Reveal><p className="of-lede">Every call runs on the official Higgsfield API — Seedance 2.5 with face inputs, Kling 3, Genjutsu, Cinema Studio 4.0, Soul, Wan, LTX and more. Poll every 4s to a 10-minute deadline; skeletons bloom per-tile as runs land. Tokens spend on submit, refund on failure.</p></Reveal>
          <Reveal>
            <div style={{ marginTop: 8 }}>
              <Link href="/#pricing" className="of-btn of-btn--lime">Browse all 44 models with live token rates →</Link>
            </div>
          </Reveal>
          <div className="of-split">
            <Reveal as="article" className="of-card"><span className="n">HIGGSFIELD API</span><h3>Submit → poll → bloom</h3><p><code>POST /&#123;model&#125;</code> then <code>GET /requests/&#123;id&#125;/status</code> under the operator key. Server actions are the only caller — the browser never touches provider credentials.</p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">TOKENS</span><h3>Spend on submit, refund on failure</h3><p>Cost quotes derive from the official $/sec rate card at 100 tokens per $1. Balance in the top bar, history on <code>/studio/billing</code>. <Link href="/#pricing">Full rate card →</Link></p></Reveal>
          </div>
        </section>

        <section id="pricing" className="of-wrap of-section" aria-labelledby="pricing-h">
          <Reveal><p className="of-kicker">Pricing</p></Reveal>
          <Reveal><h2 id="pricing-h" className="of-h2">No subscriptions. <span style={{ color: "var(--of-lime)" }}>Just tokens.</span></h2></Reveal>
          <Reveal><p className="of-lede">1 token = $0.01 of Higgsfield API cost. Top up with UroPay direct-UPI, spend per generation, refund on failure.</p></Reveal>
          <TokenPacksGrid />
          <p className="of-pack-note">Secure checkout via <strong>UroPay</strong> — pay on the hosted page, tokens land automatically. They never expire.</p>
          <Reveal><p className="of-kicker">Rate card</p></Reveal>
          <Reveal><h3 className="of-h2" style={{ fontSize: "clamp(26px,3vw,36px)" }}>Every model, quoted the same way.</h3></Reveal>
          <Reveal><p className="of-lede">Video rows: 720p · 16:9 · 30 seconds. Image rows: 1 image. Rates mirror the official Higgsfield API card (100 tokens per $1).</p></Reveal>
          <ModelRates rates={rates} />
        </section>

        <section id="open-source" className="of-wrap of-section" aria-labelledby="oss-h">
          <Reveal><p className="of-kicker">Open source</p></Reveal>
          <Reveal><h2 id="oss-h" className="of-h2">Built on giants. MIT all the way down.</h2></Reveal>
          <Reveal><p className="of-lede">Openfield is built on the open-source Higgsfield studio — credited, linked, and licensed. Fork it, self-host it, QT it with your demo.</p></Reveal>
          <div className="of-split">
            <Reveal as="article" className="of-card"><span className="n">UPSTREAM</span><h3>open-higgsfield</h3><p>Studio shell, 38-model catalog, server actions, Zustand + IndexedDB. <a href="https://github.com/wide-trace/open-higgsfield" rel="noopener">wide-trace/open-higgsfield →</a></p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">THIS REPO</span><h3>sahajiscoding/openfield</h3><p>Supabase auth, token billing via UroPay, credits-priced studio. <a href="https://github.com/sahajiscoding/openfield" rel="noopener">sahajiscoding/openfield →</a></p></Reveal>
          </div>
        </section>

        <section className="of-wrap" aria-labelledby="cta-h">
          <div className="of-cta">
            <div>
              <p className="of-kicker">Seven days. One demo.</p>
              <h2 id="cta-h" className="of-h2">Make something people actually use.</h2>
              <p>Sign in, grab tokens, and ship your first Seedance run in under a minute. Pay per second, never per month.</p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">Open the studio →</Link>
                <Link href="/#pricing" className="of-btn">Pricing</Link>
              </div>
            </div>
            <div className="of-composer-mock" aria-hidden>
              <div className="of-mock-tabs"><span className="of-mock-tab of-mock-tab--on">Seedance 2.5</span><span className="of-mock-tab">Kling 3 Pro</span></div>
              <p className="of-mock-prompt">Neon monsoon over a night market, reflections chasing a rickshaw, anamorphic streaks…</p>
              <div className="of-mock-row"><span className="of-chip">9:16</span><span className="of-chip">10s</span><span className="of-chip of-chip--lime">face input ✓</span></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="of-wrap of-footer">
        <span>© 2026 Openfield · MIT · An open Higgsfield alternative</span>
        <span className="right">
          <a href="https://github.com/sahajiscoding/openfield" rel="noopener">GitHub</a>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/studio">Studio</Link>
        </span>
      </footer>
    </div>
  );
}
