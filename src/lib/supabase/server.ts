import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing Supabase env — copy .env.example to .env.local.");
  }
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet: { name: string; value: string; options?: object }[]) => {
        for (const { name, value, options } of toSet) {
          try {
            jar.set(name, value, options);
          } catch {
            // setAll from a Server Component is a no-op (middleware refreshes).
          }
        }
      },
    },
  });
}

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
