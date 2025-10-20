"use server";

import { inngest } from "~/inngest/client";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface QueueAnalysisParams {
  ticker: string;
  date: string;
  analysts: string[];
  published: boolean;
}

export async function queueAnalysisReport(params: QueueAnalysisParams) {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Send event to Inngest to trigger the analysis workflow
    const result = await inngest.send({
      name: "generate-analysis-event",
      data: {
        ticker: params.ticker,
        date: params.date,
        analysts: params.analysts,
        userId: session.user.id,
        published: params.published,
      },
    });

    return {
      success: true,
      message: "Analysis queued successfully",
      eventId: result.ids[0],
    };
  } catch (error) {
    console.error("Failed to queue analysis:", error);
    return {
      success: false,
      message: "Failed to queue analysis",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
