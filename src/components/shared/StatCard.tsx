'use client';

import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  iconGradient?: string;
  index?: number;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  iconGradient = 'bg-blue-100 dark:bg-blue-900/30',
  index = 0
}: StatCardProps) {
  return (
    <div 
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover group animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {change && (
            <div className={cn(
              "flex items-center gap-1.5 mt-2 text-sm font-medium",
              changeType === 'positive' && "text-emerald-600 dark:text-emerald-400",
              changeType === 'negative' && "text-red-600 dark:text-red-400",
              changeType === 'neutral' && "text-gray-500 dark:text-gray-400"
            )}>
              {changeType === 'positive' && <ArrowUpRight className="w-4 h-4" />}
              {changeType === 'negative' && <ArrowDownRight className="w-4 h-4" />}
              {change}
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
          iconGradient
        )}>
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}
