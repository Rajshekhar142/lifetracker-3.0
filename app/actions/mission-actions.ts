"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Domain, Task} from "@/generated/prisma/client";
// create once use everywhere.. auth helper..
import { getSession } from "./domain-actions";

// ─── Auth helper ─────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export type TaskWithDomain = Task & { domain: Domain };

export type DomainWithTasks = Domain & {
  tasks: Task[];
  totalWU: number;
  claimedWU: number;
};

// ─── Domain queries ───────────────────────────────────────────────────────────
export async function getDomainsWithTasks(): Promise<DomainWithTasks[]> {
  const session = await getSession();

  const domains = await prisma.domain.findMany({
    where: { userId: session.user.id },
    include: { tasks: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "asc" },
  });

  return domains.map((d) => {
    const totalWU = d.tasks.reduce((sum, t) => sum + t.calculatedWU, 0);
    const claimedWU = d.tasks
      .filter((t) => t.status === "Completed")
      .reduce((sum, t) => sum + t.calculatedWU, 0);
    return { ...d, totalWU, claimedWU };
  });
}

// ─── Task creation ────────────────────────────────────────────────────────────
export async function createTask(data: {
  title: string;
  description?: string;
  domainId: string;
  resistanceLevel: number;
}) {
  const session = await getSession();

  // Verify domain belongs to user
  const domain = await prisma.domain.findFirst({
    where: { id: data.domainId, userId: session.user.id },
  });
  if (!domain) throw new Error("Domain not found");

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim(),
      resistanceLevel: data.resistanceLevel,
      domainId: data.domainId,
      userId: session.user.id,
    },
  });

  revalidatePath("/mission");
  return task;
}

// ─── Timer: start ─────────────────────────────────────────────────────────────
export async function startTaskTimer(taskId: string) {
  const session = await getSession();

  await prisma.task.updateMany({
    where: { id: taskId, userId: session.user.id },
    data: { startedAt: new Date() },
  });

  revalidatePath("/mission");
}

// ─── Timer: get elapsed seconds ──────────────────────────────────────────────
export async function getElapsedSeconds(taskId: string): Promise<number> {
  const session = await getSession();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: session.user.id },
    select: { startedAt: true },
  });

  if (!task?.startedAt) return 0;
  return Math.floor((Date.now() - task.startedAt.getTime()) / 1000);
}

// ─── Resistance multiplier ───────────────────────────────────────────────────
function resistanceMultiplier(level: number): number {
  if (level >= 7) return 4;
  if (level >= 4) return 2;
  return 1;
}

// ─── Recall evaluation ───────────────────────────────────────────────────────
const REFLECTION_DOMAINS = ["Physical", "Vocational"];

const DOMAIN_AI_PROMPTS: Record<string, string> = {
  Mental:     "Did the user demonstrate understanding of what they studied or learned? Be strict — surface-level answers should score low.",
  Spiritual:  "Did the user reflect meaningfully on their inner experience, practice, or insight?",
  Physical:   "Did the user account for their physical effort, how their body felt, and what they pushed through?",
  Emotional:  "Did the user show genuine self-awareness about what they felt and why it mattered?",
  Social:     "Did the user articulate what happened in the interaction and what they took from it?",
  Financial:  "Did the user clearly explain the decision, action, or financial insight?",
  Vocational: "Did the user describe what they built, shipped, or meaningfully progressed on?",
};

function evaluateHeuristic(input: string, taskTitle: string): number {
  const words = input.trim().split(/\s+/).filter(Boolean).length;
  const taskKeywords = taskTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const inputLower = input.toLowerCase();
  const hasOverlap = taskKeywords.some((w) => inputLower.includes(w));
  const isSubstantial = words >= 20;
  const isThorough = words >= 50;

  if (isThorough && hasOverlap) return 1.0;
  if (isSubstantial && hasOverlap) return 1.0;
  if (isSubstantial || hasOverlap) return 0.75;
  return 0.5;
}

export async function evaluateRecall(data: {
  taskId: string;
  taskTitle: string;
  domainName: string;
  recallText: string;
  useAI: boolean;
}): Promise<{ multiplier: number; feedback: string }> {
  const isReflectionDomain = REFLECTION_DOMAINS.includes(data.domainName);
  const promptType = isReflectionDomain ? "reflection" : "recall";

  // Try AI evaluation if requested
  if (data.useAI) {
    try {
      const domainPrompt =
        DOMAIN_AI_PROMPTS[data.domainName] ??
        "Did the user provide a meaningful account of what they did and what they gained from it?";

      const systemPrompt = `You are evaluating a user's ${promptType} response for a life-tracking app that uses the Feynman technique.
Task: "${data.taskTitle}"
Domain: ${data.domainName}
Evaluation criteria: ${domainPrompt}

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"multiplier": 1.0, "feedback": "Short encouraging feedback under 15 words"}
or
{"multiplier": 0.5, "feedback": "Short constructive feedback under 15 words"}

Be fair but honest. A genuine, specific response scores 1.0. Vague or minimal responses score 0.5.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": `${process.env.ANTHROPIC_API_KEY}`,
    "anthropic-version": "2023-06-01",},
        body: JSON.stringify({
          model: "Claude Haiku 4.5",
          max_tokens: 100,
          system: systemPrompt,
          messages: [{ role: "user", content: data.recallText }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.content?.[0]?.text ?? "";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        return {
          multiplier: parsed.multiplier ?? 0.5,
          feedback: parsed.feedback ?? "Evaluation complete.",
        };
      }
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic fallback
  const multiplier = evaluateHeuristic(data.recallText, data.taskTitle);
  const feedback =
    multiplier === 1.0
      ? "Solid recall. Full points awarded."
      : multiplier === 0.75
      ? "Decent response. Minor deduction applied."
      : "Too brief. Half points awarded.";

  return { multiplier, feedback };
}

// ─── Complete task (WU calculation happens here) ──────────────────────────────
export async function completeTask(data: {
  taskId: string;
  recallMultiplier: number;
}) {
  const session = await getSession();

  const task = await prisma.task.findFirst({
    where: { id: data.taskId, userId: session.user.id },
    select: { startedAt: true, resistanceLevel: true },
  });

  if (!task) throw new Error("Task not found");

  // Calculate duration
  const durationMinutes = task.startedAt
    ? Math.max(1, Math.floor((Date.now() - task.startedAt.getTime()) / 60000))
    : 1;

  const rMult = resistanceMultiplier(task.resistanceLevel);
  const calculatedWU = parseFloat(
    (durationMinutes * rMult * data.recallMultiplier).toFixed(2)
  );

  await prisma.task.updateMany({
    where: { id: data.taskId, userId: session.user.id },
    data: {
      status: "Completed",
      durationMinutes,
      calculatedWU,
    },
  });

  revalidatePath("/mission");
  return { durationMinutes, calculatedWU };
}

// ─── Fail task ────────────────────────────────────────────────────────────────
export async function failTask(taskId: string) {
  const session = await getSession();

  await prisma.task.updateMany({
    where: { id: taskId, userId: session.user.id },
    data: { status: "Failed" },
  });

  revalidatePath("/mission");
}

// ─── Update task ──────────────────────────────────────────────────────────────
export async function updateTask(
  taskId: string,
  data: { title?: string; description?: string; resistanceLevel?: number }
) {
  const session = await getSession();

  await prisma.task.updateMany({
    where: { id: taskId, userId: session.user.id },
    data: {
      ...(data.title && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.resistanceLevel !== undefined && { resistanceLevel: data.resistanceLevel }),
    },
  });

  revalidatePath("/mission");
}

// ─── Delete task ──────────────────────────────────────────────────────────────
export async function deleteTask(taskId: string) {
  const session = await getSession();

  await prisma.task.deleteMany({
    where: { id: taskId, userId: session.user.id },
  });

  revalidatePath("/mission");
}