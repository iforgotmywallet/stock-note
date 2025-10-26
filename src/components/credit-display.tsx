"use client";

import { IconCoins } from "@tabler/icons-react";
import { useUserCredits } from "~/hooks/use-user-credits";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { authClient } from "~/lib/auth-client";

interface CreditDisplayProps {
  userId: string | null;
  className?: string;
}

export function CreditDisplay({ userId, className }: CreditDisplayProps) {
  const { credits, loading, error } = useUserCredits(userId);

  // Don't render anything if no user
  if (!userId) {
    return null;
  }

  const handleUpgrade = async () => {
    await authClient.checkout({
      products: [
        "82b305c8-0a4f-4f29-bf3a-af72ffe8fcb0", // starter
        "616f0965-ca1e-4d34-b824-13f4ff5989e1", // pro
        "d126e0c2-c180-49e4-8144-6e59462158d4", // power
      ],
    });
  };

  // Loading state with proper spacing and alignment
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5",
          "transition-colors duration-200",
          className,
        )}
      >
        <IconCoins className="text-muted-foreground h-4 w-4 shrink-0" />
        <Skeleton className="h-3.5 w-12 lg:w-16" />
      </div>
    );
  }

  // Error state - show nothing to avoid cluttering the header
  if (error) {
    return null;
  }

  return (
    <button
      onClick={handleUpgrade}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5",
        "text-muted-foreground text-sm",
        "transition-colors duration-200",
        "hover:bg-accent/50 hover:text-foreground",
        "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
        "cursor-pointer",
        className,
      )}
    >
      <IconCoins className="h-4 w-4 shrink-0" />
      {/* Desktop: Show full text */}
      <span className="hidden font-medium sm:inline">
        {credits} {credits === 1 ? "credit" : "credits"}
      </span>
      {/* Mobile: Show just the number */}
      <span className="font-medium tabular-nums sm:hidden">{credits}</span>
    </button>
  );
}
