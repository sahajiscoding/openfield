import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Syne } from "next/font/google";

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  STUDIO_BG,
  openGraphFor,
  twitterFor,
} from "@/site";

import "./base.css";

const display = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: { title: SITE_NAME },
  keywords: [
    "open-source Higgsfield alternative",
    "AI video generation",
    "Seedance 2.5",
    "Kling",
    "text-to-video",
    "image-to-video",
    "Supabase auth",
  ],
  openGraph: openGraphFor({ path: "/" }),
  twitter: twitterFor(),
  verification: { google: "AEIauCUUbD9tJhpCBg3LHSNrsR5iULOPg8cHy_OiNE0" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: STUDIO_BG,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
