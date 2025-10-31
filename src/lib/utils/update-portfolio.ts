import { db } from "~/server/db";
import { env } from "~/env";
import { getEffectiveAllocation } from "~/lib/utils";

export async function updatePortfolioFromReport({
  sessionId,
}: {
  sessionId: string;
}) {
  // Fetch the finished analysis report
  const report = await db.agent_reports.findUnique({
    where: { session_id: sessionId },
    select: {
      session_id: true,
      userId: true,
      ticker: true,
      recommendation: true,
      price: true,
    },
  });

  if (!report || !report.recommendation || !report.price) return;

  // Safeguard: Only allow admin-triggered analyses
  if (report.userId !== env.ADMIN_USER_SECRET_ID) {
    console.log(
      `Portfolio update skipped - not admin triggered (userId: ${report.userId})`,
    );
    return { updated: 0 };
  }

  const price = parseFloat(report.price);
  const action = report.recommendation.toUpperCase(); // BUY | SELL | HOLD
  const today = new Date()
    .toLocaleString("en-US", { weekday: "long" })
    .toLowerCase();

  console.log(
    `Portfolio update for ${report.ticker}: action=${action}, price=${price}, today=${today}`,
  );

  // Find all portfolios that contain this ticker and are active today
  const portfolios = await db.portfolio.findMany({
    where: {
      enabled: true,
      tickers: { some: { ticker: report.ticker } },
      days_of_week: { has: today },
    },
    include: { tickers: true },
  });

  console.log(
    `Found ${portfolios.length} portfolios to update for ticker ${report.ticker} on ${today}`,
  );

  for (const portfolio of portfolios) {
    //Using Effective Allocation to avoid over flow of percentage
    const effectiveAllocation = getEffectiveAllocation(
      portfolio.allocation_per_ticker,
      portfolio.tickers.length,
    );
    const portfolioValue = 100000;
    const targetValue = portfolioValue * effectiveAllocation;
    const shares = Math.floor(targetValue / price);

    console.log(
      `Updating portfolio ${portfolio.id} (${portfolio.name}): allocation=${effectiveAllocation}, shares=${shares}, action=${action}`,
    );

    // Handle HOLD explicitly
    if (action === "HOLD") {
      await db.portfolioAction.create({
        data: {
          portfolioId: portfolio.id,
          session_id: sessionId,
          ticker: report.ticker,
          action: "HOLD",
          shares: 0,
          price_at_action: price,
          note: "AI decided to hold current position today",
        },
      });

      console.log(
        `Logged HOLD action for ${portfolio.name}: holding ${report.ticker} at ${price}`,
      );

      // Just update last known price for position (no trade)
      await db.portfolioPosition.upsert({
        where: {
          portfolioId_ticker: {
            portfolioId: portfolio.id,
            ticker: report.ticker,
          },
        },
        update: {
          last_price: price,
          updated_at: new Date(),
        },
        create: {
          portfolioId: portfolio.id,
          ticker: report.ticker,
          shares: 0,
          avg_cost: price,
          last_price: price,
        },
      });

      continue; // move on to next ticker
    }

    // BUY or SELL below
    await db.portfolioAction.create({
      data: {
        portfolioId: portfolio.id,
        session_id: sessionId,
        ticker: report.ticker,
        action,
        shares: action === "SELL" ? -shares : shares,
        price_at_action: price,
        note: `AI recommended ${action.toLowerCase()} ${Math.abs(shares)} shares at $${price}`,
      },
    });

    console.log(
      `Created ${action} action for ${portfolio.name}: ${shares} shares of ${report.ticker}`,
    );

    // Update or insert position
    const pos = await db.portfolioPosition.findUnique({
      where: {
        portfolioId_ticker: {
          portfolioId: portfolio.id,
          ticker: report.ticker,
        },
      },
    });

    let newShares = pos?.shares ?? 0;
    let avgCost = pos?.avg_cost ?? 0;

    if (action === "BUY") {
      avgCost = (avgCost * newShares + price * shares) / (newShares + shares);
      newShares += shares;
    } else if (action === "SELL") {
      newShares -= Math.abs(shares);
    }

    await db.portfolioPosition.upsert({
      where: {
        portfolioId_ticker: {
          portfolioId: portfolio.id,
          ticker: report.ticker,
        },
      },
      update: {
        shares: newShares,
        avg_cost: avgCost,
        last_price: price,
        updated_at: new Date(),
      },
      create: {
        portfolioId: portfolio.id,
        ticker: report.ticker,
        shares: newShares,
        avg_cost: avgCost,
        last_price: price,
      },
    });

    console.log(
      `Updated position for ${portfolio.name}: ${newShares} shares at avg ${avgCost}`,
    );
  }

  return { updated: portfolios.length };
}
