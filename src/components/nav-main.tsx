"use client";

import {
  IconTerminal2,
  IconCalendarTime,
  IconAdjustments,
  type Icon,
} from "@tabler/icons-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// Chat toggle state management
const CHAT_TOGGLE_KEY = 'chat-report-selector-open';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReportSelectorOpen, setIsReportSelectorOpen] = useState(false);
  const [selectedReportsCount, setSelectedReportsCount] = useState(0);

  // Load toggle state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_TOGGLE_KEY);
    if (saved !== null) {
      setIsReportSelectorOpen(JSON.parse(saved) as boolean);
    }
  }, []);

  // Save toggle state to localStorage and broadcast to chat page
  const handleToggleReportSelector = () => {
    const newState = !isReportSelectorOpen;
    setIsReportSelectorOpen(newState);
    localStorage.setItem(CHAT_TOGGLE_KEY, JSON.stringify(newState));
    
    // Broadcast the change to the chat page
    window.dispatchEvent(new CustomEvent('chat-toggle-report-selector', {
      detail: { isOpen: newState }
    }));
  };

  // Listen for selected reports count updates from chat page
  useEffect(() => {
    const handleReportsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ count: number }>;
      setSelectedReportsCount(customEvent.detail.count ?? 0);
    };

    window.addEventListener('chat-reports-count-update', handleReportsUpdate);
    
    return () => {
      window.removeEventListener('chat-reports-count-update', handleReportsUpdate);
    };
  }, []);

  const handleStartAnalysis = () => {
    router.push("/");
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Start Analysis"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={handleStartAnalysis}
            >
              <IconTerminal2 />
              <span>Start Analysis</span>
            </SidebarMenuButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="size-8 group-data-[collapsible=icon]:opacity-0"
                  variant="outline"
                >
                  <IconCalendarTime />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Automate your stock analytics — coming soon</p>
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            // Items that should be disabled with "Coming Soon" badge
            const comingSoonItems = [
              "Dashboard",
              "Trending",
              "Watch List",
              "Search",
            ];
            const isComingSoon = comingSoonItems.includes(item.title);
            const isActive = pathname === item.url;
            const isChatItem = item.title === "Chat";

            const handleItemClick = () => {
              if (!isComingSoon && item.url) {
                router.push(item.url);
              }
            };

            return (
              <SidebarMenuItem key={item.title}>
                <div className="relative flex items-center gap-2">
                  <SidebarMenuButton
                    tooltip={item.title}
                    disabled={isComingSoon}
                    isActive={isActive}
                    className={
                      isComingSoon ? "cursor-not-allowed opacity-50" : ""
                    }
                    onClick={handleItemClick}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  
                  {/* Chat toggle button */}
                  {isChatItem && isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 group-data-[collapsible=icon]:opacity-0 flex-shrink-0"
                          onClick={handleToggleReportSelector}
                        >
                          <IconAdjustments className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isReportSelectorOpen ? "Hide report selector" : "Show report selector"}</p>
                        {selectedReportsCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {selectedReportsCount} report{selectedReportsCount !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Selected reports badge for chat when not on chat page */}
                  {isChatItem && !isActive && selectedReportsCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedReportsCount}
                    </Badge>
                  )}
                  
                  {/* Coming soon badge */}
                  {isComingSoon && (
                    <div className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Soon
                    </div>
                  )}
                </div>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
