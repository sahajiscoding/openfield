import {
  ALREADY_GRANTED,
  grantTokens,
  mapProviderStatus,
  markOrderPaid,
  setOrderStatus,
} from "@/lib/credits/wallet";
import { getUropayOrder } from "@/lib/uropay/client";

/**
 * The ONE place a UroPay payment is confirmed and, if it is confirmed, the ONE
 * place its tokens are granted.
 *
 * Both asynchronous paths that can learn about a payment — the UroPay webhook
 * and a status poll — end up here or in the webhook's own equivalent (which
 * calls the same `creditPaidOrder`). There is deliberately no second crediting
 * system: the ledger reference `topup:<tenant_ref>` is unique (migration 002),
 * so a webhook delivered twice, a poll landing at the same instant, or both at
 * once, all grant exactly once and every later attempt is reported as
 * ALREADY_GRANTED rather than as a failure.
 *
 * Verification lives here and only here:
 *   - the provider is asked directly (`GET /v1/orders/:id`) — a webhook body or
 *     a query parameter is never evidence of payment;
 *   - the amount AND currency must match the row we created;
 *   - only a provider state of PAID/COMPLETED proceeds to crediting.
 *
 * Nothing in this module is callable from a browser: it is imported by server
 * actions / route handlers that have already authenticated the caller, and the
 * grant itself needs the service credential.
 */

/** The order columns this module needs — satisfied by `OrderRow` and `OwnOrderRow`. */
export type ConfirmableOrder = {
  id: string;
  tenant_ref: string;
  tokens: number;
  amount: number;
  currency: string;
  status: string;
  uropay_order_id: string | null;
};

export type ConfirmResult = {
  /** The authoritative status after the check, in our own vocabulary. */
  status: string;
  /** True once the tokens are in the wallet and the row reads `paid`. */
  credited: boolean;
};

/**
 * Grant the tokens for an order the server has already verified, then mark it
 * paid. A duplicate grant is not an error — the money moved exactly once — but
 * any OTHER failure is re-thrown so the caller can refuse to call it paid.
 */
export async function creditPaidOrder(order: ConfirmableOrder, userId: string): Promise<void> {
  try {
    await grantTokens(userId, order.tokens, "uropay", `topup:${order.tenant_ref}`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (message !== ALREADY_GRANTED) throw caught;
    // Already credited earlier (webhook, or a poll that got here first).
    console.info("[billing] grant deduped", { tenantRef: order.tenant_ref });
  }
  await markOrderPaid(order.id, order.uropay_order_id ?? "");
}

/**
 * Ask the provider what actually happened and reconcile our row with it.
 *
 * Throws only when the provider cannot be reached or refuses the request —
 * which the caller must surface as "we could not check", NOT as "payment
 * failed". A provider state that is not PAID is recorded and returned as-is, so
 * a genuine FAILED/EXPIRED/CANCELLED is the only way the UI ever says so.
 */
export async function confirmOrderWithProvider(
  order: ConfirmableOrder,
  userId: string,
): Promise<ConfirmResult> {
  if (order.status === "paid") return { status: "paid", credited: true };
  // No provider id yet: the order never reached checkout (or the attach failed),
  // so there is nothing to confirm and nothing to credit.
  if (!order.uropay_order_id) return { status: order.status, credited: false };

  const provider = await getUropayOrder(order.uropay_order_id);
  // ONE provider-status mapping for the whole app (wallet.ts): the webhook, the
  // poll and this check agree on what "COMPLETED" or "REVIEW_REQUIRED" means.
  const authoritative = mapProviderStatus(provider.status);

  if (authoritative === "paid") {
    // The provider's number must match ours before anything is granted.
    if (Number(provider.amount) !== Number(order.amount) || provider.currency !== order.currency) {
      console.error("[billing] amount mismatch", { tenantRef: order.tenant_ref });
      return { status: order.status, credited: false };
    }
    await creditPaidOrder(order, userId);
    console.info("[billing] credited", {
      tenantRef: order.tenant_ref,
      tokens: order.tokens,
      via: "status-check",
    });
    return { status: "paid", credited: true };
  }

  if (authoritative !== order.status) {
    await setOrderStatus(order.tenant_ref, authoritative).catch(() => {});
  }
  return { status: authoritative, credited: false };
}
