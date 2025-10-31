/*
  Warnings:

  - A unique constraint covering the columns `[portfolioId,ticker]` on the table `PortfolioPosition` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "leverage" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "PortfolioAction" ADD COLUMN     "note" TEXT,
ADD COLUMN     "trade_type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPosition_portfolioId_ticker_key" ON "PortfolioPosition"("portfolioId", "ticker");
