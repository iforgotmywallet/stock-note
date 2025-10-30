-- AlterTable
ALTER TABLE "agent_reports" ADD COLUMN     "price" TEXT;

-- CreateIndex
CREATE INDEX "idx_agent_reports_price" ON "agent_reports"("price");
