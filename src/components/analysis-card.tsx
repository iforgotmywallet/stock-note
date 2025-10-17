"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LineChart, Loader2 } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface FormData {
  ticker: string;
  analyze_date: string;
  report_type: string;
}

interface ReportType {
  value: string;
  label: string;
}

const reportTypes: ReportType[] = [
  { value: "technical", label: "Technical Analysis" },
  { value: "fundamental", label: "Fundamental Analysis" },
  { value: "comprehensive", label: "Comprehensive Analysis" },
  { value: "risk", label: "Risk Assessment" },
];

const AnalysisCard = () => {
  const [formData, setFormData] = useState<FormData>({
    ticker: "",
    analyze_date: new Date().toISOString().split("T")[0] || "",
    report_type: "technical",
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);

    try {
      // Mock analysis process
      console.log("Starting analysis for:", formData);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Here you would typically make an API call to start the analysis
      // const response = await fetch('/api/analyze', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
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
                  <Label htmlFor="report_type">Report Type *</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(value) =>
                      handleInputChange("report_type", value)
                    }
                    disabled={isAnalyzing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isAnalyzing || !formData.ticker}
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

export default AnalysisCard;
