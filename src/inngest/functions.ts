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

        // Calculate total cost: base cost (2) + analysts count (1 each)
        const baseCost = 2;
        const analystCost = Array.isArray(analysts) ? analysts.length : 4;
        const totalCost = baseCost + analystCost;

        console.log(
          `Credit calculation: Base cost: ${baseCost}, Analysts: ${analystCost}, Total cost: ${totalCost}`,
        );

        const user = await db.user.findUniqueOrThrow({
          where: {
            id: userId,
          },
          select: {
            credits: true,
          },
        });

        if (user.credits < totalCost) {
          console.error(
            `Insufficient credits: User has ${user.credits}, needs ${totalCost}`,
          );

          // Update report status to NEC (Not Enough Credits) if credit check fails
          if (sessionId) {
            try {
              await db.agent_reports.update({
                where: { session_id: sessionId },
                data: { status: "NEC", updated_at: new Date() },
              });
              console.log(
                `Updated report status to NEC for session: ${sessionId}`,
              );
            } catch (updateError) {
              console.error(
                "Failed to update report status after credit check failure:",
                updateError,
              );
            }
          }

          throw new Error(
            `Insufficient credits. Required: ${totalCost}, Available: ${user.credits}`,
          );
        }

        return {
          success: true,
          message: "Credits check passed",
          credits: user.credits,
          totalCost,
          baseCost,
          analystCost,
          userId,
        };
      } catch (error) {
        console.error("Credit check failed:", error);

        // Update report status to NEC if credit check fails
        if (sessionId) {
          try {
            await db.agent_reports.update({
              where: { session_id: sessionId },
              data: { status: "NEC", updated_at: new Date() },
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

    // Step 3: Fetch current stock price from Finnhub API and update database
    const priceUpdateResult = await step.fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const priceExtractionResult = await step.run("update-price", async () => {
      try {
        console.log(`Fetching current price for ${ticker} (${sessionId})`);

        // Validate Finnhub API response status first
        if (!priceUpdateResult.ok) {
          console.error("Finnhub API request failed:", {
            status: priceUpdateResult.status,
            statusText: priceUpdateResult.statusText,
            sessionId,
            ticker,
          });

          let errorMessage = `Finnhub API request failed: ${priceUpdateResult.statusText}`;
          if (
            priceUpdateResult.status === 401 ||
            priceUpdateResult.status === 403
          ) {
            errorMessage =
              "Finnhub API authentication failed - invalid API key";
          } else if (priceUpdateResult.status === 429) {
            errorMessage = "Finnhub API rate limit exceeded";
          } else if (priceUpdateResult.status >= 500) {
            errorMessage = "Finnhub API service temporarily unavailable";
          }

          throw new Error(errorMessage);
        }

        // Parse the Finnhub API response
        const priceData = await priceUpdateResult.json();
        console.log(
          "Finnhub API response:",
          JSON.stringify(priceData, null, 2),
        );

        // Extract current price from Finnhub response
        // Finnhub response format: { "c": 261.74, "h": 263.31, "l": 260.68, "o": 261.07, "pc": 259.45, "t": 1582641000 }
        // "c" is the current price
        const currentPrice = priceData?.c;

        if (
          currentPrice === undefined ||
          currentPrice === null ||
          typeof currentPrice !== "number"
        ) {
          console.error("Invalid price data in Finnhub response:", {
            priceData,
            currentPrice,
            sessionId,
            ticker,
          });
          throw new Error(
            "Current price not available or invalid in Finnhub API response",
          );
        }

        // Validate price is a reasonable number (not NaN, not negative, not zero)
        if (isNaN(currentPrice) || currentPrice <= 0) {
          console.error("Invalid price value from Finnhub:", {
            currentPrice,
            sessionId,
            ticker,
          });
          throw new Error(
            `Invalid price value received from Finnhub: ${currentPrice}`,
          );
        }

        const priceString = currentPrice.toString();

        console.log(`Current price for ${ticker}: $${priceString}`);

        // Update the agent_reports table with the current price
        const updatedReport = await db.agent_reports.update({
          where: {
            session_id: sessionId,
          },
          data: {
            price: priceString,
            updated_at: new Date(),
          },
          select: {
            id: true,
            price: true,
          },
        });

        return {
          success: true,
          message: "Price fetch and update completed successfully",
          sessionId,
          currentPrice: priceString,
          finnhubData: priceData,
          reportUpdated: !!updatedReport,
          reportId: updatedReport.id,
        };
      } catch (error) {
        console.error("Price fetch step failed:", {
          error: error instanceof Error ? error.message : error,
          sessionId,
          ticker,
        });

        // Update report status to failed when price fetch encounters errors
        try {
          await db.agent_reports.update({
            where: { session_id: sessionId },
            data: {
              status: "failed",
              updated_at: new Date(),
            },
          });
          console.log(
            `Updated report status to failed due to price fetch error for session: ${sessionId}`,
          );
        } catch (updateError) {
          console.error(
            "Failed to update report status after price fetch failure:",
            updateError,
          );
        }

        // Re-throw the error to ensure the step fails
        throw error;
      }
    });

    // Step 4: Send POST request to analysis service
    console.log(`Sending analysis request for ${ticker} (${sessionId})`);

    const requestBody = {
      session_id: sessionId,
      ticker,
      date,
      userId,
      published,
      analysts,
      config: {
        llm_provider: env.NEXT_PUBLIC_LLM_PROVIDER,
      },
    };

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await step.fetch(env.STOCK_ANALYZE_URL, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": env.MODAL_KEY,
        "Modal-Secret": env.MODAL_SECRET,
      },
    });

    console.log(
      `Analysis service response: ${response.status} ${response.statusText}`,
    );

    // Parse and validate response
    let result;
    try {
      result = await response.json();
      console.log("Parsed response:", JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error("Failed to parse response JSON:", parseError);

      // Update status to failed
      try {
        await db.agent_reports.update({
          where: { session_id: sessionId },
          data: { status: "failed", updated_at: new Date() },
        });
      } catch (updateError) {
        console.error(
          "Failed to update report status after JSON parse error:",
          updateError,
        );
      }

      throw new Error("Invalid response from analysis service");
    }

    if (!response.ok) {
      console.error("Analysis service request failed:", {
        status: response.status,
        statusText: response.statusText,
        sessionId,
        ticker,
        responseBody: result,
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

      // Extract error message from response if available
      let errorMessage = `Analysis request failed: ${response.statusText}`;
      if (result?.error?.message) {
        errorMessage = `Analysis failed: ${result.error.message}`;
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = "Authentication failed with analysis service";
      } else if (response.status === 422) {
        errorMessage =
          "Analysis service validation error - please check your input parameters";
      } else if (response.status === 429) {
        errorMessage = "Analysis service rate limit exceeded";
      } else if (response.status >= 500) {
        errorMessage = "Analysis service is temporarily unavailable";
      }

      throw new Error(errorMessage);
    }

    // Check if the response indicates success even with 200 status
    if (result?.success === false) {
      console.error("Analysis service returned success=false:", {
        sessionId,
        ticker,
        responseBody: result,
      });

      // Update status to failed
      try {
        await db.agent_reports.update({
          where: { session_id: sessionId },
          data: { status: "failed", updated_at: new Date() },
        });
      } catch (updateError) {
        console.error(
          "Failed to update report status after success=false:",
          updateError,
        );
      }

      const errorMessage =
        result?.error?.message || "Analysis execution failed";
      throw new Error(errorMessage);
    }
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

    // Step 5: Update analyst report status and add to recent list
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

    // Step 6: Deduct credit from user
    const creditDeduction = await step.run("deduct-credit", async () => {
      // Use the total cost calculated in step 1
      const totalCost = creditCheck.totalCost;

      const updatedUser = await db.user.update({
        where: {
          id: userId,
        },
        data: {
          credits: {
            decrement: totalCost,
          },
        },
        select: {
          credits: true,
        },
      });

      return {
        success: true,
        message: `Credits deducted successfully (${totalCost} credits)`,
        userId,
        remainingCredits: updatedUser.credits,
        deductedAmount: totalCost,
        breakdown: {
          baseCost: creditCheck.baseCost,
          analystCost: creditCheck.analystCost,
          totalCost: totalCost,
        },
      };
    });

    return {
      success: true,
      message: "Analysis workflow completed successfully",
      steps: {
        creditCheck,
        statusUpdate,
        priceExtractionResult,
        analysisResult,
        updateResult,
        creditDeduction,
      },
      finalResult: analysisResult.analysisData,
    };
  },
);
