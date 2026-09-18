import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import { LandingNav } from "@/app/nav";
import { Reveal } from "@/app/reveal";
import "@/app/landing.css";
import "./mcp.css";
import { McpSetupClient } from "./mcp-setup-client";

export default async function McpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/studio/mcp");
  const endpoint = "https://openfieldai.vercel.app/api/mcp";

  return (
    <div className="of-landing">
      <LandingNav current="mcp" />

      <main>
        <section className="of-wrap of-section" style={{ paddingTop: 72 }}>
          <Reveal>
            <p className="of-kicker">Model Context Protocol · Signed in as {user.email}</p>
          </Reveal>
          <Reveal>
            <h1 className="of-h2" style={{ fontSize: "clamp(38px,5vw,64px)", maxWidth: 14 + "ch" }}>
              Connect Openfield to <span style={{ color: "var(--of-lime)" }}>your AI tools.</span>
            </h1>
          </Reveal>
          <Reveal>
            <p className="of-lede" style={{ maxWidth: 62 + "ch" }}>
              You&apos;re authenticated. Your Supabase token is auto-detected below — pick your AI tool, copy the
              config, restart the client, and ask it to list Openfield models. No service-role keys, no payment
              credentials exposed.
            </p>
          </Reveal>
          <Reveal>
            <div className="of-cta-row" style={{ marginTop: 20 }}>
              <Link href="/studio" className="of-btn of-btn--lime">
                Back to Studio →
              </Link>
              <Link href="/mcp" className="of-btn">
                Public docs
              </Link>
            </div>
          </Reveal>

          <div style={{ marginTop: 48 }}>
            <McpSetupClient endpoint={endpoint} />
          </div>
        </section>
      </main>

      <footer className="of-wrap of-footer">
        <span>© 2026 Openfield · MIT · Signed in</span>
        <span className="right">
          <Link href="/studio">Studio</Link>
          <Link href="/studio/billing">Billing</Link>
          <Link href="/mcp">MCP</Link>
        </span>
      </footer>
    </div>
  );
}
