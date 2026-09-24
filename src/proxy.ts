import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, resolveDeviceId } from "./generation/device";

/**
 * Next 16 edge entry: device minting (Vercel Blob scoping, from
 * open-higgsfield) + Supabase session refresh + the auth gate on gated routes.
 *
 * PERFORMANCE CONTRACT — the auth round trip is conditional on purpose.
 * `supabase.auth.getUser()` is a NETWORK call to the Supabase Auth server, and
 * this middleware sits in front of every page render. Doing it unconditionally
 * put a round trip in front of `/`, `/#pricing` and every other public page, and
 * it was one of the hops stacked in front of `/studio`.
 *
 * So the check runs only where it changes the outcome:
 *   - billing routes (`/billing/**`) — the gate itself;
 *   - `/login` — so a signed-in visitor is forwarded into the studio instead
 *     of being shown a dead form.
 *
 * Public routes keep the device cookie and nothing else. Sessions are not left
 * un-refreshed by that: the access token is refreshed and re-cookie'd the first
 * time a visitor crosses into a gated route (@supabase/ssr refreshes on read
 * and this middleware writes the rotated cookies back on the response).
 *
 * AUTHORIZATION IS UNCHANGED — nothing here was loosened. Signed-out visitors
 * are still bounced to /login before a gated page renders, and the pages
 * re-check the session for themselves (fail closed twice, by design).
 */

/** Route prefixes that require a signed-in, non-expired session. */
// Studio performs its own server-side auth check so the page can reuse the
// resolved user for its required data reads. Keeping a second network auth
// check in middleware made every Studio navigation pay for two sequential
// Supabase auth requests. Billing remains middleware-gated because its nested
// routes have separate server components.
const GATED_PREFIXES = ["/billing"] as const;

function isGated(path: string): boolean {
  return GATED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  // 0) Canonical host: a visitor on any preview/deployment URL (or an old
  //    domain) is bounced to NEXT_PUBLIC_SITE_URL before anything else, so
  //    OAuth return URLs built from the current origin always land on the
  //    production host. Skipped when unconfigured and on loopback (dev).
  const canonical = canonicalHost();
  const reqHost = (request.headers.get("x-forwarded-host") ?? request.nextUrl.host)
    .split(",")[0]!
    .trim()
    .toLowerCase();
  if (canonical && reqHost !== canonical && !isLoopback(reqHost)) {
    const target = request.nextUrl.clone();
    try {
      const base = new URL(process.env.NEXT_PUBLIC_SITE_URL!.trim());
      target.protocol = base.protocol;
      target.host = canonical;
    } catch {
      target.host = canonical;
    }
    return NextResponse.redirect(target, 308);
  }

  let response = NextResponse.next({ request });

  // 1) Device id for blob pathnames (mint once, httpOnly).
  const { deviceId, minted } = resolveDeviceId(request.cookies.get(DEVICE_COOKIE)?.value);
  if (minted) response.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);

  const path = request.nextUrl.pathname;

  // 0b) Stray OAuth code: if Supabase (or a stale bookmark) drops ?code= on
  //     any page except the callback itself, forward it there — the callback
  //     exchanges it for a session and honors ?next=. Without this the code
  //     sits unexchanged in the address bar and the visitor stays signed out.
  if (path !== "/auth/callback" && request.nextUrl.searchParams.get("code")) {
    const target = request.nextUrl.clone();
    target.pathname = "/auth/callback";
    return NextResponse.redirect(target, 308);
  }

  const needsAuth = isGated(path) || path === "/login";

  // 2) Public render: hand the request straight through, auth untouched.
  if (!needsAuth) return response;

  // 3) Gated render. Fail closed: without configured auth nobody enters gated
  //    routes — the login page explains what env is missing.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const gated = isGated(path);

  // No auth configured: everything gated funnels to /login, which renders
  // the missing-env guidance instead of a dead form.
  if ((!url || !anon) && gated) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    login.searchParams.set("error", "missing_env");
    return NextResponse.redirect(login);
  }
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: object }[]) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        if (minted) response.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = path === "/login";

  if (gated && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    const redirect = NextResponse.redirect(login);
    if (minted) redirect.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
    return redirect;
  }
  if (isLogin && user) {
    const studio = request.nextUrl.clone();
    studio.pathname = "/studio";
    studio.search = "";
    const redirect = NextResponse.redirect(studio);
    if (minted) redirect.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
    return redirect;
  }
  return response;
}

/** Canonical host from NEXT_PUBLIC_SITE_URL, or null when unconfigured. */
function canonicalHost(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopback(host: string): boolean {
  const bare = host.split(":")[0]!;
  return bare === "localhost" || bare === "127.0.0.1" || bare === "[::1]" || bare === "::1";
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
