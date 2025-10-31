"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  AlertTriangle, 
  RefreshCw, 
  WifiOff, 
  Shield, 
  Server, 
  MessageSquareX,
  FilesIcon,
  BotMessageSquare,
  Settings
} from "lucide-react";
import { ErrorBoundary } from "~/components/error-boundary";
import { Loader } from "~/components/ai-elements/loader";
import { Shimmer } from "~/components/ai-elements/shimmer";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

// Enhanced error types for better categorization
export type ChatErrorType = "network" | "auth" | "validation" | "server" | "openai" | "reports" | "model" | "unknown";

export interface ChatError {
  type: ChatErrorType;
  message: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

// Error boundary props for chat components
interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

/**
 * Enhanced Chat Interface Error Boundary
 * Wraps the entire chat interface with comprehensive error handling
 */
export function ChatInterfaceErrorBoundary({ 
  children, 
  onError,
  componentName = "Chat Interface"
}: ChatErrorBoundaryProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`${componentName} Error:`, error, errorInfo);
    
    // Report error to monitoring service if available
    onError?.(error, errorInfo);
    
    // Show toast notification for critical errors
    toast.error(`${componentName} encountered an error`, {
      description: "Please try refreshing the page or contact support if the issue persists.",
      action: {
        label: "Refresh",
        onClick: () => window.location.reload(),
      },
    });
  }, [onError, componentName]);

  return (
    <ErrorBoundary 
      fallback={ChatInterfaceErrorFallback} 
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Report Selection Error Boundary
 * Handles errors specific to report selection functionality
 */
export function ReportSelectionErrorBoundary({ 
  children, 
  onError,
}: ChatErrorBoundaryProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Report Selection Error:", error, errorInfo);
    onError?.(error, errorInfo);
  }, [onError]);

  return (
    <ErrorBoundary 
      fallback={ReportSelectionErrorFallback} 
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * GPT Model Selection Error Boundary
 * Handles errors specific to model selection functionality
 */
export function ModelSelectionErrorBoundary({ 
  children, 
  onError,
}: ChatErrorBoundaryProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Model Selection Error:", error, errorInfo);
    onError?.(error, errorInfo);
  }, [onError]);

  return (
    <ErrorBoundary 
      fallback={ModelSelectionErrorFallback} 
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Message List Error Boundary
 * Handles errors in message rendering and conversation display
 */
export function MessageListErrorBoundary({ 
  children, 
  onError,
}: ChatErrorBoundaryProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Message List Error:", error, errorInfo);
    onError?.(error, errorInfo);
  }, [onError]);

  return (
    <ErrorBoundary 
      fallback={MessageListErrorFallback} 
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}

// Fallback Components

/**
 * Main Chat Interface Error Fallback
 */
function ChatInterfaceErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  const errorType = categorizeError(error);
  
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            {getErrorIcon(errorType)}
          </div>
          <CardTitle className="text-xl font-semibold text-red-900 dark:text-red-400">
            {getErrorTitle(errorType)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(errorType, error)}
          </p>
          
          <Badge variant="outline" className="text-xs">
            Error Code: {errorType.toUpperCase()}
          </Badge>
          
          {error && process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Technical Details (Development)
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2 justify-center pt-2">
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Report Selection Error Fallback
 */
function ReportSelectionErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <FilesIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Report Selection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load report selection. You can still use the chat without reports.
          </p>
          
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Model Selection Error Fallback
 */
function ModelSelectionErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-2">
      <Card className="w-full max-w-sm">
        <CardContent className="p-4 text-center">
          <div className="mb-2 flex items-center justify-center">
            <Settings className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Model selection unavailable. Using default model.
          </p>
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Message List Error Fallback
 */
function MessageListErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <MessageSquareX className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Message Display Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            There was an issue displaying your conversation. Your messages are safe.
          </p>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading State Components

/**
 * Chat Interface Loading State
 */
export function ChatInterfaceLoading({ message = "Loading chat interface..." }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Loader size={24} />
        </div>
        <div className="space-y-2">
          <Shimmer className="text-lg font-medium">{message}</Shimmer>
          <p className="text-sm text-muted-foreground">
            Please wait while we set up your chat experience
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Report Selection Loading State
 */
export function ReportSelectionLoading() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Loader size={16} />
        </div>
        <Shimmer className="text-sm">Loading reports...</Shimmer>
      </div>
    </div>
  );
}

/**
 * Model Selection Loading State
 */
export function ModelSelectionLoading() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
      <Loader size={14} />
      <Shimmer className="text-sm">Loading models...</Shimmer>
    </div>
  );
}

/**
 * Message Sending Loading State
 */
export function MessageSendingLoading({ model }: { model?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader size={14} />
      <Shimmer>
        {model ? `Sending via ${model}...` : "Sending message..."}
      </Shimmer>
    </div>
  );
}

// Utility Functions

function categorizeError(error?: Error): ChatErrorType {
  if (!error) return "unknown";
  
  const message = error.message.toLowerCase();
  
  if (message.includes("network") || message.includes("fetch")) {
    return "network";
  }
  if (message.includes("auth") || message.includes("unauthorized") || message.includes("forbidden")) {
    return "auth";
  }
  if (message.includes("validation") || message.includes("invalid")) {
    return "validation";
  }
  if (message.includes("openai") || message.includes("model") || message.includes("token")) {
    return "openai";
  }
  if (message.includes("report") || message.includes("session")) {
    return "reports";
  }
  if (message.includes("server") || message.includes("500") || message.includes("503")) {
    return "server";
  }
  
  return "unknown";
}

function getErrorIcon(errorType: ChatErrorType) {
  const iconClass = "h-8 w-8";
  
  switch (errorType) {
    case "network":
      return <WifiOff className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
    case "auth":
      return <Shield className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
    case "server":
      return <Server className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
    case "openai":
    case "model":
      return <BotMessageSquare className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
    case "reports":
      return <FilesIcon className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
    default:
      return <AlertTriangle className={cn(iconClass, "text-red-600 dark:text-red-400")} />;
  }
}

function getErrorTitle(errorType: ChatErrorType): string {
  switch (errorType) {
    case "network":
      return "Connection Error";
    case "auth":
      return "Authentication Required";
    case "server":
      return "Server Error";
    case "openai":
    case "model":
      return "AI Model Error";
    case "reports":
      return "Report Access Error";
    case "validation":
      return "Input Validation Error";
    default:
      return "Something Went Wrong";
  }
}

function getErrorMessage(errorType: ChatErrorType, error?: Error): string {
  switch (errorType) {
    case "network":
      return "Unable to connect to the server. Please check your internet connection and try again.";
    case "auth":
      return "You need to log in to access this feature. Please authenticate and try again.";
    case "server":
      return "Our servers are experiencing issues. Please try again in a few moments.";
    case "openai":
    case "model":
      return "There was an issue with the AI model. Please try again or select a different model.";
    case "reports":
      return "Unable to access reports. You may not have permission or the reports may be unavailable.";
    case "validation":
      return error?.message || "Please check your input and try again.";
    default:
      return "An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.";
  }
}

// Validation Utilities

export function validateChatMessage(message: string): { isValid: boolean; error?: string } {
  if (!message || typeof message !== "string") {
    return { isValid: false, error: "Message is required" };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Message cannot be empty" };
  }

  if (trimmed.length > 4000) {
    return { isValid: false, error: "Message is too long (maximum 4000 characters)" };
  }

  // Check for potentially harmful content patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: "Message contains potentially harmful content" };
    }
  }

  return { isValid: true };
}

export function validateReportSelection(selectedReports: unknown[], maxReports = 5): { isValid: boolean; error?: string } {
  if (!Array.isArray(selectedReports)) {
    return { isValid: false, error: "Invalid report selection format" };
  }

  if (selectedReports.length > maxReports) {
    return { isValid: false, error: `Maximum ${maxReports} reports allowed` };
  }

  return { isValid: true };
}

export function validateGPTModel(model: string, availableModels: string[]): { isValid: boolean; error?: string } {
  if (!model || typeof model !== "string") {
    return { isValid: false, error: "Model selection is required" };
  }

  if (!availableModels.includes(model)) {
    return { isValid: false, error: "Selected model is not available" };
  }

  return { isValid: true };
}