import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Settings,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Create Job", href: "/create-job", icon: PlusCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-sm">SC</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">SparkClean</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-150"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </NavLink>
      </div>
    </aside>
  );
}
