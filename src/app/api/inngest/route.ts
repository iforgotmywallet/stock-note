import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  generateAnalysis,
  dailyPortfolioCron,
} from "~/inngest/functions/index";

// Create an API that serves all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateAnalysis, dailyPortfolioCron],
});
