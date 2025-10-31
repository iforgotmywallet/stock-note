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
    const STARTING_EQUITY = 100000;
    const leverage = portfolio.leverage ?? 1;

    // Compute current gross exposure (sum of |position| * last_price)
    const existingPositions = await db.portfolioPosition.findMany({
      where: { portfolioId: portfolio.id },
    });

    const currentExposure = existingPositions.reduce((sum, p) => {
      const price = p.last_price ?? 0;
      return sum + Math.abs(p.shares * price);
    }, 0);

    const maxExposure = STARTING_EQUITY * leverage;
    const effectiveAllocation = getEffectiveAllocation(
      portfolio.allocation_per_ticker,
      portfolio.tickers.length,
    );

    const targetValue = STARTING_EQUITY * effectiveAllocation;
    const remainingExposure = Math.max(0, maxExposure - currentExposure);
    const tradableValue = Math.min(targetValue, remainingExposure);
    const shares = Math.floor(tradableValue / price);

    console.log(
      `Updating portfolio ${portfolio.id} (${portfolio.name}): allocation=${effectiveAllocation}, leverage=${leverage}x, tradableValue=${tradableValue.toFixed(
        2,
      )}, shares=${shares}, action=${action}`,
    );

    // ⚠️ Skip if no remaining margin or exposure room
    if (remainingExposure <= 0 || shares <= 0) {
      console.log(
        `⛔ Skipped ${action} for ${portfolio.name}: no remaining buying power (remaining=${remainingExposure.toFixed(
          2,
        )}, leverage=${leverage}x)`,
      );

      await db.portfolioAction.create({
        data: {
          portfolioId: portfolio.id,
          session_id: sessionId,
          ticker: report.ticker,
          action,
          trade_type: "SKIPPED_NO_POWER",
          shares: 0,
          price_at_action: price,
          note: `Skipped — no available buying power at ${leverage.toFixed(
            1,
          )}× leverage ⚠️`,
        },
      });

      continue; // Skip this trade
    }

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
          note: "Holding steady — no trades today 💎🙌",
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
    let cashDelta = 0;

    // 🧠 Trade logic
    if (action === "BUY") {
      if (newShares < 0) {
        // Covering short
        tradeType = "SHORT_COVER";
        const coveringShares = Math.min(shares, Math.abs(newShares));
        const realizedPnl = (avgCost - price) * coveringShares;
        console.log(
          `Covering ${coveringShares} short shares of ${report.ticker}, P/L: ${realizedPnl.toFixed(
            2,
          )}`,
        );
        cashDelta -= price * coveringShares; // buy back shares
        newShares += shares;
        if (newShares > 0) avgCost = price; // flipped to long
      } else {
        // Buy long
        tradeType = "LONG_BUY";
        cashDelta -= price * shares;
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
          `Sold ${sellingShares} long shares of ${report.ticker}, P/L: ${realizedPnl.toFixed(
            2,
          )}`,
        );
        cashDelta += price * sellingShares;
        newShares -= shares;
      } else if (newShares === 0) {
        // Opening new short
        tradeType = "SHORT_OPEN";
        avgCost = price;
        newShares = -shares;
        cashDelta += price * shares; // proceeds from short sale
      } else {
        // Adding to short
        tradeType = "SHORT_ADD";
        cashDelta += price * shares;
        avgCost =
          (avgCost * Math.abs(newShares) + price * shares) /
          (Math.abs(newShares) + shares || 1);
        newShares -= shares;
      }
    }

    // 💬 Generate readable trade note
    const getNoteForTrade = (
      type: string | null,
      shareCount: number,
      tradePrice: number,
      leverage: number,
    ): string => {
      const absShares = Math.abs(shareCount);
      const base = `${absShares} shares @ $${tradePrice.toFixed(2)}`;
      switch (type) {
        case "LONG_BUY":
          return `Bought ${base} (using ${leverage.toFixed(1)}× leverage) 📈`;
        case "LONG_SELL":
          return `Sold ${base} 💰`;
        case "SHORT_OPEN":
          return `Opened short ${base} (leveraged ${leverage.toFixed(1)}×) 🐻`;
        case "SHORT_ADD":
          return `Added to short ${base} 📉`;
        case "SHORT_COVER":
          return `Covered ${base} 🔄`;
        default:
          return `Executed ${type ?? "TRADE"} ${base}`;
      }
    };

    // 6️⃣ Record portfolio action
    await db.portfolioAction.create({
      data: {
        portfolioId: portfolio.id,
        session_id: sessionId,
        ticker: report.ticker,
        action,
        trade_type: tradeType,
        shares: action === "SELL" ? -shares : shares,
        price_at_action: price,
        note: getNoteForTrade(tradeType, shares, price, leverage),
      },
    });

    // 7️⃣ Update / upsert portfolio position
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
      `✅ Updated ${portfolio.name}: ${newShares} shares @ avg ${avgCost.toFixed(
        2,
      )}, cash Δ ${cashDelta.toFixed(2)}`,
    );
  }

  return { updated: portfolios.length };
}
