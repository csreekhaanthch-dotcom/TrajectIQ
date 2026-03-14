'use client';

import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const getGradeClass = (g: string) => {
    if (g === 'A' || g === 'A_PLUS') return 'grade-a';
    if (g === 'A_MINUS') return 'grade-a';
    if (g === 'B_PLUS') return 'grade-bplus';
    if (g === 'B') return 'grade-b';
    if (g === 'B_MINUS') return 'grade-bminus';
    if (g === 'C_PLUS') return 'grade-cplus';
    if (g === 'C') return 'grade-c';
    if (g === 'C_MINUS') return 'grade-cminus';
    if (g.startsWith('D')) return 'grade-cminus';
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
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={cn(
      'grade-badge inline-flex items-center font-semibold rounded',
      getGradeClass(grade),
      sizeClass[size]
    )}>
      {formatGrade(grade)}
    </span>
  );
}
