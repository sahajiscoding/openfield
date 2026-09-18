import type { Metadata } from "next";
import Link from "next/link";

import { hasPlatformCredentials } from "@/generation/actions";
import { hasMuapiKey } from "@/lib/muapi/actions";
import { Reveal } from "../reveal";
import "../landing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/byok" },
  title: "BYOK — bring your own key",
  description:
    "Use Openfield with your own Higgsfield id:secret or MuAPI key. Stored in httpOnly cookies, called only from server actions — the browser never touches your key.",
};

const STEPS = [
  {
    n: "01",
    t: "Get a key",
    d: "Higgsfield console → API keys (format id:secret) for Seedance, Kling, Soul. MuAPI access-keys page for the 400+ catalog (Veo, Sora, Flux, lip sync).",
  },
  {
    n: "02",
    t: "Paste it in the studio",
    d: "Higgsfield tab → Add key. MuAPI tab → MuAPI key. Saved to an httpOnly cookie for 30 days — or set MUAPI_API_KEY / HF_API_BASE_URL on the server instead.",
  },
  {
    n: "03",
    t: "Generate at cost",
    d: "Every run bills your provider balance directly. No credits, no markup, no subscription meter running in Openfield.",
  },
];

const FAQS: Array<[string, string]> = [
  [
    "Which key format goes where?",
    "Higgsfield tab: id:secret (two parts joined by a colon — the studio rejects anything else). MuAPI tab: a single x-api-key token. The forms tell you immediately if the shape is wrong, before anything is saved.",
  ],
  [
    "Can I use both providers?",
    "Yes — that's the point. Keep a Higgsfield key for the cheapest Seedance 2.5 + face inputs and a MuAPI key for Veo, Sora, and lip sync. The studio remembers each independently and the provider tabs switch instantly.",
  ],
  [
    "What happens if I never add a key?",
    "Everything except generation works: landing, sign-in, browsing the catalog, your gallery history. The moment you press Generate without a key, the studio opens the key modal instead of failing silently.",
  ],
  [
    "How do I revoke a key?",
    "Delete it at the provider (Higgsfield console / MuAPI dashboard) and it dies everywhere. Then remove it from the studio — Higgsfield tab → key button → remove; MuAPI tab → MuAPI key → Clear. Server operators rotate MUAPI_API_KEY by redeploying env.",
  ],
  [
    "I'm self-hosting — where do keys go?",
    "Per-user keys still flow through the same httpOnly-cookie modals. Server defaults come from env: HF_API_BASE_URL + MUAPI_BASE_URL point at providers, MUAPI_API_KEY prefills MuAPI for all signed-in users, OPEN_HIGGSFIELD_READ_WRITE_TOKEN enables Vercel Blob uploads.",
  ],
];

function StatusPill({ on }: { on: boolean }) {
  return on
    ? <span className="of-pill of-pill--lime">Connected</span>
    : <span className="of-pill">Not connected</span>;
}

export default async function ByokPage() {
  const [hfConnected, muapiConnected] = await Promise.all([
    hasPlatformCredentials().catch(() => false),
    hasMuapiKey().catch(() => false),
  ]);

  return (
    <div className="of-landing">
      <header className="of-nav">
        <div className="of-wrap of-nav-inner">
          <Link href="/" className="of-brand" aria-label="Openfield home">
            <span className="of-mark" aria-hidden>○</span> Openfield
          </Link>
          <nav className="of-nav-links" aria-label="Primary">
            <Link href="/#how">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/byok" aria-current="page">BYOK</Link>
            <Link href="/#open-source">Open source</Link>
          </nav>
          <Link href="/login" className="of-btn of-btn--ghost of-btn--nav-sign">Sign in</Link>
          <Link href="/studio" className="of-btn of-btn--lime">Open studio →</Link>
        </div>
      </header>

      <main>
        <section className="of-wrap of-section" aria-labelledby="byok-h" style={{ paddingTop: 72 }}>
          <Reveal><p className="of-kicker">BYOK · your keys, your bill</p></Reveal>
          <Reveal><h1 id="byok-h" className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)" }}>Bring your own key. <span style={{ color: "var(--of-lime)" }}>Keep your margin.</span></h1></Reveal>
          <Reveal><p className="of-lede">Openfield never sells you credits. Connect the providers you already pay, generate at their cost, revoke anytime. Status below reflects this browser right now. Prefer keyless? <Link href="/pricing">Pro runs on our Higgsfield key →</Link></p></Reveal>

          <div className="of-split">
            <Reveal as="article" className="of-card">
              <span className="n">PROVIDER ①</span>
              <h3>Higgsfield API</h3>
              <p>Soul 2 · Soul Cinema · Seedance 2.5 / Edit / Extend · Kling 3 · Wan · Flux · Ideogram. Format: <code>id:secret</code>.</p>
              <p><StatusPill on={hfConnected} /></p>
              <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="of-btn" href="https://console.higgsfield.ai/" rel="noopener">Get a key →</a>
                <Link className="of-btn of-btn--lime" href="/studio">Manage in studio</Link>
              </p>
            </Reveal>
            <Reveal as="article" className="of-card" delay={90}>
              <span className="n">PROVIDER ②</span>
              <h3>MuAPI gateway</h3>
              <p>400+ models — Veo 3 · Sora 2 · Kling · Flux · Nano Banana · lip sync. Format: single <code>x-api-key</code> token.</p>
              <p><StatusPill on={muapiConnected} /></p>
              <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="of-btn" href="https://muapi.ai/access-keys" rel="noopener">Get a key →</a>
                <Link className="of-btn of-btn--lime" href="/studio">Manage in studio</Link>
              </p>
            </Reveal>
          </div>
        </section>

        <section className="of-wrap of-section" aria-labelledby="steps-h">
          <Reveal><p className="of-kicker">Three steps</p></Reveal>
          <Reveal><h2 id="steps-h" className="of-h2">From zero to first render in a minute.</h2></Reveal>
          <div className="of-grid-3" style={{ marginTop: 26 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} as="article" className="of-card" delay={i * 90}>
                <span className="n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="of-wrap of-section" aria-labelledby="sec-h">
          <Reveal><p className="of-kicker">Security</p></Reveal>
          <Reveal><h2 id="sec-h" className="of-h2">Your key never meets JavaScript.</h2></Reveal>
          <Reveal>
            <div className="of-table" role="region" aria-label="Key security model" tabIndex={0}>
              <table>
                <thead><tr><th scope="col">Guarantee</th><th scope="col">How</th></tr></thead>
                <tbody>
                  <tr><td><strong>Unreadable by the browser</strong></td><td>Keys persist in <code>httpOnly</code> cookies — <code>document.cookie</code> and every script see nothing.</td></tr>
                  <tr><td><strong>Server-only provider calls</strong></td><td>Next.js server actions are the sole caller of Higgsfield (<code>Authorization: Key …</code>) and MuAPI (<code>x-api-key</code>).</td></tr>
                  <tr><td><strong>Secrets stay server-side</strong></td><td><code>HF_API_BASE_URL</code>, <code>MUAPI_API_KEY</code> and the Blob token have no <code>NEXT_PUBLIC_</code> prefix — they never ship to the client.</td></tr>
                  <tr><td><strong>Scoped uploads</strong></td><td>Reference frames upload per-device pathnames; Supabase storage policies scope reads and deletes.</td></tr>
                  <tr><td><strong>Instant revocation</strong></td><td>Kill the key at the provider and remove it in-studio; no background jobs hold a copy.</td></tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section className="of-wrap of-section" aria-labelledby="faq-h">
          <Reveal><p className="of-kicker">FAQ</p></Reveal>
          <Reveal><h2 id="faq-h" className="of-h2">Key questions, answered.</h2></Reveal>
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
              <p className="of-kicker">Ready when you are</p>
              <h2 id="cta-h" className="of-h2">Keys later. Cinema now.</h2>
              <p>Browse the catalog and your gallery today — the studio asks for a key only at the moment of generation. See <Link href="/pricing">pricing →</Link></p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">Open the studio →</Link>
                <Link href="/pricing" className="of-btn">Pricing</Link>
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
