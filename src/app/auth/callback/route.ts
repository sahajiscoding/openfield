import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Supabase email + OAuth callback: exchanges `code` for a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), url.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const jar = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    return NextResponse.redirect(new URL("/login?error=missing_env", url.origin));
  }

  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet: { name: string; value: string; options?: object }[]) => {
        for (const { name, value, options } of toSet) {
          try {
            jar.set(name, value, options);
          } catch {
            // middleware refreshes on next request
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

/**
 * `next` must stay on this origin: reject absolute URLs, protocol-relative
 * URLs (//evil), and backslash tricks — anything else lands on /studio.
 */
function safeNext(raw: string | null, origin: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/studio";
  }
  try {
    const target = new URL(raw, origin);
    if (target.origin !== origin) return "/studio";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/studio";
  }
}
