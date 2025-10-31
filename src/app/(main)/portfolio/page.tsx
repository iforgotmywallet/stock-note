import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { PortfolioPageContent } from "~/components/portfolio-page-content";

// Force dynamic rendering since we need user session
export const dynamic = "force-dynamic";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  days_of_week: string[];
  allocation_per_ticker: number;
  enabled: boolean;
  leverage: number;
  created_at: Date;
  tickers: { ticker: string }[];
}

async function getPortfolios(userId: string): Promise<Portfolio[]> {
  try {
    const portfolios = await db.portfolio.findMany({
      where: {
        userId: userId,
      },
      include: {
        tickers: {
          select: {
            ticker: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return portfolios;
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return [];
  }
}

export default async function PortfolioPage() {
  // Redirect to auth if not signed in
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session) {
    redirect("/auth/sign-in");
  }

  const portfolios = await getPortfolios(session.user.id);

  return <PortfolioPageContent portfolios={portfolios} />;
}