import type { MetadataRoute } from "next";

import { SITE_URL } from "@/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/mcp`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
