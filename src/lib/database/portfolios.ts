import { db } from "~/server/db";
import type { Portfolio, PortfolioTicker } from "@prisma/client";

export interface PortfolioWithTickers extends Portfolio {
  tickers: PortfolioTicker[];
}

export interface CreatePortfolioParams {
  userId: string;
  name: string;
  description?: string;
  tickers: string[];
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
}

/**
 * Database service for portfolio operations
 */
export class PortfoliosService {
  /**
   * Fetch all portfolios for a specific user with ticker relationships
   * @param userId - User ID to filter portfolios
   * @returns Promise<PortfolioWithTickers[]> - Array of portfolios with tickers
   */
  static async getUserPortfolios(userId: string): Promise<PortfolioWithTickers[]> {
    try {
      const portfolios = await db.portfolio.findMany({
        where: {
          userId,
        },
        include: {
          tickers: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return portfolios;
    } catch (error) {
      console.error("Error fetching user portfolios:", error);
      throw new Error("Failed to fetch user portfolios");
    }
  }

  /**
   * Create a new portfolio with ticker relationships using transaction
   * @param params - Parameters for creating the portfolio
   * @returns Promise<PortfolioWithTickers> - Created portfolio with tickers
   */
  static async createPortfolio(params: CreatePortfolioParams): Promise<PortfolioWithTickers> {
    try {
      // Validate input parameters
      this.validateCreatePortfolioParams(params);

      // Use transaction to ensure data consistency
      const result = await db.$transaction(async (tx) => {
        // Create the portfolio
        const portfolio = await tx.portfolio.create({
          data: {
            userId: params.userId,
            name: params.name,
            description: params.description,
            days_of_week: params.days_of_week,
            allocation_per_ticker: params.allocation_per_ticker,
            enabled: params.enabled,
          },
        });     
   // Create ticker associations
        const tickerData = params.tickers.map(ticker => ({
          portfolioId: portfolio.id,
          ticker: ticker.toUpperCase(),
        }));

        await tx.portfolioTicker.createMany({
          data: tickerData,
        });

        // Fetch the complete portfolio with tickers
        const portfolioWithTickers = await tx.portfolio.findUnique({
          where: { id: portfolio.id },
          include: {
            tickers: true,
          },
        });

        if (!portfolioWithTickers) {
          throw new Error("Failed to retrieve created portfolio");
        }

        return portfolioWithTickers;
      });

      return result;
    } catch (error) {
      console.error("Error creating portfolio:", error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("foreign key") || error.message.includes("FOREIGN")) {
          throw new Error("Invalid user ID provided");
        }
        if (error.message.includes("validation") || error.message.includes("required")) {
          throw new Error(`Validation error: ${error.message}`);
        }
        // Re-throw validation errors as-is
        if (error.message.includes("is required") || error.message.includes("must be")) {
          throw error;
        }
      }
      
      throw new Error("Failed to create portfolio - database error");
    }
  }

  /**
   * Verify user ownership of a portfolio
   * @param portfolioId - Portfolio ID
   * @param userId - User ID to verify ownership
   * @returns Promise<boolean> - True if user owns the portfolio
   */
  static async verifyPortfolioOwnership(
    portfolioId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const portfolio = await db.portfolio.findUnique({
        where: { id: portfolioId },
        select: { userId: true },
      });

      return portfolio?.userId === userId;
    } catch (error) {
      console.error("Error verifying portfolio ownership:", error);
      return false;
    }
  }

  /**
   * Get a single portfolio by ID with ticker relationships
   * @param portfolioId - Portfolio ID
   * @param userId - User ID to verify ownership
   * @returns Promise<PortfolioWithTickers | null> - Portfolio with tickers or null if not found/not owned
   */
  static async getPortfolioById(
    portfolioId: string,
    userId: string,
  ): Promise<PortfolioWithTickers | null> {
    try {
      const portfolio = await db.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId,
        },
        include: {
          tickers: true,
        },
      });

      return portfolio;
    } catch (error) {
      console.error("Error fetching portfolio by ID:", error);
      throw new Error("Failed to fetch portfolio");
    }
  }

  /**
   * Validate portfolio creation parameters
   * @param params - Parameters to validate
   * @throws Error if validation fails
   */
  private static validateCreatePortfolioParams(params: CreatePortfolioParams): void {
    if (!params.userId || typeof params.userId !== "string") {
      throw new Error("User ID is required and must be a string");
    }

    if (!params.name || typeof params.name !== "string") {
      throw new Error("Portfolio name is required and must be a string");
    }

    if (params.name.length > 100) {
      throw new Error("Portfolio name must be 100 characters or less");
    }

    if (!Array.isArray(params.tickers) || params.tickers.length === 0) {
      throw new Error("At least one ticker is required");
    }

    if (!Array.isArray(params.days_of_week) || params.days_of_week.length === 0) {
      throw new Error("At least one day of the week is required");
    }

    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const invalidDays = params.days_of_week.filter(day => !validDays.includes(day.toLowerCase()));
    if (invalidDays.length > 0) {
      throw new Error(`Invalid days of week: ${invalidDays.join(", ")}`);
    }

    if (typeof params.allocation_per_ticker !== "number" || 
        params.allocation_per_ticker < 0.01 || 
        params.allocation_per_ticker > 1.0) {
      throw new Error("Allocation per ticker must be between 0.01 and 1.0");
    }

    if (typeof params.enabled !== "boolean") {
      throw new Error("Enabled status must be a boolean");
    }

    // Validate ticker format (basic validation)
    const invalidTickers = params.tickers.filter(ticker => 
      !ticker || typeof ticker !== "string" || ticker.length > 10
    );
    if (invalidTickers.length > 0) {
      throw new Error("All tickers must be valid strings with 10 characters or less");
    }
  }
}