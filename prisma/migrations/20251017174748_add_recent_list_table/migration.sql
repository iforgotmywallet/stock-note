-- CreateTable
CREATE TABLE "agent_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" VARCHAR(255) NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "analysis_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "market_analyst_report" TEXT,
    "news_analyst_report" TEXT,
    "fundamentals_analyst_report" TEXT,
    "social_analyst_report" TEXT,
    "bull_researcher_report" TEXT,
    "bear_researcher_report" TEXT,
    "research_manager_report" TEXT,
    "trader_report" TEXT,
    "risky_analyst_report" TEXT,
    "neutral_analyst_report" TEXT,
    "safe_analyst_report" TEXT,
    "portfolio_manager_report" TEXT,
    "final_analysis" TEXT,
    "recommendation" VARCHAR(15),
    "userId" TEXT,

    CONSTRAINT "agent_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR(10) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "stockId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_reports_session_id_key" ON "agent_reports"("session_id");

-- CreateIndex
CREATE INDEX "idx_agent_reports_created_at" ON "agent_reports"("created_at");

-- CreateIndex
CREATE INDEX "idx_agent_reports_date" ON "agent_reports"("analysis_date");

-- CreateIndex
CREATE INDEX "idx_agent_reports_session_id" ON "agent_reports"("session_id");

-- CreateIndex
CREATE INDEX "idx_agent_reports_ticker" ON "agent_reports"("ticker");

-- CreateIndex
CREATE INDEX "idx_agent_reports_ticker_date" ON "agent_reports"("ticker", "analysis_date");

-- CreateIndex
CREATE INDEX "idx_agent_reports_user_id" ON "agent_reports"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "stock_symbol_key" ON "stock"("symbol");

-- CreateIndex
CREATE INDEX "idx_stock_symbol" ON "stock"("symbol");

-- CreateIndex
CREATE INDEX "idx_watchlist_user_id" ON "watchlist"("userId");

-- CreateIndex
CREATE INDEX "idx_watchlist_stock_id" ON "watchlist"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_userId_stockId_key" ON "watchlist"("userId", "stockId");

-- CreateIndex
CREATE INDEX "idx_recent_list_user_id" ON "recent_list"("userId");

-- CreateIndex
CREATE INDEX "idx_recent_list_session_id" ON "recent_list"("sessionId");

-- CreateIndex
CREATE INDEX "idx_recent_list_viewed_at" ON "recent_list"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recent_list_userId_sessionId_key" ON "recent_list"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_list" ADD CONSTRAINT "recent_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_list" ADD CONSTRAINT "recent_list_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
