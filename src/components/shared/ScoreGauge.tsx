'use client';

import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreGauge({ score, size = 'md', showLabel = true }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 85) return '#22c55e';
    if (s >= 70) return '#3b82f6';
    if (s >= 55) return '#eab308';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };

  const sizes = {
    sm: { container: 'w-20 h-20', text: 'text-lg', label: 'text-[10px]' },
    md: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-xs' },
    lg: { container: 'w-40 h-40', text: 'text-3xl', label: 'text-sm' },
  };

  const svgSizes = {
    sm: { cx: 40, cy: 40, r: 32, strokeWidth: 6 },
    md: { cx: 64, cy: 64, r: 45, strokeWidth: 8 },
    lg: { cx: 80, cy: 80, r: 56, strokeWidth: 10 },
  };

  const s = sizes[size];
  const svg = svgSizes[size];
  const adjustedCircumference = 2 * Math.PI * svg.r;
  const adjustedOffset = adjustedCircumference - (score / 100) * adjustedCircumference;

  return (
    <div className={cn('relative score-gauge-container', s.container)}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${svg.cx * 2} ${svg.cy * 2}`}>
        <circle
          cx={svg.cx}
          cy={svg.cy}
          r={svg.r}
          fill="none"
          stroke="currentColor"
          strokeWidth={svg.strokeWidth}
          className="text-gray-100 dark:text-gray-800"
        />
        <circle
          cx={svg.cx}
          cy={svg.cy}
          r={svg.r}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={svg.strokeWidth}
          strokeDasharray={adjustedCircumference}
          strokeDashoffset={adjustedOffset}
          strokeLinecap="round"
          className="score-gauge-fill"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', s.text)}>{score.toFixed(1)}</span>
        {showLabel && <span className={cn('text-gray-500 font-medium', s.label)}>Score</span>}
      </div>
    </div>
  );
}
