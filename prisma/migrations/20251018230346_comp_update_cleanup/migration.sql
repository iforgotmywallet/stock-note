/*
  Warnings:

  - Made the column `created_at` on table `agent_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `agent_reports` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "agent_reports" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "idx_agent_reports_published" ON "agent_reports"("published");

-- CreateIndex
CREATE INDEX "idx_agent_reports_status" ON "agent_reports"("status");
