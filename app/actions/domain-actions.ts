"use server";

import  {prisma} from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// seed create manage domains..
const CORE_DOMAINS = [
  { name: "Physical",    icon: "◈" },
  { name: "Mental",      icon: "◇" },
  { name: "Emotional",   icon: "◉" },
  { name: "Spiritual",   icon: "△" },
  { name: "Social",      icon: "◎" },
  { name: "Financial",   icon: "◆" },
  { name: "Vocational",  icon: "▣" },
];

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  // if user isn't authenticated return the session and send the error..
  if (!session?.user) throw new Error("Unauthorized");
  // makes sense how returning session is needed and not returning error object.. 
  // and why instant stop to an unauthorized session is neccessary.
  return session;
}

// Called on first load — seeds 7 domains if user has none
export async function seedDomainsIfNew(): Promise<void> {

  const session = await getSession();
  const userId = session.user.id;

  const existing = await prisma.domain.count({ where: { userId } });
  if (existing > 0) return;
  // yeah if it exist even more than 0 make now change and return and if not.. 
  // create via ts const u declared earlier.
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
  // referesh on certain same path, to incorporate changes ....
  revalidatePath("/domain");
}

// Delete a domain (cascades tasks via schema)
export async function deleteDomain(id: string) {
  const session = await getSession();
  // using prisma to implement directly fn like nosql.
  await prisma.domain.deleteMany({
    where: { id, userId: session.user.id },
  });
  revalidatePath("/domain");
}

// Add a custom domain
export async function addCustomDomain(name: string) {
  const session = await getSession();
  const icons = ["◌","▣","◆"];
  const domain = await prisma.domain.create({
    
    data: {
      name: name.trim(),
      icon:  icons[Math.floor(Math.random()*icons.length)],// custom domain gets open circle icon
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
  // if firstobj exist return its id if its undefined return the fallback that's null.
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