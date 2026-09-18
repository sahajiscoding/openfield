import type { Metadata } from "next";
import Link from "next/link";

import { LandingNav } from "../nav";
import { Reveal } from "../reveal";
import "../landing.css";
import "../studio/mcp/mcp.css";
import { McpSetupClient } from "../studio/mcp/mcp-setup-client";

export const metadata: Metadata = {
  alternates: { canonical: "/mcp" },
  title: "MCP — Connect Openfield to Claude, Cursor, and any AI tool",
  description:
    "Add Openfield to Claude Desktop, Cursor, Windsurf, VS Code, Cline, Claude Code, Codex, Continue, or any MCP client. One endpoint, Bearer auth, 2 tools: openfield_models and openfield_pricing.",
};

export default function McpPublicPage() {
  const endpoint = "https://openfieldai.vercel.app/api/mcp";

  return (
    <div className="of-landing">
      <LandingNav current="mcp" />

      <main>
        <section className="of-wrap of-section" style={{ paddingTop: 72 }}>
          <Reveal>
            <p className="of-kicker">Model Context Protocol</p>
          </Reveal>
          <Reveal>
            <h1 className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)", maxWidth: 14 + "ch" }}>
              Connect Openfield to <span style={{ color: "var(--of-lime)" }}>your AI tools.</span>
            </h1>
          </Reveal>
          <Reveal>
            <p className="of-lede" style={{ maxWidth: 62 + "ch" }}>
              One endpoint. Bearer auth with your Supabase token. 2 read-only tools —{" "}
              <code style={{ background: "#101214", border: "1px solid var(--of-line)", padding: "2px 6px", borderRadius: 6 }}>openfield_models</code> and{" "}
              <code style={{ background: "#101214", border: "1px solid var(--of-line)", padding: "2px 6px", borderRadius: 6 }}>openfield_pricing</code> — so
              Claude, Cursor, and friends can list 38 Higgsfield models and token rates without ever seeing your
              payment keys.
            </p>
          </Reveal>
          <Reveal>
            <div className="of-cta-row" style={{ marginTop: 20 }}>
              <Link href="/login?next=/mcp" className="of-btn of-btn--lime">
                Sign in to get token →
              </Link>
              <Link href="/studio/mcp" className="of-btn">
                Open in Studio
              </Link>
            </div>
          </Reveal>

          <div style={{ marginTop: 48 }}>
            <McpSetupClient endpoint={endpoint} />
          </div>
        </section>

        <section className="of-wrap of-section" style={{ paddingTop: 24 }}>
          <div className="of-cta">
            <div>
              <p className="of-kicker">Works everywhere</p>
              <h2 className="of-h2">From prompt to Seedance in one ask.</h2>
              <p>Ask your AI tool: “What Openfield models can I use for a 9:16 10s video?” — it calls openfield_models, then you generate from the studio or via API.</p>
              <div className="of-cta-row">
                <Link href="/studio" className="of-btn of-btn--lime">
                  Open the studio →
                </Link>
                <Link href="/pricing" className="of-btn">
                  See token rates
                </Link>
              </div>
            </div>
            <div className="of-composer-mock" aria-hidden>
              <div className="of-mock-tabs">
                <span className="of-mock-tab of-mock-tab--on">Cursor</span>
                <span className="of-mock-tab">Claude Desktop</span>
              </div>
              <p className="of-mock-prompt">List Openfield models for cinematic video — I need 9:16, 10s, with face input…</p>
              <div className="of-mock-row">
                <span className="of-chip">openfield_models ✓</span>
                <span className="of-chip">openfield_pricing ✓</span>
                <span className="of-chip of-chip--lime">Bearer auth ✓</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="of-wrap of-footer">
        <span>© 2026 Openfield · MIT · An open Higgsfield alternative</span>
        <span className="right">
          <a href="https://github.com/sahajiscoding/openfield" rel="noopener">
            GitHub
          </a>
          <Link href="/pricing">Pricing</Link>
          <Link href="/mcp">MCP</Link>
          <Link href="/studio">Studio</Link>
        </span>
      </footer>
    </div>
  );
}
