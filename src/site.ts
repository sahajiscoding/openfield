/* One source of truth for the site's identity and its canonical origin.
   Server-only by intent: VERCEL_PROJECT_PRODUCTION_URL is not exposed to the
   browser, so importing SITE_URL into a client component would resolve
   differently on each side. Keep this module out of "use client" files. */

function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveOrigin();

export const SITE_NAME = "Openfield";
export const SITE_DESCRIPTOR = "Open-source AI video studio";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_DESCRIPTOR}`;

export const SITE_DESCRIPTION =
  "Openfield is the open Higgsfield studio — one prompt bar for image and video across 38 Higgsfield models, Supabase sign-in, token billing via UroPay, and every finished run in one gallery.";

export const STUDIO_BG = "#08090a";

/* The Open Graph card is rendered by src/app/opengraph-image.tsx so its
   identity stays in sync with the current Openfield brand. */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Openfield AI — Open-source AI video studio.",
};

export function openGraphFor({
  path,
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
}: {
  path: string;
  title?: string;
  description?: string;
}) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: "en_US",
    url: path,
    title,
    description,
    images: [OG_IMAGE],
  };
}

export function twitterFor({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
}: { title?: string; description?: string } = {}) {
  return {
    card: "summary_large_image" as const,
    title,
    description,
    images: [OG_IMAGE],
  };
}
