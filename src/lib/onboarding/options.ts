export const USE_CASES = [
  "ads-marketing",
  "films",
  "social-content",
  "music-videos",
  "client-work",
  "just-exploring",
] as const;

export const REFERRAL_SOURCES = [
  "x-challenge",
  "friend",
  "search",
  "youtube",
  "instagram",
  "other",
] as const;

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "pro"] as const;

export type UseCase = (typeof USE_CASES)[number];
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];
export type Experience = (typeof EXPERIENCE_LEVELS)[number];
