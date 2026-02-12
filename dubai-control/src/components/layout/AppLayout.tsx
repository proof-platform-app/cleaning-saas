// dubai-control/src/components/layout/AppLayout.tsx

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AccountDropdown } from "./AccountDropdown";
import { ProductSwitcher } from "./ProductSwitcher";
import { cn } from "@/lib/utils";

export function AppLayout() {
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
    <div className="min-h-screen bg-background">
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
        <div
          className={cn(
            // убрали mx-auto, чтобы не центрировать, и поставили mr-auto,
            // чтобы контент «прилипал» к левому краю рядом с меню
            "min-h-screen px-6 py-8 mr-auto",
            // при раскрытом сайдбаре даём чуть больше ширины
            collapsed ? "max-w-[1440px]" : "max-w-7xl",
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
