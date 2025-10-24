"use client";

import {
  IconTerminal2,
  IconCalendarTime,
  type Icon,
} from "@tabler/icons-react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "~/components/ui/button";
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

            const handleItemClick = () => {
              if (!isComingSoon && item.url) {
                router.push(item.url);
              }
            };

            return (
              <SidebarMenuItem key={item.title}>
                <div className="relative">
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
