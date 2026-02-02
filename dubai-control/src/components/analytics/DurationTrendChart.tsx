import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendDataPoint } from "@/data/analyticsData";

const DURATION_COLOR = "hsl(var(--primary))";

interface DurationTrendChartProps {
  data: TrendDataPoint[];
}

export function DurationTrendChart({ data }: DurationTrendChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          Average Job Duration
        </h3>
        <p className="text-sm text-muted-foreground">
          Average cleaning time per job (hours)
        </p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(214, 32%, 91%)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
              dx={-10}
              unit="h"
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                padding: "12px",
              }}
              labelStyle={{
                color: "hsl(222, 47%, 11%)",
                fontWeight: 600,
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "hsl(215, 16%, 47%)",
                fontSize: "13px",
              }}
              formatter={(value: number) => [`${value} hrs`, "Avg duration"]}
            />

            <Line
              type="monotone"
              dataKey="avgDuration"
              stroke={DURATION_COLOR}
              strokeWidth={2}
              dot={{ fill: DURATION_COLOR, strokeWidth: 0, r: 3 }}
              activeDot={{
                fill: DURATION_COLOR,
                strokeWidth: 2,
                stroke: "white",
                r: 5,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
