"use server";

import { confirmOrderWithProvider } from "@/lib/billing/confirm";
import {
  normalizeTenantRef,
  notFoundView,
  unavailableView,
  viewFromOrder,
  type PaymentView,
} from "@/lib/credits/payment-status";
import { getMyOrderSelf } from "@/lib/credits/wallet";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * Server-authoritative payment status for one order reference.
 *
 * The browser may ask what happened; it may never decide. Both exports here
 * resolve the caller from the session and then read through the migration-005
 * self lane (`get_my_order`), which filters on `auth.uid()` inside SQL — so a
 * reference belonging to somebody else returns no row at all, and there is no
 * ownership comparison in application code for a future edit to forget.
 *
 * `checkPayment` additionally asks UroPay directly and reconciles the row
 * through `confirmOrderWithProvider` — the same verification and the same
 * idempotent crediting the webhook uses. A provider outage is reported as
 * "unreachable", which the UI renders as "we could not check, you may still be
 * fine" — never as a failed payment.
 */

export type PaymentCode = "ok" | "auth" | "not_found" | "unreachable" | "error";

export type PaymentCheck = {
  code: PaymentCode;
  view: PaymentView;
};

/** Are we allowed to tell this caller anything at all? */
async function sessionUserId(): Promise<string | null> {
  try {
    const user = await getSessionUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Initial render: our own row and nothing else — no provider call, no service
 * credential, one Supabase round trip. Fast enough to be the first paint, and
 * the client's first status check follows immediately after hydration.
 */
export async function loadPaymentView(tenantRef: string): Promise<PaymentCheck> {
  const ref = normalizeTenantRef(tenantRef);
  if (!ref) return { code: "not_found", view: notFoundView(ref) };
  const userId = await sessionUserId();
  if (!userId) return { code: "auth", view: unavailableView(ref) };

  try {
    const row = await getMyOrderSelf(ref);
    if (!row) return { code: "not_found", view: notFoundView(ref) };
    return { code: "ok", view: viewFromOrder(row, ref) };
  } catch (caught) {
    // Missing migration, permission failure, transport error: none of these is
    // evidence about the payment, so say exactly that.
    console.error(
      "[billing] payment view failed",
      caught instanceof Error ? caught.message : caught,
    );
    return { code: "error", view: unavailableView(ref) };
  }
}

/**
 * Authoritative re-check, used by polling and by the "Check status" button.
 *
 * Note what it does NOT do: it never accepts a status from the caller, never
 * treats a return URL as evidence, and never credits a browser's word. The
 * provider is asked, the amount and currency must match our row, and only then
 * does crediting happen (inside `confirmOrderWithProvider`).
 */
export async function checkPayment(tenantRef: string): Promise<PaymentCheck> {
  const ref = normalizeTenantRef(tenantRef);
  if (!ref) return { code: "not_found", view: notFoundView(ref) };
  const userId = await sessionUserId();
  if (!userId) return { code: "auth", view: unavailableView(ref) };

  let row;
  try {
    row = await getMyOrderSelf(ref);
  } catch (caught) {
    console.error(
      "[billing] payment check read failed",
      caught instanceof Error ? caught.message : caught,
    );
    return { code: "error", view: unavailableView(ref) };
  }
  if (!row) return { code: "not_found", view: notFoundView(ref) };

  try {
    const result = await confirmOrderWithProvider(row, userId);
    // When the provider confirmed payment, crediting has ALREADY happened by
    // the time this returns (grant first, then mark-paid), so `paid` here never
    // means "the provider says so" without the tokens having been added.
    return {
      code: "ok",
      view: viewFromOrder(
        {
          ...row,
          status: result.status,
          paid_at: result.status === "paid" ? row.paid_at ?? new Date().toISOString() : row.paid_at,
        },
        ref,
      ),
    };
  } catch (caught) {
    // Provider unreachable / refused. NOT a failure of the payment.
    console.error(
      "[billing] payment check failed",
      caught instanceof Error ? caught.message : caught,
    );
    return { code: "unreachable", view: viewFromOrder(row, ref) };
  }
}
