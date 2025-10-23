"use client";

import React, { useState, createContext, useContext, useCallback } from "react";
import { ReportSelector } from "~/components/report-selector";
import { ChatInterface } from "~/components/chat-interface";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import {
  Menu,
  BotMessageSquare,
  FileText,
  X,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { ErrorBoundary } from "~/components/error-boundary";
import { cn } from "~/lib/utils";

// Types for selected reports (matching ReportSelector interface)
interface SelectedReport {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
  content: string;
}

// Chat Context for state management across the page
interface ChatPageContextType {
  selectedReports: SelectedReport[];
  setSelectedReports: (reports: SelectedReport[]) => void;
  isMobileReportSelectorOpen: boolean;
  setIsMobileReportSelectorOpen: (open: boolean) => void;
  isDesktopReportSelectorOpen: boolean;
  setIsDesktopReportSelectorOpen: (open: boolean) => void;
  clearAllReports: () => void;
}

const ChatPageContext = createContext<ChatPageContextType | null>(null);

const useChatPageContext = () => {
  const context = useContext(ChatPageContext);
  if (!context) {
    throw new Error("useChatPageContext must be used within ChatPageProvider");
  }
  return context;
};

// Chat Page Provider Component
function ChatPageProvider({ children }: { children: React.ReactNode }) {
  const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
  const [isMobileReportSelectorOpen, setIsMobileReportSelectorOpen] =
    useState(false);
  const [isDesktopReportSelectorOpen, setIsDesktopReportSelectorOpen] =
    useState(false);

  // Load initial toggle state from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("chat-report-selector-open");
    if (saved !== null) {
      setIsDesktopReportSelectorOpen(JSON.parse(saved) as boolean);
    }
  }, []);

  // Listen for toggle events from sidebar
  React.useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      setIsDesktopReportSelectorOpen(customEvent.detail.isOpen);
    };

    window.addEventListener("chat-toggle-report-selector", handleToggle);

    return () => {
      window.removeEventListener("chat-toggle-report-selector", handleToggle);
    };
  }, []);

  // Broadcast selected reports count to sidebar
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("chat-reports-count-update", {
        detail: { count: selectedReports.length },
      }),
    );
  }, [selectedReports.length]);

  const clearAllReports = useCallback(() => {
    setSelectedReports([]);
  }, []);

  const contextValue: ChatPageContextType = {
    selectedReports,
    setSelectedReports,
    isMobileReportSelectorOpen,
    setIsMobileReportSelectorOpen,
    isDesktopReportSelectorOpen,
    setIsDesktopReportSelectorOpen,
    clearAllReports,
  };

  return (
    <ChatPageContext.Provider value={contextValue}>
      {children}
    </ChatPageContext.Provider>
  );
}

// Mobile Report Selector Component
function MobileReportSelector() {
  const {
    selectedReports,
    setSelectedReports,
    isMobileReportSelectorOpen,
    setIsMobileReportSelectorOpen,
  } = useChatPageContext();

  return (
    <Sheet
      open={isMobileReportSelectorOpen}
      onOpenChange={setIsMobileReportSelectorOpen}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="mr-2 size-4" />
          Reports
          {selectedReports.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedReports.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Report Selector</SheetTitle>
          <SheetDescription>
            Select reports to include in your chat conversation.
          </SheetDescription>
        </SheetHeader>
        <div className="h-full overflow-hidden">
          <ReportSelector
            selectedReports={selectedReports}
            onReportsSelected={(reports) => {
              setSelectedReports(reports);
              // Auto-close on mobile after selection
              if (reports.length > selectedReports.length) {
                setIsMobileReportSelectorOpen(false);
              }
            }}
            className="h-full rounded-none border-0"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Report Selector Component
function DesktopReportSelector() {
  const { selectedReports, setSelectedReports, isDesktopReportSelectorOpen } =
    useChatPageContext();

  return (
    <div
      className={cn(
        "hidden flex-shrink-0 overflow-hidden transition-all duration-300 md:block",
        isDesktopReportSelectorOpen ? "w-80" : "w-0",
      )}
    >
      {isDesktopReportSelectorOpen && (
        <div className="w-80">
          <ReportSelector
            selectedReports={selectedReports}
            onReportsSelected={setSelectedReports}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}

// Chat Header Component
function ChatHeader() {
  const { selectedReports, clearAllReports } = useChatPageContext();

  return (
    <div className="bg-muted/50 border-b px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotMessageSquare className="text-primary size-6" />
          <div>
            <h1 className="text-xl font-semibold">Financial Chat</h1>
            <p className="text-muted-foreground hidden text-sm sm:block">
              Chat with AI about your financial reports and get insights about
              your stock analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MobileReportSelector />

          {selectedReports.length > 0 && (
            <div className="hidden items-center gap-3 md:flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllReports}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1 size-4" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile selected reports indicator */}
      {selectedReports.length > 0 && (
        <div className="mt-3 md:hidden">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllReports}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 size-4" />
              Reset
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {selectedReports.slice(0, 3).map((report) => (
              <Badge
                key={report.sessionId}
                variant="secondary"
                className="text-xs"
              >
                {report.ticker}
              </Badge>
            ))}
            {selectedReports.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedReports.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Chat Content Component
function ChatContent() {
  const { selectedReports } = useChatPageContext();

  return (
    <div className="min-h-0 flex-1">
      <ChatInterface selectedReports={selectedReports} className="h-full" />
    </div>
  );
}

// Main Chat Page Component
function ChatPageContent() {
  const { isDesktopReportSelectorOpen } = useChatPageContext();

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 md:h-[calc(100vh-6rem)] md:gap-4">
      {/* Desktop Report Selector */}
      <DesktopReportSelector />

      {/* Main Chat Area */}
      <div
        className={cn(
          "bg-card flex min-w-0 flex-1 flex-col rounded-none border-0 transition-all duration-300 md:rounded-lg md:border",
          !isDesktopReportSelectorOpen && "md:max-w-full",
        )}
      >
        <ChatHeader />
        <ChatContent />
      </div>
    </div>
  );
}

// Error Fallback Component
function ChatErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  if (!error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center md:h-[calc(100vh-6rem)]">
        <div className="text-center">
          <AlertTriangle className="text-destructive mx-auto mb-4 size-12" />
          <h2 className="text-xl font-semibold">Unknown Error</h2>
          <Button onClick={resetError} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center md:h-[calc(100vh-6rem)]">
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <AlertTriangle className="text-destructive mx-auto size-12" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred while loading the chat interface. This
          might be a temporary issue.
        </p>
        <div className="space-y-2">
          <Button onClick={resetError} className="w-full">
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Refresh Page
          </Button>
        </div>
        <details className="text-left">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            Technical Details
          </summary>
          <pre className="bg-muted mt-2 overflow-auto rounded p-2 text-xs">
            {error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}

// Main exported page component with provider and error boundary
export default function ChatPage() {
  return (
    <ErrorBoundary fallback={ChatErrorFallback}>
      <ChatPageProvider>
        <div className="container mx-auto h-full px-0 md:px-4">
          <ChatPageContent />
        </div>
      </ChatPageProvider>
    </ErrorBoundary>
  );
}
