"use client";

import React, {
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "~/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "~/components/ai-elements/message";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputCommand,
  PromptInputCommandInput,
  PromptInputCommandList,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandSeparator,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
  PromptInputButton,
} from "~/components/ai-elements/prompt-input";

import { Response } from "~/components/ai-elements/response";
import {
  BotMessageSquare,
  AlertCircle,
  RefreshCw,
  FilesIcon,
  CheckIcon,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import {
  GPTModel,
  GPT_MODELS,
  DEFAULT_GPT_MODEL,
  getGPTModelConfig,
} from "~/types/gpt-models";
import { saveGPTModel, loadGPTModel } from "~/lib/utils/gpt-model-storage";
import { MAX_REPORTS_PER_CHAT } from "~/lib/constants";
import {
  ChatInterfaceErrorBoundary,
  ReportSelectionErrorBoundary,
  ModelSelectionErrorBoundary,
  MessageListErrorBoundary,
  ChatInterfaceLoading,
  ReportSelectionLoading,
  ModelSelectionLoading,
  validateChatMessage,
  validateReportSelection,
  validateGPTModel,
  type ChatError,
} from "~/components/enhanced-chat-error-boundaries";

// Enhanced error handling with better categorization
// ChatError type is now imported from enhanced-chat-error-boundaries

// Types based on design document
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  model?: GPTModel;
  reportContext?: {
    reportIds: string[];
    reportCount: number;
  };
}

interface Report {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
}

interface SelectedReport extends Report {
  content: string;
}

interface EnhancedChatContextType {
  // Existing chat state
  messages: ChatMessage[];
  isLoading: boolean;
  error: ChatError | null;

  // Report selection state
  selectedReports: SelectedReport[];
  availableReports: Report[];
  isReportModalOpen: boolean;
  reportSearchQuery: string;
  isReportsLoading: boolean;

  // GPT model state
  selectedGPTModel: GPTModel;

  // Actions
  sendMessage: (message: string, model: GPTModel) => Promise<void>;
  toggleReportSelection: (report: Report) => Promise<void>;
  setReportModalOpen: (open: boolean) => void;
  setReportSearchQuery: (query: string) => void;
  setSelectedGPTModel: (model: GPTModel) => void;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;

  // Error recovery actions
  retryReportFetch: () => Promise<void>;
  clearError: () => void;
}

interface EnhancedChatInterfaceProps {
  className?: string;
}

// Enhanced Chat Context for state management
const EnhancedChatContext = createContext<EnhancedChatContextType | null>(null);

const useEnhancedChatContext = () => {
  const context = useContext(EnhancedChatContext);
  if (!context) {
    throw new Error(
      "useEnhancedChatContext must be used within EnhancedChatProvider",
    );
  }
  return context;
};

// Enhanced Chat Provider Component with comprehensive error handling
function EnhancedChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
  const [availableReports, setAvailableReports] = useState<Report[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [selectedGPTModel, setSelectedGPTModelState] =
    useState<GPTModel>(DEFAULT_GPT_MODEL);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const lastUserMessageRef = useRef<string>("");
  const lastModelRef = useRef<GPTModel>(DEFAULT_GPT_MODEL);

  // Initialize component with error handling
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsInitializing(true);

        // Load GPT model from localStorage
        const savedModel = loadGPTModel();
        setSelectedGPTModelState(savedModel);
        lastModelRef.current = savedModel;

        // Fetch available reports
        await fetchReports();
      } catch (err) {
        console.error("Error initializing chat interface:", err);
        const initError: ChatError = {
          type: "unknown",
          message: "Failed to initialize chat interface",
          retryable: true,
        };
        setError(initError);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeComponent();
  }, []);

  const fetchReports = async () => {
    try {
      setIsReportsLoading(true);
      const response = await fetch("/api/chat/reports");

      if (!response.ok) {
        let errorMessage = "Failed to fetch reports";
        let errorType: ChatError["type"] = "server";

        if (response.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
          errorType = "auth";
        } else if (response.status === 403) {
          errorMessage =
            "Access denied. You don't have permission to view reports.";
          errorType = "auth";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
          errorType = "server";
        } else {
          errorType = "network";
        }

        const reportError: ChatError = {
          type: errorType,
          message: errorMessage,
          retryable: errorType !== "auth",
        };

        // Only set error for critical auth issues, not for general report loading
        if (errorType === "auth") {
          setError(reportError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response data
      if (!data || !Array.isArray(data.reports)) {
        throw new Error("Invalid reports data received");
      }

      // Convert date strings to Date objects with error handling
      const reportsWithDates = data.reports.map((report: any) => {
        try {
          return {
            ...report,
            analysisDate: new Date(report.analysisDate),
          };
        } catch (dateErr) {
          console.warn("Invalid date in report:", report.sessionId, dateErr);
          return {
            ...report,
            analysisDate: new Date(), // Fallback to current date
          };
        }
      });

      setAvailableReports(reportsWithDates);

      // Clear any previous report-related errors
      if (error?.type === "reports") {
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);

      // Create specific error for report fetching
      const reportError: ChatError = {
        type: "reports",
        message: err instanceof Error ? err.message : "Failed to load reports",
        retryable: true,
      };

      // Only show toast for non-auth errors (auth errors are handled above)
      if (!(err instanceof Error && err.message.includes("Authentication"))) {
        toast.error("Unable to load reports", {
          description: "You can still use the chat without reports.",
          action: {
            label: "Retry",
            onClick: () => void fetchReports(),
          },
        });
      }
    } finally {
      setIsReportsLoading(false);
    }
  };

  const fetchReportContent = async (sessionId: string): Promise<string> => {
    const response = await fetch(`/api/chat/reports/${sessionId}`);

    if (!response.ok) {
      let errorMessage = "Failed to fetch report content";

      if (response.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied to this report.";
      } else if (response.status === 404) {
        errorMessage = "Report not found or no longer available.";
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.content;
  };

  // Helper function to parse and categorize errors
  const parseError = (error: unknown, response?: Response): ChatError => {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        type: "network",
        message:
          "Network connection failed. Please check your internet connection.",
        retryable: true,
      };
    }

    if (response) {
      switch (response.status) {
        case 401:
          return {
            type: "auth",
            message: "Authentication required. Please log in again.",
            retryable: false,
          };
        case 403:
          return {
            type: "auth",
            message:
              "Access denied. You do not have permission to perform this action.",
            retryable: false,
          };
        case 429:
          return {
            type: "openai",
            message:
              "Rate limit exceeded. Please wait a moment before trying again.",
            retryable: true,
          };
        case 500:
          return {
            type: "server",
            message: "Server error occurred. Please try again later.",
            retryable: true,
          };
        case 503:
          return {
            type: "server",
            message: "Service temporarily unavailable. Please try again later.",
            retryable: true,
          };
        default:
          return {
            type: "server",
            message: `Server error (${response.status}). Please try again.`,
            retryable: true,
          };
      }
    }

    if (error instanceof Error) {
      return {
        type: "unknown",
        message: error.message,
        retryable: true,
      };
    }

    return {
      type: "unknown",
      message: "An unexpected error occurred. Please try again.",
      retryable: true,
    };
  };

  // Enhanced validation with comprehensive checks
  const validateMessageInput = (
    message: string,
  ): { isValid: boolean; error?: string } => {
    const validation = validateChatMessage(message);
    return validation;
  };

  const sendMessage = useCallback(
    async (message: string, model: GPTModel) => {
      // Enhanced validation with comprehensive checks
      const messageValidation = validateMessageInput(message);
      if (!messageValidation.isValid) {
        const error: ChatError = {
          type: "validation",
          message: messageValidation.error || "Invalid message",
          retryable: false,
        };
        setError(error);
        toast.error(messageValidation.error);
        return;
      }

      // Validate model selection
      const modelValidation = validateGPTModel(
        model,
        GPT_MODELS.map((m) => m.id),
      );
      if (!modelValidation.isValid) {
        const error: ChatError = {
          type: "model",
          message: modelValidation.error || "Invalid model selection",
          retryable: false,
        };
        setError(error);
        toast.error(modelValidation.error);
        return;
      }

      // Validate report selection
      const reportValidation = validateReportSelection(
        selectedReports,
        MAX_REPORTS_PER_CHAT,
      );
      if (!reportValidation.isValid) {
        const error: ChatError = {
          type: "reports",
          message: reportValidation.error || "Invalid report selection",
          retryable: false,
        };
        setError(error);
        toast.error(reportValidation.error);
        return;
      }

      setError(null);
      const trimmedMessage = message.trim();
      lastUserMessageRef.current = trimmedMessage;
      lastModelRef.current = model;

      // Add user message with sending status
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedMessage,
        timestamp: new Date(),
        status: "sending",
        model,
        reportContext:
          selectedReports.length > 0
            ? {
                reportIds: selectedReports.map((r) => r.sessionId),
                reportCount: selectedReports.length,
              }
            : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Create assistant message placeholder for streaming
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "sending",
        model,
      };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
            model,
            context: {
              reports: selectedReports,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = parseError(
            new Error(errorData.error || "Request failed"),
            response,
          );
          throw new Error(errorData.error || "Request failed");
        }

        // Update user message status to sent
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, status: "sent" as const }
              : msg,
          ),
        );

        // Add assistant message placeholder
        setMessages((prev) => [...prev, assistantMessage]);

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                // Mark assistant message as complete
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, status: "sent" as const }
                      : msg,
                  ),
                );
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;

                  // Update assistant message with accumulated content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg,
                    ),
                  );
                }
              } catch (e) {
                // Skip invalid JSON
                continue;
              }
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);

        const chatError =
          err instanceof Error && "type" in err
            ? (err as ChatError)
            : parseError(err);

        setError(chatError);

        // Show appropriate toast based on error type
        if (chatError.type === "auth") {
          toast.error(chatError.message, {
            action: {
              label: "Login",
              onClick: () => (window.location.href = "/auth/login"),
            },
          });
        } else if (chatError.retryable) {
          toast.error(chatError.message, {
            action: {
              label: "Retry",
              onClick: () => void retryLastMessage(),
            },
          });
        } else {
          toast.error(chatError.message);
        }

        // Update user message status to error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, status: "error" as const }
              : msg,
          ),
        );

        // Remove assistant message placeholder if it was added
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedReports],
  );

  const toggleReportSelection = useCallback(
    async (report: Report) => {
      try {
        const isSelected = selectedReports.some(
          (r) => r.sessionId === report.sessionId,
        );

        if (isSelected) {
          // Remove report from selection
          setSelectedReports((prev) =>
            prev.filter((r) => r.sessionId !== report.sessionId),
          );
          toast.success(`Removed ${report.ticker} from selection`);
        } else {
          // Validate selection limit before adding
          const validation = validateReportSelection(
            [...selectedReports, report],
            MAX_REPORTS_PER_CHAT,
          );
          if (!validation.isValid) {
            toast.error(validation.error);
            return;
          }

          // Add report to selection with loading state
          toast.loading(`Loading ${report.ticker} report...`, {
            id: `loading-${report.sessionId}`,
          });

          try {
            const content = await fetchReportContent(report.sessionId);
            const selectedReport: SelectedReport = { ...report, content };

            setSelectedReports((prev) => [...prev, selectedReport]);
            toast.success(`Added ${report.ticker} to selection`, {
              id: `loading-${report.sessionId}`,
            });
          } catch (err) {
            console.error("Error fetching report content:", err);
            const errorMessage =
              err instanceof Error
                ? err.message
                : "Failed to load report content";
            toast.error(`Failed to load ${report.ticker}: ${errorMessage}`, {
              id: `loading-${report.sessionId}`,
            });

            // Create a more specific error for report loading
            const reportError: ChatError = {
              type: "reports",
              message: `Failed to load report: ${report.ticker}`,
              details: { reportId: report.sessionId, ticker: report.ticker },
              retryable: true,
            };
            setError(reportError);
          }
        }
      } catch (err) {
        console.error("Error in report selection:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Report selection error: ${errorMessage}`);
      }
    },
    [selectedReports],
  );

  const setSelectedGPTModel = useCallback((model: GPTModel) => {
    setSelectedGPTModelState(model);
    saveGPTModel(model);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    lastUserMessageRef.current = "";
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      try {
        // Clear any existing errors
        setError(null);

        // Remove the last error message
        setMessages((prev) => prev.filter((msg) => msg.status !== "error"));

        // Retry the message
        await sendMessage(lastUserMessageRef.current, lastModelRef.current);
      } catch (err) {
        console.error("Error retrying message:", err);
        toast.error("Failed to retry message");
      }
    }
  }, [sendMessage]);

  // Error recovery functions
  const retryReportFetch = useCallback(async () => {
    try {
      setError(null);
      await fetchReports();
      toast.success("Reports loaded successfully");
    } catch (err) {
      console.error("Error retrying report fetch:", err);
      toast.error("Failed to retry loading reports");
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue: EnhancedChatContextType = {
    messages,
    isLoading,
    error,
    selectedReports,
    availableReports,
    isReportModalOpen,
    reportSearchQuery,
    selectedGPTModel,
    sendMessage,
    toggleReportSelection,
    setReportModalOpen: setIsReportModalOpen,
    setReportSearchQuery,
    setSelectedGPTModel,
    clearChat,
    retryLastMessage,
    // Additional error recovery functions
    retryReportFetch,
    clearError,
    isReportsLoading,
  };

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <EnhancedChatContext.Provider value={contextValue}>
        <ChatInterfaceLoading message="Initializing chat interface..." />
      </EnhancedChatContext.Provider>
    );
  }

  return (
    <EnhancedChatContext.Provider value={contextValue}>
      {children}
    </EnhancedChatContext.Provider>
  );
}

// Report Selection Components with Error Boundary
function ReportSelectionActionMenu() {
  const {
    selectedReports,
    availableReports,
    reportSearchQuery,
    setReportSearchQuery,
    toggleReportSelection,
    isReportModalOpen,
    setReportModalOpen,
    isReportsLoading,
  } = useEnhancedChatContext();

  // Keyboard navigation and accessibility
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setReportModalOpen(false);
          break;
        case "ArrowDown":
          event.preventDefault();
          // Focus next item in the list
          const currentFocus = document.activeElement;
          const items = modalRef.current?.querySelectorAll(
            '[role="option"]:not([aria-disabled="true"])',
          );
          if (items && items.length > 0) {
            const currentIndex = Array.from(items).indexOf(
              currentFocus!,
            );
            const nextIndex =
              currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            (items[nextIndex] as HTMLElement)?.focus();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          // Focus previous item in the list
          const currentFocusUp = document.activeElement;
          const itemsUp = modalRef.current?.querySelectorAll(
            '[role="option"]:not([aria-disabled="true"])',
          );
          if (itemsUp && itemsUp.length > 0) {
            const currentIndexUp = Array.from(itemsUp).indexOf(
              currentFocusUp!,
            );
            const prevIndex =
              currentIndexUp > 0 ? currentIndexUp - 1 : itemsUp.length - 1;
            (itemsUp[prevIndex] as HTMLElement)?.focus();
          }
          break;
        case "Enter":
        case " ":
          // Handle selection if focused on a report item
          const focusedElement = document.activeElement;
          if (focusedElement?.getAttribute("role") === "option") {
            event.preventDefault();
            (focusedElement as HTMLElement).click();
          }
          break;
      }
    },
    [setReportModalOpen],
  );

  // Focus management when modal opens/closes
  useEffect(() => {
    if (isReportModalOpen) {
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isReportModalOpen]);

  const filteredReports = useMemo(() => {
    if (!reportSearchQuery.trim()) return availableReports;

    const query = reportSearchQuery.toLowerCase();
    return availableReports.filter(
      (report) =>
        report.ticker.toLowerCase().includes(query) ||
        report.name.toLowerCase().includes(query) ||
        report.recommendation.toLowerCase().includes(query),
    );
  }, [availableReports, reportSearchQuery]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case "buy":
      case "strong buy":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "sell":
      case "strong sell":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  // Show loading state if reports are being fetched
  if (availableReports.length === 0 && isReportsLoading) {
    return <ReportSelectionLoading />;
  }

  return (
    <ReportSelectionErrorBoundary>
      <Popover open={isReportModalOpen} onOpenChange={setReportModalOpen}>
        <PopoverTrigger asChild>
          <PromptInputButton
            variant="ghost"
            className="gap-2"
            aria-label={
              selectedReports.length > 0
                ? `Report selection. ${selectedReports.length} reports selected`
                : "Select reports for analysis"
            }
            aria-expanded={isReportModalOpen}
            aria-haspopup="dialog"
          >
            <FilesIcon className="size-4" aria-hidden="true" />
            {selectedReports.length > 0 ? (
              <Badge
                variant="secondary"
                className="ml-1"
                aria-label={`${selectedReports.length} reports selected`}
              >
                {selectedReports.length}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                Add reports from your analysis...
              </span>
            )}
          </PromptInputButton>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 p-0"
          ref={modalRef}
          role="dialog"
          aria-label="Report selection dialog"
          aria-modal="true"
          onKeyDown={handleKeyDown}
          align="start"
        >
          <PromptInputCommand>
            <PromptInputCommandInput
              ref={searchInputRef}
              placeholder="Search reports..."
              value={reportSearchQuery}
              onValueChange={setReportSearchQuery}
              className="border-0 focus:ring-0"
              aria-label="Search reports by ticker, name, or recommendation"
            />
            <PromptInputCommandList
              className="max-h-80"
              role="listbox"
              aria-label="Available reports"
            >
              <PromptInputCommandEmpty role="status" aria-live="polite">
                {availableReports.length === 0
                  ? "No reports available."
                  : "No reports found."}
              </PromptInputCommandEmpty>

              {selectedReports.length > 0 && (
                <>
                  <PromptInputCommandGroup
                    heading="Added"
                    role="group"
                    aria-label="Selected reports"
                  >
                    {selectedReports.map((report) => (
                      <PromptInputCommandItem
                        key={`selected-${report.sessionId}`}
                        onSelect={() => toggleReportSelection(report)}
                        className="flex items-center justify-between"
                        role="option"
                        aria-selected="true"
                        aria-label={`Remove ${report.ticker} (${report.recommendation})`}
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-2">
                          <CheckIcon
                            className="size-4 text-green-600"
                            aria-hidden="true"
                          />
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {report.ticker}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getRecommendationColor(report.recommendation),
                              )}
                            >
                              <TrendingUp
                                className="mr-1 size-2.5"
                                aria-hidden="true"
                              />
                              {report.recommendation}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                          <span className="text-xs opacity-50">
                            #{report.sessionId.slice(-6)}
                          </span>
                          <Calendar
                            className="ml-1 size-2.5"
                            aria-hidden="true"
                          />
                          <span>
                            {report.analysisDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </PromptInputCommandItem>
                    ))}
                  </PromptInputCommandGroup>
                  <PromptInputCommandSeparator role="separator" />
                </>
              )}

              <PromptInputCommandGroup
                heading="Other Files"
                role="group"
                aria-label="Available reports"
              >
                {filteredReports
                  .filter(
                    (report) =>
                      !selectedReports.some(
                        (selected) => selected.sessionId === report.sessionId,
                      ),
                  )
                  .map((report) => (
                    <PromptInputCommandItem
                      key={`available-${report.sessionId}`}
                      onSelect={() => toggleReportSelection(report)}
                      className="flex items-center justify-between"
                      disabled={selectedReports.length >= MAX_REPORTS_PER_CHAT}
                      role="option"
                      aria-selected="false"
                      aria-disabled={
                        selectedReports.length >= MAX_REPORTS_PER_CHAT
                      }
                      aria-label={`Add ${report.ticker} (${report.recommendation})${
                        selectedReports.length >= MAX_REPORTS_PER_CHAT
                          ? ". Maximum reports selected"
                          : ""
                      }`}
                      tabIndex={
                        selectedReports.length >= MAX_REPORTS_PER_CHAT ? -1 : 0
                      }
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-4" aria-hidden="true" />{" "}
                        {/* Placeholder for checkbox */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {report.ticker}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getRecommendationColor(report.recommendation),
                            )}
                          >
                            <TrendingUp
                              className="mr-1 size-2.5"
                              aria-hidden="true"
                            />
                            {report.recommendation}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <span className="text-xs opacity-50">
                          #{report.sessionId.slice(-6)}
                        </span>
                        <Calendar
                          className="ml-1 size-2.5"
                          aria-hidden="true"
                        />
                        <span>
                          {report.analysisDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </PromptInputCommandItem>
                  ))}
              </PromptInputCommandGroup>
            </PromptInputCommandList>
          </PromptInputCommand>
        </PopoverContent>
      </Popover>
    </ReportSelectionErrorBoundary>
  );
}

// GPT Model Selection Component with Error Boundary
function GPTModelSelector() {
  const { selectedGPTModel, setSelectedGPTModel } = useEnhancedChatContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleModelChange = useCallback(
    async (value: GPTModel) => {
      try {
        setIsLoading(true);

        // Validate model before setting
        const validation = validateGPTModel(
          value,
          GPT_MODELS.map((m) => m.id),
        );
        if (!validation.isValid) {
          toast.error(validation.error);
          return;
        }

        setSelectedGPTModel(value);
        toast.success(`Switched to ${getGPTModelConfig(value).name}`);
      } catch (err) {
        console.error("Error changing model:", err);
        toast.error("Failed to change model");
      } finally {
        setIsLoading(false);
      }
    },
    [setSelectedGPTModel],
  );

  if (isLoading) {
    return <ModelSelectionLoading />;
  }

  const currentModel = getGPTModelConfig(selectedGPTModel);

  return (
    <ModelSelectionErrorBoundary>
      <PromptInputModelSelect
        value={selectedGPTModel}
        onValueChange={handleModelChange}
        disabled={isLoading}
      >
        <PromptInputModelSelectTrigger
          className="w-auto"
          aria-label={`GPT Model selector. Currently selected: ${currentModel.name}`}
          aria-describedby="model-description"
        >
          <PromptInputModelSelectValue>
            {currentModel.name}
          </PromptInputModelSelectValue>
        </PromptInputModelSelectTrigger>
        <PromptInputModelSelectContent
          role="listbox"
          aria-label="Available GPT models"
        >
          {GPT_MODELS.map((model) => (
            <PromptInputModelSelectItem
              key={model.id}
              value={model.id}
              role="option"
              aria-selected={model.id === selectedGPTModel}
              aria-label={`${model.name} - ${model.description}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-muted-foreground text-xs">
                  {model.description}
                </span>
              </div>
            </PromptInputModelSelectItem>
          ))}
        </PromptInputModelSelectContent>
      </PromptInputModelSelect>
      <div id="model-description" className="sr-only">
        {currentModel.description}
      </div>
    </ModelSelectionErrorBoundary>
  );
}

// Main Enhanced Chat Interface Content Component
function EnhancedChatInterfaceContent({ className }: { className?: string }) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
    selectedGPTModel,
    selectedReports,
    clearError,
    retryReportFetch,
  } = useEnhancedChatContext();

  const handleSubmit = useCallback(
    async (messageData: { text?: string }, event: React.FormEvent) => {
      event.preventDefault();

      if (!messageData.text?.trim()) {
        toast.error("Please enter a message");
        return;
      }

      await sendMessage(messageData.text, selectedGPTModel);
    },
    [sendMessage, selectedGPTModel],
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Error Banner */}
      {error && (
        <div
          className="bg-destructive/10 border-b px-4 py-2"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle
                className="text-destructive h-4 w-4"
                aria-hidden="true"
              />
              <span className="text-destructive text-sm" id="error-message">
                {error.message}
              </span>
            </div>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-labelledby="error-message"
            >
              {error.retryable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={
                    error.type === "reports"
                      ? retryReportFetch
                      : retryLastMessage
                  }
                  className="h-7 text-xs"
                  aria-label={`Retry ${error.type === "reports" ? "loading reports" : "sending message"}`}
                >
                  <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
                  Retry
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={clearError}
                className="h-7 text-xs"
                aria-label="Dismiss error message"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      <Conversation
        className="flex-1"
        role="main"
        aria-label="Chat conversation"
      >
        <ConversationContent
          className={
            messages.length === 0
              ? "flex min-h-full items-center justify-center p-4"
              : "p-4"
          }
        >
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask questions about your selected reports to get AI-powered insights"
              icon={<BotMessageSquare className="size-12" aria-hidden="true" />}
              role="status"
              aria-live="polite"
            />
          ) : (
            <MessageListErrorBoundary>
              <div
                className="mx-auto max-w-4xl space-y-6"
                role="log"
                aria-label="Chat messages"
                aria-live="polite"
                aria-atomic="false"
              >
                {messages.map((message, index) => (
                  <Message
                    key={message.id}
                    from={message.role}
                    role="article"
                    aria-label={`${message.role === "user" ? "User" : "AI Assistant"} message ${index + 1}`}
                  >
                    <MessageAvatar
                      src=""
                      name={message.role === "user" ? "Me" : "AI"}
                      className="size-10 text-sm font-semibold"
                      aria-hidden="true"
                    />
                    <MessageContent variant="flat" className="bg-transparent">
                      <div className="space-y-3">
                        {/* Message content */}
                        <div className="min-w-0">
                          {message.role === "assistant" ? (
                            <div
                              className="prose prose-sm dark:prose-invert prose-headings:font-semibold prose-p:text-foreground/90 dark:prose-p:text-foreground/80 prose-strong:text-foreground dark:prose-strong:text-foreground/90 prose-code:text-foreground/90 dark:prose-code:text-foreground/80 max-w-none"
                              role="region"
                              aria-label="AI response"
                            >
                              <Response>{message.content}</Response>
                            </div>
                          ) : (
                            <div
                              className="text-foreground/90 dark:text-foreground/80 text-sm whitespace-pre-wrap"
                              role="region"
                              aria-label="User message"
                            >
                              {message.content}
                            </div>
                          )}
                        </div>

                        {/* Message metadata */}
                        <div
                          className="text-muted-foreground flex items-center gap-3 pt-1 text-xs"
                          role="complementary"
                          aria-label="Message metadata"
                        >
                          <span
                            aria-label={`Sent at ${message.timestamp.toLocaleString()}`}
                          >
                            {message.timestamp.toLocaleTimeString()}
                          </span>

                          {message.reportContext && (
                            <span
                              className="text-muted-foreground"
                              aria-label={`Used ${message.reportContext.reportCount} report${message.reportContext.reportCount !== 1 ? "s" : ""} for context`}
                            >
                              {message.reportContext.reportCount} report
                              {message.reportContext.reportCount !== 1
                                ? "s"
                                : ""}
                            </span>
                          )}

                          {message.status === "error" && (
                            <div
                              className="text-destructive flex items-center gap-1.5"
                              role="alert"
                              aria-live="assertive"
                            >
                              <AlertCircle
                                className="size-3"
                                aria-hidden="true"
                              />
                              <span>Failed to send</span>
                            </div>
                          )}
                        </div>

                        {/* Retry button for failed messages */}
                        {message.status === "error" && (
                          <div className="pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={retryLastMessage}
                              aria-label="Retry sending the last message"
                            >
                              <RefreshCw
                                className="mr-1.5 size-3"
                                aria-hidden="true"
                              />
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    </MessageContent>
                  </Message>
                ))}
              </div>
            </MessageListErrorBoundary>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur">
        <div className="mx-auto max-w-4xl p-4">
          <PromptInputProvider>
            <PromptInput
              onSubmit={handleSubmit}
              onError={(error) => {
                toast.error(error.message);
              }}
            >
              <PromptInputTextarea
                placeholder="Ask about your selected reports... (Press Enter to send, Shift+Enter for new line)"
                disabled={isLoading}
                className="min-h-[60px] resize-none"
                rows={2}
                aria-label="Chat message input"
                aria-describedby="chat-input-help"
              />
              <div id="chat-input-help" className="sr-only">
                Type your message and press Enter to send, or Shift+Enter for a
                new line.
              </div>

              <PromptInputFooter>
                <PromptInputTools>
                  <div className="flex items-center gap-2">
                    <ReportSelectionActionMenu />
                    <GPTModelSelector />
                    {messages.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearChat}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        Clear Chat
                      </Button>
                    )}
                  </div>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={isLoading}
                  status={isLoading ? "submitted" : undefined}
                  aria-label={isLoading ? "Sending message..." : "Send message"}
                  aria-describedby="submit-help"
                />
                <div id="submit-help" className="sr-only">
                  {isLoading
                    ? "Message is being sent"
                    : `Send message using ${getGPTModelConfig(selectedGPTModel).name}${
                        selectedReports.length > 0
                          ? ` with ${selectedReports.length} selected reports`
                          : ""
                      }`}
                </div>
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>
      </div>
    </div>
  );
}

// Main exported component with provider and error boundary
export function EnhancedChatInterface({
  className,
}: EnhancedChatInterfaceProps) {
  return (
    <ChatInterfaceErrorBoundary>
      <EnhancedChatProvider>
        <EnhancedChatInterfaceContent className={className} />
      </EnhancedChatProvider>
    </ChatInterfaceErrorBoundary>
  );
}
