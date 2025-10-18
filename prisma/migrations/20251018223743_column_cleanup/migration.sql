/*
  Warnings:

  - You are about to drop the column `addedAt` on the `watchlist` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `recent_list` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `saved_list` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `watchlist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "agent_reports" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "recent_list" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "saved_list" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "watchlist" DROP COLUMN "addedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "idx_recent_list_created_at" ON "recent_list"("createdAt");

-- CreateIndex
CREATE INDEX "idx_saved_list_created_at" ON "saved_list"("createdAt");

-- CreateIndex
CREATE INDEX "idx_watchlist_created_at" ON "watchlist"("createdAt");
