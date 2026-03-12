-- CreateTable
CREATE TABLE "shadow_threshold" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shadow_threshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shadow_threshold_domainId_key" ON "shadow_threshold"("domainId");

-- CreateIndex
CREATE INDEX "shadow_threshold_userId_idx" ON "shadow_threshold"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shadow_threshold_userId_domainId_key" ON "shadow_threshold"("userId", "domainId");

-- AddForeignKey
ALTER TABLE "shadow_threshold" ADD CONSTRAINT "shadow_threshold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shadow_threshold" ADD CONSTRAINT "shadow_threshold_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
