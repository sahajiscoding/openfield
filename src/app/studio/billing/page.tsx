import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TOKEN_PACKS } from "@/lib/credits/packs";
import { findOrderByTenantRef, getMyOrders, getTokenBalance } from "@/lib/credits/wallet";
import { getSessionUser } from "@/lib/supabase/server";
import "../../landing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing",
  description: "Your Openfield token balance and UroPay orders.",
  alternates: { canonical: "/studio/billing" },
  robots: { index: false, follow: false },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login?next=/studio/billing");

  const [balance, orders] = await Promise.all([
    getTokenBalance(user.id).catch(() => 0),
    getMyOrders(user.id).catch(() => []),
  ]);
  const { ref } = await searchParams;
  const highlight = ref ? await findOrderByTenantRef(ref).catch(() => null) : null;

  return (
    <div className="of-landing">
      <main className="of-wrap of-section" aria-labelledby="billing-h" style={{ paddingTop: 64 }}>
        <p className="of-kicker">Billing</p>
        <h1 id="billing-h" className="of-h2">Your tokens.</h1>
        <p className="of-lede">
          Balance: <strong style={{ color: "var(--of-lime)" }}>{balance} tokens</strong> · 1 token = $0.01 of
          generation. Payments run through UroPay (UPI, cards, netbanking).
        </p>

        {highlight && (
          <div className="of-card" role="status" style={{ marginBottom: 16 }}>
            <span className="n">ORDER {highlight.tenant_ref}</span>
            <h3 style={{ textTransform: "capitalize" }}>{highlight.status}</h3>
            <p>
              {highlight.tokens} tokens for ₹{highlight.amount}.{" "}
              {highlight.status === "paid"
                ? "Credited — back to the studio."
                : "If you just paid, give the webhook a minute, then refresh."}
            </p>
            <Link href="/studio" className="of-btn of-btn--lime">Back to studio →</Link>
          </div>
        )}

        <h2 className="of-h2" style={{ fontSize: 26, marginTop: 40 }}>Order history</h2>
        {orders.length === 0 ? (
          <p className="of-lede">No orders yet — <Link href="/pricing#packs">grab your first pack →</Link></p>
        ) : (
          <div className="of-table" role="region" aria-label="Order history" tabIndex={0}>
            <table>
              <thead>
                <tr><th scope="col">Pack</th><th scope="col">Tokens</th><th scope="col">Paid</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={highlight?.id === o.id ? { background: "rgba(212,249,33,0.06)" } : undefined}>
                    <td><strong>{o.pack_id}</strong><br />{o.tenant_ref}</td>
                    <td>{o.tokens}</td>
                    <td>₹{o.amount} {o.currency}</td>
                    <td><span className={`of-pill${o.status === "paid" ? " of-pill--lime" : ""}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="of-h2" style={{ fontSize: 26, marginTop: 40 }}>Need more?</h2>
        <div className="of-grid-3">
          {TOKEN_PACKS.slice(0, 3).map((p) => (
            <article key={p.id} className="of-card">
              <span className="n">{p.tokens} TOKENS</span>
              <h3>₹{p.inr}</h3>
              <p>{p.blurb}</p>
              <Link href="/pricing#packs" className="of-btn" style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                Buy on pricing →
              </Link>
            </article>
          ))}
        </div>
        <p style={{ marginTop: 28 }}><Link href="/studio">← Back to studio</Link></p>
      </main>
    </div>
  );
}
