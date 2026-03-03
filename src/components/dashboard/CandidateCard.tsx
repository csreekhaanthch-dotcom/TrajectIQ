'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  Briefcase,
  GraduationCap,
  Calendar,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Candidate } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  candidate: Candidate;
  rank?: number;
  onClose?: () => void;
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

function getSkillColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-teal-500';
  if (score >= 70) return 'bg-amber-500';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CandidateCard({ candidate, rank, onClose }: CandidateCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>
              {rank && rank <= 3 && (
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">
                  #{rank}
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-xl">{candidate.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Briefcase className="h-3.5 w-3.5" />
                {candidate.jobTitle}
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Score and Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{candidate.score}</span>
            <span className="text-muted-foreground">/ 100</span>
          </div>
          <Badge variant="outline" className={cn('text-sm font-semibold', getGradeColor(candidate.grade))}>
            Grade: {candidate.grade}
          </Badge>
          <Badge variant="outline" className={cn('text-sm', getRecommendationStyle(candidate.recommendation))}>
            {candidate.recommendation}
          </Badge>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="truncate">{candidate.experience} years exp.</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="truncate">{formatDate(candidate.evaluatedAt)}</span>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {candidate.summary}
          </p>
        </div>

        {/* Education */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            Education
          </h4>
          <p className="text-sm text-muted-foreground">{candidate.education}</p>
        </div>

        {/* Skills */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Skills Assessment</h4>
          <ScrollArea className="h-[160px] pr-4">
            <div className="space-y-3">
              {candidate.skills.map((skill) => (
                <div key={skill.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{skill.name}</span>
                    <span className="text-muted-foreground">{skill.score}%</span>
                  </div>
                  <Progress 
                    value={skill.score} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* Strengths */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Strengths
          </h4>
          <ul className="space-y-1">
            {candidate.strengths.map((strength, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <Star className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-amber-700">
            <TrendingUp className="h-4 w-4" />
            Areas for Improvement
          </h4>
          <ul className="space-y-1">
            {candidate.improvements.map((improvement, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
