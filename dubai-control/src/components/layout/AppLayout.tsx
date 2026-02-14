// dubai-control/src/components/layout/AppLayout.tsx

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AccountDropdown } from "./AccountDropdown";
import { ProductSwitcher } from "./ProductSwitcher";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

/**
 * Get container classes based on shell mode.
 * No pathname checks - layout is driven by active context.
 */
function getContainerClasses(shellMode: string | undefined, collapsed: boolean): string {
  const mode = shellMode ?? "default";

  switch (mode) {
    case "compact":
      // Full-bleed, dense layout for MaintainProof
      // No max-width, tighter padding
      return "min-h-screen px-4 py-5";

    case "document":
      // Narrower container for document-centric views
      return cn(
        "min-h-screen px-6 py-8 mr-auto",
        "max-w-4xl"
      );

    case "project":
      // Wider container for project management views
      return cn(
        "min-h-screen px-6 py-8 mr-auto",
        "max-w-[1600px]"
      );

    case "default":
    default:
      // Standard CleanProof container
      return cn(
        "min-h-screen px-6 py-8 mr-auto",
        collapsed ? "max-w-[1440px]" : "max-w-7xl"
      );
  }
}

export function AppLayout() {
  const { contextConfig } = useAppContext();
  const shellMode = contextConfig.shellMode;
  const productClass = `product-${contextConfig.id}`;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("cp_sidebar") === "collapsed",
  );

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("cp_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  return (
    <div className={cn("min-h-screen bg-background", productClass)}>
      <AppSidebar collapsed={collapsed} onToggle={handleToggle} />

      {/* App Header with Product Switcher and Account Dropdown */}
      <header
        className={cn(
          "app-header fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 transition-[left] duration-200 ease-out",
          collapsed ? "left-16" : "left-64",
        )}
      >
        {/* Left: Product Switcher */}
        <ProductSwitcher />

        {/* Right: Account Dropdown */}
        <AccountDropdown userInitials="SC" userName="User" />
      </header>

      <main
        className={cn(
          "pt-16 transition-[padding-left] duration-200 ease-out",
          collapsed ? "pl-16" : "pl-64",
        )}
      >
        <div className={getContainerClasses(shellMode, collapsed)}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
