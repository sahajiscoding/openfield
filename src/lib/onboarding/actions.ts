"use server";

import { permissionDiagnosis, serviceClient, serviceKeyKind } from "@/lib/supabase/admin";
import {
  EXPERIENCE_LEVELS,
  REFERRAL_SOURCES,
  USE_CASES,
} from "./options";
import { requireSessionUser } from "@/lib/supabase/server";

function adminClient() {
  try {
    return serviceClient();
  } catch {
    throw new Error("Onboarding is not configured.");
  }
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** DOB is optional. When given it must be a real past date, age 13–120. */
function parseDob(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date of birth must be a valid date.");
  }
  const dob = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) throw new Error("Date of birth must be a valid date.");
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() >= dob.getUTCDate());
  if (!birthdayPassed) age -= 1;
  if (age < 0) throw new Error("Date of birth can't be in the future.");
  if (age < 13) throw new Error("You must be at least 13 to use Openfield.");
  if (age > 120) throw new Error("That date of birth doesn't look right.");
  return value;
}

/** True once the user answered or explicitly skipped. Never throws. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const user = await requireSessionUser();
    const { data } = await adminClient()
      .from("onboarding_responses")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return data !== null;
  } catch {
    // Fail open: a billing/config outage must not trap users outside /studio.
    return true;
  }
}

export async function saveOnboarding(input: {
  useCase: unknown;
  referralSource: unknown;
  experience: unknown;
  dob?: unknown;
}): Promise<void> {
  const user = await requireSessionUser();
  if (!isOneOf(input.useCase, USE_CASES)) throw new Error("Pick what you'll create first.");
  if (!isOneOf(input.referralSource, REFERRAL_SOURCES)) throw new Error("Tell us how you found us.");
  if (!isOneOf(input.experience, EXPERIENCE_LEVELS)) throw new Error("Pick your experience level.");
  const dob = parseDob(input.dob ?? null);

  const { error } = await adminClient().from("onboarding_responses").upsert(
    {
      user_id: user.id,
      use_case: input.useCase,
      referral_source: input.referralSource,
      experience: input.experience,
      dob,
      skipped: false,
    },
    { onConflict: "user_id" },
  );
  if (error) throw mappableDbError(error.message, "Could not save your answers — try again.", error.code);
}

export async function skipOnboarding(): Promise<void> {
  const user = await requireSessionUser();
  const { error } = await adminClient().from("onboarding_responses").upsert(
    {
      user_id: user.id,
      use_case: "just-exploring",
      referral_source: "other",
      experience: "beginner",
      dob: null,
      skipped: true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw mappableDbError(error.message, "Could not skip — try again.", error.code);
}

/** Turn opaque Postgres failures into actionable, leak-free messages. */
function mappableDbError(detail: string, fallback: string, code?: string): Error {
  console.error("[onboarding] db failed", { detail, code, keyKind: serviceKeyKind() });
  // Error codes are safe to show (no secrets) and decisive for debugging.
  const ref = code ? ` (ref ${code})` : "";
  if (/does not exist|could not find the table/i.test(detail) || code === "PGRST205" || code === "42P01") {
    return new Error("Database table missing — run migration 003_onboarding.sql in Supabase SQL Editor, then retry.");
  }
  if (/permission denied|policy|rls|row-level/i.test(detail) || code === "42501") {
    return new Error(`${permissionDiagnosis()}${ref}`);
  }
  return new Error(`${fallback}${ref}`);
}
