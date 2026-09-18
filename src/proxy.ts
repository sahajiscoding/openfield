import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, resolveDeviceId } from "./generation/device";

/**
 * Next 16 edge entry: device minting (Vercel Blob scoping, from
 * open-higgsfield) + Supabase session refresh + /studio auth gate.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 1) Device id for blob pathnames (mint once, httpOnly).
  const { deviceId, minted } = resolveDeviceId(request.cookies.get(DEVICE_COOKIE)?.value);
  if (minted) response.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);

  // 2) Supabase session. If env is missing (keys pasted later), don't block —
  //    pages render their own "connect Supabase" guidance.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

  const path = request.nextUrl.pathname;
  const isStudio = path === "/studio" || path.startsWith("/studio/");
  const isLogin = path === "/login";

  if (isStudio && !user) {
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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
