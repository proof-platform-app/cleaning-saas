import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: "bg-card gradient-card",
  primary: "gradient-blue border-primary/10",
  success: "bg-status-completed-bg/50",
  warning: "bg-status-issue-bg/50",
};

const iconVariantStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-status-completed",
  warning: "text-status-issue",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-6 shadow-card transition-all duration-200 hover:shadow-soft",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "p-2.5 rounded-lg bg-background/80",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
