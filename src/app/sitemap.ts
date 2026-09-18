import type { MetadataRoute } from "next";

import { SITE_URL } from "@/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/studio`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];
}
