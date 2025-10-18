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
import { LineChart, Loader2, CheckIcon } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface FormData {
  ticker: string;
  analyze_date: string;
  analysts: string[];
}

interface ApiRequestBody {
  ticker: string;
  date: string;
  analysts: string[];
  config: {
    llm_provider: string;
    research_depth: number;
  };
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

const AnalysisSearchCard = () => {
  const [formData, setFormData] = useState<FormData>({
    ticker: "",
    analyze_date: new Date().toISOString().split("T")[0] || "",
    analysts: [],
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      // Transform form data to match API expected format
      const requestBody: ApiRequestBody = {
        ticker: formData.ticker,
        date: formData.analyze_date, // Map analyze_date to date
        analysts: formData.analysts,
        config: {
          llm_provider: process.env.NEXT_PUBLIC_LLM_PROVIDER || "openai",
          research_depth: parseInt(process.env.NEXT_PUBLIC_RESEARCH_DEPTH || "3"),
        },
      };

      console.log("Starting analysis for:", requestBody);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Here you would typically make an API call to start the analysis
      // const response = await fetch('/api/analyze', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(requestBody)
      // })

      console.log("Analysis completed");
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">
            Analyze Stock
          </h1>
          <p className="text-sm text-gray-500">
            Start a new stock analysis - results will appear below
          </p>
        </div>

        <form onSubmit={handleStartAnalyze}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <LineChart className="h-5 w-5" />
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
                              {analyst.label}
                              {formData.analysts.includes(analyst.id) && (
                                <CheckIcon
                                  className="text-muted-foreground"
                                  size={14}
                                />
                              )}
                            </TagsItem>
                          ))}
                        </TagsGroup>
                      </TagsList>
                    </TagsContent>
                  </Tags>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  isAnalyzing ||
                  !formData.ticker ||
                  formData.analysts.length === 0
                }
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing... This may take up to 4 minutes
                  </>
                ) : (
                  <>
                    <LineChart className="mr-2 h-4 w-4" />
                    Start Analyze
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

export default AnalysisSearchCard;
