"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MODELS, getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { OpenHiggsfieldApp } from "@/openhiggsfield/openhiggsfield-app";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/studio", label: "Studio", icon: "✦" },
  { href: "/mcp", label: "MCP", icon: "◇" },
  { href: "/#pricing", label: "Pricing", icon: "$" },
  { href: "/studio/billing", label: "Billing", icon: "◷" },
  { href: "/studio/security", label: "Security", icon: "◌" },
] as const;

export function StudioShell({ email, balance }: { email: string | undefined; balance: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryApplied = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Deep-link prefill from the landing composer (?model=&prompt=).
     Runs once on mount: validates the model against the catalog, loads the
     prompt, then drops the query so refreshes don't replay. */
  useEffect(() => {
    if (queryApplied.current || typeof window === "undefined") return;
    queryApplied.current = true;
    const q = new URLSearchParams(window.location.search);
    const prompt = (q.get("prompt") ?? "").slice(0, 2000).trim();
    const model = q.get("model") ?? "";
    if (!prompt && !model) return;

    if (model && MODELS.some((entry) => entry.id === model)) {
      try {
        useActive.getState().setModel(model);
      } catch {
        // unknown model — keep the persisted one
      }
    }
    if (prompt) {
      const surface = (() => {
        try {
          return model ? getModel(model).surface : useActive.getState().surface;
        } catch {
          return useActive.getState().surface;
        }
      })();
      (surface === "image" ? useImagePrompt : useVideoPrompt).getState().setText(prompt);
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className={`of-studio-frame${sidebarOpen ? " of-studio-frame--nav-open" : ""}`}>
      <aside className="of-studio-sidebar" aria-label="Studio navigation">
        <div className="of-studio-sidebar-head">
          <Link href="/" className="of-studio-side-brand" aria-label="Back to Openfield home">
            <span className="of-studio-side-mark" aria-hidden>○</span>
            <span>Openfield</span>
          </Link>
          <button
            type="button"
            className="of-studio-sidebar-close"
            aria-label="Close navigation"
            onClick={closeSidebar}
          >
            ×
          </button>
        </div>

        <nav className="of-studio-nav">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/studio"
              ? pathname === "/studio"
              : item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`of-studio-nav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeSidebar}
              >
                <span className="of-studio-nav-icon" aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="of-studio-sidebar-foot">
          <span className="of-studio-side-foot-label">Openfield</span>
          <span className="of-studio-side-foot-copy">Create, connect, and keep your tokens in one place.</span>
        </div>
      </aside>

      <button
        type="button"
        className="of-studio-sidebar-backdrop"
        aria-label="Close navigation"
        onClick={closeSidebar}
      />

      <section className="of-studio-workspace">
        <div className="of-studio-top" role="banner">
          <button
            type="button"
            className="of-studio-menu-button"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="of-studio-title">Studio</div>

          <Link
            href="/#packs"
            title="Top up tokens"
            className="of-studio-balance"
            data-empty={balance <= 0 ? "true" : "false"}
          >
            {balance <= 0 ? "Out of tokens — top up" : `${balance} tokens`}
          </Link>

          <div className="of-studio-user">
            <span title={email ?? ""}>{email ?? "Signed in"}</span>
            <button type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>

        <div className="of-studio-app">
          <OpenHiggsfieldApp initialBalance={balance} />
        </div>
      </section>
    </div>
  );
}
