import { createServerClient } from "@supabase/ssr";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTIONS,
  blobPathname,
  resolveDeviceId,
} from "@/generation/device";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";

/** Uploads bill the operator's Blob store: signed-in, verified users only. */
async function requireUploader(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Auth is not configured — uploads disabled.");
  }
  const jar = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to upload.");
  if (!user.email_confirmed_at) {
    throw new Error("Verify your email to upload — check your inbox.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(`blob:${clientIpFromHeaders(request.headers)}`, 20, 60_000);
    await requireUploader();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Upload denied.";
    const status = message.includes("Too many requests") ? 429 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const incoming = (await request.json()) as HandleUploadBody;
  const device =
    incoming.type === "blob.generate-client-token" ? await readDeviceId() : null;
  const body = device ? withDevicePath(incoming, device.deviceId) : incoming;
  console.info("[blob] upload", summarizeBlobEvent(body));

  try {
    const token = process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing OPEN_HIGGSFIELD_READ_WRITE_TOKEN");
    const json = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        console.info("[blob] token", { pathname });
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "audio/wav",
            "audio/x-wav",
          ],
          // 256 MB per file: room for video start frames, bounded Blob bills.
          maximumSizeInBytes: 256 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return withDeviceCookie(
      json.type === "blob.generate-client-token" && body.type === "blob.generate-client-token"
        ? NextResponse.json({ ...json, pathname: body.payload.pathname })
        : NextResponse.json(json),
      device,
    );
  } catch (error) {
    console.error("[blob] upload failed", error instanceof Error ? error.message : error);
    if (device?.minted) return withDeviceCookie(new NextResponse(null, { status: 500 }), device);
    throw error;
  }
}

async function readDeviceId() {
  const jar = await cookies();
  return resolveDeviceId(jar.get(DEVICE_COOKIE)?.value);
}

function withDeviceCookie(
  response: NextResponse,
  device: { deviceId: string; minted: boolean } | null,
) {
  if (device?.minted) response.cookies.set(DEVICE_COOKIE, device.deviceId, DEVICE_COOKIE_OPTIONS);
  return response;
}

function withDevicePath(body: HandleUploadBody, deviceId: string): HandleUploadBody {
  if (body.type !== "blob.generate-client-token") return body;
  return {
    ...body,
    payload: { ...body.payload, pathname: blobPathname(deviceId, body.payload.pathname) },
  };
}

function summarizeBlobEvent(body: HandleUploadBody) {
  if (body.type === "blob.generate-client-token") {
    return { type: body.type, pathname: body.payload.pathname };
  }
  return { type: body.type, url: body.payload.blob.url };
}
