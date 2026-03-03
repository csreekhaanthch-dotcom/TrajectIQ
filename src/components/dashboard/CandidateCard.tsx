'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoreGauge, MiniScoreBar } from './ScoreGauge';
import { AnimatedNumber } from './AnimatedNumber';
import {
  X,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  TrendingUp,
  Brain,
  Target,
  Award,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Candidate } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  candidate: Candidate;
  rank?: number;
  onClose?: () => void;
}

export function CandidateCard({ candidate, rank, onClose }: CandidateCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getGradeColor = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-500', text: 'text-white', grade: 'A', label: 'Excellent' };
    if (score >= 70) return { bg: 'bg-indigo-500', text: 'text-white', grade: 'B', label: 'Good' };
    if (score >= 55) return { bg: 'bg-amber-500', text: 'text-white', grade: 'C', label: 'Average' };
    return { bg: 'bg-red-500', text: 'text-white', grade: 'D', label: 'Below Average' };
  };

  const getRecommendationStyle = (rec: string) => {
    switch (rec?.toUpperCase()) {
      case 'STRONGLY_RECOMMEND':
        return { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Strongly Recommend' };
      case 'RECOMMEND':
        return { icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Recommend' };
      case 'CONSIDER':
        return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Consider' };
      default:
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Not Recommended' };
    }
  };

  const gradeInfo = getGradeColor(candidate.score);
  const recStyle = getRecommendationStyle(candidate.recommendation || 'CONSIDER');
  const RecIcon = recStyle.icon;

  // Mock detailed scores for visual demonstration
  const detailedScores = {
    skills: candidate.skillsScore || Math.round(candidate.score * 0.9 + Math.random() * 20),
    impact: candidate.impactScore || Math.round(candidate.score * 0.8 + Math.random() * 15),
    trajectory: candidate.trajectoryScore || Math.round(candidate.score * 0.7 + Math.random() * 25),
    experience: candidate.experienceScore || Math.round(candidate.score * 0.85 + Math.random() * 10),
  };

  return (
    <div
      className={cn(
        'transition-all duration-500',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
    >
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 pb-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <span className="text-2xl font-bold text-white">
                  {candidate.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {rank && (
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-amber-900 shadow-lg">
                  #{rank}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{candidate.name}</h3>
              <p className="text-white/80 flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {candidate.email}
              </p>
            </div>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {candidate.currentRole && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Briefcase className="h-3 w-3 mr-1" />
              {candidate.currentRole}
            </Badge>
          )}
          {candidate.company && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Building2 className="h-3 w-3 mr-1" />
              {candidate.company}
            </Badge>
          )}
        </div>

        {/* Floating score gauge */}
        <div className="absolute -bottom-16 right-6">
          <ScoreGauge score={candidate.score} size="lg" animated showLabel={false} />
        </div>
      </div>

      <CardContent className="p-6 pt-20">
        {/* Recommendation banner */}
        <div className={cn('flex items-center gap-2 p-3 rounded-xl mb-6', recStyle.bg)}>
          <RecIcon className={cn('h-5 w-5', recStyle.color)} />
          <span className={cn('font-semibold', recStyle.color)}>{recStyle.label}</span>
          <Badge className={cn('ml-auto', gradeInfo.bg, gradeInfo.text)}>
            Grade {gradeInfo.grade}
          </Badge>
        </div>

        {/* Score breakdown */}
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Score Breakdown
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <ScoreBreakdownItem
              icon={Target}
              label="Skills"
              score={detailedScores.skills}
              color="from-indigo-500 to-purple-500"
              delay={0}
            />
            <ScoreBreakdownItem
              icon={TrendingUp}
              label="Impact"
              score={detailedScores.impact}
              color="from-emerald-500 to-teal-500"
              delay={100}
            />
            <ScoreBreakdownItem
              icon={Brain}
              label="Trajectory"
              score={detailedScores.trajectory}
              color="from-cyan-500 to-blue-500"
              delay={200}
            />
            <ScoreBreakdownItem
              icon={Award}
              label="Experience"
              score={detailedScores.experience}
              color="from-amber-500 to-orange-500"
              delay={300}
            />
          </div>
        </div>

        {/* AI Detection Risk */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">AI Assistance Risk</span>
            </div>
            <Badge variant="outline" className="bg-white dark:bg-slate-800">
              {candidate.aiRisk || 15}% Low Risk
            </Badge>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-1000"
              style={{ width: `${candidate.aiRisk || 15}%` }}
            />
          </div>
        </div>

        {/* Skills Match */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Skills Match
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Evaluated {new Date(candidate.evaluatedAt).toLocaleDateString()}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {candidate.jobTitle}
          </span>
        </div>
      </CardContent>
    </div>
  );
}

// Score breakdown item component
interface ScoreBreakdownItemProps {
  icon: React.ElementType;
  label: string;
  score: number;
  color: string;
  delay: number;
}

function ScoreBreakdownItem({ icon: Icon, label, score, color, delay }: ScoreBreakdownItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white', color)}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <AnimatedNumber
          value={score}
          className="text-2xl font-bold"
          duration={1000}
        />
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-1000', color)}
          style={{ width: isVisible ? `${score}%` : '0%' }}
        />
      </div>
    </div>
  );
}

export default CandidateCard;
