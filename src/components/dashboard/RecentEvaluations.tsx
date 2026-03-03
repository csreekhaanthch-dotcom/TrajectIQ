'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User } from 'lucide-react';
import type { RecentEvaluation } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface RecentEvaluationsProps {
  evaluations: RecentEvaluation[];
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (grade === 'D') return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentEvaluations({ evaluations }: RecentEvaluationsProps) {
  if (evaluations.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>No recent evaluations to display</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Evaluations
        </CardTitle>
        <CardDescription>Latest candidate evaluations</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {evaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(evaluation.candidateName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{evaluation.candidateName}</span>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', getGradeColor(evaluation.grade))}
                    >
                      {evaluation.grade}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{evaluation.jobTitle}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="shrink-0">{formatRelativeTime(evaluation.evaluatedAt)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">{evaluation.score}</div>
                  <div className="text-xs text-muted-foreground">score</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
