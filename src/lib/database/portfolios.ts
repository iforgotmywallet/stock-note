import { db } from "~/server/db";
import type { Portfolio, PortfolioTicker, PortfolioPosition, PortfolioAction } from "@prisma/client";

export interface PortfolioWithTickers extends Portfolio {
  tickers: PortfolioTicker[];
}

export interface PortfolioPositionWithMetrics extends PortfolioPosition {
  profit_loss: number;
  profit_loss_pct: number;
  price_source?: 'live' | 'stored';
  price_updated_at?: Date;
}

export type PortfolioActionWithDetails = PortfolioAction;

export interface PerformanceMetrics {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  lastUpdate: Date;
  positionCount: number;
}

export interface CreatePortfolioParams {
  userId: string;
  name: string;
  description?: string;
  tickers: string[];
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
  leverage: number;
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
            leverage: params.leverage,
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
   * Fetch portfolio positions with calculated profit/loss metrics
   * @param portfolioId - Portfolio ID
   * @returns Promise<PortfolioPositionWithMetrics[]> - Array of positions with P/L calculations
   */
  static async getPortfolioPositions(portfolioId: string): Promise<PortfolioPositionWithMetrics[]> {
    try {
      const positions = await db.portfolioPosition.findMany({
        where: {
          portfolioId,
        },
        orderBy: {
          ticker: "asc",
        },
      });

      // Calculate profit/loss metrics for each position
      return positions.map(position => {
        const shares = position.shares;
        const avgCost = position.avg_cost;
        const lastPrice = position.last_price || 0;
        
        let profit_loss = 0;
        let profit_loss_pct = 0;
        
        if (shares !== 0 && lastPrice > 0) {
          if (shares > 0) {
            // Long position: profit when price goes up
            const currentValue = shares * lastPrice;
            const costBasis = shares * avgCost;
            profit_loss = currentValue - costBasis;
            profit_loss_pct = costBasis > 0 ? (profit_loss / costBasis) * 100 : 0;
          } else {
            // Short position: profit when price goes down
            const shares_abs = Math.abs(shares);
            const currentValue = shares_abs * lastPrice;
            const costBasis = shares_abs * avgCost;
            profit_loss = costBasis - currentValue; // Inverted for short positions
            profit_loss_pct = costBasis > 0 ? (profit_loss / costBasis) * 100 : 0;
          }
        }

        return {
          ...position,
          profit_loss,
          profit_loss_pct,
        };
      });
    } catch (error) {
      console.error("Error fetching portfolio positions:", error);
      throw new Error("Failed to fetch portfolio positions");
    }
  }

  /**
   * Fetch recent portfolio actions ordered by date
   * @param portfolioId - Portfolio ID
   * @param limit - Maximum number of actions to return (default: 10)
   * @returns Promise<PortfolioActionWithDetails[]> - Array of recent portfolio actions
   */
  static async getPortfolioActions(
    portfolioId: string,
    limit = 10,
  ): Promise<PortfolioActionWithDetails[]> {
    try {
      const actions = await db.portfolioAction.findMany({
        where: {
          portfolioId,
        },
        orderBy: {
          action_date: "desc",
        },
        take: limit,
      });

      return actions;
    } catch (error) {
      console.error("Error fetching portfolio actions:", error);
      throw new Error("Failed to fetch portfolio actions");
    }
  }

  /**
   * DEPRECATED: Cash balance is now calculated from positions, not stored separately
   * Get current cash balance for a portfolio
   * @param portfolioId - Portfolio ID
   * @returns Promise<number> - Current cash balance
   */
  // static async getPortfolioCashBalance(portfolioId: string): Promise<number> {
  //   try {
  //     const latestValue = await db.portfolioDailyValue.findFirst({
  //       where: {
  //         portfolioId,
  //       },
  //       orderBy: {
  //         date: "desc",
  //       },
  //       select: {
  //         cash_balance: true,
  //       },
  //     });

  //     return latestValue?.cash_balance ?? 40201.50; // Default starting cash if no records
  //   } catch (error) {
  //     console.error("Error fetching portfolio cash balance:", error);
  //     return 40201.50; // Default fallback
  //   }
  // }

  /**
   * Calculate comprehensive portfolio performance metrics
   * @param portfolioId - Portfolio ID
   * @returns Promise<PerformanceMetrics> - Calculated performance metrics
   */
  static async getPortfolioPerformance(portfolioId: string): Promise<PerformanceMetrics> {
    try {
      const positions = await this.getPortfolioPositions(portfolioId);
      
      let totalValue = 0;
      let totalCost = 0;
      let profitablePositions = 0;
      let lastUpdate = new Date(0); // Initialize to epoch

      positions.forEach(position => {
        const currentValue = position.shares * (position.last_price || 0);
        const costBasis = position.shares * position.avg_cost;
        
        totalValue += currentValue;
        totalCost += costBasis;
        
        if (position.profit_loss > 0) {
          profitablePositions++;
        }

        // Track the most recent update
        if (position.updated_at > lastUpdate) {
          lastUpdate = position.updated_at;
        }
      });

      const totalReturn = totalValue - totalCost;
      const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
      const winRate = positions.length > 0 ? (profitablePositions / positions.length) * 100 : 0;

      return {
        totalValue,
        totalCost,
        totalReturn,
        totalReturnPct,
        winRate,
        lastUpdate: positions.length > 0 ? lastUpdate : new Date(),
        positionCount: positions.length,
      };
    } catch (error) {
      console.error("Error calculating portfolio performance:", error);
      throw new Error("Failed to calculate portfolio performance");
    }
  }

  /**
   * Verify user ownership of a portfolio (enhanced version)
   * @param portfolioId - Portfolio ID
   * @param userId - User ID to verify ownership
   * @returns Promise<boolean> - True if user owns the portfolio
   */
  static async verifyPortfolioOwnership(
    portfolioId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!portfolioId || !userId) {
        return false;
      }

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

    if (typeof params.leverage !== "number" || 
        params.leverage < 1.0 || 
        params.leverage > 5.0) {
      throw new Error("Leverage must be between 1.0 and 5.0");
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