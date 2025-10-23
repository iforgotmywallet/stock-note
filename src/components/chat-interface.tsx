"use client";

import React, {
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
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
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";
import { Loader } from "~/components/ai-elements/loader";
import { Response } from "~/components/ai-elements/response";
import { BotMessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

// Error types for better error handling
type ChatError = {
  type: "network" | "auth" | "validation" | "server" | "openai" | "unknown";
  message: string;
  code?: string;
  retryable?: boolean;
};

// Types based on design document
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

interface SelectedReport {
  sessionId: string;
  ticker: string;
  analysisDate: Date;
  name: string;
  recommendation: string;
  content: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: ChatError | null;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
}

interface ChatInterfaceProps {
  selectedReports: SelectedReport[];
  className?: string;
}

// Chat Context for state management
const ChatContext = createContext<ChatContextType | null>(null);

const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};

// Chat Provider Component
function ChatProvider({
  children,
  selectedReports,
}: {
  children: React.ReactNode;
  selectedReports: SelectedReport[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const lastUserMessageRef = useRef<string>("");

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

  // Validation helper
  const validateMessage = (message: string): string | null => {
    if (!message || typeof message !== "string") {
      return "Message is required";
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return "Message cannot be empty";
    }

    if (trimmed.length > 4000) {
      return "Message is too long (maximum 4000 characters)";
    }

    return null;
  };

  const sendMessage = useCallback(
    async (message: string) => {
      // Validate message
      const validationError = validateMessage(message);
      if (validationError) {
        const error: ChatError = {
          type: "validation",
          message: validationError,
          retryable: false,
        };
        setError(error);
        toast.error(validationError);
        return;
      }

      setError(null);
      const trimmedMessage = message.trim();
      lastUserMessageRef.current = trimmedMessage;

      // Add user message with sending status
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedMessage,
        timestamp: new Date(),
        status: "sending",
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
      };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
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

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    lastUserMessageRef.current = "";
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last error message
      setMessages((prev) => prev.filter((msg) => msg.status !== "error"));
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  const contextValue: ChatContextType = {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
}

// Main Chat Interface Component
function ChatInterfaceContent({ className }: { className?: string }) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    retryLastMessage,
  } = useChatContext();

  const handleSubmit = useCallback(
    async (messageData: { text?: string }, event: React.FormEvent) => {
      event.preventDefault();

      if (!messageData.text?.trim()) {
        toast.error("Please enter a message");
        return;
      }

      await sendMessage(messageData.text);
    },
    [sendMessage],
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Conversation className="flex-1">
        <ConversationContent className="p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask questions about your selected reports to get AI-powered insights"
              icon={<BotMessageSquare className="size-12" />}
            />
          ) : (
            <div className="mx-auto max-w-4xl space-y-6">
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageAvatar
                    src=""
                    name={message.role === "user" ? "Me" : "AI"}
                    className="size-10 text-sm font-semibold"
                  />
                  <MessageContent variant="flat" className="bg-transparent">
                    <div className="space-y-3">
                      {/* Message content */}
                      <div className="min-w-0">
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert prose-headings:font-semibold prose-p:text-foreground/90 dark:prose-p:text-foreground/80 prose-strong:text-foreground dark:prose-strong:text-foreground/90 prose-code:text-foreground/90 dark:prose-code:text-foreground/80 max-w-none">
                            <Response>{message.content}</Response>
                          </div>
                        ) : (
                          <div className="text-foreground/90 dark:text-foreground/80 text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {/* Message metadata */}
                      <div className="text-muted-foreground flex items-center gap-3 pt-1 text-xs">
                        <span>{message.timestamp.toLocaleTimeString()}</span>

                        {message.status === "sending" && (
                          <div className="flex items-center gap-1.5">
                            <Loader className="size-3" />
                            <span>
                              {message.role === "user"
                                ? "Sending..."
                                : "Thinking..."}
                            </span>
                          </div>
                        )}

                        {message.status === "error" && (
                          <div className="text-destructive flex items-center gap-1.5">
                            <AlertCircle className="size-3" />
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
                          >
                            <RefreshCw className="mr-1.5 size-3" />
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  </MessageContent>
                </Message>
              ))}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur">
        <div className="mx-auto max-w-4xl p-4">
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
            />
            <PromptInputFooter>
              <PromptInputTools>
                <div className="flex items-center gap-2">
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
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

// Main exported component with provider
export function ChatInterface({
  selectedReports,
  className,
}: ChatInterfaceProps) {
  return (
    <ChatProvider selectedReports={selectedReports}>
      <ChatInterfaceContent className={className} />
    </ChatProvider>
  );
}
