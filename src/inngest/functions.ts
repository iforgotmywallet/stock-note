import { db } from "~/server/db";
import { inngest } from "./client";
import { env } from "~/env";

export const generateAnalysis = inngest.createFunction(
  {
    id: "generate-analysis",
    concurrency: {
      limit: 2,
      key: "event.data.userId",
      scope: "fn", // Ensure concurrency is scoped to this function
    },
    onFailure: async ({ event }) => {
      const ticker = event?.data?.event?.data?.ticker;
      const date = event?.data?.event?.data?.date;
      const userId = event?.data?.event?.data?.userId;

      if (ticker && date && userId) {
        // Create a predictable session_id for failures to enable upsert
        const failureSessionId = `failed-${userId}-${ticker}-${date}-${Date.now()}`;

        // Create or update entry in agent_reports table with status "fail"
        await db.agent_reports.upsert({
          where: {
            session_id: failureSessionId,
          },
          update: {
            status: "fail",
            updated_at: new Date(),
          },
          create: {
            session_id: failureSessionId,
            ticker,
            analysis_date: new Date(date),
            userId,
            status: "fail",
          },
        });
      }
    },
  },
  { event: "generate-analysis-event" },
  async ({ event, step }) => {
    const { ticker, date, analysts, userId, published } = event.data as {
      ticker: string;
      date: string;
      analysts: string[];
      userId: string;
      published: boolean;
    };

    console.log(
      `[CONCURRENCY DEBUG] Starting analysis for userId: ${userId}, ticker: ${ticker}`,
    );

    // Step 1: Check credits
    const creditCheck = await step.run("check-credits", async () => {
      const user = await db.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          credits: true,
        },
      });

      if (user.credits <= 0) {
        throw new Error("Insufficient credits");
      }

      return {
        success: true,
        message: "Credits check passed",
        credits: user.credits,
        userId,
      };
    });

    // Step 2: Send POST request to analysis service
    const response = await step.fetch(env.STOCK_ANALYZE_URL, {
      method: "POST",
      body: JSON.stringify({
        ticker,
        date,
        analysts,
        userId,
        published,
        config: {
          llm_provider: env.NEXT_PUBLIC_LLM_PROVIDER,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": env.MODAL_KEY,
        "Modal-Secret": env.MODAL_SECRET,
      },
    });

    if (!response.ok) {
      // Create a predictable session_id for failures to enable upsert
      const failureSessionId = `failed-${userId}-${ticker}-${date}-${Date.now()}`;

      // Create or update entry in agent_reports table with status "fail"
      await db.agent_reports.upsert({
        where: {
          session_id: failureSessionId,
        },
        update: {
          status: "fail",
          updated_at: new Date(),
        },
        create: {
          session_id: failureSessionId,
          ticker,
          analysis_date: new Date(date),
          userId,
          status: "fail",
        },
      });
      throw new Error(`Analysis request failed: ${response.statusText}`);
    }

    const result = await response.json();
    const analysisResult = {
      success: true,
      message: "Analysis request completed successfully",
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      sessionId: result.data?.session_id, // Get session_id from API response
      ticker,
      date,
      analysts,
      analysisData: result,
    };

    // Step 3: Update analyst report status and add to recent list
    const updateResult = await step.run(
      "update-report-and-recent-list",
      async () => {
        const sessionId = analysisResult.sessionId;

        // Check if sessionId exists
        if (!sessionId) {
          throw new Error("Session ID is missing from analysis result");
        }

        // Update the agent_reports table status
        const updatedReport = await db.agent_reports.update({
          where: {
            session_id: sessionId,
          },
          data: {
            status: "done",
            updated_at: new Date(),
          },
        });

        // Add to recent_list with uniqueness constraint (upsert)
        const recentListResult = await db.recentList.upsert({
          where: {
            unique_user_session: {
              userId: userId,
              sessionId: sessionId,
            },
          },
          update: {
            viewedAt: new Date(),
            updatedAt: new Date(),
          },
          create: {
            userId: userId,
            sessionId: sessionId,
            viewedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Report status updated and added to recent list",
          sessionId,
          reportUpdated: !!updatedReport,
          recentListUpdated: !!recentListResult,
          userId,
        };
      },
    );

    // Step 4: Deduct credit from user
    const creditDeduction = await step.run("deduct-credit", async () => {
      const updatedUser = await db.user.update({
        where: {
          id: userId,
        },
        data: {
          credits: {
            decrement: 1,
          },
        },
        select: {
          credits: true,
        },
      });

      return {
        success: true,
        message: "Credit deducted successfully",
        userId,
        remainingCredits: updatedUser.credits,
        deductedAmount: 1,
      };
    });

    return {
      success: true,
      message: "Analysis workflow completed successfully",
      steps: {
        creditCheck,
        analysisResult,
        updateResult,
        creditDeduction,
      },
      finalResult: analysisResult.analysisData,
    };
  },
);
