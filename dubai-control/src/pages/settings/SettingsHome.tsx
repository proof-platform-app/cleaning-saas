// dubai-control/src/pages/settings/SettingsHome.tsx

import { Link } from "react-router-dom";
import { Settings, CreditCard, Bell, Shield, ArrowRight, Lock } from "lucide-react";
import { useUserRole, canAccessBilling, isOwner, getRoleLabel } from "@/hooks/useUserRole";

interface SettingsTile {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  visible: boolean;
  badge?: string;
}

export default function SettingsHome() {
  const user = useUserRole();
  const canSeeBilling = canAccessBilling(user.role);
  const userIsOwner = isOwner(user.role);

  const tiles: SettingsTile[] = [
    {
      id: "account",
      title: "Account Settings",
      description: "Profile and preferences",
      icon: Settings,
      link: "/settings/account",
      visible: true, // All roles
    },
    {
      id: "billing",
      title: "Billing",
      description: userIsOwner
        ? "Subscription, payment methods, and invoices"
        : "Subscription and usage (read-only)",
      icon: CreditCard,
      link: "/settings/billing",
      visible: canSeeBilling, // Owner, Manager only
      badge: !userIsOwner && canSeeBilling ? "Read-only" : undefined,
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Email alerts and preferences",
      icon: Bell,
      link: "/settings/account#notifications",
      visible: true, // All roles
    },
    {
      id: "security",
      title: "Security",
      description: "Password and authentication",
      icon: Shield,
      link: "/settings/account#security",
      visible: true, // All roles
    },
  ];

  const visibleTiles = tiles.filter((tile) => tile.visible);

  return (
    <div className="mx-auto max-w-5xl p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {getRoleLabel(user.role)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {userIsOwner
            ? "Manage your account, billing, and preferences"
            : "Manage your account and preferences"}
        </p>
      </div>

      {/* Settings Tiles Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {visibleTiles.map((tile) => {
          const Icon = tile.icon;

          return (
            <Link
              key={tile.id}
              to={tile.link}
              className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            >
              {/* Badge (e.g., Read-only for Manager on Billing) */}
              {tile.badge && (
                <div className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Lock className="h-3 w-3" />
                  {tile.badge}
                </div>
              )}

              {/* Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {tile.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tile.description}
                </p>
              </div>

              {/* Arrow */}
              <div className="absolute bottom-6 right-6">
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
