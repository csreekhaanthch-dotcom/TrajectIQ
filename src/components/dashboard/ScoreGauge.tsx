'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80, height: 80, strokeWidth: 6, textSize: 'text-lg' },
  md: { width: 120, height: 120, strokeWidth: 8, textSize: 'text-2xl' },
  lg: { width: 160, height: 160, strokeWidth: 10, textSize: 'text-4xl' },
  xl: { width: 200, height: 200, strokeWidth: 12, textSize: 'text-5xl' },
};

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 'md',
  showLabel = true,
  label,
  animated = true,
  className,
}: ScoreGaugeProps) {
  // Initialize with proper starting value
  const [animatedScore, setAnimatedScore] = useState(() => animated ? 0 : score);
  const config = sizeConfig[size];

  useEffect(() => {
    if (!animated) return;

    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [score, animated]);

  const percentage = (animatedScore / maxScore) * 100;
  const radius = (Math.min(config.width, config.height) / 2) - config.strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColorClass = (scoreVal: number) => {
    if (scoreVal >= 85) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', grade: 'A' };
    if (scoreVal >= 70) return { stroke: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)', grade: 'B' };
    if (scoreVal >= 55) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', grade: 'C' };
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)', grade: 'D' };
  };

  const colorConfig = getColorClass(animatedScore);

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-muted/20"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorConfig.stroke} />
            <stop offset="100%" stopColor={colorConfig.stroke} stopOpacity="0.6" />
          </linearGradient>
          <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Progress circle */}
        <circle
          cx={config.width / 2}
          cy={config.height / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${score})`}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter={`url(#glow-${score})`}
          className={cn('transition-all duration-1000 ease-out')}
          style={{
            filter: `drop-shadow(0 0 8px ${colorConfig.glow})`,
          }}
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold text-foreground', config.textSize)}>
          {animatedScore}
        </span>
        {size !== 'sm' && (
          <span className="text-xs text-muted-foreground font-medium">
            / {maxScore}
          </span>
        )}
      </div>

      {/* Label */}
      {showLabel && label && (
        <span className="mt-2 text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}

      {/* Grade badge */}
      {size !== 'sm' && (
        <div
          className={cn(
            'absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg',
            animatedScore >= 85 && 'bg-emerald-500',
            animatedScore >= 70 && animatedScore < 85 && 'bg-indigo-500',
            animatedScore >= 55 && animatedScore < 70 && 'bg-amber-500',
            animatedScore < 55 && 'bg-red-500'
          )}
        >
          {colorConfig.grade}
        </div>
      )}
    </div>
  );
}

// Mini progress bar version
interface MiniScoreBarProps {
  score: number;
  maxScore?: number;
  label?: string;
  className?: string;
}

export function MiniScoreBar({ score, maxScore = 100, label, className }: MiniScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  const getGradient = (scoreVal: number) => {
    if (scoreVal >= 85) return 'from-emerald-500 to-teal-400';
    if (scoreVal >= 70) return 'from-indigo-500 to-purple-400';
    if (scoreVal >= 55) return 'from-amber-500 to-orange-400';
    return 'from-red-500 to-rose-400';
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{score}</span>
        </div>
      )}
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out',
            getGradient(score)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Radial Progress for multiple scores
interface MultiScoreGaugeProps {
  scores: { label: string; score: number; color: string }[];
  size?: 'md' | 'lg';
  className?: string;
}

export function MultiScoreGauge({ scores, size = 'md', className }: MultiScoreGaugeProps) {
  const config = size === 'lg' 
    ? { width: 200, height: 200, strokeWidth: 8 }
    : { width: 140, height: 140, strokeWidth: 6 };

  const radius = (Math.min(config.width, config.height) / 2) - config.strokeWidth - (scores.length - 1) * 4;

  return (
    <div className={cn('relative', className)}>
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="transform -rotate-90"
      >
        {scores.map((item, index) => {
          const currentRadius = radius - index * 10;
          const circumference = 2 * Math.PI * currentRadius;
          const strokeDashoffset = circumference - (item.score / 100) * circumference;

          return (
            <circle
              key={item.label}
              cx={config.width / 2}
              cy={config.height / 2}
              r={currentRadius}
              fill="none"
              stroke={item.color}
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 4px ${item.color}40)`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
