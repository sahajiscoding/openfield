"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  EXPERIENCE_LEVELS,
  REFERRAL_SOURCES,
  USE_CASES,
  type Experience,
  type ReferralSource,
  type UseCase,
} from "@/lib/onboarding/options";

async function postOnboarding(body: Record<string, unknown>): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the server — check your connection and try again.");
  }
  let data: { ok?: boolean; error?: unknown } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error("Server returned an unreadable response — try again in a moment.");
  }
  if (!res.ok || !data.ok) {
    const message = typeof data.error === "string" && data.error ? data.error : "";
    // Never surface redacted RSC internals; they mean "server failed opaquely".
    if (!message || /minified react error|server components render/i.test(message)) {
      throw new Error("Couldn't save — try again in a moment. If it persists, the database may be unreachable.");
    }
    throw new Error(message);
  }
}

const USE_CASE_LABELS: Record<UseCase, string> = {
  "ads-marketing": "Ads & marketing",
  films: "Films & shorts",
  "social-content": "Social content",
  "music-videos": "Music videos",
  "client-work": "Client work",
  "just-exploring": "Just exploring",
};

const REFERRAL_LABELS: Record<ReferralSource, string> = {
  "x-challenge": "$50K challenge post",
  friend: "A friend",
  search: "Search",
  youtube: "YouTube",
  instagram: "Instagram",
  other: "Somewhere else",
};

const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: "Beginner — first time with AI video",
  intermediate: "Intermediate — shipped a few projects",
  pro: "Pro — clients pay me for this",
};

const STEPS = ["What will you create?", "How did you find us?", "Your experience?", "Almost done"] as const;

export function QuizForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [referral, setReferral] = useState<ReferralSource | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    (step === 0 && useCase !== null) ||
    (step === 1 && referral !== null) ||
    (step === 2 && experience !== null) ||
    step === 3;

  async function finish() {
    if (!useCase || !referral || !experience) return;
    setBusy(true);
    setError(null);
    try {
      await postOnboarding({ op: "save", useCase, referralSource: referral, experience, dob: dob || null });
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    setError(null);
    try {
      await postOnboarding({ op: "skip" });
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  function pick<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div>
      <ol className="of-quiz-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} data-done={i < step}>
            <span className="of-quiz-dot" aria-hidden>{i + 1}</span>
            <span className="of-quiz-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {error && <p className="of-error" role="alert">{error}</p>}

      {step === 0 && (
        <div className="of-quiz-grid" role="group" aria-label={STEPS[0]}>
          {USE_CASES.map((id) => (
            <button key={id} type="button" aria-pressed={useCase === id} className="of-quiz-opt" onClick={() => pick(setUseCase, id)}>
              {USE_CASE_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="of-quiz-grid" role="group" aria-label={STEPS[1]}>
          {REFERRAL_SOURCES.map((id) => (
            <button key={id} type="button" aria-pressed={referral === id} className="of-quiz-opt" onClick={() => pick(setReferral, id)}>
              {REFERRAL_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="of-quiz-grid of-quiz-grid--one" role="group" aria-label={STEPS[2]}>
          {EXPERIENCE_LEVELS.map((id) => (
            <button key={id} type="button" aria-pressed={experience === id} className="of-quiz-opt" onClick={() => pick(setExperience, id)}>
              {EXPERIENCE_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="of-field">
            <label htmlFor="of-dob">Date of birth <span style={{ fontWeight: 400, textTransform: "none" }}>(optional — must be 13+)</span></label>
            <input id="of-dob" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="of-login-actions">
            <button type="button" className="of-btn of-btn--lime" disabled={busy} onClick={() => void finish()}>
              {busy ? "Saving…" : "Enter the studio →"}
            </button>
          </div>
        </div>
      )}

      <div className="of-quiz-nav">
        {step > 0 && (
          <button type="button" className="of-btn of-btn--ghost" disabled={busy} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
        )}
        {step < 3 && (
          <button type="button" className="of-btn" disabled={busy || !canNext} onClick={() => setStep((s) => s + 1)}>
            Continue →
          </button>
        )}
        <button type="button" className="of-quiz-skip" disabled={busy} onClick={() => void skip()}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
