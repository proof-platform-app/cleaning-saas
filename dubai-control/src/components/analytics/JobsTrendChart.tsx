import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendDataPoint } from "@/data/analyticsData";

const PRIMARY_COLOR = "hsl(var(--primary))";

interface JobsTrendChartProps {
  data: TrendDataPoint[];
}

export function JobsTrendChart({ data }: JobsTrendChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          Jobs Completed
        </h3>
        <p className="text-sm text-muted-foreground">
          Daily job completion over the last 14 days
        </p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={PRIMARY_COLOR}
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor={PRIMARY_COLOR}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

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
              formatter={(value: number) => [`${value} jobs`, "Completed"]}
            />

            <Area
              type="monotone"
              dataKey="jobsCompleted"
              stroke={PRIMARY_COLOR}
              strokeWidth={2}
              fill="url(#jobsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
