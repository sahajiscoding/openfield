import Link from "next/link";

/**
 * Shared landing nav. Section anchors are root-relative (`/#effects`) so
 * they work from any page — Pricing lives in the homepage `#pricing`
 * section, there is no separate /pricing route.
 */
export function LandingNav({ current }: { current?: "mcp" }) {
  return (
    <header className="of-nav">
      <div className="of-wrap of-nav-inner">
        <Link href="/" className="of-brand" aria-label="Openfield home">
          <span className="of-mark" aria-hidden>
            ○
          </span>{" "}
          Openfield
        </Link>
        <nav className="of-nav-links" aria-label="Primary">
          <Link href="/#how">How it works</Link>
          <Link href="/#effects">Effects</Link>
          <Link href="/#models">Models</Link>
          <Link href="/#pricing">
            Pricing
          </Link>
          <Link href="/mcp" aria-current={current === "mcp" ? "page" : undefined}>
            MCP
          </Link>
        </nav>
        <Link href="/login" className="of-btn of-btn--ghost of-btn--nav-sign">
          Sign in
        </Link>
        <Link href="/studio" className="of-btn of-btn--lime">
          Open studio →
        </Link>
      </div>
    </header>
  );
}
