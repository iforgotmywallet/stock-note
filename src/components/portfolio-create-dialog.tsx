"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { X, Coins } from "lucide-react";
import { PortfolioTickerSelector } from "./portfolio-ticker-selector";
import { createPortfolio, getUserCredits, type CreatePortfolioFormData } from "~/actions/portfolios";
import { loadTickerData } from "~/lib/utils/ticker-utils";
import { getEffectiveAllocation } from "~/lib/utils";
import { toast } from "sonner";

const PORTFOLIO_CREATION_COST = 15;

interface PortfolioCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPortfolioCreated?: () => void;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
];

export const PortfolioCreateDialog: React.FC<PortfolioCreateDialogProps> = ({
  open,
  onOpenChange,
  onPortfolioCreated,
}) => {
  const [formData, setFormData] = useState<CreatePortfolioFormData>({
    name: "",
    description: "",
    tickers: [],
    days_of_week: [],
    allocation_per_ticker: 0.1, // Default to 10%
    enabled: true,
    leverage: 1.0, // Default to 1x leverage
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tickerData, setTickerData] = useState<Record<string, string>>({});
  const [isLoadingTickers, setIsLoadingTickers] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Load ticker data when component mounts
  useEffect(() => {
    const loadTickers = async () => {
      setIsLoadingTickers(true);
      try {
        const data = await loadTickerData();
        setTickerData(data);
      } catch (error) {
        console.error("Failed to load ticker data:", error);
        toast.error("Failed to load ticker data. Some validation may not work properly.");
      } finally {
        setIsLoadingTickers(false);
      }
    };

    loadTickers();
  }, []);

  // Load user credits when dialog opens
  useEffect(() => {
    if (open) {
      const loadCredits = async () => {
        setIsLoadingCredits(true);
        try {
          const credits = await getUserCredits();
          setUserCredits(credits);
        } catch (error) {
          console.error("Failed to load user credits:", error);
          toast.error("Failed to load credit balance.");
        } finally {
          setIsLoadingCredits(false);
        }
      };

      loadCredits();
    }
  }, [open]);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        description: "",
        tickers: [],
        days_of_week: [],
        allocation_per_ticker: 0.1,
        enabled: true,
        leverage: 1.0,
      });
      setErrors({});
      setIsSubmitting(false);
      setUserCredits(null);
    }
  }, [open]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate portfolio name
    if (!formData.name?.trim()) {
      newErrors.name = "Portfolio name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Portfolio name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Portfolio name must be 100 characters or less";
    } else if (!/^[a-zA-Z0-9\s\-_.,()]+$/.test(formData.name.trim())) {
      newErrors.name = "Portfolio name contains invalid characters";
    }

    // Validate description length
    if (formData.description && formData.description.length > 250) {
      newErrors.description = "Description must be 250 characters or less";
    }

    // Validate tickers
    if (formData.tickers?.length === 0) {
      newErrors.tickers = "At least one ticker is required";
    } else if (formData.tickers.length > 10) {
      newErrors.tickers = "Maximum 10 tickers allowed per portfolio";
    } else {
      // Validate individual tickers
      const invalidTickers: string[] = [];
      const duplicateTickers: string[] = [];
      const tickerSet = new Set<string>();

      for (const ticker of formData.tickers) {
        const cleanTicker = ticker.trim().toUpperCase();
        
        // Check for duplicates
        if (tickerSet.has(cleanTicker)) {
          if (!duplicateTickers.includes(cleanTicker)) {
            duplicateTickers.push(cleanTicker);
          }
        } else {
          tickerSet.add(cleanTicker);
        }

        // Validate ticker format
        if (!/^[A-Z]{1,10}$/.test(cleanTicker)) {
          invalidTickers.push(ticker);
        }
        // Validate ticker existence (if ticker data is loaded)
        else if (Object.keys(tickerData).length > 0 && !tickerData[cleanTicker]) {
          invalidTickers.push(ticker);
        }
      }

      if (duplicateTickers.length > 0) {
        newErrors.tickers = `Duplicate tickers found: ${duplicateTickers.join(", ")}`;
      } else if (invalidTickers.length > 0) {
        newErrors.tickers = `Invalid or unknown tickers: ${invalidTickers.join(", ")}`;
      }
    }

    // Validate days of week
    if (formData.days_of_week?.length === 0) {
      newErrors.days_of_week = "At least one trading day is required";
    } else {
      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
      const invalidDays = formData.days_of_week.filter(day => 
        !validDays.includes(day.toLowerCase())
      );
      if (invalidDays.length > 0) {
        newErrors.days_of_week = `Invalid days selected: ${invalidDays.join(", ")}`;
      }
    }

    // Validate allocation percentage
    if (typeof formData.allocation_per_ticker !== "number") {
      newErrors.allocation_per_ticker = "Allocation must be a valid number";
    } else if (formData.allocation_per_ticker < 0.01) {
      newErrors.allocation_per_ticker = "Allocation must be at least 1%";
    } else if (formData.allocation_per_ticker > 1.0) {
      newErrors.allocation_per_ticker = "Allocation cannot exceed 100%";
    }

    // Validate enabled status
    if (typeof formData.enabled !== "boolean") {
      newErrors.enabled = "Portfolio status must be specified";
    }

    // Validate leverage
    if (typeof formData.leverage !== "number") {
      newErrors.leverage = "Leverage must be a valid number";
    } else if (formData.leverage < 1.0) {
      newErrors.leverage = "Leverage must be at least 1.0x";
    } else if (formData.leverage > 5.0) {
      newErrors.leverage = "Leverage cannot exceed 5.0x";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Show loading toast for better UX
      const loadingToast = toast.loading("Creating portfolio...");

      const result = await createPortfolio(formData);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(result.message || "Portfolio created successfully!");
        onOpenChange(false);
        onPortfolioCreated?.();
      } else {
        // Handle server-side validation errors
        const errorMessage = result.message || "Failed to create portfolio";
        
        if (result.error) {
          // Map specific server errors to form fields
          const serverError = result.error.toLowerCase();
          
          // Handle insufficient credits error
          if (serverError.includes("credit") || serverError.includes("balance")) {
            toast.error(result.error);
            setErrors({ general: result.error });
            // Refresh credit balance
            try {
              const credits = await getUserCredits();
              setUserCredits(credits);
            } catch (e) {
              console.error("Failed to refresh credits:", e);
            }
          } else if (serverError.includes("name")) {
            toast.error(errorMessage);
            setErrors({ name: result.error });
          } else if (serverError.includes("ticker")) {
            toast.error(errorMessage);
            setErrors({ tickers: result.error });
          } else if (serverError.includes("day")) {
            toast.error(errorMessage);
            setErrors({ days_of_week: result.error });
          } else if (serverError.includes("allocation")) {
            toast.error(errorMessage);
            setErrors({ allocation_per_ticker: result.error });
          } else if (serverError.includes("authentication") || serverError.includes("unauthorized")) {
            toast.error("Authentication error. Please sign in again.");
            setErrors({ general: "Authentication error. Please sign in again." });
            // Could redirect to login here if needed
          } else if (serverError.includes("database") || serverError.includes("connection")) {
            toast.error("Database connection error. Please try again later.");
            setErrors({ general: "Database connection error. Please try again later." });
          } else {
            toast.error(errorMessage);
            setErrors({ general: result.error });
          }
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error creating portfolio:", error);
      
      // Handle different types of network/client errors
      let errorMessage = "An unexpected error occurred";
      let userFriendlyMessage = "Failed to create portfolio. Please try again.";
      
      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage = "Network connection error";
        userFriendlyMessage = "Network error. Please check your connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes("timeout")) {
          userFriendlyMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("abort")) {
          userFriendlyMessage = "Request was cancelled. Please try again.";
        }
      }
      
      toast.error(userFriendlyMessage);
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle day selection
  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
    // Clear days error when user changes selection
    if (errors.days_of_week) {
      setErrors(prev => {
        const { days_of_week, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle day removal from badge
  const handleDayRemove = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.filter(d => d !== day)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
          <DialogDescription>
            Set up a new investment portfolio with your preferred tickers, trading days, and allocation strategy.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Loading overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Creating portfolio...</p>
              </div>
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
          {/* General Error */}
          {errors.general && (
            <div 
              className="text-sm text-destructive bg-destructive/10 p-3 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {errors.general}
            </div>
          )}

          {/* Portfolio Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Portfolio Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                // Clear name error when user starts typing
                if (errors.name) {
                  setErrors(prev => {
                    const { name, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="Enter portfolio name (2-100 characters)"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              maxLength={100}
              required
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Portfolio Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                // Clear description error when user starts typing
                if (errors.description) {
                  setErrors(prev => {
                    const { description, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="Optional description for your portfolio (max 250 characters)"
              disabled={isSubmitting}
              rows={3}
              maxLength={250}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : "description-count"}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span id="description-count" aria-live="polite">
                {formData.description?.length || 0}/250 characters
              </span>
            </div>
            {errors.description && (
              <p id="description-error" className="text-sm text-destructive" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          {/* Ticker Selection */}
          <div className="space-y-2">
            <Label id="tickers-label">Tickers * (max 10)</Label>
            <PortfolioTickerSelector
              selectedTickers={formData.tickers}
              onTickersChange={(tickers) => {
                setFormData(prev => ({ ...prev, tickers }));
                // Clear tickers error when user changes selection
                if (errors.tickers) {
                  setErrors(prev => {
                    const { tickers, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              disabled={isSubmitting || isLoadingTickers}
              placeholder={isLoadingTickers ? "Loading ticker data..." : "Select stock tickers for your portfolio"}
              maxSelections={10}
              aria-labelledby="tickers-label"
              aria-describedby={errors.tickers ? "tickers-error" : "tickers-count"}
              aria-invalid={!!errors.tickers}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-muted-foreground">
              <span id="tickers-count" aria-live="polite">
                {formData.tickers.length}/10 tickers selected
              </span>
              <span className="text-xs text-muted-foreground">
                Limited to 10 tickers for optimal portfolio management
              </span>
              {isLoadingTickers && (
                <span aria-live="polite">Loading validation data...</span>
              )}
            </div>
            {errors.tickers && (
              <p id="tickers-error" className="text-sm text-destructive" role="alert">
                {errors.tickers}
              </p>
            )}
          </div>

          {/* Days of Week Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Trading Days *
            </legend>
            
            {/* Selected days as badges */}
            {formData.days_of_week.length > 0 && (
              <div className="flex flex-wrap gap-1" role="group" aria-label="Selected trading days">
                {formData.days_of_week.map((day) => {
                  const dayLabel = DAYS_OF_WEEK.find(d => d.value === day)?.label || day;
                  return (
                    <Badge
                      key={day}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <span>{dayLabel}</span>
                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={() => handleDayRemove(day)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                          aria-label={`Remove ${dayLabel} from selected days`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Day selection buttons */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select trading days">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.days_of_week.includes(day.value);
                return (
                  <Button
                    key={day.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                    disabled={isSubmitting}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Remove" : "Add"} ${day.value} as trading day`}
                  >
                    {day.label}
                  </Button>
                );
              })}
            </div>
            
            {errors.days_of_week && (
              <p className="text-sm text-destructive" role="alert">
                {errors.days_of_week}
              </p>
            )}
          </fieldset>

          {/* Allocation Per Ticker */}
          <div className="space-y-3">
            <Label htmlFor="allocation-slider">
              Allocation Per Ticker: {Math.round(formData.allocation_per_ticker * 100)}%
            </Label>
            <Slider
              id="allocation-slider"
              value={[formData.allocation_per_ticker]}
              onValueChange={(values) => {
                const value = values[0];
                if (value !== undefined) {
                  setFormData(prev => ({ ...prev, allocation_per_ticker: value }));
                  // Clear allocation error when user changes value
                  if (errors.allocation_per_ticker) {
                    setErrors(prev => {
                      const { allocation_per_ticker, ...rest } = prev;
                      return rest;
                    });
                  }
                }
              }}
              min={0.01}
              max={1.0}
              step={0.01}
              disabled={isSubmitting}
              className="w-full"
              aria-label={`Allocation per ticker: ${Math.round(formData.allocation_per_ticker * 100)} percent`}
              aria-describedby={errors.allocation_per_ticker ? "allocation-error" : "allocation-info"}
            />
            <div id="allocation-range" className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>100%</span>
            </div>
            
            {/* Effective Allocation Information */}
            {formData.tickers.length > 0 && (
              <div id="allocation-info" className="space-y-2 p-3 bg-muted/50 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">Portfolio Overview:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Selected Tickers: {formData.tickers.length}</div>
                  <div>Total Allocation: {Math.round(formData.allocation_per_ticker * formData.tickers.length * 100)}%</div>
                </div>
                {formData.allocation_per_ticker * formData.tickers.length > 1 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    <span className="font-medium">⚠️ Over-allocation detected:</span>
                    <br />
                    Effective allocation per ticker will be{' '}
                    <span className="font-medium">
                      {Math.round(getEffectiveAllocation(formData.allocation_per_ticker, formData.tickers.length) * 100)}%
                    </span>
                    {' '}(normalized to stay within 100% total)
                  </div>
                )}
                {formData.allocation_per_ticker * formData.tickers.length <= 1 && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    ✓ Allocation is within limits. Each ticker will receive{' '}
                    <span className="font-medium">{Math.round(formData.allocation_per_ticker * 100)}%</span>
                  </div>
                )}
              </div>
            )}
            
            {errors.allocation_per_ticker && (
              <p id="allocation-error" className="text-sm text-destructive" role="alert">
                {errors.allocation_per_ticker}
              </p>
            )}
          </div>

          {/* Leverage */}
          <div className="space-y-3">
            <Label htmlFor="leverage-slider">
              Leverage: {formData.leverage.toFixed(1)}x
            </Label>
            <Slider
              id="leverage-slider"
              value={[formData.leverage]}
              onValueChange={(values) => {
                const value = values[0];
                if (value !== undefined) {
                  setFormData(prev => ({ ...prev, leverage: value }));
                  // Clear leverage error when user changes value
                  if (errors.leverage) {
                    setErrors(prev => {
                      const { leverage, ...rest } = prev;
                      return rest;
                    });
                  }
                }
              }}
              min={1.0}
              max={5.0}
              step={0.1}
              disabled={isSubmitting}
              className="w-full"
              aria-label={`Leverage: ${formData.leverage.toFixed(1)}x`}
              aria-describedby={errors.leverage ? "leverage-error" : "leverage-info"}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.0x</span>
              <span>5.0x</span>
            </div>
            
            <div id="leverage-info" className="text-xs text-muted-foreground">
              <span className="font-medium">Leverage multiplies your buying power.</span>
              <br />
              Higher leverage increases both potential gains and losses.
            </div>
            
            {errors.leverage && (
              <p id="leverage-error" className="text-sm text-destructive" role="alert">
                {errors.leverage}
              </p>
            )}
          </div>

          {/* Enable Portfolio */}
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              disabled={isSubmitting}
              aria-describedby="enabled-description"
            />
            <Label htmlFor="enabled">Enable Portfolio</Label>
            <span id="enabled-description" className="sr-only">
              {formData.enabled ? "Portfolio will be active" : "Portfolio will be inactive"}
            </span>
          </div>

          {/* Credit Cost Display */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Portfolio Creation Cost</span>
                <span className="text-xs text-muted-foreground">
                  {isLoadingCredits ? (
                    "Loading balance..."
                  ) : userCredits !== null ? (
                    <>Your balance: {userCredits} credits</>
                  ) : (
                    "Balance unavailable"
                  )}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{PORTFOLIO_CREATION_COST} credits</div>
              {userCredits !== null && userCredits < PORTFOLIO_CREATION_COST && (
                <div className="text-xs text-destructive font-medium">Insufficient balance</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingTickers || isLoadingCredits || Object.values(errors).some(error => error && error.trim())}
              aria-describedby={isSubmitting ? "submit-status" : undefined}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  <span id="submit-status">Creating...</span>
                </>
              ) : (
                "Create Portfolio"
              )}
            </Button>
          </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioCreateDialog;