"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MedicTask = {
  domain: string;
  title: string;
  resistance: number;
  reason: string;
};

export type MedicResult = {
  tasks: {
    id: string;
    title: string;
    domain: string;
    resistance: number;
    reason: string;
  }[];
  advice: string;
};

export type MedicAnalytics = {
  totalSessions: number;
  avgSeverity: number;
  topTriggers: { keyword: string; count: number }[];
  strongDomains: { domain: string; completionRate: number }[];
  avgRecoveryDays: number | null;
};

// ─── Keyword extractor ────────────────────────────────────────────────────────
function extractKeywords(input: string): string[] {
  const stopWords = new Set([
    "i", "me", "my", "am", "is", "are", "was", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "a", "an", "the", "and",
    "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "just", "so", "not", "no",
    "feel", "feeling", "really", "very", "quite", "bit", "little",
  ]);

  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 10);
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────
function getRuleBasedSuggestions(
  severity: number,
  domains: string[]
): MedicTask[] {
  const protocols: Record<string, { low: string; mid: string; high: string }> = {
    Physical:   { low: "15 minute walk outside", mid: "10 minutes of gentle stretching", high: "5 minutes of deep breathing lying down" },
    Mental:     { low: "Read one page of anything you enjoy", mid: "Write 3 things you already know well", high: "Close all tabs. Sit quietly for 5 minutes" },
    Emotional:  { low: "Write one sentence about how you feel", mid: "Journal for 10 minutes without stopping", high: "Acknowledge the feeling. Write its name down" },
    Spiritual:  { low: "Sit outside for 10 minutes", mid: "Write one thing you are grateful for", high: "Breathe and do nothing for 5 minutes" },
    Social:     { low: "Send one message to someone you trust", mid: "Call someone for 10 minutes", high: "Let someone know you are having a hard day" },
    Financial:  { low: "Review your budget for 5 minutes", mid: "Write one financial goal for this week", high: "Log one expense. Just one" },
    Vocational: { low: "Do the smallest possible task in your work", mid: "Write what you want to accomplish tomorrow", high: "Open your work. Look at it. Close it. That counts" },
  };

  const level = severity <= 2 ? "low" : severity <= 3 ? "mid" : "high";
  const resistance = severity <= 2 ? 2 : 1;

  return domains.slice(0, 4).map((domain) => {
    const protocol = protocols[domain] ?? protocols["Mental"];
    return {
      domain,
      title: protocol[level],
      resistance,
      reason: "Recovery task — gentle effort counts.",
    };
  });
}

// ─── Groq call ────────────────────────────────────────────────────────────────
async function getGroqSuggestions(
  userInput: string,
  severity: number,
  domains: string[]
): Promise<{ tasks: MedicTask[]; advice: string }> {
  const prompt = `You are Medic, a recovery assistant inside a life tracking app.
The user tracks life across these domains: ${domains.join(", ")}.
They are having a difficult day. Severity: ${severity}/5.
They wrote: "${userInput}"

Return ONLY valid JSON. No markdown. No explanation:
{
  "tasks": [
    {
      "domain": "Physical",
      "title": "15 minute walk outside",
      "resistance": 2,
      "reason": "Light movement reduces cortisol"
    }
  ],
  "advice": "Two sentence direct warm advice here."
}

Rules:
- Max 4 tasks, pick most relevant domains
- resistance must be 1, 2, or 3 only
- domain must exactly match one of: ${domains.join(", ")}
- advice must feel personal to what they wrote`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw = completion.choices[0].message.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const validTasks: MedicTask[] = (parsed.tasks ?? []).filter(
      (t: MedicTask) =>
        typeof t.domain === "string" &&
        typeof t.title === "string" &&
        typeof t.resistance === "number" &&
        t.resistance >= 1 &&
        t.resistance <= 3 &&
        domains.includes(t.domain)
    );

    return {
      tasks: validTasks.length ? validTasks : getRuleBasedSuggestions(severity, domains),
      advice: typeof parsed.advice === "string" ? parsed.advice : "Rest. Show up tomorrow. That is enough.",
    };
  } catch {
    return {
      tasks: getRuleBasedSuggestions(severity, domains),
      advice: "Rest. Show up tomorrow. That is enough.",
    };
  }
}

// ─── Activate Medic ───────────────────────────────────────────────────────────
export async function activateMedic(
  userInput: string,
  severity: number
): Promise<MedicResult> {
  const session = await getSession();
  const userId = session.user.id;

  const userDomains = await prisma.domain.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const domainNames = userDomains.map((d) => d.name);
  const domainMap = new Map(userDomains.map((d) => [d.name, d.id]));

  // WU from last 7 days for recovery baseline
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentTasks = await prisma.task.findMany({
    where: { userId, status: "Completed", createdAt: { gte: sevenDaysAgo } },
    select: { calculatedWU: true, domainId: true },
  });

  const wuBeforeMedic = recentTasks.reduce((sum, t) => sum + t.calculatedWU, 0);

  const activeDomainIds = new Set(recentTasks.map((t) => t.domainId));
  const domainsActive = userDomains
    .filter((d) => activeDomainIds.has(d.id))
    .map((d) => d.name);

  const keywords = extractKeywords(userInput);
  const { tasks: suggestions, advice } = await getGroqSuggestions(userInput, severity, domainNames);

  // Create tasks in DB
  const createdTasks = (
    await Promise.all(
      suggestions.map(async (s) => {
        const domainId = domainMap.get(s.domain);
        if (!domainId) return null;

        return prisma.task.create({
          data: {
            title: s.title,
            description: s.reason,
            resistanceLevel: s.resistance,
            status: "In_progress",
            userId,
            domainId,
            isMedicTask: true,
          },
          select: {
            id: true,
            title: true,
            resistanceLevel: true,
            domain: { select: { name: true } },
          },
        });
      })
    )
  ).filter(Boolean);

  // Log session
  await prisma.medicLog.create({
    data: {
      userId,
      input: userInput,
      severity,
      keywords,
      domainsActive,
      wuBeforeMedic,
      tasksCreated: createdTasks.length,
      advice,
    },
  });

  revalidatePath("/mission");

  return {
    tasks: createdTasks.map((t) => ({
      id: t!.id,
      title: t!.title,
      domain: t!.domain.name,
      resistance: t!.resistanceLevel,
      reason: suggestions.find((s) => s.title === t!.title)?.reason ?? "",
    })),
    advice,
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getMedicAnalytics(): Promise<MedicAnalytics> {
  const session = await getSession();
  const userId = session.user.id;

  const logs = await prisma.medicLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!logs.length) {
    return { totalSessions: 0, avgSeverity: 0, topTriggers: [], strongDomains: [], avgRecoveryDays: null };
  }

  const avgSeverity = logs.reduce((sum, l) => sum + l.severity, 0) / logs.length;

  const keywordCount = new Map<string, number>();
  for (const log of logs) {
    for (const kw of log.keywords) {
      keywordCount.set(kw, (keywordCount.get(kw) ?? 0) + 1);
    }
  }

  const domainCount = new Map<string, number>();
  for (const log of logs) {
    for (const domain of log.domainsActive) {
      domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1);
    }
  }

  const recoveredLogs = logs.filter((l) => l.recoveredAt);
  const avgRecoveryDays =
    recoveredLogs.length > 0
      ? parseFloat(
          (
            recoveredLogs.reduce((sum, l) => {
              return sum + (l.recoveredAt!.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / recoveredLogs.length
          ).toFixed(1)
        )
      : null;

  return {
    totalSessions: logs.length,
    avgSeverity: parseFloat(avgSeverity.toFixed(1)),
    topTriggers: [...keywordCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count })),
    strongDomains: [...domainCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({
        domain,
        completionRate: Math.round((count / logs.length) * 100),
      })),
    avgRecoveryDays,
  };
}

// ─── Latest digest ────────────────────────────────────────────────────────────
export async function getLatestDigest() {
  const session = await getSession();
  return prisma.weeklyDigest.findFirst({
    where: { userId: session.user.id },
    orderBy: { weekStart: "desc" },
  });
}