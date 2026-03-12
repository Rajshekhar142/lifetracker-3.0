"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type ShadowDomainStatus = {
  domainId: string;
  domainName: string;
  threshold: number;       // today's WU target
  todayWU: number;         // WU earned today so far
  progressPct: number;     // todayWU / threshold * 100 (capped at 200)
  approved: boolean;       // todayWU >= threshold
  hasHistory: boolean;     // enough data to set a threshold
  weekStart: Date | null;  // when current threshold period began
};

export type ShadowData = {
  domains: ShadowDomainStatus[];
  lastUpdated: Date | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Calculate rolling 7-day average WU for a domain ─────────────────────────
async function getRollingAverage(
  userId: string,
  domainId: string
): Promise<{ avg: number; hasHistory: boolean }> {
  const sevenDaysAgo = daysAgo(7);
  const todayStart = startOfDay(new Date());

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      domainId,
      status: "Completed",
      createdAt: {
        gte: sevenDaysAgo,
        lt: todayStart, // exclude today — compare against past
      },
    },
    select: { calculatedWU: true, createdAt: true },
  });

  if (!tasks.length) return { avg: 0, hasHistory: false };

  // Group by day and sum WU per day
  const byDay = new Map<string, number>();
  for (const t of tasks) {
    const day = t.createdAt.toISOString().split("T")[0];
    byDay.set(day, (byDay.get(day) ?? 0) + t.calculatedWU);
  }

  // Need at least 3 active days to set a meaningful threshold
  if (byDay.size < 3) return { avg: 0, hasHistory: false };

  const totalWU = [...byDay.values()].reduce((s, v) => s + v, 0);
  const avg = totalWU / byDay.size; // avg per active day

  return { avg, hasHistory: true };
}

// ─── Get today's WU for a domain ─────────────────────────────────────────────
async function getTodayWU(userId: string, domainId: string): Promise<number> {
  const todayStart = startOfDay(new Date());

  const result = await prisma.task.aggregate({
    where: {
      userId,
      domainId,
      status: "Completed",
      createdAt: { gte: todayStart },
    },
    _sum: { calculatedWU: true },
  });

  return result._sum.calculatedWU ?? 0;
}

// ─── Initialize or get threshold for a domain ────────────────────────────────
async function ensureThreshold(
  userId: string,
  domainId: string
): Promise<{ threshold: number; weekStart: Date | null; hasHistory: boolean }> {
  const existing = await prisma.shadowThreshold.findUnique({
    where: { userId_domainId: { userId, domainId } },
  });

  const { avg, hasHistory } = await getRollingAverage(userId, domainId);

  if (!hasHistory) {
    return { threshold: 0, weekStart: existing?.weekStart ?? null, hasHistory: false };
  }

  // 115% of rolling average = Shadow threshold
  const newThreshold = parseFloat((avg * 1.15).toFixed(2));

  if (!existing) {
    // First time — create threshold
    const created = await prisma.shadowThreshold.create({
      data: {
        userId,
        domainId,
        threshold: newThreshold,
        weekStart: new Date(),
      },
    });
    return { threshold: created.threshold, weekStart: created.weekStart, hasHistory: true };
  }

  // Check if 7 days have passed since last update
  const daysSinceUpdate =
    (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate >= 7) {
    // Update threshold — progressive overload
    const updated = await prisma.shadowThreshold.update({
      where: { userId_domainId: { userId, domainId } },
      data: {
        threshold: newThreshold,
        weekStart: new Date(),
        updatedAt: new Date(),
      },
    });
    return { threshold: updated.threshold, weekStart: updated.weekStart, hasHistory: true };
  }

  return { threshold: existing.threshold, weekStart: existing.weekStart, hasHistory: true };
}

// ─── Main: get Shadow data for all domains ────────────────────────────────────
export async function getShadowData(): Promise<ShadowData> {
  const session = await getSession();
  const userId = session.user.id;

  const domains = await prisma.domain.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const results = await Promise.all(
    domains.map(async (domain) => {
      const { threshold, weekStart, hasHistory } = await ensureThreshold(
        userId,
        domain.id
      );
      const todayWU = await getTodayWU(userId, domain.id);

      const progressPct =
        threshold > 0
          ? Math.min(Math.round((todayWU / threshold) * 100), 200)
          : 0;

      return {
        domainId: domain.id,
        domainName: domain.name,
        threshold,
        todayWU: parseFloat(todayWU.toFixed(1)),
        progressPct,
        approved: hasHistory && todayWU >= threshold,
        hasHistory,
        weekStart,
      };
    })
  );

  // Last updated = most recent completed task today
  const todayStart = startOfDay(new Date());
  const lastTask = await prisma.task.findFirst({
    where: { userId, status: "Completed", createdAt: { gte: todayStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    domains: results,
    lastUpdated: lastTask?.createdAt ?? null,
  };
}

// ─── Force threshold refresh (call manually if needed) ───────────────────────
export async function refreshShadowThresholds(): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const domains = await prisma.domain.findMany({
    where: { userId },
    select: { id: true },
  });

  await Promise.all(
    domains.map((d) => ensureThreshold(userId, d.id))
  );
}