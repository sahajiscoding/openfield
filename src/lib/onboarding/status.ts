import { createClient } from "@/lib/supabase/server";

/**
 * "Has this user answered the onboarding quiz?" for server components that
 * already hold the session.
 *
 * This lives outside the Server Action module on purpose. The action
 * (`hasCompletedOnboarding`) has to derive the user from the session, because
 * a browser can call it and must never be able to name another user's id. A
 * server component that has just read the session, though, already knows the
 * user — so it asks for that row directly instead of paying a second
 * Supabase auth round trip to prove who it is again.
 *
 * Fail-open, exactly like the action: a config outage must not trap signed-in
 * people outside the studio.
 */
export async function hasCompletedOnboardingFor(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("onboarding_responses")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[onboarding] status check failed", error.message);
      return true;
    }
    return data !== null;
  } catch (caught) {
    console.error(
      "[onboarding] status check threw",
      caught instanceof Error ? caught.message : caught,
    );
    return true;
  }
}
