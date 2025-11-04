import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { env } from "~/env";

async function fetchLivePrices(
  tickers: string[],
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const ticker of tickers) {
    try {
      const priceUpdateResult = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${env.FINNHUB_API_KEY}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!priceUpdateResult.ok) {
        console.error(
          `Failed to fetch price for ${ticker}: ${priceUpdateResult.statusText}`,
        );
        continue;
      }

      const data = await priceUpdateResult.json();

      // Finnhub returns 'c' as the current price
      if (data.c && data.c > 0) {
        prices[ticker] = data.c;
      }

      // Add delay to respect rate limits (1 second between requests)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
    }
  }

  return prices;
}

export const recordPortfolioDailyValue = inngest.createFunction(
  { id: "record-portfolio-daily-value", name: "Record Portfolio Daily Values" },
  { cron: "0 22 * * 1-5" }, // Mon–Fri 5PM EST (22:00 UTC)
  async ({ step }) => {
    const STARTING_EQUITY = 100000;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]!;
    const weekday = today
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();

    // 1️⃣ Fetch all enabled portfolios
    const portfolios = await step.run("Fetch portfolios", async () => {
      return db.portfolio.findMany({
        where: { enabled: true },
        include: { tickers: true },
      });
    });

    for (const portfolio of portfolios) {
      await step.run(`Process portfolio ${portfolio.name}`, async () => {

        const positions = await db.portfolioPosition.findMany({
          where: { portfolioId: portfolio.id },
        });

        if (positions.length === 0) {
          console.log(`⚠️ ${portfolio.name} has no positions`);
          await db.portfolioDailyValue.create({
            data: {
              portfolioId: portfolio.id,
              date: new Date(todayStr),
              cash_balance: STARTING_EQUITY,
              long_value: 0,
              short_value: 0,
              net_value: STARTING_EQUITY,
              total_return_pct: 0,
              // daily_change_pct defaults to 0
            },
          });
          return;
        }

        // ✅ Fetch latest prices
        const tickers = positions.map((p) => p.ticker);
        const prices = await fetchLivePrices(tickers);

        // Compute exposures and PnL
        let long_value = 0;
        let short_value = 0;
        let unrealizedPnl = 0;

        for (const pos of positions) {
          const price = prices[pos.ticker] ?? pos.last_price ?? pos.avg_cost;
          if (pos.shares > 0) {
            long_value += pos.shares * price;
            unrealizedPnl += (price - pos.avg_cost) * pos.shares;
          } else if (pos.shares < 0) {
            const abs = Math.abs(pos.shares);
            short_value += abs * price;
            unrealizedPnl += (pos.avg_cost - price) * abs;
          }
        }

        const leverage = portfolio.leverage ?? 1;
        const gross_exposure = long_value + short_value;
        const equity = STARTING_EQUITY + unrealizedPnl;
        const max_exposure = STARTING_EQUITY * leverage;
        const cash_balance = Math.max(max_exposure - gross_exposure, 0);
        const net_value = equity;
        const total_return_pct = (net_value / STARTING_EQUITY - 1) * 100;

        // 🕓 Get yesterday's snapshot (if exists)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const previousSnapshot = await db.portfolioDailyValue.findFirst({
          where: {
            portfolioId: portfolio.id,
            date: {
              lt: new Date(todayStr),
            },
          },
          orderBy: { date: "desc" },
        });

        const daily_change_pct = previousSnapshot
          ? ((net_value - previousSnapshot.net_value) /
              previousSnapshot.net_value) *
            100
          : 0;

        // 🧾 Check if record exists for today
        const existingRecord = await db.portfolioDailyValue.findFirst({
          where: {
            portfolioId: portfolio.id,
            date: new Date(todayStr),
          },
        });

        if (existingRecord) {
          // Update existing record
          await db.portfolioDailyValue.update({
            where: { id: existingRecord.id },
            data: {
              cash_balance,
              long_value,
              short_value,
              net_value,
              total_return_pct,
              daily_change_pct,
            },
          });
        } else {
          // Create new record
          await db.portfolioDailyValue.create({
            data: {
              portfolioId: portfolio.id,
              date: new Date(todayStr),
              cash_balance,
              long_value,
              short_value,
              net_value,
              total_return_pct,
              daily_change_pct,
            },
          });
        }

        console.log(
          `✅ ${portfolio.name} snapshot: Net=${net_value.toFixed(
            2,
          )} | Daily Change=${daily_change_pct.toFixed(2)}% | Total Return=${total_return_pct.toFixed(
            2,
          )}%`,
        );
      });
    }

    return { processed: portfolios.length, date: todayStr };
  },
);
