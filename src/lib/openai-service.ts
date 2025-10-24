import OpenAI from "openai";
import { env } from "~/env.js";
import { MAX_REPORTS_PER_CHAT } from "~/lib/constants";
import { type GPTModel, getGPTModelConfig, DEFAULT_GPT_MODEL } from "~/types/gpt-models";

// Re-export for backward compatibility
export { MAX_REPORTS_PER_CHAT };

// Financial system prompt for specialized responses
export const FINANCIAL_SYSTEM_PROMPT = `You are a financial analysis assistant specializing in stock market analysis and investment recommendations. 

You have access to detailed financial reports and should provide insights based on the provided context. Your expertise includes:
- Stock market analysis and trends
- Investment recommendations and strategies  
- Risk assessment and portfolio management
- Financial news and market sentiment analysis
- Technical and fundamental analysis

Guidelines:
- Focus on actionable investment advice based on the provided report data
- Provide clear explanations of complex financial concepts
- Consider both opportunities and risks in your responses
- Reference specific data points from the reports when relevant
- Maintain a professional but approachable tone
- If asked about stocks not in the provided context, clearly state the limitation

Always base your responses on the provided report context and your financial expertise.`;

// Interface for selected reports
export interface SelectedReport {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
  content: string;
}

// OpenAI service class
export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate report content if needed to fit within token limits
   */
  private truncateReportContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }

    // Try to truncate at a reasonable point (end of a section or paragraph)
    const truncated = content.substring(0, maxChars);
    const lastSectionBreak = truncated.lastIndexOf("\n\n===");
    const lastParagraphBreak = truncated.lastIndexOf("\n\n");

    if (lastSectionBreak > maxChars * 0.7) {
      return (
        truncated.substring(0, lastSectionBreak) +
        "\n\n[Content truncated for length]"
      );
    } else if (lastParagraphBreak > maxChars * 0.8) {
      return (
        truncated.substring(0, lastParagraphBreak) +
        "\n\n[Content truncated for length]"
      );
    } else {
      return truncated + "\n\n[Content truncated for length]";
    }
  }

  /**
   * Build context from selected reports for OpenAI with smart truncation
   */
  buildChatContext(reports: SelectedReport[], model: GPTModel = DEFAULT_GPT_MODEL): string {
    if (!reports || reports.length === 0) {
      return "";
    }

    // Get model configuration for context window size
    const modelConfig = getGPTModelConfig(model);
    const maxContextWindow = modelConfig.maxTokens;

    // Reserve tokens for system prompt, user message, and response
    const systemPromptTokens = this.estimateTokens(FINANCIAL_SYSTEM_PROMPT);
    const maxUserMessageTokens = 1000; // Conservative estimate for user messages
    const maxResponseTokens = 2000; // As set in the API call
    const reservedTokens =
      systemPromptTokens + maxUserMessageTokens + maxResponseTokens + 500; // 500 buffer

    const maxContextTokens = maxContextWindow - reservedTokens;
    const tokensPerReport = Math.floor(maxContextTokens / reports.length);

    return reports
      .map((report) => {
        const analysisDate = new Date(report.analysisDate).toLocaleDateString();
        const header = `Report for ${report.ticker} (${analysisDate}):`;
        const headerTokens = this.estimateTokens(header);
        const availableTokensForContent = tokensPerReport - headerTokens - 10; // 10 token buffer

        const truncatedContent = this.truncateReportContent(
          report.content,
          availableTokensForContent,
        );
        return `${header}\n${truncatedContent}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Create streaming chat completion
   */
  async createChatCompletion(message: string, reports: SelectedReport[] = [], model: GPTModel = DEFAULT_GPT_MODEL) {
    // Validate inputs
    if (!message || typeof message !== "string") {
      throw new Error("Message is required and must be a string");
    }

    if (message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (message.length > 4000) {
      throw new Error("Message is too long (maximum 4000 characters)");
    }

    if (!Array.isArray(reports)) {
      throw new Error("Reports must be an array");
    }

    // Get model configuration for validation
    const modelConfig = getGPTModelConfig(model);
    const contextText = this.buildChatContext(reports, model);

    // Validate total context size with more accurate token estimation
    const systemPromptTokens = this.estimateTokens(FINANCIAL_SYSTEM_PROMPT);
    const contextTokens = this.estimateTokens(contextText);
    const messageTokens = this.estimateTokens(message);
    const totalTokens = systemPromptTokens + contextTokens + messageTokens;

    // Use model-specific context window, reserve 2k for response
    const maxInputTokens = modelConfig.maxTokens - 2000;

    if (totalTokens > maxInputTokens) {
      const excessTokens = totalTokens - maxInputTokens;
      throw new Error(
        `Context is too large by approximately ${excessTokens} tokens for ${modelConfig.name}. Please select fewer reports or use a shorter message.`,
      );
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          FINANCIAL_SYSTEM_PROMPT +
          (contextText ? `\n\nContext Reports:\n${contextText}` : ""),
      },
      {
        role: "user",
        content: message.trim(),
      },
    ];

    try {
      return await this.client.chat.completions.create({
        model: model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      });
    } catch (error) {
      // Re-throw with better error handling
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Create a readable stream for streaming responses
   */
  createResponseStream(
    completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ) {
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Error in streaming:", error);
          controller.error(error);
        }
      },
    });
  }

  /**
   * Get context usage information for debugging/user feedback
   */
  getContextUsage(message: string, reports: SelectedReport[] = [], model: GPTModel = DEFAULT_GPT_MODEL) {
    const modelConfig = getGPTModelConfig(model);
    const contextText = this.buildChatContext(reports, model);
    const systemPromptTokens = this.estimateTokens(FINANCIAL_SYSTEM_PROMPT);
    const contextTokens = this.estimateTokens(contextText);
    const messageTokens = this.estimateTokens(message);
    const totalTokens = systemPromptTokens + contextTokens + messageTokens;
    const maxInputTokens = modelConfig.maxTokens - 2000; // Reserve for response

    return {
      model: modelConfig.name,
      systemPromptTokens,
      contextTokens,
      messageTokens,
      totalTokens,
      maxTokens: maxInputTokens,
      remainingTokens: maxInputTokens - totalTokens,
      reportsCount: reports.length,
    };
  }

  /**
   * Handle OpenAI API errors with user-friendly messages
   */
  handleOpenAIError(error: unknown): Error {
    console.error("OpenAI API error:", error);

    if (error instanceof Error) {
      // Check for specific OpenAI error patterns
      if (
        error.message.includes("API key") ||
        error.message.includes("Unauthorized")
      ) {
        const authError = new Error(
          "OpenAI API configuration error",
        ) as Error & { status: number; type: string };
        authError.status = 500;
        authError.type = "openai";
        return authError;
      }

      if (
        error.message.includes("rate limit") ||
        error.message.includes("Rate limit")
      ) {
        const rateLimitError = new Error(
          "Rate limit exceeded. Please try again later.",
        ) as Error & { status: number; type: string };
        rateLimitError.status = 429;
        rateLimitError.type = "openai";
        return rateLimitError;
      }

      if (
        error.message.includes("quota") ||
        error.message.includes("insufficient_quota")
      ) {
        const quotaError = new Error(
          "API quota exceeded. Please contact support.",
        ) as Error & { status: number; type: string };
        quotaError.status = 429;
        quotaError.type = "openai";
        return quotaError;
      }

      if (error.message.includes("model") || error.message.includes("Model")) {
        const modelError = new Error(
          "The selected GPT model is not available. Please try a different model or try again later.",
        ) as Error & { status: number; type: string };
        modelError.status = 503;
        modelError.type = "openai";
        return modelError;
      }

      if (error.message.includes("invalid_request_error") && error.message.includes("model")) {
        const invalidModelError = new Error(
          "Invalid model specified. Please select a valid GPT model.",
        ) as Error & { status: number; type: string };
        invalidModelError.status = 400;
        invalidModelError.type = "openai";
        return invalidModelError;
      }

      if (
        error.message.includes("timeout") ||
        error.message.includes("Timeout")
      ) {
        const timeoutError = new Error(
          "Request timed out. Please try again.",
        ) as Error & { status: number; type: string };
        timeoutError.status = 408;
        timeoutError.type = "openai";
        return timeoutError;
      }

      if (error.message.includes("Context is too large")) {
        // Extract the excess tokens and model name from the error message if available
        const tokenMatch = error.message.match(/by approximately (\d+) tokens/);
        const modelMatch = error.message.match(/for (GPT-[^.]+)/);
        const excessTokens = tokenMatch && tokenMatch[1] ? parseInt(tokenMatch[1], 10) : 0;
        const modelName = modelMatch && modelMatch[1] ? modelMatch[1] : "the selected model";

        let helpfulMessage =
          `The selected reports and message are too large for ${modelName}. `;
        if (excessTokens > 0) {
          const reportsToRemove = Math.ceil(excessTokens / 10000); // Rough estimate
          helpfulMessage += `Try removing ${reportsToRemove} report${reportsToRemove > 1 ? "s" : ""}, shortening your message, or using a model with a larger context window.`;
        } else {
          helpfulMessage +=
            "Try selecting fewer reports, using a shorter message, or choosing a model with a larger context window.";
        }

        const contextError = new Error(helpfulMessage) as Error & {
          status: number;
          type: string;
        };
        contextError.status = 400;
        contextError.type = "validation";
        return contextError;
      }

      // Return the original error if it's already well-formatted
      if (
        error.message.includes("Message is") ||
        error.message.includes("Reports must")
      ) {
        const validationError = new Error(error.message) as Error & {
          status: number;
          type: string;
        };
        validationError.status = 400;
        validationError.type = "validation";
        return validationError;
      }
    }

    // Default error
    const defaultError = new Error("Failed to generate response") as Error & {
      status: number;
      type: string;
    };
    defaultError.status = 500;
    defaultError.type = "unknown";
    return defaultError;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
