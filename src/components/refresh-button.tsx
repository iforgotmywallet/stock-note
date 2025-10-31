"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RefreshButton({ 
  label = "Refresh", 
  variant = "outline",
  size = "sm",
  className = ""
}: RefreshButtonProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the current page
      router.refresh();
      // Also reload the page to ensure fresh data
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing page:", error);
    } finally {
      // Reset loading state after a delay since page will reload
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-2 ${className}`}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {size !== "icon" && label}
    </Button>
  );
}