-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('Pending', 'Active', 'Completed', 'Declined');

-- CreateTable
CREATE TABLE "network" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duel" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "initiatorBet" DOUBLE PRECISION NOT NULL,
    "challengerBet" DOUBLE PRECISION NOT NULL,
    "initiatorWU" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "challengerWU" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DuelStatus" NOT NULL DEFAULT 'Pending',
    "winnerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "network_inviteCode_key" ON "network"("inviteCode");

-- CreateIndex
CREATE INDEX "network_createdById_idx" ON "network"("createdById");

-- CreateIndex
CREATE INDEX "network_inviteCode_idx" ON "network"("inviteCode");

-- CreateIndex
CREATE INDEX "network_member_networkId_idx" ON "network_member"("networkId");

-- CreateIndex
CREATE INDEX "network_member_userId_idx" ON "network_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "network_member_userId_networkId_key" ON "network_member"("userId", "networkId");

-- CreateIndex
CREATE INDEX "duel_networkId_idx" ON "duel"("networkId");

-- CreateIndex
CREATE INDEX "duel_initiatorId_idx" ON "duel"("initiatorId");

-- CreateIndex
CREATE INDEX "duel_challengerId_idx" ON "duel"("challengerId");

-- AddForeignKey
ALTER TABLE "network" ADD CONSTRAINT "network_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_member" ADD CONSTRAINT "network_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_member" ADD CONSTRAINT "network_member_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel" ADD CONSTRAINT "duel_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel" ADD CONSTRAINT "duel_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel" ADD CONSTRAINT "duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
