'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, TooltipProps } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { ScoreDistribution } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { TrendingUp, PieChartIcon, BarChart3 } from 'lucide-react';

interface ScoreChartProps {
  distribution: ScoreDistribution;
}

const COLORS = {
  excellent: { main: '#10b981', gradient: ['#10b981', '#34d399'], label: 'Excellent' },
  good: { main: '#6366f1', gradient: ['#6366f1', '#818cf8'], label: 'Good' },
  average: { main: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'], label: 'Average' },
  belowAverage: { main: '#f97316', gradient: ['#f97316', '#fb923c'], label: 'Below Avg' },
  poor: { main: '#ef4444', gradient: ['#ef4444', '#f87171'], label: 'Needs Work' },
};

// Custom tooltip component defined outside render
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const colorConfig = COLORS[item.key as keyof typeof COLORS];
    const total = item.total || 0;
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
        <p className="font-semibold" style={{ color: colorConfig.main }}>{item.name}</p>
        <p className="text-sm text-muted-foreground">Range: {item.range}</p>
        <p className="text-sm font-medium">{item.value} candidates</p>
        <p className="text-xs text-muted-foreground">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}% of total</p>
      </div>
    );
  }
  return null;
}

export function ScoreChart({ distribution }: ScoreChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timeout);
  }, []);

  const data = [
    { name: 'Excellent', value: distribution.excellent, key: 'excellent', range: '90-100' },
    { name: 'Good', value: distribution.good, key: 'good', range: '80-89' },
    { name: 'Average', value: distribution.average, key: 'average', range: '70-79' },
    { name: 'Below Avg', value: distribution.belowAverage, key: 'belowAverage', range: '60-69' },
    { name: 'Needs Work', value: distribution.poor, key: 'poor', range: '0-59' },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Add total to each data item for tooltip
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <div
      className={cn(
        'transition-all duration-700',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Score Distribution
            </CardTitle>
            <CardDescription>Candidate performance breakdown</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            {total} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="mb-4 bg-slate-100/50 dark:bg-slate-800/50">
            <TabsTrigger value="bar" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              <BarChart3 className="h-4 w-4" />
              Bar
            </TabsTrigger>
            <TabsTrigger value="pie" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              <PieChartIcon className="h-4 w-4" />
              Pie
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar" className="mt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataWithTotal} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <XAxis 
                    type="number" 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 10)}
                    width={80}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
                  <Bar dataKey="value" radius={6} animationDuration={1000} animationEasing="ease-out">
                    {dataWithTotal.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.key as keyof typeof COLORS].main}
                        className="transition-opacity duration-200"
                        opacity={activeIndex === index ? 1 : activeIndex === null ? 0.9 : 0.5}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="mt-0">
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataWithTotal}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {dataWithTotal.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.key as keyof typeof COLORS].main}
                        stroke="transparent"
                        className="transition-all duration-200 cursor-pointer hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">{total}</p>
                  <p className="text-xs text-muted-foreground">Candidates</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          {data.map((item) => {
            const colorConfig = COLORS[item.key as keyof typeof COLORS];
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
            return (
              <div 
                key={item.name} 
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: colorConfig.main }}
                />
                <span className="text-xs font-medium">{colorConfig.label}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {item.value} ({percentage}%)
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </div>
  );
}

// Donut chart for single candidate scores
interface DonutScoreChartProps {
  scores: { label: string; value: number; color: string }[];
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DonutScoreChart({ scores, title, size = 'md' }: DonutScoreChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timeout);
  }, []);

  const sizeConfig = {
    sm: { width: 120, height: 120, innerRadius: 35, outerRadius: 50 },
    md: { width: 160, height: 160, innerRadius: 45, outerRadius: 70 },
    lg: { width: 200, height: 200, innerRadius: 60, outerRadius: 90 },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'transition-all duration-700',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
    >
      {title && <p className="text-sm font-medium mb-2">{title}</p>}
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={scores}
              cx="50%"
              cy="50%"
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              paddingAngle={2}
              dataKey="value"
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {scores.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ScoreChart;
