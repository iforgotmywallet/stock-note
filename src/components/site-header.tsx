"use client";

import { useRouter, usePathname } from "next/navigation";
import { IconTransferOut } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { ClientThemeToggle } from "~/components/client-theme-toggle";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the root page
  const isRootPage = pathname === "/";
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {!isRootPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="hover:bg-accent flex items-center gap-2 text-base font-light"
          >
            <IconTransferOut className="h-4 w-4" />
            Back
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ClientThemeToggle />
        </div>
      </div>
    </header>
  );
}
