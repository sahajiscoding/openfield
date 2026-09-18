/**
 * Payment status vocabulary — pure, dependency-free, and shared by the server
 * (which reads the order) and the browser (which renders it).
 *
 * There is exactly ONE payment state machine in Openfield: the `status` column
 * of `public.uropay_orders`, constrained by
 * `uropay_orders_status_check` (migration 003/005) to the seven values below.
 * Nothing here invents a second one — these helpers only translate that column,
 * plus the two non-order outcomes the UI has to be able to say out loud
 * ("we could not find it", "we could not check it"), into something a page can
 * render.
 *
 * Nothing in this file may touch the network, Supabase, or the provider. It is
 * the reason the payment UI can never claim success on its own: `paid` is only
 * ever constructed from a row the server confirmed, never from a URL.
 */

/** The states our own table can hold (`uropay_orders_status_check`). */
export const ORDER_STATES = [
  "pending",
  "utr_submitted",
  "review",
  "paid",
  "failed",
  "expired",
  "cancelled",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

/** Everything the payment screen can render: order states + non-order outcomes. */
export type PaymentState = OrderState | "not_found" | "unavailable";

/** States where the payment is still in flight and worth re-checking. */
export const OPEN_STATES: readonly PaymentState[] = ["pending", "utr_submitted", "review"];

/** States where the order will not change on its own any more. */
export const TERMINAL_STATES: readonly PaymentState[] = ["paid", "failed", "expired", "cancelled"];

export function isOpenState(state: PaymentState): boolean {
  return OPEN_STATES.includes(state);
}

export function isTerminalState(state: PaymentState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** The order fields the payment screen is allowed to show. Never a secret. */
export type PaymentOrder = {
  tenant_ref: string;
  pack_id: string | null;
  tokens: number | null;
  amount: number | null;
  currency: string | null;
  status: string;
  submitted_utr: string | null;
  created_at: string | null;
  paid_at: string | null;
};

/** What the UI renders. Plain data so it can cross the server/client boundary. */
export type PaymentView = {
  state: PaymentState;
  tenantRef: string;
  packId: string | null;
  tokens: number | null;
  amount: number | null;
  currency: string | null;
  /** Masked. The full UTR is a payment credential and is never handed back. */
  utr: string | null;
  createdAt: string | null;
  paidAt: string | null;
};

/** Order references are ours: `of-<base36 time>-<user prefix>`. */
export function normalizeTenantRef(value: string | undefined | null): string {
  const ref = (value ?? "").trim();
  if (!/^of-[a-z0-9-]{1,80}$/i.test(ref)) return "";
  return ref;
}

/** Show enough of a UTR to recognise, never enough to reuse. */
export function maskUtr(utr: string | null): string | null {
  const clean = (utr ?? "").trim();
  if (!clean) return null;
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${"•".repeat(Math.min(clean.length - 4, 8))}${clean.slice(-4)}`;
}

/**
 * The database status → UI state. An unknown value is deliberately NOT mapped
 * to `pending`: claiming a payment is merely waiting when we do not understand
 * the row would hide a real problem. It becomes `unavailable`, which says the
 * truthful thing.
 */
export function stateFromStatus(status: string | null | undefined): PaymentState {
  const value = (status ?? "").trim().toLowerCase();
  return (ORDER_STATES as readonly string[]).includes(value) ? (value as OrderState) : "unavailable";
}

export function viewFromOrder(order: PaymentOrder, fallbackRef: string): PaymentView {
  return {
    state: stateFromStatus(order.status),
    tenantRef: order.tenant_ref || fallbackRef,
    packId: order.pack_id ?? null,
    tokens: typeof order.tokens === "number" ? order.tokens : null,
    amount: typeof order.amount === "number" ? order.amount : Number(order.amount ?? NaN) || null,
    currency: order.currency ?? null,
    utr: maskUtr(order.submitted_utr),
    createdAt: order.created_at ?? null,
    paidAt: order.paid_at ?? null,
  };
}

/** "We could not find a payment for this request" — never "that one is not yours". */
export function notFoundView(tenantRef: string): PaymentView {
  return blank("not_found", tenantRef);
}

/** "We could not check just now" — a checked-out failure, never a failed payment. */
export function unavailableView(tenantRef: string): PaymentView {
  return blank("unavailable", tenantRef);
}

function blank(state: PaymentState, tenantRef: string): PaymentView {
  return {
    state,
    tenantRef,
    packId: null,
    tokens: null,
    amount: null,
    currency: null,
    utr: null,
    createdAt: null,
    paidAt: null,
  };
}
