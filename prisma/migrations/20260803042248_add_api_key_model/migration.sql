-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_agencyId_fkey";

-- CreateIndex
CREATE INDEX "ApiKey_agencyId_idx" ON "ApiKey"("agencyId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
