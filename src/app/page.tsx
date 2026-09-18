import type { Metadata } from "next";
import Link from "next/link";

import { ComposerMock } from "./composer-mock";
import { Reveal } from "./reveal";
import "./landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Openfield — the open-source Higgsfield alternative",
  description:
    "One prompt bar for cinematic AI image and video. Seedance 2.5, Kling 3, Soul, Veo, 400+ MuAPI models, Supabase sign-in. MIT licensed.",
};

const PROVIDERS = [
  "Seedance 2.5", "Kling 3.0", "Soul Cinema", "Veo 3", "Sora 2", "Wan 2.6",
  "Hailuo 2.3", "Flux", "Nano Banana 2", "Ideogram", "PixVerse 6", "LTX",
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
  return (
    <div className="of-landing">
      <header className="of-nav">
        <div className="of-wrap of-nav-inner">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <nav className="of-nav-links" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#effects">Effects</a>
            <a href="#models">Models</a>
            <Link href="/pricing">Pricing</Link>
            <Link href="/byok">BYOK</Link>
          </nav>
          <Link href="/login" className="of-btn of-btn--ghost of-btn--nav-sign">Sign in</Link>
          <Link href="/studio" className="of-btn of-btn--lime">Open studio →</Link>
        </div>
      </header>

      <main>
        <section className="of-wrap of-hero" aria-labelledby="hero-h">
          <div>
            <span className="of-eyebrow"><span className="dot" aria-hidden /> $50K Higgsfield-challenge entry · MIT</span>
            <h1 id="hero-h" className="of-h1">The open studio for <em>cinematic</em> AI video.</h1>
            <p className="of-sub">
              Openfield fuses <strong>open-higgsfield</strong> (one prompt bar, per-model settings, gallery)
              with <strong>open-generative-ai&apos;s</strong> 400-model MuAPI gateway — behind{" "}
              <strong>Supabase sign-in</strong>. Paste your API key later. Generate now.
            </p>
            <div className="of-cta-row">
              <Link href="/studio" className="of-btn of-btn--lime">Start creating — it&apos;s open</Link>
              <a href="#models" className="of-btn">Browse 60+ models</a>
            </div>
            <div className="of-meta-row" aria-label="Studio facts">
              <span><b>38</b> Higgsfield models</span>
              <span><b>24</b> curated MuAPI</span>
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
          <Reveal><h2 id="how-h" className="of-h2">Sign in. Paste a key. Direct the scene.</h2></Reveal>
          <Reveal><p className="of-lede">No closed ecosystem, no studio subscription. Your key, your generations — the studio itself is free and self-hostable.</p></Reveal>
          <div className="of-grid-3">
            <Reveal as="article" className="of-card"><span className="n">01</span><h3>Sign in with Supabase</h3><p>Magic link, password, or Google OAuth. Sessions refresh at the edge; <code>/studio</code> is gated until you&apos;re in.</p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">02</span><h3>Bring any key — later</h3><p>Higgsfield <code>id:secret</code> for Seedance/Kling/Soul, or a MuAPI key for 400+ models. Stored in an <code>httpOnly</code> cookie, never in JS.</p></Reveal>
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
          <Reveal><h2 id="models-h" className="of-h2">Two gateways. One gallery.</h2></Reveal>
          <Reveal><p className="of-lede">Higgsfield-compatible endpoints for the cheapest Seedance 2.5 + face inputs in the US — plus the MuAPI catalog (Flux, Midjourney, Kling, Sora, Veo) when you need range. Poll every 4s to a 10-minute deadline; skeletons bloom per-tile as runs land.</p></Reveal>
          <Reveal>
            <div className="of-table" role="region" aria-label="Model providers" tabIndex={0}>
              <table>
                <thead><tr><th scope="col">Provider</th><th scope="col">Auth</th><th scope="col">What you get</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  <tr><td><strong>Higgsfield API</strong><br />Soul 2 · Soul Cinema · Seedance 2.5 / Edit / Extend · Kling 3 · Wan · Flux · Ideogram</td><td><span className="of-pill">id:secret</span></td><td>Per-model settings, start/end/reference/video/audio roles, batch ×4, IndexedDB history</td><td><span className="of-pill of-pill--lime">Live</span></td></tr>
                  <tr><td><strong>MuAPI gateway</strong><br />Seedance · Kling · Veo 3 · Sora 2 · Wan · Hailuo · PixVerse · Flux · Nano Banana · Lip sync</td><td><span className="of-pill">x-api-key</span></td><td>Dual-mode T2I/I2I + T2V/I2V, multi-image inputs, lipsync studio, server proxy</td><td><span className="of-pill of-pill--lime">Live</span></td></tr>
                  <tr><td><strong>Bring your own</strong><br />Self-host, fork the catalog, add a mapper</td><td><span className="of-pill">env</span></td><td><code>HF_API_BASE_URL</code> + <code>MUAPI_BASE_URL</code> — new entry, zero studio changes</td><td><span className="of-pill">MIT</span></td></tr>
                </tbody>
              </table>
            </div>
          </Reveal>
          <div className="of-split">
            <Reveal as="article" className="of-card"><span className="n">HIGGSFIELD-COMPAT</span><h3>Submit → poll → bloom</h3><p><code>POST /&#123;model&#125;</code> then <code>GET /requests/&#123;id&#125;/status</code> with <code>Authorization: Key …</code>. Server actions are the only caller — the browser never touches the key.</p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">MUAPI</span><h3>Two-step, proxied</h3><p><code>POST /api/v1/&#123;endpoint&#125;</code> then poll <code>/predictions/&#123;id&#125;/result</code> under <code>x-api-key</code>. Uploads go through <code>/api/v1/upload_file</code>.</p></Reveal>
          </div>
        </section>

        <section id="open-source" className="of-wrap of-section" aria-labelledby="oss-h">
          <Reveal><p className="of-kicker">Open source</p></Reveal>
          <Reveal><h2 id="oss-h" className="of-h2">Built on giants. MIT all the way down.</h2></Reveal>
          <Reveal><p className="of-lede">Openfield stands on the two repos from the $50K call — credited, linked, and licensed. Fork it, self-host it, QT it with your demo.</p></Reveal>
          <div className="of-grid-3">
            <Reveal as="article" className="of-card"><span className="n">UPSTREAM ①</span><h3>open-higgsfield</h3><p>Studio shell, 38-model catalog, server actions, Zustand + IndexedDB. <a href="https://github.com/wide-trace/open-higgsfield" rel="noopener">wide-trace/open-higgsfield →</a></p></Reveal>
            <Reveal as="article" className="of-card" delay={90}><span className="n">UPSTREAM ②</span><h3>open-generative-ai</h3><p>MuAPI gateway, 400+ models, dual-mode studios, lip sync. <a href="https://github.com/anil-matcha/open-generative-ai" rel="noopener">anil-matcha/open-generative-ai →</a></p></Reveal>
            <Reveal as="article" className="of-card" delay={180}><span className="n">THIS REPO</span><h3>sahajiscoding/openfield</h3><p>Supabase auth, dual-provider studio, $10K-checklist UI. <a href="https://github.com/sahajiscoding/openfield" rel="noopener">sahajiscoding/openfield →</a></p></Reveal>
          </div>
        </section>

        <section className="of-wrap" aria-labelledby="cta-h">
          <div className="of-cta">
            <div>
              <p className="of-kicker">Seven days. One demo.</p>
              <h2 id="cta-h" className="of-h2">Make something people actually use.</h2>
              <p>Sign in, paste a key when you have one, and ship your first Seedance run in under a minute. Free, open, yours.</p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">Open the studio →</Link>
                <Link href="/login" className="of-btn">Sign in</Link>
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
          <Link href="/pricing">Pricing</Link>
          <Link href="/byok">BYOK</Link>
          <Link href="/studio">Studio</Link>
        </span>
      </footer>
    </div>
  );
}
