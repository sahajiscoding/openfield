import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadPaymentView } from "@/lib/billing/payment";
import { normalizeTenantRef } from "@/lib/credits/payment-status";
import { getSessionUser } from "@/lib/supabase/server";
import "../../../landing.css";
import "./payment.css";

import { PaymentStatus } from "./payment-status";

/**
 * One payment result surface for the whole app.
 *
 * The URL carries ONE thing: which order to look at. It does not carry a
 * verdict. `/billing/payment/of-...?success=true`, a UroPay return URL, or a
 * hand-typed link are all the same request here — read the reference, confirm
 * the visitor is the owner, then read the state from our database. The page
 * cannot be made to say "paid" by anything except a row the server already
 * credited.
 *
 * Ownership is enforced in SQL: the lookup rides the migration-005
 * `get_my_order` RPC, which filters on `auth.uid()`. A reference belonging to
 * somebody else yields no row at all, and the screen answers "we couldn't find
 * a payment associated with this request" — the same message a typo gets, so
 * nothing leaks about which references exist.
 *
 * Dynamic on purpose: the answer depends on cookies and on a wallet that
 * changes, so this must never be cached or prerendered.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment status",
  description: "Check the status of an Openfield token purchase paid through UroPay.",
  alternates: { canonical: "/billing/payment" },
  robots: { index: false, follow: false },
};

export default async function PaymentStatusPage({
  params,
}: {
  params: Promise<{ tenantRef: string }>;
}) {
  const { tenantRef } = await params;
  // Next already decodes the segment; normalize keeps only our own reference
  // shape and drops anything else (no path traversal, no junk into the RPC).
  const ref = normalizeTenantRef(tenantRef);

  let signedIn = false;
  try {
    signedIn = Boolean(await getSessionUser());
  } catch {
    // Supabase env missing / unreachable: the screen below reports that it
    // cannot check rather than pretending anything about the payment.
    signedIn = false;
  }
  if (!signedIn) {
    // Still authenticated-only: the payment page is a private receipt. The
    // reference survives the trip so the visitor lands back on their order.
    redirect(`/login?next=${encodeURIComponent(`/billing/payment/${ref || "unknown"}`)}`);
  }

  // The initial read is our own row only — no provider call — so this page
  // paints as fast as the wallet does. The client's first status check (which
  // asks UroPay authoritatively) follows immediately after hydration.
  const { view } = await loadPaymentView(ref);

  return (
    <div className="of-landing">
      <PaymentStatus initialView={view} />
    </div>
  );
}
