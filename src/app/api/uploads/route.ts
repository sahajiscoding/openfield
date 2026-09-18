import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";

const BUCKET = "openfield-uploads";
// Mirrors ROLE_ACCEPT in src/openhiggsfield/data.ts — keep the two in sync.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "audio/wav",
  "audio/x-wav",
]);
const MAX_BYTES = 256 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  const base = name.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "");
  return (cleaned.slice(0, 120) || "file").toLowerCase();
}

/** Reference-frame uploads → Supabase Storage (public bucket, user-scoped paths). */
export async function POST(request: Request): Promise<NextResponse> {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    return NextResponse.json({ error: "Uploads are not configured." }, { status: 503 });
  }

  const supabase = createServerClient(url, anon, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "Verify your email to upload." }, { status: 403 });
  }

  try {
    enforceRateLimit(`upload:${user.id}:${clientIpFromHeaders(request.headers)}`, 20, 60_000);
  } catch {
    return NextResponse.json({ error: "Too many uploads — wait a moment." }, { status: 429 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Send multipart form-data with a file field." }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}.` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 256 MB)." }, { status: 413 });
  }

  const ext = sanitizeFilename(file.name).split(".").pop();
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const admin = createAdminClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("[upload] supabase upload failed", error.message);
    return NextResponse.json({ error: "Upload failed — try again." }, { status: 500 });
  }
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl, path });
}
