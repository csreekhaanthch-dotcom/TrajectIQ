'use client';

import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  iconGradient?: 'blue' | 'green' | 'purple' | 'amber' | 'teal';
  index?: number;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  iconGradient = 'blue',
  index = 0
}: StatCardProps) {
  const iconColors: Record<string, string> = {
    blue: 'bg-primary-100 text-primary-600 dark:bg-primary/15 dark:text-primary-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    purple: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
  };

  return (
    <div 
      className="stat-card animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="stat-card-header">
        <p className="stat-card-title">{title}</p>
        <div className={cn("stat-card-icon", iconColors[iconGradient])}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="stat-card-value">{value}</p>
      {change && (
        <div className={cn("stat-card-change", changeType)}>
          {changeType === 'positive' && <ArrowUpRight className="w-3.5 h-3.5" />}
          {changeType === 'negative' && <ArrowDownRight className="w-3.5 h-3.5" />}
          {changeType === 'neutral' && <Minus className="w-3.5 h-3.5" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
