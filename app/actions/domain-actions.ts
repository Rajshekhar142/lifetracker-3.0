"use server";

import  {prisma} from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const CORE_DOMAINS = [
  { name: "Physical",    icon: "◈" },
  { name: "Mental",      icon: "◇" },
  { name: "Emotional",   icon: "◉" },
  { name: "Spiritual",   icon: "△" },
  { name: "Social",      icon: "◎" },
  { name: "Financial",   icon: "◆" },
  { name: "Vocational",  icon: "▣" },
];

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Called on first load — seeds 7 domains if user has none
export async function seedDomainsIfNew(): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const existing = await prisma.domain.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.domain.createMany({
    data: CORE_DOMAINS.map((d) => ({ ...d, userId })),
  });
}

// Fetch all domains for current user
export async function getDomains() {
  const session = await getSession();
  return prisma.domain.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
}

// Rename a domain
export async function renameDomain(id: string, name: string) {
  const session = await getSession();
  await prisma.domain.updateMany({
    where: { id, userId: session.user.id },
    data: { name: name.trim() },
  });
  revalidatePath("/domain");
}

// Delete a domain (cascades tasks via schema)
export async function deleteDomain(id: string) {
  const session = await getSession();
  await prisma.domain.deleteMany({
    where: { id, userId: session.user.id },
  });
  revalidatePath("/domain");
}

// Add a custom domain
export async function addCustomDomain(name: string) {
  const session = await getSession();
  const domain = await prisma.domain.create({
    data: {
      name: name.trim(),
      icon: "◌", // custom domain gets open circle icon
      userId: session.user.id,
    },
  });
  revalidatePath("/domain");
  return domain;
}

// Confirm domains and proceed (marks onboarding complete via localStorage on client)
// Returns the first domain id to navigate to
export async function confirmDomains() {
  const session = await getSession();
  const first = await prisma.domain.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return first?.id ?? null;
}
// In your actions file
export async function checkUserHasDomains(): Promise<boolean> {
  const session = await getSession();
  const count = await prisma.domain.count({
    where: { userId: session.user.id }
  });
  return count > 0;
}