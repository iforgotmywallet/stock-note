"use client";

import React from "react";
import { EnhancedChatInterface } from "~/components/enhanced-chat-interface";
import { BotMessageSquare, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "~/components/error-boundary";
import { Button } from "~/components/ui/button";

// Simplified Chat Header Component
function ChatHeader() {
  return (
    <div className="bg-muted/50 border-b px-4 py-4 md:px-6">
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
    </div>
  );
}

// Main Chat Page Component
function ChatPageContent() {
  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      {/* Main Chat Area - Full Width Streamlined Interface */}
      <div className="bg-card flex h-full w-full flex-col rounded-none border-0 md:rounded-lg md:border">
        <ChatHeader />
        <div className="min-h-0 flex-1">
          <EnhancedChatInterface className="h-full" />
        </div>
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

// Main exported page component with error boundary
export default function ChatPage() {
  return (
    <ErrorBoundary fallback={ChatErrorFallback}>
      <div className="container mx-auto h-full px-0 md:px-4">
        <ChatPageContent />
      </div>
    </ErrorBoundary>
  );
}
