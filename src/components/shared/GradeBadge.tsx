'use client';

import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const getGradeClass = (g: string) => {
    if (g.startsWith('A')) return 'grade-a';
    if (g.startsWith('B')) return 'grade-b';
    if (g.startsWith('C')) return 'grade-c';
    if (g.startsWith('D')) return 'grade-d';
    return 'grade-f';
  };
  
  const formatGrade = (g: string) => {
    const gradeMap: Record<string, string> = {
      'A_PLUS': 'A+', 'A_MINUS': 'A-',
      'B_PLUS': 'B+', 'B_MINUS': 'B-',
      'C_PLUS': 'C+', 'C_MINUS': 'C-',
      'D_PLUS': 'D+', 'D_MINUS': 'D-',
    };
    return gradeMap[g] || g;
  };

  const sizeClass = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-lg',
      getGradeClass(grade),
      sizeClass[size]
    )}>
      {formatGrade(grade)}
    </span>
  );
}
