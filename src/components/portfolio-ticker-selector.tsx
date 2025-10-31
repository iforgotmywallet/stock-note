"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, ChevronsUpDown, Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover"; // ✅ FIX: import Radix Portal directly
import { cn } from "~/lib/utils";
import {
  loadTickerData,
  createTickerOptions,
  filterTickerOptions,
  truncateTickerName,
  type TickerOption,
  type FilteredTickerResults,
} from "~/lib/utils/ticker-utils";

interface PortfolioTickerSelectorProps {
  selectedTickers: string[];
  onTickersChange: (tickers: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxSelections?: number;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export const PortfolioTickerSelector: React.FC<
  PortfolioTickerSelectorProps
> = ({
  selectedTickers,
  onTickersChange,
  disabled = false,
  placeholder = "Select tickers...",
  maxSelections,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}) => {
  const [tickerData, setTickerData] = useState<Record<string, string>>({});
  const [tickerOptions, setTickerOptions] = useState<TickerOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load ticker data
  useEffect(() => {
    const initializeTickerData = async () => {
      const data = await loadTickerData();
      setTickerData(data);
      setTickerOptions(createTickerOptions(data));
    };
    void initializeTickerData();
  }, []);

  // Filter ticker options
  const filteredResults: FilteredTickerResults = useMemo(() => {
    return filterTickerOptions(tickerOptions, searchQuery, tickerData);
  }, [searchQuery, tickerOptions, tickerData]);

  // Select / remove tickers
  const handleTickerSelect = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      onTickersChange(selectedTickers.filter((t) => t !== ticker));
    } else if (!maxSelections || selectedTickers.length < maxSelections) {
      onTickersChange([...selectedTickers, ticker]);
    }
  };

  const handleTickerRemove = (ticker: string) => {
    onTickersChange(selectedTickers.filter((t) => t !== ticker));
  };

  const isMaxSelectionsReached =
    maxSelections && selectedTickers.length >= maxSelections;

  return (
    <div className="space-y-2">
      {/* Selected tickers */}
      {selectedTickers.length > 0 && (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Selected tickers"
        >
          {selectedTickers.map((ticker) => (
            <Badge
              key={ticker}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="font-medium">{ticker}</span>
              {tickerData[ticker] && (
                <span className="text-muted-foreground text-xs">
                  {truncateTickerName(tickerData[ticker], 15)}
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleTickerRemove(ticker)}
                  className="hover:bg-muted-foreground/20 focus:ring-primary ml-1 rounded-full p-0.5 focus:ring-2 focus:ring-offset-1 focus:outline-none"
                  aria-label={`Remove ${ticker}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* ✅ Scroll-safe Popover inside Dialog */}
      <Popover
        modal={false} // important for dialogs
        open={isDropdownOpen}
        onOpenChange={(open) => {
          setIsDropdownOpen(open);
          if (!open) setSearchQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            className="w-full justify-between"
            disabled={disabled || !!isMaxSelectionsReached}
          >
            <span className="truncate text-left">
              {selectedTickers.length === 0
                ? placeholder
                : `${selectedTickers.length} ticker${
                    selectedTickers.length === 1 ? "" : "s"
                  } selected`}
            </span>
            <ChevronsUpDown
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>

        {/* ✅ Portal fix for nested scroll */}
        <PopoverPrimitive.Portal>
          <PopoverContent
            side="bottom"
            align="start"
            className="bg-popover text-popover-foreground z-[9999] max-h-[350px] w-[400px] overflow-y-auto border p-0 shadow-md"
            onWheel={(e) => e.stopPropagation()} // allow scroll inside Dialog
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search tickers..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList
                className="max-h-[300px] overflow-y-auto"
                onWheel={(e) => e.stopPropagation()}
              >
                <CommandEmpty>No ticker found.</CommandEmpty>

                {/* Popular tickers */}
                {filteredResults.popular.length > 0 && (
                  <CommandGroup heading="Popular Tickers">
                    {filteredResults.popular.map((option) => {
                      const isSelected = selectedTickers.includes(
                        option.ticker,
                      );
                      const canSelect =
                        !isSelected &&
                        (!maxSelections ||
                          selectedTickers.length < maxSelections);
                      return (
                        <CommandItem
                          key={option.ticker}
                          value={option.ticker}
                          onSelect={() =>
                            (isSelected || canSelect) &&
                            handleTickerSelect(option.ticker)
                          }
                          disabled={!isSelected && !canSelect}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{option.ticker}</span>
                            <span className="text-muted-foreground truncate text-sm">
                              {truncateTickerName(option.name, 40)}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Other tickers */}
                {filteredResults.others.length > 0 && (
                  <CommandGroup
                    heading={searchQuery ? "Other Results" : "Recent Tickers"}
                  >
                    {filteredResults.others.map((option) => {
                      const isSelected = selectedTickers.includes(
                        option.ticker,
                      );
                      const canSelect =
                        !isSelected &&
                        (!maxSelections ||
                          selectedTickers.length < maxSelections);
                      return (
                        <CommandItem
                          key={option.ticker}
                          value={`${option.ticker} ${option.name}`}
                          onSelect={() =>
                            (isSelected || canSelect) &&
                            handleTickerSelect(option.ticker)
                          }
                          disabled={!isSelected && !canSelect}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{option.ticker}</span>
                            <span className="text-muted-foreground truncate text-sm">
                              {truncateTickerName(option.name, 40)}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {/* Info footer */}
                {searchQuery && (
                  <div className="text-muted-foreground border-t px-2 py-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>
                        Showing{" "}
                        {filteredResults.popular.length +
                          filteredResults.others.length}{" "}
                        results
                        {filteredResults.others.length === 50 &&
                          " (limited to 50)"}
                      </span>
                      {maxSelections && (
                        <span>
                          {selectedTickers.length}/{maxSelections} selected
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Limit notice */}
                {isMaxSelectionsReached && !searchQuery && (
                  <div className="text-muted-foreground border-t px-2 py-1 text-xs">
                    Maximum {maxSelections} tickers selected
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </PopoverPrimitive.Portal>
      </Popover>
    </div>
  );
};

export default PortfolioTickerSelector;
