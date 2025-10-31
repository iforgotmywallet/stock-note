"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  useBrowserHistory?: boolean;
}

export function BackButton({ 
  href = "/", 
  label = "Back", 
  onClick,
  useBrowserHistory = true
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (useBrowserHistory && window.history.length > 1) {
      // Use browser history to go back to previous page
      router.back();
    } else {
      // Fallback to specified href if no history or useBrowserHistory is false
      router.push(href);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}