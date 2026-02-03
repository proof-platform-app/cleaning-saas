// dubai-control/src/components/layout/AppLayout.tsx

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
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

      <main
        className={cn(
          "transition-[padding-left] duration-200 ease-out",
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
