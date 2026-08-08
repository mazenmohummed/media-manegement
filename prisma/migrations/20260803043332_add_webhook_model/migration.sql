-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_agencyId_fkey";

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
