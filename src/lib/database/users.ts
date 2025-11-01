import { db } from "~/server/db";

const PORTFOLIO_CREATION_COST = 15;

export class UsersService {
  /**
   * Get user's current credit balance
   */
  static async getUserCredits(userId: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user.credits;
  }

  /**
   * Check if user has enough credits for an operation
   */
  static async hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);
    return currentCredits >= requiredCredits;
  }

  /**
   * Deduct credits from user's balance
   */
  static async deductCredits(userId: string, amount: number): Promise<number> {
    if (amount <= 0) {
      throw new Error("Credit amount must be positive");
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount,
        },
      },
      select: { credits: true },
    });

    return user.credits;
  }

  /**
   * Check if user has enough credits for portfolio creation
   */
  static async canCreatePortfolio(userId: string): Promise<{ canCreate: boolean; currentCredits: number; requiredCredits: number }> {
    const currentCredits = await this.getUserCredits(userId);
    return {
      canCreate: currentCredits >= PORTFOLIO_CREATION_COST,
      currentCredits,
      requiredCredits: PORTFOLIO_CREATION_COST,
    };
  }

  /**
   * Deduct credits for portfolio creation
   */
  static async deductPortfolioCreationCredits(userId: string): Promise<number> {
    return await this.deductCredits(userId, PORTFOLIO_CREATION_COST);
  }
}

export { PORTFOLIO_CREATION_COST };
