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
    onFailure: async ({ event, error }) => {
      const ticker = event?.data?.event?.data?.ticker;
      const userId = event?.data?.event?.data?.userId;
      const sessionId = event?.data?.event?.data?.sessionId;

      console.error("Analysis function failed:", {
        error: error?.message,
        sessionId,
        ticker,
        userId,
      });

      if (sessionId) {
        try {
          // Update existing entry in agent_reports table with status "failed"
          await db.agent_reports.update({
            where: {
              session_id: sessionId,
            },
            data: {
              status: "failed",
              updated_at: new Date(),
            },
          });
          console.log(
            `Updated report status to failed for session: ${sessionId}`,
          );
        } catch (updateError) {
          console.error(
            "Failed to update report status on failure:",
            updateError,
          );
        }
      } else {
        console.error("No session ID available to update report status");
      }
    },
  },
  { event: "generate-analysis-event" },
  async ({ event, step }) => {
    const { ticker, date, analysts, userId, published, sessionId } =
      event.data as {
        ticker: string;
        date: string;
        analysts: string[];
        userId: string;
        published: boolean;
        sessionId: string;
      };

    console.log(
      `[CONCURRENCY DEBUG] Starting analysis for userId: ${userId}, ticker: ${ticker}`,
    );

    // Step 1: Check credits
    const creditCheck = await step.run("check-credits", async () => {
      try {
        if (!userId || typeof userId !== "string") {
          throw new Error("Invalid user ID provided");
        }

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
      } catch (error) {
        console.error("Credit check failed:", error);

        // Update report status to failed if credit check fails
        if (sessionId) {
          try {
            await db.agent_reports.update({
              where: { session_id: sessionId },
              data: { status: "failed", updated_at: new Date() },
            });
          } catch (updateError) {
            console.error(
              "Failed to update report status after credit check failure:",
              updateError,
            );
          }
        }

        throw error;
      }
    });

    // Step 2: Check and update report status from queued to processing
    const statusUpdate = await step.run(
      "update-status-to-processing",
      async () => {
        try {
          if (!sessionId || typeof sessionId !== "string") {
            throw new Error("Invalid session ID provided");
          }

          // First, check the current status of the report
          const currentReport = await db.agent_reports.findUnique({
            where: { session_id: sessionId },
            select: { status: true, id: true },
          });

          if (!currentReport) {
            // Can't update status to failed if report doesn't exist, just throw error
            throw new Error(`Report with session ID ${sessionId} not found`);
          }

          // Verify the status is "queued" before proceeding
          if (currentReport.status !== "queued") {
            // Update status to failed since we can't proceed
            try {
              await db.agent_reports.update({
                where: { session_id: sessionId },
                data: { status: "failed", updated_at: new Date() },
              });
            } catch (updateError) {
              console.error(
                "Failed to update report status to failed after status validation failure:",
                updateError,
              );
            }

            throw new Error(
              `Report status is "${currentReport.status}" but expected "queued". Cannot proceed with analysis.`,
            );
          }

          // Update status from "queued" to "processing"
          const updatedReport = await db.agent_reports.update({
            where: { session_id: sessionId },
            data: {
              status: "processing",
              updated_at: new Date(),
            },
            select: { id: true, status: true },
          });

          return {
            success: true,
            message: "Report status updated from queued to processing",
            sessionId,
            reportId: updatedReport.id,
            previousStatus: "queued",
            newStatus: updatedReport.status,
          };
        } catch (error) {
          console.error("Status update failed:", error);

          // If status update fails, mark the report as failed
          if (sessionId) {
            try {
              await db.agent_reports.update({
                where: { session_id: sessionId },
                data: { status: "failed", updated_at: new Date() },
              });
            } catch (updateError) {
              console.error(
                "Failed to update report status to failed after status check failure:",
                updateError,
              );
            }
          }

          throw error;
        }
      },
    );

    // Step 3: Send POST request to analysis service
    const response = await step.fetch(env.STOCK_ANALYZE_URL, {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        ticker,
        date,
        userId,
        published,
        analysts,
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
      console.error("Analysis service request failed:", {
        status: response.status,
        statusText: response.statusText,
        sessionId,
        ticker,
      });

      // Update existing entry in agent_reports table with status "failed"
      try {
        await db.agent_reports.update({
          where: {
            session_id: sessionId,
          },
          data: {
            status: "failed",
            updated_at: new Date(),
          },
        });
      } catch (updateError) {
        console.error(
          "Failed to update report status after API failure:",
          updateError,
        );
      }

      // Provide more specific error messages
      let errorMessage = `Analysis request failed: ${response.statusText}`;
      if (response.status === 401 || response.status === 403) {
        errorMessage = "Authentication failed with analysis service";
      } else if (response.status === 429) {
        errorMessage = "Analysis service rate limit exceeded";
      } else if (response.status >= 500) {
        errorMessage = "Analysis service is temporarily unavailable";
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    const analysisResult = {
      success: true,
      message: "Analysis request completed successfully",
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      sessionId: sessionId, // Use session_id from event data
      ticker,
      date,
      analysts,
      analysisData: result,
    };

    // Step 4: Update analyst report status and add to recent list
    const updateResult = await step.run(
      "update-report-and-recent-list",
      async () => {
        try {
          // Check if sessionId exists
          if (!sessionId) {
            throw new Error("Session ID is missing from event data");
          }

          if (!userId) {
            throw new Error("User ID is missing from event data");
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
        } catch (error) {
          console.error(
            "Failed to update report status or recent list:",
            error,
          );

          // If we can't update to "done", at least try to mark as failed
          if (sessionId) {
            try {
              await db.agent_reports.update({
                where: { session_id: sessionId },
                data: { status: "failed", updated_at: new Date() },
              });
            } catch (fallbackError) {
              console.error(
                "Failed to update report status to failed:",
                fallbackError,
              );
            }
          }

          throw error;
        }
      },
    );

    // Step 5: Deduct credit from user
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
        statusUpdate,
        analysisResult,
        updateResult,
        creditDeduction,
      },
      finalResult: analysisResult.analysisData,
    };
  },
);
