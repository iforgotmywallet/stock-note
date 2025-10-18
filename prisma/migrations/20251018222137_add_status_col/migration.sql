-- AlterTable
ALTER TABLE "agent_reports" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;
