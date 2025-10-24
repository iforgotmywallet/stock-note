"use client";

import { useEffect } from "react";

/**
 * Component that triggers sidebar refresh when a document is opened
 * This is the only place where sidebar should auto-refresh
 */
export function DocumentSidebarRefresh() {
  useEffect(() => {
    // Dispatch sidebar refresh event when document is opened
    window.dispatchEvent(
      new CustomEvent("sidebarRefresh", {
        detail: { action: "documentOpen" },
      })
    );
  }, []);

  // This component doesn't render anything
  return null;
}