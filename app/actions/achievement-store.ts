"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  masteryKey,
  MASTERY_TIERS,
  DOMAINS,
  getAchievementMeta,
  type AchievementMeta,
} from "@/lib/Achievements";

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Core unlock helper ───────────────────────────────────────────────────────
// Filters out already-unlocked keys, inserts only new ones
// Returns the keys that were freshly unlocked
async function unlockIfNew(userId: string, keys: string[]): Promise<string[]> {
  if (!keys.length) return [];

  const existing = await prisma.achievement.findMany({
    where: { userId, key: { in: keys } },
    select: { key: true },
  });

  const existingKeys = new Set(existing.map((a) => a.key));
  const newKeys = keys.filter((k) => !existingKeys.has(k));

  if (!newKeys.length) return [];

  await prisma.achievement.createMany({
    data: newKeys.map((key) => ({ userId, key })),
    skipDuplicates: true,
  });

  return newKeys;
}

// ─── INSTANT — hidden achievement evaluation ──────────────────────────────────
// Call this immediately after completeTask()
// Returns newly unlocked achievement keys for the toast
export async function evaluateHiddenAchievements(taskId: string): Promise<string[]> {
  const session = await getSession();
  const userId = session.user.id;

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, status: "Completed" },
    select: {
      resistanceLevel: true,
      durationMinutes: true,
      calculatedWU: true,
      startedAt: true,
    },
  });

  if (!task) return [];

  const toUnlock: string[] = [];
  const now = new Date();

  // ── IMMOVABLE — resistance exactly 10
  if (task.resistanceLevel === 10) {
    toUnlock.push("immovable");
  }

  // ── MARATHON — single task 90+ minutes
  if ((task.durationMinutes ?? 0) >= 90) {
    toUnlock.push("marathon");
  }

  // ── GHOST PROTOCOL — completed between 2am and 4am
  const hour = now.getHours();
  if (hour >= 2 && hour < 4) {
    toUnlock.push("ghost_protocol");
  }

  // ── IRON WILL — 5 tasks with resistance 9 or 10
  const highResistanceCount = await prisma.task.count({
    where: { userId, status: "Completed", resistanceLevel: { gte: 9 } },
  });
  if (highResistanceCount >= 5) toUnlock.push("iron_will");

  // ── PERFECT RECALL — 10 tasks with WU > 0 and duration >= 5 min
  // approximation: completed tasks with meaningful duration
  // replace with exact recallMultiplier field once added to schema
  const recallCount = await prisma.task.count({
    where: {
      userId,
      status: "Completed",
      durationMinutes: { gte: 5 },
      calculatedWU: { gt: 0 },
    },
  });
  if (recallCount >= 10) toUnlock.push("perfect_recall");

  // ── FEYNMAN LEVEL — 25 tasks (same logic, higher bar)
  if (recallCount >= 25) toUnlock.push("feynman_level");

  // ── FULL SPECTRUM — all 7 domains active in current week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const activeThisWeek = await prisma.task.findMany({
    where: {
      userId,
      status: "Completed",
      createdAt: { gte: weekStart },
    },
    select: { domainId: true },
    distinct: ["domainId"],
  });

  const userDomainCount = await prisma.domain.count({ where: { userId } });

  if (userDomainCount >= 7 && activeThisWeek.length >= 7) {
    toUnlock.push("full_spectrum");
  }

  const newKeys = await unlockIfNew(userId, toUnlock);
  if (newKeys.length) revalidatePath("/achievements");
  return newKeys;
}

// ─── DAILY — mastery achievement evaluation ───────────────────────────────────
// Call this on a daily cron or manually from a settings action
// Returns newly unlocked achievement keys
export async function evaluateMasteryAchievements(): Promise<string[]> {
  const session = await getSession();
  const userId = session.user.id;

  // Get all user domains with their completed WU
  const domains = await prisma.domain.findMany({
    where: { userId },
    select: {
      name: true,
      tasks: {
        where: { status: "Completed" },
        select: { calculatedWU: true },
      },
    },
  });

  const toUnlock: string[] = [];

  for (const domain of domains) {
    const totalWU = domain.tasks.reduce((sum, t) => sum + t.calculatedWU, 0);

    for (const { tier, wuRequired } of MASTERY_TIERS) {
      if (totalWU >= wuRequired) {
        toUnlock.push(masteryKey(domain.name, tier));
      }
    }
  }

  const newKeys = await unlockIfNew(userId, toUnlock);
  if (newKeys.length) revalidatePath("/achievements");
  return newKeys;
}

// ─── Domain purge — call from deleteDomain action ─────────────────────────────
export async function evaluateDomainPurge(): Promise<string[]> {
  const session = await getSession();
  const newKeys = await unlockIfNew(session.user.id, ["domain_purge"]);
  if (newKeys.length) revalidatePath("/achievements");
  return newKeys;
}

// ─── Combined instant check — single call after completeTask() ───────────────
// This is the only function mission-page needs to call
// Returns newly unlocked keys for the toast
export async function checkAchievementsOnComplete(taskId: string): Promise<string[]> {
  return evaluateHiddenAchievements(taskId);
}

// ─── Fetch user achievements ──────────────────────────────────────────────────
export type UserAchievement = {
  key: string;
  isPublic: boolean;
  unlockedAt: Date;
  meta: AchievementMeta;
};

export async function getUserAchievements(): Promise<{
  unlocked: UserAchievement[];
  locked: AchievementMeta[];
  totalCount: number;
  unlockedCount: number;
}> {
  const session = await getSession();
  const userId = session.user.id;

  const rows = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
  });

  const unlockedKeys = new Set(rows.map((r) => r.key));

  const unlocked: UserAchievement[] = rows
    .map((row) => {
      const meta = getAchievementMeta(row.key);
      if (!meta) return null;
      return {
        key: row.key,
        isPublic: row.isPublic,
        unlockedAt: row.unlockedAt,
        meta,
      };
    })
    .filter(Boolean) as UserAchievement[];

  const { ALL_ACHIEVEMENTS } = await import("@/lib/Achievements");

  const locked: AchievementMeta[] = ALL_ACHIEVEMENTS.filter(
    (a) => !unlockedKeys.has(a.key)
  );

  return {
    unlocked,
    locked,
    totalCount: ALL_ACHIEVEMENTS.length,
    unlockedCount: unlocked.length,
  };
}

// ─── Toggle public visibility ─────────────────────────────────────────────────
export async function toggleAchievementVisibility(key: string): Promise<void> {
  const session = await getSession();

  const existing = await prisma.achievement.findFirst({
    where: { userId: session.user.id, key },
    select: { isPublic: true },
  });

  if (!existing) return;

  await prisma.achievement.updateMany({
    where: { userId: session.user.id, key },
    data: { isPublic: !existing.isPublic },
  });

  revalidatePath("/achievements");
}