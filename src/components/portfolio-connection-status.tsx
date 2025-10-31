'use client';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '~/lib/utils';

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
}

interface PortfolioConnectionStatusProps {
  state: WebSocketState;
  onReconnect?: () => void;
  usingHttpFallback?: boolean;
}

export function PortfolioConnectionStatus({
  state,
  onReconnect,
  usingHttpFallback = false,
}: PortfolioConnectionStatusProps) {
  // HTTP Fallback state - show orange badge with manual reconnect option
  if (usingHttpFallback) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <AlertCircle className="size-3 mr-1.5" />
          Using HTTP polling
        </Badge>
        
        {onReconnect && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="size-3 mr-1" />
            Try WebSocket Again
          </Button>
        )}
      </div>
    );
  }

  // Connected state - show green "Live" badge with pulse animation
  if (state.connected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400">
          <span className="relative flex size-2 mr-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-green-500"></span>
          </span>
          Live
        </Badge>
      </div>
    );
  }

  // Connecting state - show yellow indicator with "Connecting..." text
  if (state.connecting) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
          <Wifi className="size-3 mr-1.5 animate-pulse" />
          Connecting...
          {state.reconnectAttempt > 0 && (
            <span className="ml-1 text-xs opacity-70">
              (Attempt {state.reconnectAttempt})
            </span>
          )}
        </Badge>
      </div>
    );
  }

  // Disconnected or error state - show red indicator with retry button
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={cn(
          "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
          state.error && "pr-1"
        )}
      >
        {state.error ? (
          <AlertCircle className="size-3 mr-1.5" />
        ) : (
          <WifiOff className="size-3 mr-1.5" />
        )}
        Disconnected
      </Badge>
      
      {state.error && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={state.error}>
            {state.error}
          </span>
        </div>
      )}
      
      {onReconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="size-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}
