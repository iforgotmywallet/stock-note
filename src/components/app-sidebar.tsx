"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  IconCamera,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconCreditCard,
  IconStackMiddle,
  IconAlertCircle,
  IconTable,
  IconMessageChatbot,
} from "@tabler/icons-react";

import { NavDocuments } from "~/components/nav-documents";
import { NavSaved } from "~/components/nav-saved";
import { NavMain } from "~/components/nav-main";
import { NavSecondary } from "~/components/nav-secondary";
import { NavUser } from "~/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { authClient } from "~/lib/auth-client";

// Error Boundary Component for Sidebar
class SidebarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Sidebar Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="text-sidebar-foreground/50 flex items-center gap-2 p-4">
            <IconAlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load sidebar</span>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Table View",
      url: "/table",
      icon: IconTable,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconMessageChatbot,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Billing",
      url: "/customer-portal",
      icon: IconCreditCard,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setCurrentUser({
            id: session.data.user.id,
            name: session.data.user.name || "User",
            email: session.data.user.email || "",
          });
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error getting current user:", error);
        setCurrentUser(null);
      }
    };

    getCurrentUser();
  }, []);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconStackMiddle className="!size-5" />
                <span className="text-base font-semibold">StockNotes</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarErrorBoundary>
          <NavMain items={data.navMain} />
        </SidebarErrorBoundary>
        <SidebarErrorBoundary>
          <NavSaved userId={currentUser?.id || ""} />
        </SidebarErrorBoundary>
        <SidebarErrorBoundary>
          <NavDocuments userId={currentUser?.id || ""} />
        </SidebarErrorBoundary>
        <SidebarErrorBoundary>
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarErrorBoundary>
      </SidebarContent>
      <SidebarFooter>
        <SidebarErrorBoundary>
          <NavUser
            user={
              currentUser
                ? {
                    name: currentUser.name,
                    email: currentUser.email,
                    avatar: "/avatars/shadcn.jpg", // Keep default avatar for now
                  }
                : data.user
            }
          />
        </SidebarErrorBoundary>
      </SidebarFooter>
    </Sidebar>
  );
}
