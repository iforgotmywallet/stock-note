"use client";

import { useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";
import { ShieldCheck } from "lucide-react";

export function AdminBanner() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.id) {
          const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
          setIsAdmin(session.data.user.id === adminUserId);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdmin();
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-white shadow-md">
      <div className="flex items-center justify-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-semibold">Admin View</span>
      </div>
    </div>
  );
}
