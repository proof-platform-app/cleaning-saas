// dubai-control/src/components/analytics/AnalyticsKPICard.tsx

import {
  CheckCircle2,
  Clock,
  Camera,
  Timer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPIData, KPIVariant, KPITrend } from "@/data/analyticsData";

// маппинг строкового ключа в иконку
const iconMap: Record<string, LucideIcon> = {
  CheckCircle2,
  Clock,
  Camera,
  Timer,
  AlertTriangle,
};

// фон карточки в зависимости от варианта (без цветного бордера)
const VARIANT_STYLES: Record<NonNullable<KPIData["variant"]>, string> = {
  primary:
    // нежно-синий, как на Dashboard
    "bg-blue-50 shadow-[0_18px_45px_rgba(59,130,246,0.12)]",

  success:
    "bg-emerald-50 shadow-[0_18px_45px_rgba(16,185,129,0.12)]",

  neutral:
    "bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]",

  warning:
    "bg-amber-50 shadow-[0_18px_45px_rgba(245,158,11,0.12)]",

  danger:
    "bg-rose-50 shadow-[0_18px_45px_rgba(244,63,94,0.12)]",
};

// цвет иконки по variant
const ICON_STYLES: Record<KPIVariant, string> = {
  primary: "text-blue-600",
  success: "text-emerald-600",
  neutral: "text-slate-500",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

// цвет текста дельты по тренду
const TREND_STYLES: Record<KPITrend, string> = {
  positive: "text-emerald-600",
  negative: "text-red-500",
  neutral: "text-muted-foreground",
};

type AnalyticsKPICardProps = {
  data: KPIData;
};

export function AnalyticsKPICard({ data }: AnalyticsKPICardProps) {
  const Icon = iconMap[data.icon] || CheckCircle2;

  // title — основной заголовок (Jobs completed / Issues detected и т.п.)
  const title = (data as any).title ?? data.label ?? "";

  // маленькое пояснение (подзаголовок)
  const subtitle = data.description ?? "";

  const variant: KPIVariant = data.variant ?? "neutral";
  const cardClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral;

  // --- дельта и подпись ---
  // Если backend прислал delta — используем её.
  // Если нет — считаем, что дельта 0%, но всё равно показываем строку.
  const hasNumericDelta =
    typeof data.delta === "number" && !Number.isNaN(data.delta);

  const rawDelta: number = hasNumericDelta ? Number(data.delta) : 0;

  // блок с процентами показываем всегда (минимум "0%")
  const hasDelta = true;

  // подпись типа "vs yesterday" / "vs last week"
  const deltaLabel =
    data.deltaLabel ?? (data as any).changeLabel ?? "";

  // тренд для окраски стрелки/процента
  let trend: KPITrend = data.trend ?? "neutral";

  if (!data.trend) {
    if (rawDelta > 0) {
      trend = "positive";
    } else if (rawDelta < 0) {
      trend = "negative";
    } else {
      trend = "neutral";
    }
  }

  const TrendIcon =
    trend === "positive"
      ? TrendingUp
      : trend === "negative"
      ? TrendingDown
      : null;

  // базовый цвет иконки по variant
  let iconColor = ICON_STYLES[variant] ?? ICON_STYLES.neutral;
  // для первой карточки (jobs_completed) — делаем галочку синей
  if (data.id === "jobs_completed") {
    iconColor = "text-sky-500";
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card p-6 shadow-card transition-all hover:shadow-soft",
        cardClass,
        data.onClick && "cursor-pointer",
      )}
      onClick={data.onClick}
    >
      <div className="relative">
        {/* Иконка в мягком светлом квадратике */}
        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white/80 p-3">
          <Icon
            className={cn("h-5 w-5", iconColor)}
            strokeWidth={1.6}
          />
        </div>

        {/* Значение */}
        <div className="mb-1">
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {data.value}
          </span>
        </div>

        {/* Заголовок */}
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        {/* Подзаголовок + tooltip "?" на одной строке (для Issues) */}
        {subtitle && (
          <div className="mt-1 flex items-start gap-1 text-sm text-slate-500">
            <span className="flex-1">{subtitle}</span>
            {data.tooltip && (
              <button
                type="button"
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] leading-none text-slate-500"
                title={data.tooltip}
                onClick={(e) => e.stopPropagation()}
              >
                ?
              </button>
            )}
          </div>
        )}

        {/* Дельта: стрелка + % + подпись */}
        {hasDelta && rawDelta !== null && (
          <div
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs",
            )}
          >
            {TrendIcon && (
              <TrendIcon
                className={cn("h-3.5 w-3.5", TREND_STYLES[trend])}
              />
            )}

            <span
              className={cn(
                "font-medium",
                TREND_STYLES[trend],
              )}
            >
              {rawDelta > 0 ? "+" : ""}
              {rawDelta.toFixed(0)}%
            </span>

            {deltaLabel && (
              <span className="text-xs text-muted-foreground">
                {deltaLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
