import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Supabase email + OAuth callback: exchanges `code` for a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/studio";

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
