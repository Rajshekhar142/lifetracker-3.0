// lib/achievements.ts
// Pure definitions — no server code, no prisma
// Import this anywhere (client or server)

export type AchievementTier = "novice" | "apprentice" | "operator" | "elite";
export type AchievementType = "mastery" | "hidden";

export type AchievementMeta = {
  key: string;
  name: string;
  description: string;
  type: AchievementType;
  domain?: string;       // only for mastery
  tier?: AchievementTier; // only for mastery
  icon: string;
  hidden: boolean;       // if true — show ??? until unlocked
};

// ─── Mastery ──────────────────────────────────────────────────────────────────
// 7 domains × 4 tiers = 28 total mastery achievements

export const DOMAINS = [
  "Physical",
  "Mental",
  "Emotional",
  "Spiritual",
  "Social",
  "Financial",
  "Vocational",
] as const;

export const MASTERY_TIERS: {
  tier: AchievementTier;
  label: string;
  wuRequired: number;
  icon: string;
}[] = [
  { tier: "novice",     label: "Novice",     wuRequired: 50,  icon: "◌" },
  { tier: "apprentice", label: "Apprentice", wuRequired: 140, icon: "◎" },
  { tier: "operator",   label: "Operator",   wuRequired: 400, icon: "◈" },
  { tier: "elite",      label: "Elite",      wuRequired: 1100, icon: "◆" },
];

// Lookup: how much WU is needed for a given tier
export const MASTERY_WU: Record<AchievementTier, number> = {
  novice:     50,
  apprentice: 140,
  operator:   400,
  elite:      1100,
};

export function masteryKey(domain: string, tier: AchievementTier): string {
  return `${domain.toLowerCase()}_${tier}`;
}

const MASTERY_ACHIEVEMENTS: AchievementMeta[] = DOMAINS.flatMap((domain) =>
  MASTERY_TIERS.map(({ tier, label, wuRequired, icon }) => ({
    key: masteryKey(domain, tier),
    name: `${domain} — ${label}`,
    description: `Accumulate ${wuRequired} Work Units in the ${domain} domain.`,
    type: "mastery" as const,
    domain,
    tier,
    icon,
    hidden: false,
  }))
);

// ─── Hidden ───────────────────────────────────────────────────────────────────
// 8 hidden achievements — names and descriptions concealed until unlocked

const HIDDEN_ACHIEVEMENTS: AchievementMeta[] = [
  {
    key: "iron_will",
    name: "Iron Will",
    description: "Complete 5 tasks with resistance level 9 or 10.",
    type: "hidden",
    icon: "🜲",
    hidden: true,
  },
  {
    key: "full_spectrum",
    name: "Full Spectrum",
    description: "Log a completed task in all 7 domains within the same week.",
    type: "hidden",
    icon: "⬡",
    hidden: true,
  },
  {
    key: "perfect_recall",
    name: "Perfect Recall",
    description: "Achieve a 1.0x recall multiplier on 10 separate tasks.",
    type: "hidden",
    icon: "◇",
    hidden: true,
  },
  {
    key: "ghost_protocol",
    name: "Ghost Protocol",
    description: "Complete a task between 2:00am and 4:00am.",
    type: "hidden",
    icon: "◉",
    hidden: true,
  },
  {
    key: "feynman_level",
    name: "Feynman Level",
    description: "Pass AI recall evaluation at 1.0x multiplier on 25 separate tasks.",
    type: "hidden",
    icon: "△",
    hidden: true,
  },
  {
    key: "marathon",
    name: "Marathon",
    description: "Complete a single task that ran for 90 minutes or longer.",
    type: "hidden",
    icon: "▣",
    hidden: true,
  },
  {
    key: "immovable",
    name: "Immovable",
    description: "Log a task at maximum resistance level 10.",
    type: "hidden",
    icon: "⬟",
    hidden: true,
  },
  {
    key: "domain_purge",
    name: "Domain Purge",
    description: "Delete a domain and create a new one. You burned it down and rebuilt.",
    type: "hidden",
    icon: "◈",
    hidden: true,
  },
];

// ─── Combined catalogue ───────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: AchievementMeta[] = [
  ...MASTERY_ACHIEVEMENTS,
  ...HIDDEN_ACHIEVEMENTS,
];

export function getAchievementMeta(key: string): AchievementMeta | undefined {
  return ALL_ACHIEVEMENTS.find((a) => a.key === key);
}

// Totals — useful for progress display
export const TOTAL_MASTERY  = MASTERY_ACHIEVEMENTS.length;  // 28
export const TOTAL_HIDDEN   = HIDDEN_ACHIEVEMENTS.length;   // 8
export const TOTAL_ALL      = ALL_ACHIEVEMENTS.length;      // 36