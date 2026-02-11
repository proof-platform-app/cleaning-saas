import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendDataPoint } from "@/data/analyticsData";

const BAR_COLOR = "hsl(38, 92%, 50%)";   // amber — matches SLA severity palette
const LINE_COLOR = "hsl(0, 72%, 51%)";   // red

interface SlaViolationsTrendChartProps {
  data: TrendDataPoint[];
  onPointClick?: (date: string) => void;
}

export function SlaViolationsTrendChart({
  data,
  onPointClick,
}: SlaViolationsTrendChartProps) {
  const clickable = Boolean(onPointClick);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          SLA Violations Trend
        </h3>
        <p className="text-sm text-muted-foreground">
          Daily violation count and rate
          {clickable && " · click a bar to see affected jobs"}
        </p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
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

            {/* Left Y-axis: job counts */}
            <YAxis
              yAxisId="count"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
              dx={-10}
              allowDecimals={false}
            />

            {/* Right Y-axis: violation rate 0–1 displayed as % */}
            <YAxis
              yAxisId="rate"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 16%, 47%)", fontSize: 12 }}
              dx={10}
              domain={[0, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
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
              itemStyle={{ color: "hsl(215, 16%, 47%)", fontSize: "13px" }}
              formatter={(value: number, name: string) => {
                if (name === "jobsWithViolations")
                  return [value, "Violations"];
                if (name === "violationRate")
                  return [`${Math.round(value * 100)}%`, "Violation rate"];
                return [value, name];
              }}
            />

            <Legend
              formatter={(value) =>
                value === "jobsWithViolations"
                  ? "Violations (count)"
                  : "Violation rate"
              }
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />

            <Bar
              yAxisId="count"
              dataKey="jobsWithViolations"
              fill={BAR_COLOR}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              cursor={clickable ? "pointer" : "default"}
              onClick={
                clickable
                  ? (payload) => onPointClick!(payload.date as string)
                  : undefined
              }
            />

            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="violationRate"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ fill: LINE_COLOR, strokeWidth: 0, r: 3 }}
              activeDot={
                clickable
                  ? {
                      fill: LINE_COLOR,
                      strokeWidth: 2,
                      stroke: "white",
                      r: 5,
                      cursor: "pointer",
                      onClick: (_event: unknown, payload: { payload: TrendDataPoint }) =>
                        onPointClick!(payload.payload.date),
                    }
                  : {
                      fill: LINE_COLOR,
                      strokeWidth: 2,
                      stroke: "white",
                      r: 5,
                    }
              }
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
