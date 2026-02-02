import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendDataPoint } from "@/data/analyticsData";

const BEFORE_COLOR = "hsl(var(--primary))";
const AFTER_COLOR = "hsl(var(--accent))";
const CHECKLIST_COLOR = "hsl(var(--muted-foreground))";

interface ProofCompletionChartProps {
  data: TrendDataPoint[];
}

export function ProofCompletionChart({ data }: ProofCompletionChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">
          Proof Completion Trend
        </h3>
        <p className="text-sm text-muted-foreground">
          Before photo, after photo, and checklist completion rates
        </p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
              domain={[80, 100]}
              tickFormatter={(value) => `${value}%`}
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
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  beforePhotoRate: "Before Photo",
                  afterPhotoRate: "After Photo",
                  checklistRate: "Checklist",
                };
                return [`${value}%`, labels[name] || name];
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: "20px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  beforePhotoRate: "Before Photo",
                  afterPhotoRate: "After Photo",
                  checklistRate: "Checklist",
                };
                return (
                  <span className="text-xs text-muted-foreground">
                    {labels[value] || value}
                  </span>
                );
              }}
            />

            <Bar
              dataKey="beforePhotoRate"
              fill={BEFORE_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={12}
            />
            <Bar
              dataKey="afterPhotoRate"
              fill={AFTER_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={12}
            />
            <Bar
              dataKey="checklistRate"
              fill={CHECKLIST_COLOR}
              radius={[4, 4, 0, 0]}
              maxBarSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
