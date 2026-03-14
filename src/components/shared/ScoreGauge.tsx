'use client';

import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreGauge({ score, size = 'md', showLabel = true }: ScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 85) return '#10b981'; // emerald
    if (s >= 70) return '#3b82f6'; // blue
    if (s >= 55) return '#f59e0b'; // amber
    if (s >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const sizes = {
    sm: { container: 'w-14 h-14', text: 'text-base', label: 'text-[9px]', r: 24, strokeWidth: 3.5 },
    md: { container: 'w-28 h-28', text: 'text-2xl', label: 'text-[10px]', r: 46, strokeWidth: 5 },
    lg: { container: 'w-36 h-36', text: 'text-3xl', label: 'text-xs', r: 58, strokeWidth: 6 },
  };

  const s = sizes[size];
  const size_ = s.container === 'w-14 h-14' ? 56 : s.container === 'w-28 h-28' ? 112 : 144;
  const cx = size_ / 2;
  const cy = size_ / 2;
  const circumference = 2 * Math.PI * s.r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('score-gauge', s.container)}>
      <svg className="score-gauge-circle" width={size_} height={size_}>
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={s.r}
          fill="none"
          className="score-gauge-bg"
          strokeWidth={s.strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={cx}
          cy={cy}
          r={s.r}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={s.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-gauge-fill"
          style={{
            filter: `drop-shadow(0 0 4px ${getColor(score)}30)`
          }}
        />
      </svg>
      <div className="score-gauge-value">
        <span className={cn('score-gauge-score', s.text)}>{score.toFixed(1)}</span>
        {showLabel && <span className={cn('score-gauge-label', s.label)}>Score</span>}
      </div>
    </div>
  );
}
