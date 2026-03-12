-- AlterTable
ALTER TABLE "task" ADD COLUMN     "isMedicTask" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "medic_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "keywords" TEXT[],
    "domainsActive" TEXT[],
    "wuBeforeMedic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wuAfterMedic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recoveredAt" TIMESTAMP(3),
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "advice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medic_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_digest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "medicSessions" INTEGER NOT NULL DEFAULT 0,
    "avgSeverity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topTriggers" TEXT[],
    "strongDomains" TEXT[],
    "recoveryAvgDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWU" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_digest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medic_log_userId_idx" ON "medic_log"("userId");

-- CreateIndex
CREATE INDEX "medic_log_userId_createdAt_idx" ON "medic_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "weekly_digest_userId_idx" ON "weekly_digest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_digest_userId_weekStart_key" ON "weekly_digest"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "medic_log" ADD CONSTRAINT "medic_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_digest" ADD CONSTRAINT "weekly_digest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
