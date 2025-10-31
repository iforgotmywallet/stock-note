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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
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

export const PortfolioTickerSelector: React.FC<PortfolioTickerSelectorProps> = ({
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

  // Load ticker data on component mount
  useEffect(() => {
    const initializeTickerData = async () => {
      const data = await loadTickerData();
      setTickerData(data);
      
      const options = createTickerOptions(data);
      setTickerOptions(options);
    };
    
    void initializeTickerData();
  }, []);

  // Filter ticker options based on search query
  const filteredResults: FilteredTickerResults = useMemo(() => {
    return filterTickerOptions(tickerOptions, searchQuery, tickerData);
  }, [searchQuery, tickerOptions, tickerData]);

  // Handle ticker selection
  const handleTickerSelect = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      // Remove ticker if already selected
      onTickersChange(selectedTickers.filter(t => t !== ticker));
    } else {
      // Add ticker if not selected and under max limit
      if (!maxSelections || selectedTickers.length < maxSelections) {
        onTickersChange([...selectedTickers, ticker]);
      }
    }
  };

  // Handle ticker removal from badge
  const handleTickerRemove = (ticker: string) => {
    onTickersChange(selectedTickers.filter(t => t !== ticker));
  };

  // Check if max selections reached
  const isMaxSelectionsReached = maxSelections && selectedTickers.length >= maxSelections;

  return (
    <div className="space-y-2">
      {/* Selected tickers as badges */}
      {selectedTickers.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Selected tickers">
          {selectedTickers.map((ticker) => (
            <Badge
              key={ticker}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="font-medium">{ticker}</span>
              {tickerData[ticker] && (
                <span className="text-xs text-muted-foreground">
                  {truncateTickerName(tickerData[ticker], 15)}
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleTickerRemove(ticker)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  aria-label={`Remove ${ticker} ${tickerData[ticker] ? `(${tickerData[ticker]})` : ""} from selection`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Ticker selector dropdown */}
      <Popover 
        open={isDropdownOpen} 
        onOpenChange={(open) => {
          setIsDropdownOpen(open);
          if (!open) {
            setSearchQuery("");
          }
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
            <span className="text-left truncate">
              {selectedTickers.length === 0 
                ? placeholder
                : `${selectedTickers.length} ticker${selectedTickers.length === 1 ? '' : 's'} selected`
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false} role="listbox" aria-label="Ticker selection">
            <CommandInput 
              placeholder="Search tickers..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              aria-label="Search for ticker symbols"
            />
            <CommandList role="group">
              <CommandEmpty>No ticker found.</CommandEmpty>
              
              {/* Popular Tickers Section */}
              {filteredResults.popular.length > 0 && (
                <CommandGroup heading="Popular Tickers">
                  {filteredResults.popular.map((option) => {
                    const isSelected = selectedTickers.includes(option.ticker);
                    const canSelect = !isSelected && (!maxSelections || selectedTickers.length < maxSelections);
                    
                    return (
                      <CommandItem
                        key={option.ticker}
                        value={option.ticker}
                        onSelect={() => {
                          if (isSelected || canSelect) {
                            handleTickerSelect(option.ticker);
                          }
                        }}
                        disabled={!isSelected && !canSelect ? true : undefined}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{option.ticker}</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {truncateTickerName(option.name, 40)}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              
              {/* Other Tickers Section */}
              {filteredResults.others.length > 0 && (
                <CommandGroup heading={searchQuery ? "Other Results" : "Recent Tickers"}>
                  {filteredResults.others.map((option) => {
                    const isSelected = selectedTickers.includes(option.ticker);
                    const canSelect = !isSelected && (!maxSelections || selectedTickers.length < maxSelections);
                    
                    return (
                      <CommandItem
                        key={option.ticker}
                        value={`${option.ticker} ${option.name}`}
                        onSelect={() => {
                          if (isSelected || canSelect) {
                            handleTickerSelect(option.ticker);
                          }
                        }}
                        disabled={!isSelected && !canSelect ? true : undefined}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{option.ticker}</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {truncateTickerName(option.name, 40)}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              
              {/* Show count and max selections info when searching */}
              {searchQuery && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                  <div className="flex justify-between items-center">
                    <span>
                      Showing {filteredResults.popular.length + filteredResults.others.length} results
                      {filteredResults.others.length === 50 && " (limited to 50)"}
                    </span>
                    {maxSelections && (
                      <span>
                        {selectedTickers.length}/{maxSelections} selected
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Max selections reached message */}
              {isMaxSelectionsReached && !searchQuery && (
                <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                  Maximum {maxSelections} tickers selected
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PortfolioTickerSelector;