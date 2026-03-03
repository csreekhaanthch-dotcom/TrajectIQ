'use client';

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScoreDistribution } from '@/types/dashboard';

interface ScoreChartProps {
  distribution: ScoreDistribution;
}

const chartConfig = {
  excellent: {
    label: 'Excellent (90-100)',
    color: 'hsl(142, 76%, 36%)', // emerald
  },
  good: {
    label: 'Good (80-89)',
    color: 'hsl(173, 58%, 39%)', // teal
  },
  average: {
    label: 'Average (70-79)',
    color: 'hsl(38, 92%, 50%)', // amber
  },
  belowAverage: {
    label: 'Below Avg (60-69)',
    color: 'hsl(25, 95%, 53%)', // orange
  },
  poor: {
    label: 'Poor (0-59)',
    color: 'hsl(0, 84%, 60%)', // red
  },
} satisfies ChartConfig;

export function ScoreChart({ distribution }: ScoreChartProps) {
  const data = [
    { name: 'Excellent', value: distribution.excellent, fill: chartConfig.excellent.color },
    { name: 'Good', value: distribution.good, fill: chartConfig.good.color },
    { name: 'Average', value: distribution.average, fill: chartConfig.average.color },
    { name: 'Below Avg', value: distribution.belowAverage, fill: chartConfig.belowAverage.color },
    { name: 'Poor', value: distribution.poor, fill: chartConfig.poor.color },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Score Distribution</CardTitle>
        <CardDescription>Candidate scores by performance tier</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar">
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 10)}
                  width={80}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={4}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </TabsContent>
          
          <TabsContent value="pie">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-xs text-muted-foreground">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
