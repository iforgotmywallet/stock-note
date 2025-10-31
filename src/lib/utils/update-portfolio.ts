import { db } from "~/server/db";
import { env } from "~/env";
import { getEffectiveAllocation } from "~/lib/utils";

export async function updatePortfolioFromReport({
  sessionId,
}: {
  sessionId: string;
}) {
  // 1️⃣ Fetch finished analysis report
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

  if (!report?.recommendation || !report.price) return;

  // 2️⃣ Only allow admin-triggered analysis
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

  // 3️⃣ Find all portfolios containing this ticker and active today
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

  // 4️⃣ Process each portfolio
  for (const portfolio of portfolios) {
    const effectiveAllocation = getEffectiveAllocation(
      portfolio.allocation_per_ticker,
      portfolio.tickers.length,
    );
    const portfolioValue = 100000;
    const leverage = portfolio.leverage ?? 1;
    const targetValue = portfolioValue * effectiveAllocation * leverage;
    const shares = Math.floor(targetValue / price);

    console.log(
      `Updating portfolio ${portfolio.id} (${portfolio.name}): allocation=${effectiveAllocation}, leverage=${leverage}x, targetValue=${targetValue}, shares=${shares}, action=${action}`,
    );

    // 🟡 Handle HOLD explicitly
    if (action === "HOLD") {
      await db.portfolioAction.create({
        data: {
          portfolioId: portfolio.id,
          session_id: sessionId,
          ticker: report.ticker,
          action: "HOLD",
          trade_type: "HOLD",
          shares: 0,
          price_at_action: price,
          note: "Holding steady, no moves today 💎🙌",
        },
      });

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

      continue;
    }

    // 5️⃣ Fetch existing position
    const pos = await db.portfolioPosition.findUnique({
      where: {
        portfolioId_ticker: {
          portfolioId: portfolio.id,
          ticker: report.ticker,
        },
      },
    });

    let newShares = pos?.shares ?? 0; // can be negative (short)
    let avgCost = pos?.avg_cost ?? 0;
    let tradeType: string | null = null;

    // 🟢 SHORT-SUPPORT LOGIC + TRADE TYPE
    if (action === "BUY") {
      if (newShares < 0) {
        // Covering short
        tradeType = "SHORT_COVER";
        const coveringShares = Math.min(shares, Math.abs(newShares));
        const realizedPnl = (avgCost - price) * coveringShares;
        console.log(
          `Covering ${coveringShares} short shares of ${report.ticker}, realized P/L: ${realizedPnl}`,
        );
        newShares += shares;
        if (newShares > 0) avgCost = price; // flipped to long
      } else {
        tradeType = "LONG_BUY";
        avgCost =
          (avgCost * newShares + price * shares) / (newShares + shares || 1);
        newShares += shares;
      }
    } else if (action === "SELL") {
      if (newShares > 0) {
        // Selling long
        tradeType = "LONG_SELL";
        const sellingShares = Math.min(shares, newShares);
        const realizedPnl = (price - avgCost) * sellingShares;
        console.log(
          `Sold ${sellingShares} long shares of ${report.ticker}, realized P/L: ${realizedPnl}`,
        );
        newShares -= shares;
      } else if (newShares === 0) {
        // Opening a short
        tradeType = "SHORT_OPEN";
        avgCost = price;
        newShares = -shares;
      } else {
        // Increasing existing short
        tradeType = "SHORT_ADD";
        avgCost =
          (avgCost * Math.abs(newShares) + price * shares) /
          (Math.abs(newShares) + shares || 1);
        newShares -= shares;
      }
    }

    // Record portfolio action
    const getNoteForTrade = (
      type: string | null,
      shareCount: number,
      tradePrice: number,
    ): string => {
      const absShares = Math.abs(shareCount);
      switch (type) {
        case "LONG_BUY":
          return `Bought ${absShares} shares @ $${tradePrice} 📈`;
        case "LONG_SELL":
          return `Sold ${absShares} shares @ $${tradePrice} 💰`;
        case "SHORT_OPEN":
          return `Opened short ${absShares} shares @ $${tradePrice} 🐻`;
        case "SHORT_ADD":
          return `Added to short ${absShares} shares @ $${tradePrice} 📉`;
        case "SHORT_COVER":
          return `Covered ${absShares} shares @ $${tradePrice} 🔄`;
        default:
          return `Executed ${type} ${absShares} shares @ $${tradePrice}`;
      }
    };

    await db.portfolioAction.create({
      data: {
        portfolioId: portfolio.id,
        session_id: sessionId,
        ticker: report.ticker,
        action,
        trade_type: tradeType,
        shares: action === "SELL" ? -shares : shares,
        price_at_action: price,
        note: getNoteForTrade(tradeType, shares, price),
      },
    });

    // Update position
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
      `Updated position for ${portfolio.name}: ${newShares} shares @ avg ${avgCost}`,
    );
  }

  return { updated: portfolios.length };
}
