import { inngest } from "../client";
import { db } from "~/server/db";
import { env } from "~/env";
import { generateSessionId } from "~/lib/utils/session-id-generator";
import { AgentReportsService } from "~/lib/database/agent-reports";

export const dailyPortfolioCron = inngest.createFunction(
  { id: "daily-portfolio-cron" },
  { cron: "30 13 * * 1-5" }, // Runs Mon–Fri at 9:30 AM EST
  async ({ step }) => {
    const today = new Date()
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();
    const todayDate = new Date().toISOString().slice(0, 10); // Format: 2025-10-29

    // Step 1: Fetch portfolios that should run today
    const portfolios = await step.run("fetch-portfolios", async () => {
      return db.portfolio.findMany({
        where: {
          enabled: true,
          days_of_week: { has: today },
        },
        include: { tickers: true },
      });
    });

    // Step 2: Gather all unique tickers and create queued reports for admin user
    const tickerSessionMap = await step.run(
      "create-queued-reports",
      async () => {
        // First, verify that the admin user exists
        const adminUser = await db.user.findUnique({
          where: { id: env.ADMIN_USER_SECRET_ID },
          select: { id: true, email: true, credits: true },
        });

        if (!adminUser) {
          throw new Error(
            `Admin user not found with ID: ${env.ADMIN_USER_SECRET_ID}. Please create this user in the database or update the ADMIN_USER_SECRET_ID environment variable.`,
          );
        }



        // Get unique tickers from all portfolios
        const uniqueTickers = new Set<string>();
        for (const portfolio of portfolios) {
          for (const { ticker } of portfolio.tickers) {
            uniqueTickers.add(ticker);
          }
        }

        // Create a map to store ticker -> sessionId mapping
        const tickerToSessionId = new Map<string, string>();

        // Create queued reports for each unique ticker using admin user ID
        for (const ticker of uniqueTickers) {
          try {
            // Generate session ID for this ticker and date
            const sessionId = generateSessionId(ticker, todayDate);

            // Create queued report for admin user
            const createdReport = await AgentReportsService.createQueuedReport({
              sessionId,
              ticker,
              analysisDate: new Date(todayDate),
              userId: env.ADMIN_USER_SECRET_ID,
              published: false,
              analystTeams: ["market", "social"],
            });

            // Store the mapping
            tickerToSessionId.set(ticker, sessionId);
          } catch (error) {
            console.error(
              `Failed to create queued report for ticker ${ticker}:`,
              error,
            );
            // Continue with other tickers even if one fails
          }
        }

        // Convert Map to plain object for return
        return Object.fromEntries(tickerToSessionId);
      },
    );

    // Step 3: Send analysis events for each ticker using the session IDs
    const eventResults = await step.run("send-analysis-events", async () => {
      const results = [];

      for (const [ticker, sessionId] of Object.entries(tickerSessionMap)) {
        try {

          await inngest.send({
            name: "generate-analysis-event",
            data: {
              sessionId,
              ticker,
              date: todayDate,
              analysts: ["market", "social"],
              userId: env.ADMIN_USER_SECRET_ID,
              published: false,
            },
          });

          results.push({ ticker, sessionId, status: "sent" });
        } catch (error) {
          console.error(
            `Failed to send analysis event for ticker ${ticker}:`,
            error,
          );
          results.push({
            ticker,
            sessionId,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return results;
    });

    return {
      portfoliosFound: portfolios.length,
      uniqueTickers: Object.keys(tickerSessionMap).length,
      tickerSessionMap,
      eventResults,
    };
  },
);
