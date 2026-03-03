'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScoreGauge } from './ScoreGauge';
import { AnimatedNumber } from './AnimatedNumber';
import { MiniScoreBar } from './ScoreGauge';
import { TrajectIQLogo } from '@/components/TrajectIQLogo';
import {
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  Briefcase,
  User,
  BarChart3,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEvaluationComplete?: (result: any) => void;
}

interface EvaluationResult {
  status: string;
  modules_completed: string[];
  execution_time_ms: number;
  final_scoring?: {
    final_score: {
      normalized_score: number;
      grade: string;
      tier: string;
    };
    recommendation: {
      decision: string;
      confidence: number;
      reasoning: string[];
    };
    factor_scores: Record<string, any>;
  };
  skill_evaluation?: {
    overall_score: { normalized_score: number };
    critical_skills_status: {
      all_critical_met: boolean;
      critical_skills_met_count: number;
      critical_skills_count: number;
    };
    skill_gaps: Array<{ skill: string; gap_type: string }>;
  };
  impact_evaluation?: {
    overall_impact_score: { normalized_score: number };
  };
  trajectory_analysis?: {
    trajectory_score: { overall_score: number };
    progression_analysis: { pattern: string };
  };
  ai_detection?: {
    overall_assessment: { ai_likelihood_score: number };
  };
}

const DEFAULT_JOB_REQUIREMENTS = `{
  "job_id": "JOB-2024-001",
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "required_skills": [
    {
      "name": "Python",
      "category": "Programming",
      "minimum_years": 5,
      "minimum_proficiency": "advanced",
      "weight": 1.0,
      "is_critical": true
    },
    {
      "name": "Kubernetes",
      "category": "Infrastructure",
      "minimum_years": 2,
      "minimum_proficiency": "intermediate",
      "weight": 0.8,
      "is_critical": true
    },
    {
      "name": "AWS",
      "category": "Cloud",
      "minimum_years": 3,
      "minimum_proficiency": "intermediate",
      "weight": 0.6,
      "is_critical": false
    },
    {
      "name": "PostgreSQL",
      "category": "Database",
      "minimum_years": 3,
      "minimum_proficiency": "intermediate",
      "weight": 0.5,
      "is_critical": false
    }
  ],
  "preferred_skills": [
    {"name": "Docker", "category": "Infrastructure", "minimum_years": 2, "weight": 0.3},
    {"name": "Redis", "category": "Database", "minimum_years": 1, "weight": 0.2}
  ]
}`;

const DEFAULT_RESUME = `JOHN SMITH
Senior Software Engineer | San Francisco, CA
john.smith@email.com | (555) 123-4567

PROFESSIONAL SUMMARY
Senior Software Engineer with 8+ years of experience building scalable distributed systems. Expert in Python, Kubernetes, and cloud-native architectures. Led teams of 5-10 engineers delivering high-impact projects.

EXPERIENCE
TechCorp Inc. | Senior Software Engineer | 2020 - Present
• Led microservices architecture serving 10M+ users with 99.9% uptime
• Reduced API latency by 40% through strategic optimization initiatives
• Managed a team of 5 engineers across 3 product teams
• Implemented CI/CD pipelines reducing deployment time by 60%

StartupXYZ | Software Engineer | 2016 - 2020
• Built core platform from ground up, scaling to 1M users
• Designed and implemented real-time data processing pipeline
• Mentored junior engineers and conducted code reviews

EDUCATION
Stanford University | MS Computer Science | 2014-2016
UC Berkeley | BS Computer Science | 2010-2014

SKILLS
Python (8 years, Expert), Kubernetes (4 years, Advanced), AWS (5 years, Advanced)
PostgreSQL (6 years, Advanced), Docker (5 years, Advanced), Redis (3 years, Intermediate)
Leadership, System Design, Technical Architecture, Team Management`;

export function EvaluationDialog({ open, onOpenChange, onEvaluationComplete }: EvaluationDialogProps) {
  const [resumeContent, setResumeContent] = useState(DEFAULT_RESUME);
  const [jobRequirements, setJobRequirements] = useState(DEFAULT_JOB_REQUIREMENTS);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (isEvaluating) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 6);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isEvaluating]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    try {
      let jobReqs;
      try {
        jobReqs = JSON.parse(jobRequirements);
      } catch (e) {
        setError('Invalid JSON in Job Requirements');
        setIsEvaluating(false);
        return;
      }

      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContent,
          jobRequirements: jobReqs,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onEvaluationComplete?.(data.data);
      } else {
        setError(data.error || 'Evaluation failed');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const processingSteps = [
    { name: 'Resume Parser', icon: User },
    { name: 'Skill Evaluator', icon: Target },
    { name: 'Impact Scorer', icon: TrendingUp },
    { name: 'Trajectory Analyzer', icon: BarChart3 },
    { name: 'AI Detector', icon: Shield },
    { name: 'Scoring Engine', icon: Award },
  ];

  const getGradeInfo = (grade: string) => {
    if (grade?.startsWith('A')) return { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Excellent' };
    if (grade?.startsWith('B')) return { color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', label: 'Good' };
    if (grade?.startsWith('C')) return { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Average' };
    return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Below Average' };
  };

  const getRecommendationStyle = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'strong_hire':
      case 'strongly_recommend':
        return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: Sparkles };
      case 'hire':
      case 'recommend':
        return { color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: CheckCircle };
      case 'consider':
        return { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: AlertCircle };
      default:
        return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: XCircle };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white dark:bg-slate-900 border-0">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 pb-24">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl text-white font-bold">AI-Powered Evaluation</DialogTitle>
                <DialogDescription className="text-white/80">
                  Comprehensive candidate assessment in seconds
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Processing indicator */}
          {isEvaluating && (
            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
                <span className="text-white text-sm font-medium">
                  Processing: {processingSteps[activeStep].name}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {processingSteps.map((step, i) => (
                  <div
                    key={step.name}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      i <= activeStep ? 'bg-white' : 'bg-white/20'
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 -mt-16 relative">
            {/* Input Section */}
            {!result && !isEvaluating && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {[
                    { icon: Zap, label: '6 Modules', desc: 'AI Analysis' },
                    { icon: Target, label: '<100ms', desc: 'Avg Response' },
                    { icon: Shield, label: '100%', desc: 'Consistent' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <item.icon className="h-4 w-4 text-indigo-500" />
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* Resume Input */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <User className="h-4 w-4 text-indigo-500" />
                      Resume Content
                    </Label>
                    <Textarea
                      value={resumeContent}
                      onChange={(e) => setResumeContent(e.target.value)}
                      placeholder="Paste resume content here..."
                      className="min-h-[280px] font-mono text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                    />
                  </div>

                  {/* Job Requirements Input */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-semibold">
                      <Briefcase className="h-4 w-4 text-indigo-500" />
                      Job Requirements (JSON)
                    </Label>
                    <Textarea
                      value={jobRequirements}
                      onChange={(e) => setJobRequirements(e.target.value)}
                      placeholder="Paste job requirements JSON..."
                      className="min-h-[280px] font-mono text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Evaluate Button */}
                <Button
                  onClick={handleEvaluate}
                  disabled={!resumeContent.trim()}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white shadow-xl shadow-indigo-500/25 text-lg font-semibold"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Run AI Evaluation
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isEvaluating && (
              <div className="flex flex-col items-center justify-center py-12">
                <TrajectIQLogo variant="icon" size="lg" className="mb-4" />
                <p className="text-lg font-semibold mb-2">Analyzing Candidate...</p>
                <p className="text-sm text-muted-foreground">{processingSteps[activeStep].name}</p>
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="space-y-6">
                {/* Main Score Card */}
                {result.final_scoring && (
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Score Gauge */}
                      <div className="flex-shrink-0">
                        <ScoreGauge
                          score={result.final_scoring.final_score.normalized_score}
                          size="xl"
                          animated
                        />
                      </div>

                      {/* Score Details */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                          {(() => {
                            const gradeInfo = getGradeInfo(result.final_scoring.final_score.grade);
                            return (
                              <Badge className={cn('text-base px-3 py-1', gradeInfo.bg, gradeInfo.color)}>
                                Grade {result.final_scoring.final_score.grade} - {gradeInfo.label}
                              </Badge>
                            );
                          })()}
                          <Badge variant="outline" className="text-muted-foreground">
                            {result.final_scoring.final_score.tier?.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        {/* Recommendation */}
                        {(() => {
                          const recStyle = getRecommendationStyle(result.final_scoring.recommendation?.decision);
                          const RecIcon = recStyle.icon;
                          return (
                            <div className={cn('flex items-center justify-center md:justify-start gap-2 p-3 rounded-xl mb-4', recStyle.bg)}>
                              <RecIcon className={cn('h-5 w-5', recStyle.color)} />
                              <span className={cn('text-lg font-bold', recStyle.color)}>
                                {result.final_scoring.recommendation?.decision?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({((result.final_scoring.recommendation?.confidence || 0) * 100).toFixed(0)}% confidence)
                              </span>
                            </div>
                          );
                        })()}

                        {/* Quick Stats */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span>{result.execution_time_ms?.toFixed(0)}ms</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span>{result.modules_completed?.length} modules</span>
                          </div>
                          {result.skill_evaluation?.critical_skills_status?.all_critical_met && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-amber-500" />
                              <span>All critical skills met</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Factor Scores */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {/* Skills Score */}
                  {result.skill_evaluation && (
                    <FactorCard
                      icon={Target}
                      label="Skills"
                      score={result.skill_evaluation.overall_score?.normalized_score || 0}
                      color="from-indigo-500 to-purple-500"
                      detail={`${result.skill_evaluation.critical_skills_status?.critical_skills_met_count}/${result.skill_evaluation.critical_skills_status?.critical_skills_count} critical`}
                    />
                  )}

                  {/* Impact Score */}
                  {result.impact_evaluation && (
                    <FactorCard
                      icon={TrendingUp}
                      label="Impact"
                      score={result.impact_evaluation.overall_impact_score?.normalized_score || 0}
                      color="from-emerald-500 to-teal-500"
                    />
                  )}

                  {/* Trajectory Score */}
                  {result.trajectory_analysis && (
                    <FactorCard
                      icon={BarChart3}
                      label="Trajectory"
                      score={result.trajectory_analysis.trajectory_score?.overall_score || 0}
                      color="from-cyan-500 to-blue-500"
                      detail={result.trajectory_analysis.progression_analysis?.pattern?.replace(/_/g, ' ')}
                    />
                  )}

                  {/* AI Detection */}
                  {result.ai_detection && (
                    <FactorCard
                      icon={Shield}
                      label="AI Risk"
                      score={result.ai_detection.overall_assessment?.ai_likelihood_score || 0}
                      color="from-amber-500 to-orange-500"
                      isRisk
                      detail={`${result.ai_detection.overall_assessment?.ai_likelihood_score}% risk`}
                    />
                  )}
                </div>

                {/* Skill Gaps */}
                {result.skill_evaluation?.skill_gaps && result.skill_evaluation.skill_gaps.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3">
                      <Target className="h-4 w-4" />
                      Skill Gaps Identified
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.skill_evaluation.skill_gaps.map((gap, i) => (
                        <Badge key={i} variant="outline" className="bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                          {gap.skill}: {gap.gap_type.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {result.final_scoring?.recommendation?.reasoning && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <h4 className="font-semibold mb-3">AI Reasoning</h4>
                    <ul className="space-y-2">
                      {result.final_scoring.recommendation.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Modules Completed */}
                <div className="flex flex-wrap gap-2">
                  {result.modules_completed?.map((module) => (
                    <Badge key={module} variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {module.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>

                {/* New Evaluation Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 border-2"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Evaluate Another Candidate
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Factor card component
interface FactorCardProps {
  icon: React.ElementType;
  label: string;
  score: number;
  color: string;
  detail?: string;
  isRisk?: boolean;
}

function FactorCard({ icon: Icon, label, score, color, detail, isRisk }: FactorCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white', color)}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <AnimatedNumber value={score} className="text-2xl font-bold" />
        {!isRisk && <span className="text-sm text-muted-foreground">/100</span>}
        {isRisk && <span className="text-sm text-muted-foreground">%</span>}
      </div>
      {detail && (
        <p className="text-xs text-muted-foreground mt-1 capitalize">{detail}</p>
      )}
      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-1000', color)}
          style={{ width: `${isRisk ? score : score}%` }}
        />
      </div>
    </div>
  );
}

export default EvaluationDialog;
