'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Trophy, Medal, Award } from 'lucide-react';
import type { Candidate } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface LeaderboardTableProps {
  candidates: Candidate[];
  onViewDetails?: (candidateId: string) => void;
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (grade === 'D') return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function getRecommendationStyle(recommendation: string): string {
  switch (recommendation) {
    case 'Strongly Recommend':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Recommend':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Consider':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Not Recommended':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-teal-500';
  if (score >= 70) return 'bg-amber-500';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function LeaderboardTable({ candidates, onViewDetails }: LeaderboardTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Candidate Leaderboard
        </CardTitle>
        <CardDescription>Ranked by evaluation score (highest to lowest)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12 text-center">Rank</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="w-32">Score</TableHead>
                <TableHead className="w-16 text-center">Grade</TableHead>
                <TableHead className="hidden lg:table-cell">Recommendation</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate, index) => {
                const rank = index + 1;
                return (
                  <TableRow key={candidate.id} className="group">
                    <TableCell className="text-center font-medium">
                      <div className="flex items-center justify-center gap-1">
                        {getRankIcon(rank)}
                        <span className={cn(
                          rank <= 3 ? 'font-bold' : ''
                        )}>{rank}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {candidate.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{candidate.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold">{candidate.score}</span>
                        </div>
                        <Progress 
                          value={candidate.score} 
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={cn('font-semibold', getGradeColor(candidate.grade))}
                      >
                        {candidate.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', getRecommendationStyle(candidate.recommendation))}
                      >
                        {candidate.recommendation}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onViewDetails?.(candidate.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
