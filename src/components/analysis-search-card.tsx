"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from "./ui/shadcn-io/tags";
import { SquareTerminal, Loader2, CheckIcon } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { queueAnalysisReport } from "~/actions/generation";
import { ErrorBoundary, AnalysisErrorFallback } from "./error-boundary";

interface FormData {
  ticker: string;
  analyze_date: string;
  analysts: string[];
}

interface Analyst {
  id: string;
  label: string;
}

const analysts: Analyst[] = [
  { id: "market", label: "Market" },
  { id: "social", label: "Social" },
  { id: "news", label: "News" },
  { id: "fundamentals", label: "Fundamentals" },
];

interface AnalysisSearchCardProps {
  onAnalysisComplete?: () => void;
}

const AnalysisSearchCardContent = ({
  onAnalysisComplete,
}: AnalysisSearchCardProps) => {
  const [formData, setFormData] = useState<FormData>({
    ticker: "",
    analyze_date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })(),
    analysts: [],
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate credit cost: base cost (2) + analysts count (1 each)
  const calculateCreditCost = () => {
    const baseCost = 2;
    const analystCost = formData.analysts.length;
    return baseCost + analystCost;
  };

  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAnalystRemove = (value: string) => {
    if (!formData.analysts.includes(value)) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      analysts: prev.analysts.filter((v) => v !== value),
    }));
  };

  const handleAnalystSelect = (value: string) => {
    if (formData.analysts.includes(value)) {
      handleAnalystRemove(value);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      analysts: [...prev.analysts, value],
    }));
  };

  const handleStartAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    try {
      // Validate form data before submission
      if (!formData.ticker.trim()) {
        toast.error("❌ Please enter a ticker symbol");
        return;
      }

      if (!formData.analyze_date) {
        toast.error("❌ Please select an analysis date");
        return;
      }

      if (formData.analysts.length === 0) {
        toast.error("❌ Please select at least one analyst");
        return;
      }

      // Queue the analysis using the server action
      const result = await queueAnalysisReport({
        ticker: formData.ticker,
        date: formData.analyze_date,
        analysts: formData.analysts,
        published: true,
      });

      if (result.success) {
        console.log("Analysis queued successfully:", result.eventId);
        toast.success(
          "🚀 Analysis started! This may take up to 4 minutes to complete.",
        );

        // Clear the form
        setFormData({
          ticker: "",
          analyze_date: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          })(),
          analysts: [],
        });

        // Notify parent component to refresh the main table (but not sidebar)
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        console.error(
          "Failed to queue analysis:",
          result.message,
          result.error,
        );

        // Provide specific error messages based on the error type
        if (
          result.error?.includes("ticker") ||
          result.error?.includes("Ticker")
        ) {
          toast.error(
            "❌ Invalid ticker symbol. Please use alphanumeric characters only.",
          );
        } else if (
          result.error?.includes("date") ||
          result.error?.includes("Date")
        ) {
          toast.error("❌ Invalid date format. Please select a valid date.");
        } else if (
          result.error?.includes("analyst") ||
          result.error?.includes("Analyst")
        ) {
          toast.error("❌ Please select at least one analyst.");
        } else if (
          result.error?.includes("Database") ||
          result.error?.includes("database")
        ) {
          toast.error("❌ Database error. Please try again in a moment.");
        } else if (
          result.error?.includes("Event queue") ||
          result.error?.includes("Inngest")
        ) {
          toast.error(
            "❌ Analysis service temporarily unavailable. Please try again later.",
          );
        } else {
          toast.error(
            `❌ ${result.message || "Failed to start analysis. Please try again."}`,
          );
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);

      // Handle network errors and other unexpected errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "❌ Network error. Please check your connection and try again.",
        );
      } else if (error instanceof Error) {
        toast.error(`❌ Error: ${error.message}`);
      } else {
        toast.error("❌ Something went wrong. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Analyze Stock 📈
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start a new stock analysis - results will appear below
          </p>
        </div>

        <form onSubmit={handleStartAnalyze}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <SquareTerminal className="h-5 w-5" />
                Start New Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol *</Label>
                  <Input
                    id="ticker"
                    placeholder="e.g., AAPL, TSLA, MSFT"
                    value={formData.ticker}
                    onChange={(e) =>
                      handleInputChange("ticker", e.target.value.toUpperCase())
                    }
                    required
                    disabled={isAnalyzing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analyze_date">Analyze Date *</Label>
                  <Input
                    id="analyze_date"
                    type="date"
                    value={formData.analyze_date}
                    onChange={(e) =>
                      handleInputChange("analyze_date", e.target.value)
                    }
                    required
                    disabled={isAnalyzing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysts">Choose Analyst *</Label>
                  <Tags className="w-full">
                    <TagsTrigger>
                      {formData.analysts.map((analystId) => (
                        <TagsValue
                          key={analystId}
                          onRemove={() => handleAnalystRemove(analystId)}
                        >
                          {analysts.find((a) => a.id === analystId)?.label}
                        </TagsValue>
                      ))}
                    </TagsTrigger>
                    <TagsContent>
                      <TagsInput placeholder="Search analyst..." />
                      <TagsList>
                        <TagsEmpty />
                        <TagsGroup>
                          {analysts.map((analyst) => (
                            <TagsItem
                              key={analyst.id}
                              onSelect={handleAnalystSelect}
                              value={analyst.id}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{analyst.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">1 credit</span>
                                  {formData.analysts.includes(analyst.id) && (
                                    <CheckIcon
                                      className="text-muted-foreground"
                                      size={14}
                                    />
                                  )}
                                </div>
                              </div>
                            </TagsItem>
                          ))}
                        </TagsGroup>
                      </TagsList>
                    </TagsContent>
                  </Tags>
                </div>
              </div>

              {/* Credit Cost Display */}
              {formData.analysts.length > 0 && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Credit Cost Breakdown:</p>
                      <div className="space-y-0.5 text-muted-foreground">
                        <p>• Base analysis: 2 credits</p>
                        <p>• Selected analysts ({formData.analysts.length}): {formData.analysts.length} credits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {calculateCreditCost()} credits
                      </p>
                      <p className="text-xs text-muted-foreground">Total cost</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  isAnalyzing ||
                  !formData.ticker ||
                  formData.analysts.length === 0
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing... This may take up to 4 minutes
                  </>
                ) : (
                  <>
                    <SquareTerminal className="mr-2 h-4 w-4" />
                    {formData.analysts.length > 0 
                      ? `Start Analyze (${calculateCreditCost()} credits)`
                      : "Start Analyze"
                    }
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

const AnalysisSearchCard = (props: AnalysisSearchCardProps) => {
  return (
    <ErrorBoundary fallback={AnalysisErrorFallback}>
      <AnalysisSearchCardContent {...props} />
    </ErrorBoundary>
  );
};

export default AnalysisSearchCard;
