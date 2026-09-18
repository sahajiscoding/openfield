"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getPack } from "@/lib/credits/packs";

type Phase = "idle" | "qr" | "polling" | "paid" | "review";

const POLL_MS = 3000;
const POLL_TRIES = 50; // ~2.5 min: SMS window is ~2 min, then REVIEW_REQUIRED

export function BuyPackForm({ packId, label }: { packId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [qr, setQr] = useState<{
    qrCode: string;
    upiString: string;
    uroPayOrderId: string;
    tenantRef: string;
    amountInRupees: string;
  } | null>(null);
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pollNote, setPollNote] = useState<string | null>(null);
  const polls = useRef(0);
  const timer = useRef<number | null>(null);

  const pack = (() => {
    try {
      return getPack(packId);
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function stopPolling() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  async function buy() {
    setBusy(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        qrCode?: unknown;
        upiString?: unknown;
        uroPayOrderId?: unknown;
        tenantRef?: unknown;
        amountInRupees?: unknown;
        error?: unknown;
        code?: unknown;
      };
      if (
        !res.ok ||
        typeof data.qrCode !== "string" ||
        typeof data.tenantRef !== "string" ||
        typeof data.uroPayOrderId !== "string"
      ) {
        if (data.code === "auth") {
          setNeedsAuth(true);
          setError("Sign in to buy tokens.");
        } else {
          setError(
            typeof data.error === "string" && data.error
              ? data.error
              : "Checkout failed — try again in a moment.",
          );
        }
        setBusy(false);
        return;
      }
      setQr({
        qrCode: data.qrCode,
        upiString: typeof data.upiString === "string" ? data.upiString : "",
        uroPayOrderId: data.uroPayOrderId,
        tenantRef: data.tenantRef,
        amountInRupees: typeof data.amountInRupees === "string" ? data.amountInRupees : "",
      });
      setPhase("qr");
      setBusy(false);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setBusy(false);
    }
  }

  async function pollOnce(tenantRef: string) {
    try {
      const res = await fetch(`/api/billing/order-status?ref=${encodeURIComponent(tenantRef)}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: unknown;
        error?: unknown;
      };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Status check failed.");
      const status = typeof data.status === "string" ? data.status : "pending";
      if (status === "paid") {
        stopPolling();
        setPhase("paid");
        setPollNote(null);
        return;
      }
      if (status === "review") {
        stopPolling();
        setPhase("review");
        return;
      }
      if (["failed", "expired", "cancelled"].includes(status)) {
        stopPolling();
        setError(`Payment ${status} — start a new checkout if you still want tokens.`);
        setPhase("qr");
        return;
      }
      polls.current += 1;
      if (polls.current >= POLL_TRIES) {
        stopPolling();
        setPollNote("Still pending — keep this tab open. Tokens land automatically when UroPay confirms; also check /studio/billing.");
        return;
      }
      setPollNote(
        status === "utr_submitted"
          ? "UTR received — waiting for the bank SMS confirmation…"
          : "Waiting for payment confirmation…",
      );
      timer.current = window.setTimeout(() => void pollOnce(tenantRef), POLL_MS);
    } catch {
      polls.current += 1;
      if (polls.current >= POLL_TRIES) {
        stopPolling();
        setPollNote("Still pending — check /studio/billing in a minute.");
        return;
      }
      timer.current = window.setTimeout(() => void pollOnce(tenantRef), POLL_MS);
    }
  }

  async function submit() {
    if (!qr) return;
    const clean = utr.trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{6,22}$/.test(clean)) {
      setError("Enter the UPI reference / UTR number from your payment app (usually 12 digits).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/submit-utr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantRef: qr.tenantRef, utr: clean }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown; code?: unknown };
      if (!res.ok) {
        if (data.code === "auth") {
          setNeedsAuth(true);
          setError("Sign in to buy tokens.");
        } else {
          setError(typeof data.error === "string" && data.error ? data.error : "Could not submit UTR.");
        }
        setSubmitting(false);
        return;
      }
      setPhase("polling");
      setPollNote("UTR received — waiting for the bank SMS confirmation…");
      polls.current = 0;
      timer.current = window.setTimeout(() => void pollOnce(qr.tenantRef), POLL_MS);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    stopPolling();
    setQr(null);
    setUtr("");
    setPhase("idle");
    setPollNote(null);
    setError(null);
  }

  if (phase === "paid" && qr) {
    return (
      <div>
        <p className="of-ok" role="status" style={{ marginTop: 0 }}>
          Paid — {pack ? `${pack.tokens} tokens` : "tokens"} credited.{" "}
          <Link href="/studio">Open the studio →</Link>
        </p>
        <p style={{ fontSize: 13.5, color: "var(--of-smoke)" }}>
          Order <code>{qr.tenantRef}</code> · <Link href="/studio/billing">billing history →</Link>
        </p>
      </div>
    );
  }

  if ((phase === "qr" || phase === "polling" || phase === "review") && qr) {
    return (
      <div>
        <div style={{ display: "grid", justifyItems: "center", gap: 8, marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr.qrCode}
            alt={`UPI QR for ₹${qr.amountInRupees || pack?.inr}`}
            width={220}
            height={220}
            style={{ borderRadius: 16, background: "#fff", padding: 8 }}
          />
          <p style={{ margin: 0, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            Pay ₹{qr.amountInRupees || pack?.inr} via any UPI app
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--of-smoke)", textAlign: "center" }}>
            1. Scan &amp; pay the exact amount · 2. Copy the 12-digit UTR / UPI ref from your payment
            history · 3. Paste it below
          </p>
        </div>

        {phase === "review" ? (
          <p className="of-error" role="status" style={{ marginTop: 10 }}>
            Under manual review — the bank SMS didn&apos;t arrive within ~2 minutes. It usually clears
            shortly; check <Link href="/studio/billing">billing →</Link>
          </p>
        ) : (
          <>
            <label htmlFor={`utr-${qr.tenantRef}`} style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              UPI reference / UTR number
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id={`utr-${qr.tenantRef}`}
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 280836361135"
                disabled={phase === "polling"}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 12,
                  border: "1px solid var(--of-line)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  padding: "11px 14px",
                  fontSize: 15,
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || phase === "polling" || utr.trim().length === 0}
                className="of-btn of-btn--lime"
              >
                {submitting ? "Sending…" : phase === "polling" ? "Sent ✓" : "I paid"}
              </button>
            </div>
            {pollNote && (
              <p role="status" style={{ fontSize: 13.5, color: "var(--of-smoke)", marginTop: 10 }}>
                {pollNote}
              </p>
            )}
          </>
        )}

        {error && (
          <p className="of-error" role="alert" style={{ marginTop: 10 }}>
            {error} {needsAuth && <Link href="/login?next=/pricing">Sign in →</Link>}
          </p>
        )}
        <button
          type="button"
          onClick={restart}
          className="of-btn of-btn--ghost"
          style={{ width: "100%", justifyContent: "center", boxSizing: "border-box", marginTop: 10 }}
        >
          Cancel / new QR
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void buy()}
        disabled={busy}
        className="of-btn of-btn--lime"
        style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}
      >
        {busy ? "Making QR…" : label}
      </button>
      {error && (
        <p className="of-error" role="alert" style={{ marginTop: 10 }}>
          {error} {needsAuth && <Link href="/login?next=/pricing">Sign in →</Link>}
        </p>
      )}
    </div>
  );
}
