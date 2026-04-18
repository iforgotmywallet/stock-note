"use client";

import { IconPlus } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { PortfolioTable, type Portfolio } from "~/components/portfolio-table";

interface PortfolioPageContentProps {
  portfolios: Portfolio[];
}

export function PortfolioPageContent({
  portfolios: initialPortfolios,
}: PortfolioPageContentProps) {
  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Portfolio Management
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Build and schedule portfolios automatically to visualize
              performance over time.
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full sm:w-auto">
              <Button
                className="flex w-full cursor-not-allowed items-center gap-2 opacity-50 sm:w-auto"
                disabled
                aria-label="Create new portfolio — Coming Soon"
              >
                <IconPlus className="size-4" aria-hidden="true" />
                <span className="sm:inline">Create Portfolio</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Coming Soon</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Portfolio Content */}
      <div className="space-y-4">
        {initialPortfolios.length > 0 && (
          <div className="text-muted-foreground text-sm">
            {initialPortfolios.length} portfolio
            {initialPortfolios.length !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Portfolio Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Portfolios</CardTitle>
            <CardDescription>
              Manage your investment portfolios and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioTable portfolios={initialPortfolios} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
