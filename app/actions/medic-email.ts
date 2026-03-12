"use server";

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const resend = new Resend(process.env.RESEND_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Groq digest summary ──────────────────────────────────────────────────────
async function generateSummary(data: {
  medicSessions: number;
  avgSeverity: number;
  topTriggers: string[];
  strongDomains: string[];
  totalWU: number;
  recoveryAvgDays: number;
}): Promise<string> {
  const prompt = `You are a personal analytics assistant for a life tracking app.
Write a brief weekly summary (3-4 sentences) based on:
- Medic sessions: ${data.medicSessions}
- Average difficulty: ${data.avgSeverity}/5
- Stress triggers: ${data.topTriggers.join(", ") || "none recorded"}
- Domains active on bad days: ${data.strongDomains.join(", ") || "none"}
- Total work units earned: ${data.totalWU}
- Avg recovery time: ${data.recoveryAvgDays > 0 ? `${data.recoveryAvgDays} days` : "still tracking"}

Write in second person. Be direct and specific to the data. No generic advice.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    });
    return completion.choices[0].message.content ?? "";
  } catch {
    return `You logged ${data.medicSessions} difficult sessions this week and earned ${data.totalWU.toFixed(0)} WU. Your strongest domains on hard days were ${data.strongDomains.join(" and ") || "still being tracked"}. Keep showing up.`;
  }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────
function buildEmail(data: {
  weekStart: Date;
  weekEnd: Date;
  medicSessions: number;
  avgSeverity: number;
  topTriggers: string[];
  strongDomains: string[];
  recoveryAvgDays: number;
  totalWU: number;
  summary: string;
}): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const severityLabel =
    data.avgSeverity <= 1.5 ? "Mild" :
    data.avgSeverity <= 2.5 ? "Moderate" :
    data.avgSeverity <= 3.5 ? "Difficult" : "Intense";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">

        <tr><td style="padding-bottom:28px;border-bottom:1px solid rgba(0,255,255,0.08);">
          <p style="margin:0;font-size:11px;letter-spacing:0.3em;color:rgba(0,255,255,0.45);text-transform:uppercase;">LIFETRACK</p>
          <p style="margin:6px 0 0;font-size:10px;letter-spacing:0.2em;color:rgba(255,255,255,0.2);">
            MEDIC WEEKLY DIGEST — ${fmt(data.weekStart)} TO ${fmt(data.weekEnd)}
          </p>
        </td></tr>

        <tr><td style="padding:28px 0 20px;">
          <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:rgba(0,255,255,0.35);text-transform:uppercase;">// WEEKLY SUMMARY</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">${data.summary}</p>
        </td></tr>

        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="width:23%;padding:14px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#00ffff;">${data.totalWU.toFixed(0)}</p>
              <p style="margin:4px 0 0;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.25);text-transform:uppercase;">Total WU</p>
            </td>
            <td style="width:4px;"></td>
            <td style="width:23%;padding:14px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#f472b6;">${data.medicSessions}</p>
              <p style="margin:4px 0 0;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.25);text-transform:uppercase;">Medic Days</p>
            </td>
            <td style="width:4px;"></td>
            <td style="width:23%;padding:14px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#a78bfa;">${severityLabel}</p>
              <p style="margin:4px 0 0;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.25);text-transform:uppercase;">Avg Load</p>
            </td>
            <td style="width:4px;"></td>
            <td style="width:23%;padding:14px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#00ffff;">${data.recoveryAvgDays > 0 ? `${data.recoveryAvgDays}d` : "—"}</p>
              <p style="margin:4px 0 0;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.25);text-transform:uppercase;">Recovery</p>
            </td>
          </tr></table>
        </td></tr>

        ${data.strongDomains.length > 0 ? `
        <tr><td style="padding-bottom:20px;">
          <p style="margin:0 0 10px;font-size:9px;letter-spacing:0.3em;color:rgba(0,255,255,0.35);text-transform:uppercase;">// DOMAINS ACTIVE ON BAD DAYS</p>
          ${data.strongDomains.map((d) => `<span style="display:inline-block;padding:5px 10px;margin:3px;background:rgba(0,255,255,0.05);border:1px solid rgba(0,255,255,0.18);font-size:10px;letter-spacing:0.1em;color:rgba(0,255,255,0.6);text-transform:uppercase;">${d}</span>`).join("")}
        </td></tr>
        ` : ""}

        ${data.topTriggers.length > 0 ? `
        <tr><td style="padding-bottom:28px;">
          <p style="margin:0 0 10px;font-size:9px;letter-spacing:0.3em;color:rgba(236,72,153,0.45);text-transform:uppercase;">// RECURRING STRESS PATTERNS</p>
          <p style="margin:0;font-size:12px;line-height:2;color:rgba(255,255,255,0.3);letter-spacing:0.06em;">${data.topTriggers.join("  ·  ")}</p>
        </td></tr>
        ` : ""}

        <tr><td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0;font-size:9px;letter-spacing:0.15em;color:rgba(255,255,255,0.12);">LIFETRACK · MEDIC ANALYTICS · PRIVATE REPORT</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Generate and save weekly digest ─────────────────────────────────────────
async function generateWeeklyDigest(userId: string) {
  const now = new Date();

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.weeklyDigest.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (existing) return existing;

  const weekLogs = await prisma.medicLog.findMany({
    where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
  });

  const weekWU = await prisma.task.aggregate({
    where: { userId, status: "Completed", createdAt: { gte: weekStart, lte: weekEnd } },
    _sum: { calculatedWU: true },
  });

  const totalWU = weekWU._sum.calculatedWU ?? 0;
  const avgSeverity =
    weekLogs.length > 0
      ? weekLogs.reduce((s, l) => s + l.severity, 0) / weekLogs.length
      : 0;

  const keywordCount = new Map<string, number>();
  const domainCount = new Map<string, number>();
  for (const log of weekLogs) {
    for (const kw of log.keywords) keywordCount.set(kw, (keywordCount.get(kw) ?? 0) + 1);
    for (const d of log.domainsActive) domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
  }

  const topTriggers = [...keywordCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([kw]) => kw);
  const strongDomains = [...domainCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

  const recoveredLogs = weekLogs.filter((l) => l.recoveredAt);
  const recoveryAvgDays =
    recoveredLogs.length > 0
      ? parseFloat(
          (recoveredLogs.reduce((sum, l) => {
            return sum + (l.recoveredAt!.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / recoveredLogs.length).toFixed(1)
        )
      : 0;

  const summary = await generateSummary({
    medicSessions: weekLogs.length,
    avgSeverity,
    topTriggers,
    strongDomains,
    totalWU,
    recoveryAvgDays,
  });

  return prisma.weeklyDigest.create({
    data: {
      userId,
      weekStart,
      weekEnd,
      medicSessions: weekLogs.length,
      avgSeverity: parseFloat(avgSeverity.toFixed(1)),
      topTriggers,
      strongDomains,
      recoveryAvgDays,
      totalWU,
      summary,
    },
  });
}

// ─── Send digest to one user ──────────────────────────────────────────────────
export async function sendWeeklyDigestEmail(userId: string): Promise<void> {
  const digest = await generateWeeklyDigest(userId);
  if (!digest || digest.emailSent) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return;

  const html = buildEmail({
    weekStart: digest.weekStart,
    weekEnd: digest.weekEnd,
    medicSessions: digest.medicSessions,
    avgSeverity: digest.avgSeverity,
    topTriggers: digest.topTriggers,
    strongDomains: digest.strongDomains,
    recoveryAvgDays: digest.recoveryAvgDays,
    totalWU: digest.totalWU,
    summary: digest.summary,
  });

  await resend.emails.send({
    from: "LifeTracker <onboarding@resend.dev>", // replace with Resend verified domain
    to: user.email,
    subject: `Medic Report — Week of ${digest.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    html,
  });

  await prisma.weeklyDigest.update({
    where: { id: digest.id },
    data: { emailSent: true, sentAt: new Date() },
  });
}

// ─── Send to all users — call from cron every Monday ─────────────────────────
export async function sendAllWeeklyDigests(): Promise<void> {
  if (new Date().getDay() !== 1) return;

  const users = await prisma.medicLog.findMany({
    distinct: ["userId"],
    select: { userId: true },
  });

  await Promise.allSettled(users.map((u) => sendWeeklyDigestEmail(u.userId)));
}