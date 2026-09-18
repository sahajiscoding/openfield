"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { checkPayment } from "@/lib/billing/payment";
import { isOpenState, type PaymentState, type PaymentView } from "@/lib/credits/payment-status";

/* ------------------------------------------------------------------ *

   The browser asks, the server answers.

   Every state on this screen comes from a PaymentView the SERVER built out of
   the order row and (on a check) the payment provider. There is no "success"
   parameter, no local-storage flag, no optimistic paid state: a URL can say
   which order to look at, and nothing else. If the browser cannot reach the
   server we say "we could not check" — which is a different sentence from
   "your payment failed", and the difference is the whole point of this file.

   Polling is a timer chain rather than an interval, so two checks can never
   overlap, and it backs off from 3s to 15s while the payment stays open. It
   stops on its own when the order reaches a terminal state, when the page is
   left, and after a five-minute budget (a payment that is still pending after
   that is not going to be helped by a sixth request — the visitor is handed a
   button instead). Nothing polls while the tab is hidden.

 * ------------------------------------------------------------------ */

/** First check this soon after paint, then 3s, backing off ×1.4 to 15s. */
const FIRST_DELAY_MS = 900;
const BASE_DELAY_MS = 3000;
const MAX_DELAY_MS = 15_000;
/** After this long we stop asking and say "still waiting", with a manual check. */
const POLL_BUDGET_MS = 5 * 60_000;

type Notice = null | "unreachable" | "auth" | "longwait";

type Copy = {
  title: string;
  body: string;
  tone: "pending" | "positive" | "negative" | "neutral";
};

const COPY: Record<PaymentState, Copy> = {
  pending: {
    title: "Waiting for payment",
    body: "This order is open and no payment has been confirmed yet. If you have already paid, it can take a moment for the payment provider to report it — nothing else is needed from you.",
    tone: "pending",
  },
  utr_submitted: {
    title: "Payment submitted",
    body: "We received your UTR and we're checking the payment with the payment provider. A submitted reference is not a confirmation yet — tokens are added only once the payment itself is verified.",
    tone: "pending",
  },
  review: {
    title: "Payment is being verified",
    body: "The payment needs confirmation and the provider is still checking it. Please don't pay again for this order — if the payment goes through, it is applied to this order automatically.",
    tone: "pending",
  },
  paid: {
    title: "Payment confirmed",
    body: "Your payment has been verified and your tokens have been added to your balance.",
    tone: "positive",
  },
  failed: {
    title: "Payment could not be confirmed",
    body: "The payment provider reported that this order did not go through. Nothing was added to your balance.",
    tone: "negative",
  },
  expired: {
    title: "Payment session expired",
    body: "This payment session is no longer active, so it cannot be completed. You'll need to start a new payment — tokens were not added for this order.",
    tone: "neutral",
  },
  cancelled: {
    title: "Payment cancelled",
    body: "This order was cancelled before the payment completed, so nothing was charged against it. You can start a new payment whenever you're ready.",
    tone: "neutral",
  },
  not_found: {
    title: "Order not found",
    body: "We couldn't find a payment associated with this request. Check the link you followed, or open Billing to see your orders.",
    tone: "neutral",
  },
  unavailable: {
    title: "Payment status temporarily unavailable",
    body: "We couldn't confirm your payment status right now. Your payment may still be processing — please check again before paying a second time.",
    tone: "neutral",
  },
};

/** The one sentence a screen reader hears when the state changes. */
function stateTitle(state: PaymentState): string {
  return COPY[state].title;
}

export function PaymentStatus({ initialView }: { initialView: PaymentView }) {
  const [view, setView] = useState<PaymentView>(initialView);
  const [notice, setNotice] = useState<Notice>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const alive = useRef(true);
  const inFlight = useRef(false);
  const ref = useRef(view.tenantRef);
  ref.current = view.tenantRef;
  const stateRef = useRef(view.state);
  stateRef.current = view.state;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** One authoritative round trip. Never throws to the UI. */
  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const { code, view: next } = await checkPayment(ref.current);
      if (!alive.current) return;
      setView(next);
      setCheckedAt(Date.now());
      setNotice(
        code === "unreachable" || code === "error"
          ? "unreachable"
          : code === "auth"
            ? "auth"
            : null,
      );
    } catch {
      // A thrown action (network drop, expired deployment) is the same story as
      // an unreachable provider: unknown, not failed.
      if (alive.current) setNotice("unreachable");
    } finally {
      inFlight.current = false;
      if (alive.current) setChecking(false);
    }
  }, []);

  /* The polling chain. Re-armed whenever the state changes, which is also what
     stops it: a terminal state re-runs this effect and returns immediately. */
  useEffect(() => {
    if (!isOpenState(view.state)) return;
    let stopped = false;
    let timer: number | undefined;
    let delay = BASE_DELAY_MS;
    const deadline = Date.now() + POLL_BUDGET_MS;

    const run = async () => {
      if (stopped) return;
      if (Date.now() > deadline) {
        setNotice("longwait");
        return;
      }
      if (document.visibilityState === "visible") {
        await check();
        delay = Math.min(Math.round(delay * 1.4), MAX_DELAY_MS);
      }
      if (stopped || !isOpenState(stateRef.current)) return;
      timer = window.setTimeout(run, delay);
    };

    timer = window.setTimeout(run, FIRST_DELAY_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [view.state, check]);

  /* Coming back to the tab is the moment a payment made elsewhere needs to be
     picked up, so it checks at once instead of waiting out the backoff. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      setNotice((current) => (current === "longwait" ? null : current));
      if (isOpenState(stateRef.current)) void check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [check]);

  const copy = COPY[view.state];
  const open = isOpenState(view.state);
  const signInHref = `/login?next=${encodeURIComponent(`/billing/payment/${view.tenantRef}`)}`;

  return (
    <div className="of-pay">
      <header className="of-pay-head">
        <Link href="/" className="of-brand" aria-label="Openfield home">
          <span className="of-mark" aria-hidden>
            ○
          </span>{" "}
          Openfield
        </Link>
        <Link href="/studio/billing" className="of-pay-head-link">
          Billing
        </Link>
      </header>

      <main className="of-pay-main">
        <section className="of-pay-card" aria-labelledby="pay-h" aria-busy={checking}>
          <span className="of-sr" role="status" aria-live="polite">
            {stateTitle(view.state)}
          </span>

          <StateIcon state={view.state} tone={copy.tone} />

          <p className="of-pay-kicker">
            {view.state === "paid" ? "Payment" : open ? "In progress" : "Payment status"}
          </p>
          <h1 id="pay-h" className="of-pay-title">
            {copy.title}
          </h1>

          {view.state === "paid" && (
            <ul className="of-pay-checks">
              <li>
                <CheckMark />
                Payment confirmed
              </li>
              <li>
                <CheckMark />
                {view.tokens !== null ? `${view.tokens} tokens added` : "Tokens added"}
              </li>
            </ul>
          )}

          <p className="of-pay-body">{copy.body}</p>

          {/* The money question first: what was this, for how much. */}
          <dl className="of-pay-facts">
            {view.tokens !== null && (
              <div>
                <dt>Tokens</dt>
                <dd>{view.tokens}</dd>
              </div>
            )}
            {view.amount !== null && (
              <div>
                <dt>Amount</dt>
                <dd>
                  ₹{view.amount}
                  {view.currency && view.currency !== "INR" ? ` ${view.currency}` : ""}
                </dd>
              </div>
            )}
            <div>
              <dt>Order</dt>
              <dd className="of-pay-ref">{view.tenantRef || "—"}</dd>
            </div>
            {view.utr && (
              <div>
                <dt>Your UTR</dt>
                <dd className="of-pay-ref" title="Partially hidden">
                  {view.utr}
                </dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill state={view.state} />
              </dd>
            </div>
          </dl>

          {/* Live region: provider unreachable / session expired / long wait. */}
          <div role="status" aria-live="polite" className="of-pay-notice-slot">
            {notice === "unreachable" && (
              <p className="of-pay-notice" data-tone="neutral">
                We couldn&apos;t reach the payment provider just now. That is not a failed payment —
                your order is still open and we&apos;ll keep checking.
              </p>
            )}
            {notice === "auth" && (
              <p className="of-pay-notice" data-tone="neutral">
                Your session expired, so we can&apos;t check this order any more.{" "}
                <Link href={signInHref}>Sign in again →</Link> — your payment, if it went through,
                is unaffected.
              </p>
            )}
            {notice === "longwait" && (
              <p className="of-pay-notice" data-tone="neutral">
                Still waiting for confirmation. Some payments take longer than usual to be reported;
                this order stays open. Use <strong>Check status</strong> when you want an update.
              </p>
            )}
            {view.state === "failed" && (
              <p className="of-pay-notice" data-tone="negative">
                If money left your account anyway, don&apos;t make another payment yet — check the
                status again in a few minutes and contact support with the order reference above.
              </p>
            )}
          </div>

          <div className="of-pay-actions">
            {actionsFor(view.state, open, check, checking, signInHref, notice === "auth")}
          </div>

          {open && (
            <p className="of-pay-foot">
              {checkedAt
                ? `Last checked at ${new Date(checkedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}. This page updates itself.`
                : "This page updates itself — you can leave it open."}
            </p>
          )}
          {!open && view.state === "paid" && (
            <p className="of-pay-foot">
              A receipt is kept under Billing{view.paidAt ? " along with the exact time of this order" : ""}.
            </p>
          )}
        </section>

        <p className="of-pay-help">
          Something wrong with this order? Write to{" "}
          <a href="mailto:support@openfield.ai?subject=Payment%20issue">support@openfield.ai</a> with the
          reference above.
        </p>
      </main>
    </div>
  );
}

/**
 * Buttons per state — the primary action first, one deliberate secondary.
 *
 * None of these can create a second payment for an order that already exists:
 * the money-making action always goes back to the pack list, where a new order
 * would carry its own reference, and the status/receipt paths are pure reads.
 */
function actionsFor(
  state: PaymentState,
  open: boolean,
  check: () => Promise<void>,
  checking: boolean,
  signInHref: string,
  needsSignIn: boolean,
): React.ReactNode {
  const checkButton = (
    <button
      type="button"
      className="of-btn of-btn--lime"
      onClick={() => void check()}
      disabled={checking}
      aria-busy={checking}
    >
      {checking ? "Checking…" : "Check status"}
    </button>
  );
  const billing = (
    <Link href="/studio/billing" className="of-btn">
      Back to billing
    </Link>
  );
  const newPayment = (
    <Link href="/pricing#packs" className="of-btn of-btn--lime">
      Start a new payment
    </Link>
  );

  switch (state) {
    case "paid":
      return (
        <>
          <Link href="/studio" className="of-btn of-btn--lime">
            Open Studio
          </Link>
          <Link href="/studio/billing" className="of-btn">
            View Billing
          </Link>
        </>
      );
    case "pending":
    case "utr_submitted":
    case "review":
      return (
        <>
          {checkButton}
          {billing}
        </>
      );
    case "failed":
      return (
        <>
          <Link href="/pricing#packs" className="of-btn of-btn--lime">
            Try again
          </Link>
          {checkButton}
          {billing}
        </>
      );
    case "expired":
    case "cancelled":
      return (
        <>
          {newPayment}
          {billing}
        </>
      );
    case "not_found":
      return (
        <>
          {billing}
          <Link href="/pricing#packs" className="of-btn">
            See packs
          </Link>
        </>
      );
    case "unavailable":
      return (
        <>
          {checkButton}
          {needsSignIn ? (
            <Link href={signInHref} className="of-btn">
              Sign in again
            </Link>
          ) : (
            billing
          )}
        </>
      );
    default:
      return open ? checkButton : billing;
  }
}

/* ---------------------------------------------------------------- *
   Marks. Shape + words carry the meaning; the tint only agrees with it.
 * ---------------------------------------------------------------- */

function StateIcon({ state, tone }: { state: PaymentState; tone: Copy["tone"] }) {
  return (
    <span className="of-pay-icon" data-tone={tone} aria-hidden>
      {state === "paid" && <CheckMark size={30} />}
      {(state === "failed" || state === "unavailable") && <ExclamationMark />}
      {(state === "pending" || state === "utr_submitted" || state === "review") && (
        <span className="of-pay-spinner" />
      )}
      {state === "expired" && <ClockMark />}
      {state === "cancelled" && <CrossMark />}
      {state === "not_found" && <QuestionMark />}
    </span>
  );
}

function StatusPill({ state }: { state: PaymentState }) {
  return (
    <span className="of-pay-pill" data-state={state}>
      {state.replace(/_/g, " ")}
    </span>
  );
}

function CheckMark({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExclamationMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path d="M12 4v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ClockMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.6V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CrossMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuestionMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="2" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="1.1" fill="currentColor" />
    </svg>
  );
}
