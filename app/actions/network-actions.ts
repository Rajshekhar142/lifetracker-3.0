"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type NetworkWithMeta = {
  id: string;
  name: string;
  domain: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  createdAt: Date;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  domainWU: number;          // WU in network domain rolling 7 days
  masteryTier: string | null; // highest tier in that domain
  isYou: boolean;
};

export type DuelWithMeta = {
  id: string;
  domain: string;
  networkName: string;
  initiatorName: string;
  challengerName: string;
  initiatorBet: number;
  challengerBet: number;
  initiatorWU: number;
  challengerWU: number;
  status: string;
  isInitiator: boolean;
  endsAt: Date | null;
  winnerId: string | null;
};

// ─── Create network ───────────────────────────────────────────────────────────
export async function createNetwork(
  name: string,
  domain: string
): Promise<{ id: string; inviteCode: string }> {
  const session = await getSession();
  const userId = session.user.id;

  // Validate domain belongs to user
  const userDomain = await prisma.domain.findFirst({
    where: { userId, name: domain },
  });
  if (!userDomain) throw new Error("Domain not found");

  // Max 5 networks per user
  const existing = await prisma.network.count({
    where: { createdById: userId },
  });
  if (existing >= 5) throw new Error("Max 5 networks per user");

  const network = await prisma.network.create({
    data: {
      name: name.trim(),
      domain,
      createdById: userId,
      members: {
        create: { userId }, // creator auto-joins
      },
    },
    select: { id: true, inviteCode: true },
  });

  revalidatePath("/network");
  return network;
}

// ─── Get invite link info (public — no auth required) ────────────────────────
export async function getNetworkByInviteCode(inviteCode: string) {
  const network = await prisma.network.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      name: true,
      domain: true,
      inviteCode: true,
      createdBy: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  if (!network) throw new Error("Network not found");
  return network;
}

// ─── Join network via invite code ─────────────────────────────────────────────
export async function joinNetwork(inviteCode: string): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const network = await prisma.network.findUnique({
    where: { inviteCode },
    include: { _count: { select: { members: true } } },
  });

  if (!network) throw new Error("Network not found");
  if (network._count.members >= 20) throw new Error("Network is full");

  // Already a member?
  const already = await prisma.networkMember.findUnique({
    where: { userId_networkId: { userId, networkId: network.id } },
  });
  if (already) throw new Error("Already a member");

  await prisma.networkMember.create({
    data: { userId, networkId: network.id },
  });

  revalidatePath("/network");
}

// ─── Get user's networks ──────────────────────────────────────────────────────
export async function getUserNetworks(): Promise<NetworkWithMeta[]> {
  const session = await getSession();
  const userId = session.user.id;

  const memberships = await prisma.networkMember.findMany({
    where: { userId },
    include: {
      network: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.network.id,
    name: m.network.name,
    domain: m.network.domain,
    inviteCode: m.network.inviteCode,
    memberCount: m.network._count.members,
    isOwner: m.network.createdById === userId,
    createdAt: m.network.createdAt,
  }));
}

// ─── Get network leaderboard ─────────────────────────────────────────────────
export async function getNetworkLeaderboard(
  networkId: string
): Promise<LeaderboardEntry[]> {
  const session = await getSession();
  const userId = session.user.id;

  // Verify membership
  const membership = await prisma.networkMember.findUnique({
    where: { userId_networkId: { userId, networkId } },
  });
  if (!membership) throw new Error("Not a member of this network");

  const network = await prisma.network.findUnique({
    where: { id: networkId },
    select: { domain: true },
  });
  if (!network) throw new Error("Network not found");

  // Get all members
  const members = await prisma.networkMember.findMany({
    where: { networkId },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Compute WU per member in the network domain
  const entries = await Promise.all(
    members.map(async (m) => {
      // Get their domain ID for this network's domain
      const domain = await prisma.domain.findFirst({
        where: { userId: m.userId, name: network.domain },
        select: { id: true },
      });

      let domainWU = 0;
      if (domain) {
        const result = await prisma.task.aggregate({
          where: {
            userId: m.userId,
            domainId: domain.id,
            status: "Completed",
            createdAt: { gte: sevenDaysAgo },
          },
          _sum: { calculatedWU: true },
        });
        domainWU = result._sum.calculatedWU ?? 0;
      }

      // Get mastery tier for this domain
      const achievement = await prisma.achievement.findFirst({
        where: {
          userId: m.userId,
          key: { in: [
            `${network.domain.toLowerCase()}_elite`,
            `${network.domain.toLowerCase()}_operator`,
            `${network.domain.toLowerCase()}_apprentice`,
            `${network.domain.toLowerCase()}_novice`,
          ]},
        },
        orderBy: { unlockedAt: "desc" },
      });

      const tierMap: Record<string, string> = {
        elite: "ELITE",
        operator: "OPERATOR",
        apprentice: "APPRENTICE",
        novice: "NOVICE",
      };

      const tier = achievement
        ? tierMap[achievement.key.split("_").pop() ?? ""] ?? null
        : null;

      return {
        userId: m.userId,
        userName: m.user.name ?? "Anonymous",
        domainWU: parseFloat(domainWU.toFixed(1)),
        masteryTier: tier,
        isYou: m.userId === userId,
      };
    })
  );

  // Sort by WU descending and assign ranks
  return entries
    .sort((a, b) => b.domainWU - a.domainWU)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// ─── Initiate duel ────────────────────────────────────────────────────────────
export async function initiateDuel(
  networkId: string,
  challengerId: string,
  domain: string,
  betAmount: number
): Promise<{ id: string }> {
  const session = await getSession();
  const initiatorId = session.user.id;

  if (initiatorId === challengerId) throw new Error("Cannot duel yourself");
  if (betAmount <= 0) throw new Error("Bet must be greater than 0");

  // Both must be network members
  const [initiatorMember, challengerMember] = await Promise.all([
    prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: initiatorId, networkId } },
    }),
    prisma.networkMember.findUnique({
      where: { userId_networkId: { userId: challengerId, networkId } },
    }),
  ]);

  if (!initiatorMember) throw new Error("You are not a member of this network");
  if (!challengerMember) throw new Error("Challenger is not a member of this network");

  // Check initiator has enough WU to bet
  const initiatorWUTotal = await prisma.task.aggregate({
    where: { userId: initiatorId, status: "Completed" },
    _sum: { calculatedWU: true },
  });
  const totalWU = initiatorWUTotal._sum.calculatedWU ?? 0;
  if (totalWU < betAmount) throw new Error("Insufficient WU to place this bet");

  // No active duel between same two users
  const existingDuel = await prisma.duel.findFirst({
    where: {
      networkId,
      status: { in: ["Pending", "Active"] },
      OR: [
        { initiatorId, challengerId },
        { initiatorId: challengerId, challengerId: initiatorId },
      ],
    },
  });
  if (existingDuel) throw new Error("Active duel already exists between these members");

  const duel = await prisma.duel.create({
    data: {
      networkId,
      initiatorId,
      challengerId,
      domain,
      initiatorBet: betAmount,
      challengerBet: 0, // challenger sets their own bet on acceptance
      status: "Pending",
    },
    select: { id: true },
  });

  revalidatePath(`/network/${networkId}`);
  return duel;
}

// ─── Accept duel ──────────────────────────────────────────────────────────────
export async function acceptDuel(
  duelId: string,
  betAmount: number
): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) throw new Error("Duel not found");
  if (duel.challengerId !== userId) throw new Error("Not your duel to accept");
  if (duel.status !== "Pending") throw new Error("Duel is no longer pending");
  if (betAmount <= 0) throw new Error("Bet must be greater than 0");

  // Check challenger has enough WU
  const challengerWU = await prisma.task.aggregate({
    where: { userId, status: "Completed" },
    _sum: { calculatedWU: true },
  });
  const totalWU = challengerWU._sum.calculatedWU ?? 0;
  if (totalWU < betAmount) throw new Error("Insufficient WU to place this bet");

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 7);

  await prisma.duel.update({
    where: { id: duelId },
    data: {
      challengerBet: betAmount,
      status: "Active",
      startedAt: now,
      endsAt,
    },
  });

  revalidatePath(`/network/${duel.networkId}`);
}

// ─── Decline duel ─────────────────────────────────────────────────────────────
export async function declineDuel(duelId: string): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) throw new Error("Duel not found");
  if (duel.challengerId !== userId) throw new Error("Not your duel to decline");
  if (duel.status !== "Pending") throw new Error("Duel is no longer pending");

  await prisma.duel.update({
    where: { id: duelId },
    data: { status: "Declined" },
  });

  revalidatePath(`/network/${duel.networkId}`);
}

// ─── Resolve expired duels (call from cron or on page load) ──────────────────
export async function resolveExpiredDuels(networkId: string): Promise<void> {
  const now = new Date();

  const expiredDuels = await prisma.duel.findMany({
    where: {
      networkId,
      status: "Active",
      endsAt: { lte: now },
    },
  });

  for (const duel of expiredDuels) {
    // Tally WU earned in chosen domain during duel window
    const [initiatorDomain, challengerDomain] = await Promise.all([
      prisma.domain.findFirst({
        where: { userId: duel.initiatorId, name: duel.domain },
        select: { id: true },
      }),
      prisma.domain.findFirst({
        where: { userId: duel.challengerId, name: duel.domain },
        select: { id: true },
      }),
    ]);

    const [initiatorResult, challengerResult] = await Promise.all([
      initiatorDomain
        ? prisma.task.aggregate({
            where: {
              userId: duel.initiatorId,
              domainId: initiatorDomain.id,
              status: "Completed",
              createdAt: { gte: duel.startedAt!, lte: duel.endsAt! },
            },
            _sum: { calculatedWU: true },
          })
        : Promise.resolve({ _sum: { calculatedWU: 0 } }),

      challengerDomain
        ? prisma.task.aggregate({
            where: {
              userId: duel.challengerId,
              domainId: challengerDomain.id,
              status: "Completed",
              createdAt: { gte: duel.startedAt!, lte: duel.endsAt! },
            },
            _sum: { calculatedWU: true },
          })
        : Promise.resolve({ _sum: { calculatedWU: 0 } }),
    ]);

    const initiatorWU = initiatorResult._sum.calculatedWU ?? 0;
    const challengerWU = challengerResult._sum.calculatedWU ?? 0;

    // Determine winner — higher WU wins
    // Tie = initiator wins (they initiated the challenge)
    const winnerId =
      initiatorWU >= challengerWU ? duel.initiatorId : duel.challengerId;
    const loserId =
      winnerId === duel.initiatorId ? duel.challengerId : duel.initiatorId;

    const winnerGets =
      winnerId === duel.initiatorId
        ? duel.challengerBet   // initiator wins challenger's bet
        : duel.initiatorBet;   // challenger wins initiator's bet

    const loserLoses =
      loserId === duel.initiatorId ? duel.initiatorBet : duel.challengerBet;

    // Apply WU transfer — create synthetic adjustment tasks
    // Winner gets a bonus completed task with the won WU
    const winnerDomain = await prisma.domain.findFirst({
      where: { userId: winnerId, name: duel.domain },
      select: { id: true },
    });

    if (winnerDomain) {
      await prisma.task.create({
        data: {
          title: `Duel Victory — ${duel.domain}`,
          description: `Won duel. +${winnerGets} WU transferred.`,
          resistanceLevel: 1,
          status: "Completed",
          userId: winnerId,
          domainId: winnerDomain.id,
          calculatedWU: winnerGets,
          durationMinutes: 0,
        },
      });
    }

    // Loser gets a negative adjustment task
    const loserDomain = await prisma.domain.findFirst({
      where: { userId: loserId, name: duel.domain },
      select: { id: true },
    });

    if (loserDomain) {
      await prisma.task.create({
        data: {
          title: `Duel Defeat — ${duel.domain}`,
          description: `Lost duel. -${loserLoses} WU deducted.`,
          resistanceLevel: 1,
          status: "Completed",
          userId: loserId,
          domainId: loserDomain.id,
          calculatedWU: -loserLoses, // negative WU
          durationMinutes: 0,
        },
      });
    }

    // Mark duel completed
    await prisma.duel.update({
      where: { id: duel.id },
      data: {
        status: "Completed",
        winnerId,
        initiatorWU,
        challengerWU,
        resolvedAt: now,
      },
    });
  }

  revalidatePath(`/network/${networkId}`);
}

// ─── Get duels for a network ──────────────────────────────────────────────────
export async function getNetworkDuels(
  networkId: string
): Promise<DuelWithMeta[]> {
  const session = await getSession();
  const userId = session.user.id;

  const duels = await prisma.duel.findMany({
    where: {
      networkId,
      OR: [{ initiatorId: userId }, { challengerId: userId }],
    },
    include: {
      initiator: { select: { name: true } },
      challenger: { select: { name: true } },
      network: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return duels.map((d) => ({
    id: d.id,
    domain: d.domain,
    networkName: d.network.name,
    initiatorName: d.initiator.name ?? "Unknown",
    challengerName: d.challenger.name ?? "Unknown",
    initiatorBet: d.initiatorBet,
    challengerBet: d.challengerBet,
    initiatorWU: d.initiatorWU,
    challengerWU: d.challengerWU,
    status: d.status,
    isInitiator: d.initiatorId === userId,
    endsAt: d.endsAt,
    winnerId: d.winnerId,
  }));
}

// ─── Leave network ────────────────────────────────────────────────────────────
export async function leaveNetwork(networkId: string): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  // Owner cannot leave — must delete
  const network = await prisma.network.findUnique({
    where: { id: networkId },
    select: { createdById: true },
  });
  if (!network) throw new Error("Network not found");
  if (network.createdById === userId)
    throw new Error("Owner cannot leave — delete the network instead");

  // Cannot leave with active duel
  const activeDuel = await prisma.duel.findFirst({
    where: {
      networkId,
      status: { in: ["Pending", "Active"] },
      OR: [{ initiatorId: userId }, { challengerId: userId }],
    },
  });
  if (activeDuel) throw new Error("Resolve active duel before leaving");

  await prisma.networkMember.delete({
    where: { userId_networkId: { userId, networkId } },
  });

  revalidatePath("/network");
}

// ─── Delete network (owner only) ──────────────────────────────────────────────
export async function deleteNetwork(networkId: string): Promise<void> {
  const session = await getSession();
  const userId = session.user.id;

  const network = await prisma.network.findUnique({
    where: { id: networkId },
    select: { createdById: true },
  });
  if (!network) throw new Error("Network not found");
  if (network.createdById !== userId) throw new Error("Only the owner can delete this network");

  await prisma.network.delete({ where: { id: networkId } });
  revalidatePath("/network");
}