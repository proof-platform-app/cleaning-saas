import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CleanerPerformance } from '@/data/analyticsData';

interface CleanerComparisonChartProps {
  data: CleanerPerformance[];
}

export function CleanerComparisonChart({ data }: CleanerComparisonChartProps) {
  const chartData = [...data]
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
    .map(c => ({
      name: c.name.split(' ')[0],
      fullName: c.name,
      jobs: c.jobsCompleted,
      isTop: c.jobsCompleted >= 45,
    }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Jobs by Cleaner</h3>
        <p className="text-sm text-muted-foreground">Weekly job completion comparison</p>
      </div>
      
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(214, 32%, 91%)" 
              horizontal={false} 
            />
            <XAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
            />
            <YAxis 
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 16%, 47%)', fontSize: 12 }}
              width={70}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                padding: '12px',
              }}
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullName;
                }
                return '';
              }}
              formatter={(value: number) => [`${value} jobs`, 'Completed']}
            />
            <Bar 
              dataKey="jobs" 
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.isTop ? 'hsl(158, 64%, 42%)' : 'hsl(221, 83%, 53%)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}