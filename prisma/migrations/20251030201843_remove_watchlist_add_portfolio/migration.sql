/*
  Warnings:

  - You are about to drop the `watchlist` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."watchlist" DROP CONSTRAINT "watchlist_stockId_fkey";

-- DropForeignKey
ALTER TABLE "public"."watchlist" DROP CONSTRAINT "watchlist_userId_fkey";

-- DropTable
DROP TABLE "public"."watchlist";

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days_of_week" TEXT[],
    "allocation_per_ticker" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTicker" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,

    CONSTRAINT "PortfolioTicker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAction" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "action_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "price_at_action" DOUBLE PRECISION NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPosition" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debt_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_price" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioDailyValue" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cash_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "long_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "short_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_return_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioDailyValue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTicker" ADD CONSTRAINT "PortfolioTicker_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAction" ADD CONSTRAINT "PortfolioAction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAction" ADD CONSTRAINT "PortfolioAction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "agent_reports"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPosition" ADD CONSTRAINT "PortfolioPosition_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioDailyValue" ADD CONSTRAINT "PortfolioDailyValue_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
