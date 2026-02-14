// dubai-control/src/components/layout/AppSidebar.tsx

import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Settings,
  LogOut,
  MapPin,
  Clock3,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const user = useUserRole();
  const canSeeCompany = canAccessBilling(user.role); // Owner/Manager only

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Job Planning", href: "/planning", icon: CalendarDays },
    { name: "Job History", href: "/history", icon: Clock3 },
    { name: "Performance", href: "/performance", icon: BarChart3 },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Locations", href: "/locations", icon: MapPin },
    { name: "Assets", href: "/assets", icon: Wrench },
    { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList },
    ...(canSeeCompany
      ? [{ name: "Company", href: "/company/profile", icon: Building2 }]
      : []),
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-200 ease-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header + logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-3">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "w-full justify-center",
            !collapsed && "flex-1",
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            SC
          </div>
          {!collapsed && (
            <span className="font-semibold tracking-tight text-foreground">
              CleanProof
            </span>
          )}
        </div>

        {/* Стрелка только в широком режиме — справа, нейтральная */}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Стрелка в свернутом режиме — отдельной строкой, тоже нейтральная */}
      {collapsed && (
        <div className="flex items-center justify-center border-b border-border py-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out",
                collapsed
                  ? "justify-center px-0 py-3"
                  : "justify-start gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Sign out */}
      <div className="border-t border-border p-3">
        <NavLink
          to="/"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:bg-sidebar-accent hover:text-foreground",
            collapsed
              ? "justify-center px-0 py-2.5"
              : "justify-start gap-3 px-3 py-2.5",
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign Out</span>}
        </NavLink>
      </div>
    </aside>
  );
}
