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

const FX_ART: Record<string, React.ReactNode> = {
  "of-fx--1": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f1g" cx="30%" cy="12%" r="65%">
          <stop offset="0%" stopColor="#5a6b1a" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#20260a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f1g)" />
      {[
        [70, 40], [150, 24], [238, 52], [320, 30], [110, 84], [282, 96],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 2.4 : 1.6} fill="#d4f921" opacity={0.25 + (i % 3) * 0.2} />
      ))}
      <g opacity="0.9">
        <line x1="196" y1="30" x2="188" y2="120" stroke="#d4f921" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        <line x1="216" y1="30" x2="208" y2="120" stroke="#d4f921" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
        <circle cx="198" cy="150" r="17" fill="#e8e4d8" opacity="0.92" />
        <rect x="184" y="168" width="30" height="62" rx="14" fill="#e8e4d8" opacity="0.85" transform="rotate(8 199 199)" />
        <rect x="176" y="176" width="12" height="44" rx="6" fill="#cfc9b8" opacity="0.8" transform="rotate(24 182 198)" />
        <rect x="212" y="176" width="12" height="44" rx="6" fill="#cfc9b8" opacity="0.8" transform="rotate(-18 218 198)" />
      </g>
      <ellipse cx="198" cy="252" rx="52" ry="10" fill="#000" opacity="0.55" />
    </svg>
  ),
  "of-fx--2": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f2g" cx="62%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#164e4b" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#101e4a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f2g)" />
      <ellipse cx="200" cy="150" rx="150" ry="86" fill="none" stroke="#7de3dc" strokeWidth="2.5" strokeDasharray="10 9" opacity="0.65" transform="rotate(-18 200 150)" />
      <ellipse cx="200" cy="150" rx="104" ry="58" fill="none" stroke="#7de3dc" strokeWidth="1.5" strokeDasharray="4 7" opacity="0.35" transform="rotate(-18 200 150)" />
      <g transform="translate(268 84) rotate(38)" opacity="0.95">
        <circle cx="0" cy="-26" r="13" fill="#e8e4d8" />
        <path d="M0 -12 C 26 -8, 30 16, 8 30 C -8 40, -26 30, -22 12 C -19 -2, -12 -10, 0 -12 Z" fill="#e8e4d8" opacity="0.9" />
        <path d="M-20 8 L-44 -6 M6 32 L22 52" stroke="#e8e4d8" strokeWidth="9" strokeLinecap="round" />
      </g>
      {[
        [60, 210], [96, 228], [320, 200],
      ].map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={x + 34} y2={y - 12} stroke="#9be8e2" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      ))}
    </svg>
  ),
  "of-fx--3": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f3g" cx="78%" cy="18%" r="65%">
          <stop offset="0%" stopColor="#8a2f1c" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#2a0f0c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="f3f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#c33d1e" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f3g)" />
      <path d="M150 250 C 140 190, 175 175, 168 130 C 163 95, 185 80, 200 60 C 214 82, 236 96, 230 132 C 224 176, 258 192, 248 250 Z" fill="url(#f3f)" opacity="0.85" />
      <circle cx="200" cy="52" r="14" fill="#1a0c0a" />
      <rect x="188" y="66" width="26" height="60" rx="12" fill="#1a0c0a" />
      {[
        [120, 120, 4, "#ffb347", 0.9], [160, 70, 3, "#ff7a2f", 0.8], [250, 90, 5, "#ffcf6b", 0.9],
        [290, 140, 3, "#ff7a2f", 0.7], [100, 190, 2.5, "#ffcf6b", 0.7], [270, 180, 4, "#ffb347", 0.8],
        [200, 40, 3, "#ffe1a1", 0.9], [140, 150, 2, "#ff7a2f", 0.6],
      ].map(([x, y, r, c, o], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity={o as number} />
      ))}
      <path d="M120 260 q 20 -14 40 0 t 40 0 t 40 0 t 40 0" stroke="#ff7a2f" strokeWidth="2.5" fill="none" opacity="0.5" />
    </svg>
  ),
  "of-fx--4": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="f4g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#232f47" />
          <stop offset="60%" stopColor="#0d1526" />
          <stop offset="100%" stopColor="#08090a" />
        </linearGradient>
        <linearGradient id="f4b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fa3c7" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3a4a6b" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f4g)" />
      <polygon points="150,0 250,0 310,210 90,210" fill="#ffe9a8" opacity="0.13" />
      <path d="M40 210 L40 90 Q40 60 70 60 L330 60 Q360 60 360 90 L360 210" fill="none" stroke="url(#f4b)" strokeWidth="10" opacity="0.9" />
      <line x1="30" y1="212" x2="370" y2="212" stroke="#5a6b8c" strokeWidth="3" opacity="0.8" />
      <rect x="168" y="150" width="64" height="58" rx="6" fill="#141d33" stroke="#8fa3c7" strokeWidth="2" />
      <rect x="168" y="150" width="64" height="16" rx="6" fill="#d4f921" opacity="0.85" />
      <line x1="150" y1="212" x2="120" y2="212" stroke="#d4f921" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <line x1="250" y1="212" x2="290" y2="212" stroke="#d4f921" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <polygon points="120,206 132,206 126,196" fill="#d4f921" opacity="0.8" />
    </svg>
  ),
  "of-fx--5": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f5g" cx="30%" cy="70%" r="70%">
          <stop offset="0%" stopColor="#2c4a3c" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#0e1a16" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f5g)" />
      <polygon points="0,250 400,90 400,150 0,300" fill="#3d5a4a" opacity="0.85" />
      <line x1="0" y1="250" x2="400" y2="90" stroke="#9fd8bb" strokeWidth="3" opacity="0.8" />
      <line x1="40" y1="232" x2="360" y2="100" stroke="#e8f5ec" strokeWidth="2" strokeDasharray="8 8" opacity="0.6" />
      <g stroke="#f2efe4" strokeWidth="7" strokeLinecap="round" opacity="0.95">
        <circle cx="238" cy="118" r="12" fill="#f2efe4" stroke="none" />
        <line x1="238" y1="132" x2="238" y2="168" />
        <line x1="238" y1="142" x2="216" y2="158" />
        <line x1="238" y1="142" x2="260" y2="156" />
        <line x1="238" y1="168" x2="220" y2="196" />
        <line x1="238" y1="168" x2="258" y2="192" />
      </g>
      <circle cx="120" cy="60" r="22" fill="#e8f5ec" opacity="0.16" />
      <circle cx="330" cy="48" r="12" fill="#e8f5ec" opacity="0.14" />
    </svg>
  ),
  "of-fx--6": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f6g" cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#3a2d55" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#101828" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f6g)" />
      <ellipse cx="200" cy="140" rx="150" ry="92" fill="none" stroke="#8f7bd8" strokeWidth="2" opacity="0.35" />
      <ellipse cx="200" cy="140" rx="112" ry="68" fill="none" stroke="#8f7bd8" strokeWidth="2.5" opacity="0.55" />
      <ellipse cx="200" cy="140" rx="76" ry="46" fill="#e9e4f2" opacity="0.92" />
      <circle cx="200" cy="140" r="26" fill="#2b1f4d" />
      <circle cx="200" cy="140" r="26" fill="none" stroke="#d4f921" strokeWidth="3" opacity="0.9" />
      <circle cx="200" cy="140" r="11" fill="#08090a" />
      <circle cx="193" cy="133" r="4" fill="#fff" opacity="0.85" />
      {[
        [52, 44], [348, 44], [52, 236], [348, 236],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} h18 M${x} ${y} v18`} stroke="#8f7bd8" strokeWidth="3" strokeLinecap="round" opacity="0.7" transform={`rotate(${i * 90} ${x} ${y})`} />
      ))}
    </svg>
  ),
  "of-fx--7": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="f7g" cx="70%" cy="80%" r="70%">
          <stop offset="0%" stopColor="#54401f" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#191207" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#08090a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="f7d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b34b" />
          <stop offset="100%" stopColor="#8a5a1c" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f7g)" />
      <rect x="0" y="0" width="400" height="34" fill="url(#f7d)" opacity="0.9" />
      {[
        [60, 34, 26, 10], [140, 34, 44, 13], [225, 34, 30, 11], [310, 34, 52, 14],
      ].map(([x, y, len, w], i) => (
        <g key={i}>
          <rect x={(x as number) - (w as number) / 2} y={y as number} width={w as number} height={len as number} rx={(w as number) / 2} fill="url(#f7d)" opacity="0.9" />
          <circle cx={x as number} cy={(y as number) + (len as number)} r={(w as number) / 2 + 2} fill="#e8b34b" opacity="0.75" />
        </g>
      ))}
      <ellipse cx="200" cy="248" rx="120" ry="20" fill="#e8b34b" opacity="0.28" />
      <ellipse cx="200" cy="252" rx="76" ry="12" fill="#ffcf6b" opacity="0.3" />
      <circle cx="120" cy="170" r="16" fill="none" stroke="#ffcf6b" strokeWidth="3" opacity="0.55" />
      <circle cx="292" cy="150" r="9" fill="none" stroke="#ffcf6b" strokeWidth="2.5" opacity="0.45" />
    </svg>
  ),
  "of-fx--8": (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="f8g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35284a" />
          <stop offset="55%" stopColor="#141020" />
          <stop offset="100%" stopColor="#08090a" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#f8g)" />
      <circle cx="200" cy="96" r="20" fill="#f2e9ff" opacity="0.85" />
      <circle cx="200" cy="96" r="30" fill="none" stroke="#f2e9ff" strokeWidth="2" opacity="0.3" />
      {[
        [40, 150, 26, 34], [76, 142, 34, 40], [300, 140, 30, 44], [336, 150, 24, 32],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x as number} y={(y as number) - (h as number)} width={w as number} height={h as number} fill="#241a36" opacity="0.9" />
      ))}
      <polygon points="186,150 214,150 300,300 100,300" fill="#2e2342" opacity="0.95" />
      <line x1="200" y1="150" x2="200" y2="300" stroke="#d4f921" strokeWidth="3" strokeDasharray="14 10" opacity="0.8" />
      {[
        [30, 60, 90, 74], [370, 70, 310, 84], [24, 130, 104, 138], [376, 140, 296, 148],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9b3f2" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      ))}
    </svg>
  ),
};

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
                <span className="of-fx-art" aria-hidden>{FX_ART[f.c]}</span>
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
