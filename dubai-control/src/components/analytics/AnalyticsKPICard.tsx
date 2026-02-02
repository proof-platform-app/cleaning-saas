import { CheckCircle2, Clock, Camera, Timer, AlertTriangle, TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIData } from '@/data/analyticsData';

const iconMap: Record<string, LucideIcon> = {
  CheckCircle2,
  Clock,
  Camera,
  Timer,
  AlertTriangle,
};

const variantStyles: Record<
  KPIData["variant"],
  { bg: string; icon: string; border: string }
> = {
  primary: {
    // основной KPI (jobs completed)
    bg: "bg-primary/5",
    icon: "text-primary",
    border: "border-primary/20",
  },
  success: {
    // зелёные «хорошие» метрики
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    border: "border-emerald-100",
  },
  warning: {
    // жёлтые предупреждения
    bg: "bg-amber-50",
    icon: "text-amber-600",
    border: "border-amber-100",
  },
  danger: {
    // красные проблемные штуки (если пригодится)
    bg: "bg-red-50",
    icon: "text-red-600",
    border: "border-red-100",
  },
  neutral: {
    // нейтральные серые
    bg: "bg-slate-50",
    icon: "text-slate-500",
    border: "border-slate-100",
  },
};

interface AnalyticsKPICardProps {
  data: KPIData;
}

export function AnalyticsKPICard({ data }: AnalyticsKPICardProps) {
  const Icon = iconMap[data.icon] || CheckCircle2;
  const styles = variantStyles[data.variant];
  const isPositive = data.change && data.change > 0;
  const isNegative = data.change && data.change < 0;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-soft',
      styles.border
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn('absolute inset-0 opacity-30', styles.bg)} />
      
      <div className="relative">
        {/* Icon */}
        <div className={cn(
          'mb-4 inline-flex items-center justify-center rounded-lg p-2.5',
          styles.bg
        )}>
          <Icon className={cn('h-5 w-5', styles.icon)} strokeWidth={1.5} />
        </div>

        {/* Value */}
        <div className="mb-1">
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {data.value}
          </span>
        </div>

        {/* Label */}
        <p className="text-sm font-medium text-muted-foreground">
          {data.label}
        </p>

        {/* Change indicator */}
        {data.change !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            {isPositive && (
              <TrendingUp className="h-3.5 w-3.5 text-analytics-success" />
            )}
            {isNegative && (
              <TrendingDown className="h-3.5 w-3.5 text-analytics-danger" />
            )}
            <span className={cn(
              'text-xs font-medium',
              isPositive && 'text-analytics-success',
              isNegative && 'text-analytics-danger',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}>
              {isPositive && '+'}
              {data.change}%
            </span>
            <span className="text-xs text-muted-foreground">
              {data.changeLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}