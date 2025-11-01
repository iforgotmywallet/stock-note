"use server";

import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortfoliosService, type CreatePortfolioParams, type PortfolioWithTickers } from "~/lib/database/portfolios";
import { UsersService, PORTFOLIO_CREATION_COST } from "~/lib/database/users";
import { getEffectiveAllocation } from "~/lib/utils";

export interface CreatePortfolioFormData {
  name: string;
  description?: string;
  tickers: string[];
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
  leverage: number;
}

export interface CreatePortfolioResult {
  success: boolean;
  message: string;
  portfolio?: PortfolioWithTickers;
  error?: string;
}

/**
 * Create a new portfolio with form validation and user authorization
 */
export async function createPortfolio(formData: CreatePortfolioFormData): Promise<CreatePortfolioResult> {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Check if user has enough credits
    const creditCheck = await UsersService.canCreatePortfolio(session.user.id);
    if (!creditCheck.canCreate) {
      return {
        success: false,
        message: "Insufficient credits",
        error: `You need ${creditCheck.requiredCredits} credits to create a portfolio. Your current balance is ${creditCheck.currentCredits} credits.`,
      };
    }

    // Validate form data
    const validationResult = validatePortfolioFormData(formData);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: "Validation failed",
        error: validationResult.error,
      };
    }

    // Calculate effective allocation based on number of tickers
    const effectiveAllocation = getEffectiveAllocation(
      formData.allocation_per_ticker,
      formData.tickers.length
    );

    // Log allocation calculation for debugging
    if (effectiveAllocation !== formData.allocation_per_ticker) {
      console.log(`Portfolio allocation normalized: ${Math.round(formData.allocation_per_ticker * 100)}% → ${Math.round(effectiveAllocation * 100)}% per ticker (${formData.tickers.length} tickers)`);
    }

    // Prepare parameters for database service
    const createParams: CreatePortfolioParams = {
      userId: session.user.id,
      name: formData.name.trim(),
      description: formData.description?.trim(),
      tickers: formData.tickers.map(ticker => ticker.toUpperCase().trim()),
      days_of_week: formData.days_of_week.map(day => day.toLowerCase()),
      allocation_per_ticker: effectiveAllocation, // Store the effective allocation
      enabled: formData.enabled,
      leverage: formData.leverage,
    };

    // Create portfolio using database service
    const portfolio = await PortfoliosService.createPortfolio(createParams);

    // Deduct credits after successful portfolio creation
    try {
      await UsersService.deductPortfolioCreationCredits(session.user.id);
    } catch (creditError) {
      console.error("Failed to deduct credits after portfolio creation:", creditError);
      // Portfolio was created but credit deduction failed - log this for manual review
      // We don't want to fail the entire operation or delete the portfolio
    }

    return {
      success: true,
      message: "Portfolio created successfully",
      portfolio,
    };
  } catch (error) {
    console.error("Error creating portfolio:", error);
    
    // Handle specific error types with more detailed messages
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Validation errors
      if (errorMessage.includes("validation error") || 
          errorMessage.includes("is required") || 
          errorMessage.includes("must be")) {
        return {
          success: false,
          message: "Please check your input and try again",
          error: error.message,
        };
      }
      
      // Authentication errors
      if (errorMessage.includes("invalid user id") || 
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("authentication")) {
        return {
          success: false,
          message: "Authentication failed. Please sign in again.",
          error: "User session is invalid or expired",
        };
      }
      
      // Database errors
      if (errorMessage.includes("database") || 
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout")) {
        return {
          success: false,
          message: "Database error. Please try again later.",
          error: "Database connection failed",
        };
      }
      
      // Duplicate name errors (if implemented in database)
      if (errorMessage.includes("duplicate") || 
          errorMessage.includes("already exists")) {
        return {
          success: false,
          message: "A portfolio with this name already exists",
          error: "Portfolio name must be unique",
        };
      }
      
      // Network/fetch errors
      if (errorMessage.includes("fetch") || 
          errorMessage.includes("network")) {
        return {
          success: false,
          message: "Network error. Please check your connection.",
          error: "Network request failed",
        };
      }
    }

    // Generic error fallback
    return {
      success: false,
      message: "Failed to create portfolio. Please try again.",
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get all portfolios for the current user
 */
export async function getUserPortfolios(): Promise<PortfolioWithTickers[]> {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Fetch portfolios using database service
    const portfolios = await PortfoliosService.getUserPortfolios(session.user.id);

    return portfolios;
  } catch (error) {
    console.error("Error fetching user portfolios:", error);
    throw new Error("Failed to fetch portfolios");
  }
}

/**
 * Get the current user's credit balance
 */
export async function getUserCredits(): Promise<number> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    return await UsersService.getUserCredits(session.user.id);
  } catch (error) {
    console.error("Error fetching user credits:", error);
    throw new Error("Failed to fetch user credits");
  }
}

/**
 * Verify if the current user owns a specific portfolio
 */
export async function verifyPortfolioOwnership(portfolioId: string): Promise<boolean> {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return false;
    }

    // Verify ownership using database service
    return await PortfoliosService.verifyPortfolioOwnership(portfolioId, session.user.id);
  } catch (error) {
    console.error("Error verifying portfolio ownership:", error);
    return false;
  }
}

/**
 * Get a single portfolio by ID (with ownership verification)
 */
export async function getPortfolioById(portfolioId: string): Promise<PortfolioWithTickers | null> {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Fetch portfolio using database service
    const portfolio = await PortfoliosService.getPortfolioById(portfolioId, session.user.id);

    return portfolio;
  } catch (error) {
    console.error("Error fetching portfolio by ID:", error);
    throw new Error("Failed to fetch portfolio");
  }
}

/**
 * Delete a portfolio and all its related data
 * IMPORTANT: Deletes PortfolioAction records first, then other related tables
 * Does NOT delete the agent_reports themselves
 */
export async function deletePortfolio(portfolioId: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      redirect("/auth/sign-in");
    }

    // Verify ownership before deletion
    const isOwner = await PortfoliosService.verifyPortfolioOwnership(portfolioId, session.user.id);
    if (!isOwner) {
      return {
        success: false,
        message: "Unauthorized",
        error: "You do not have permission to delete this portfolio",
      };
    }

    // Delete portfolio using database service (handles cascade deletion)
    await PortfoliosService.deletePortfolio(portfolioId);

    return {
      success: true,
      message: "Portfolio deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return {
      success: false,
      message: "Failed to delete portfolio",
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Validate portfolio form data with comprehensive checks
 */
function validatePortfolioFormData(formData: CreatePortfolioFormData): { isValid: boolean; error?: string } {
  // Validate name
  if (!formData.name || typeof formData.name !== "string" || formData.name.trim().length === 0) {
    return { isValid: false, error: "Portfolio name is required and cannot be empty" };
  }

  const trimmedName = formData.name.trim();
  if (trimmedName.length < 2) {
    return { isValid: false, error: "Portfolio name must be at least 2 characters long" };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: "Portfolio name must be 100 characters or less" };
  }

  // Check for valid characters in name
  if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(trimmedName)) {
    return { isValid: false, error: "Portfolio name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed." };
  }

  // Validate description (optional)
  if (formData.description) {
    if (typeof formData.description !== "string") {
      return { isValid: false, error: "Description must be a valid text string" };
    }
    if (formData.description.length > 500) {
      return { isValid: false, error: "Description must be 500 characters or less" };
    }
  }

  // Validate tickers
  if (!Array.isArray(formData.tickers) || formData.tickers.length === 0) {
    return { isValid: false, error: "At least one ticker symbol is required for the portfolio" };
  }

  if (formData.tickers.length > 10) {
    return { isValid: false, error: "Maximum 10 ticker symbols allowed per portfolio" };
  }

  // Check for duplicate tickers
  const uniqueTickers = new Set(formData.tickers.map(t => t.trim().toUpperCase()));
  if (uniqueTickers.size !== formData.tickers.length) {
    return { isValid: false, error: "Duplicate ticker symbols are not allowed" };
  }

  // Validate individual tickers
  const invalidTickers = formData.tickers.filter(ticker => {
    if (!ticker || typeof ticker !== "string") return true;
    const cleanTicker = ticker.trim().toUpperCase();
    return cleanTicker.length === 0 || cleanTicker.length > 10 || !/^[A-Z]+$/.test(cleanTicker);
  });
  
  if (invalidTickers.length > 0) {
    return { isValid: false, error: `Invalid ticker symbols found: ${invalidTickers.join(", ")}. Tickers must be 1-10 uppercase letters.` };
  }

  // Validate days of week
  if (!Array.isArray(formData.days_of_week) || formData.days_of_week.length === 0) {
    return { isValid: false, error: "At least one trading day must be selected" };
  }

  const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const invalidDays = formData.days_of_week.filter(day => 
    !day || typeof day !== "string" || !validDays.includes(day.toLowerCase())
  );
  if (invalidDays.length > 0) {
    return { isValid: false, error: `Invalid trading days selected: ${invalidDays.join(", ")}. Only weekdays (Monday-Friday) are allowed.` };
  }

  // Check for duplicate days
  const uniqueDays = new Set(formData.days_of_week.map(d => d.toLowerCase()));
  if (uniqueDays.size !== formData.days_of_week.length) {
    return { isValid: false, error: "Duplicate trading days are not allowed" };
  }

  // Validate allocation per ticker
  if (typeof formData.allocation_per_ticker !== "number") {
    return { isValid: false, error: "Allocation percentage must be a valid number" };
  }

  if (isNaN(formData.allocation_per_ticker)) {
    return { isValid: false, error: "Allocation percentage is not a valid number" };
  }

  if (formData.allocation_per_ticker < 0.01) {
    return { isValid: false, error: "Allocation percentage must be at least 1%" };
  }

  if (formData.allocation_per_ticker > 1.0) {
    return { isValid: false, error: "Allocation percentage cannot exceed 100%" };
  }

  // Validate enabled status
  if (typeof formData.enabled !== "boolean") {
    return { isValid: false, error: "Portfolio enabled status must be specified as true or false" };
  }

  // Validate leverage
  if (typeof formData.leverage !== "number") {
    return { isValid: false, error: "Leverage must be a valid number" };
  }

  if (isNaN(formData.leverage)) {
    return { isValid: false, error: "Leverage is not a valid number" };
  }

  if (formData.leverage < 1.0) {
    return { isValid: false, error: "Leverage must be at least 1.0x" };
  }

  if (formData.leverage > 5.0) {
    return { isValid: false, error: "Leverage cannot exceed 5.0x" };
  }

  return { isValid: true };
}