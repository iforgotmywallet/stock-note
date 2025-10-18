-- CreateTable
CREATE TABLE "saved_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "sessionId" VARCHAR(255) NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_saved_list_user_id" ON "saved_list"("userId");

-- CreateIndex
CREATE INDEX "idx_saved_list_session_id" ON "saved_list"("sessionId");

-- CreateIndex
CREATE INDEX "idx_saved_list_saved_at" ON "saved_list"("savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_list_userId_sessionId_key" ON "saved_list"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "saved_list" ADD CONSTRAINT "saved_list_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_reports"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_list" ADD CONSTRAINT "saved_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
