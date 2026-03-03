'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  index?: number;
}

const variantStyles = {
  default: {
    gradient: 'from-slate-50 to-slate-100',
    iconBg: 'bg-gradient-to-br from-slate-500/10 to-slate-600/10',
    iconColor: 'text-slate-600',
    border: 'border-slate-200/50',
    glow: 'hover:shadow-slate-200/50',
  },
  primary: {
    gradient: 'from-indigo-50 via-purple-50 to-pink-50',
    iconBg: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-200/50',
    glow: 'hover:shadow-indigo-300/40',
  },
  success: {
    gradient: 'from-emerald-50 via-teal-50 to-cyan-50',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-200/50',
    glow: 'hover:shadow-emerald-300/40',
  },
  warning: {
    gradient: 'from-amber-50 via-orange-50 to-yellow-50',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-600',
    border: 'border-amber-200/50',
    glow: 'hover:shadow-amber-300/40',
  },
  danger: {
    gradient: 'from-red-50 via-rose-50 to-pink-50',
    iconBg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
    iconColor: 'text-red-600',
    border: 'border-red-200/50',
    glow: 'hover:shadow-red-300/40',
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  index = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const styles = variantStyles[variant];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);
    return () => clearTimeout(timeout);
  }, [index]);

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border transition-all duration-500',
        'bg-gradient-to-br',
        styles.gradient,
        styles.border,
        'hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1',
        styles.glow,
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-xl" />
        <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-gradient-to-tr from-white/40 to-transparent blur-lg" />
      </div>

      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              {typeof value === 'number' ? (
                <AnimatedNumber
                  value={numericValue}
                  className="text-3xl font-bold tracking-tight"
                  duration={1500}
                />
              ) : (
                <span className="text-3xl font-bold tracking-tight">{value}</span>
              )}
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
                    trend.isPositive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  <span className="text-sm">{trend.isPositive ? '↑' : '↓'}</span>
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          <div
            className={cn(
              'relative p-3 rounded-xl transition-transform duration-300 hover:scale-110 hover:rotate-6',
              styles.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
            {/* Glow effect on icon */}
            <div className={cn('absolute inset-0 rounded-xl blur-md opacity-50', styles.iconBg)} />
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="mt-4 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all duration-1000',
              variant === 'primary' && 'from-indigo-500 to-purple-500',
              variant === 'success' && 'from-emerald-500 to-teal-500',
              variant === 'warning' && 'from-amber-500 to-orange-500',
              variant === 'danger' && 'from-red-500 to-rose-500',
              variant === 'default' && 'from-slate-400 to-slate-500'
            )}
            style={{ 
              width: isVisible ? `${Math.min((numericValue / 100) * 100, 100)}%` : '0%' 
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Compact mini stat card
interface MiniStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'cyan';
  className?: string;
}

const colorStyles = {
  indigo: 'from-indigo-500 to-purple-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  red: 'from-red-500 to-rose-500',
  cyan: 'from-cyan-500 to-blue-500',
};

export function MiniStatCard({
  title,
  value,
  icon: Icon,
  color = 'indigo',
  className,
}: MiniStatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm border border-white/20 shadow-lg',
        className
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg bg-gradient-to-br text-white shadow-lg',
          colorStyles[color]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
