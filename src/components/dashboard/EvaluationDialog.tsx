'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Briefcase,
  User,
  BarChart3,
} from 'lucide-react';

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

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      // Parse job requirements
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

  const getGradeColor = (grade: string) => {
    if (grade?.startsWith('A')) return 'bg-emerald-500';
    if (grade?.startsWith('B')) return 'bg-blue-500';
    if (grade?.startsWith('C')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getRecommendationColor = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'strong_hire': return 'text-emerald-600';
      case 'hire': return 'text-blue-600';
      case 'consider': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Evaluate Candidate
          </DialogTitle>
          <DialogDescription>
            Paste resume content and job requirements to get a comprehensive evaluation
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Input Section */}
            {!result && (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Resume Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Resume Content
                  </Label>
                  <Textarea
                    value={resumeContent}
                    onChange={(e) => setResumeContent(e.target.value)}
                    placeholder="Paste resume content here..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Job Requirements Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Job Requirements (JSON)
                  </Label>
                  <Textarea
                    value={jobRequirements}
                    onChange={(e) => setJobRequirements(e.target.value)}
                    placeholder="Paste job requirements JSON..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="space-y-6">
                {/* Status Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.status === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {result.status === 'complete' ? 'Evaluation Complete' : 'Partial Evaluation'}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {result.execution_time_ms?.toFixed(0)}ms
                  </Badge>
                </div>

                {/* Modules Completed */}
                <div className="flex flex-wrap gap-2">
                  {result.modules_completed?.map((module) => (
                    <Badge key={module} variant="secondary" className="text-xs">
                      ✓ {module.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>

                {/* Main Score Card */}
                {result.final_scoring && (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    {/* Score */}
                    <div className="p-4 rounded-lg bg-primary/5 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Final Score</span>
                        <Badge className={getGradeColor(result.final_scoring.final_score.grade)}>
                          {result.final_scoring.final_score.grade}
                        </Badge>
                      </div>
                      <div className="text-4xl font-bold">
                        {result.final_scoring.final_score.normalized_score}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.final_scoring.final_score.tier?.replace('_', ' ')}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="p-4 rounded-lg bg-primary/5 border">
                      <span className="text-sm text-muted-foreground">Recommendation</span>
                      <div className={`text-xl font-semibold mt-1 ${getRecommendationColor(result.final_scoring.recommendation?.decision)}`}>
                        {result.final_scoring.recommendation?.decision?.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Confidence: {((result.final_scoring.recommendation?.confidence || 0) * 100).toFixed(0)}%
                      </div>
                    </div>

                    {/* Critical Skills */}
                    {result.skill_evaluation && (
                      <div className="p-4 rounded-lg bg-primary/5 border">
                        <span className="text-sm text-muted-foreground">Critical Skills</span>
                        <div className="flex items-center gap-2 mt-1">
                          {result.skill_evaluation.critical_skills_status?.all_critical_met ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-lg font-semibold">
                            {result.skill_evaluation.critical_skills_status?.critical_skills_met_count}/
                            {result.skill_evaluation.critical_skills_status?.critical_skills_count}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Skills Score: {result.skill_evaluation.overall_score?.normalized_score}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Factor Scores */}
                {result.final_scoring?.factor_scores && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Factor Breakdown
                    </h4>
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      {Object.entries(result.final_scoring.factor_scores).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-lg font-semibold">
                            {value?.normalized_score || value?.score || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Scores */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  {result.impact_evaluation && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Impact Score</div>
                      <div className="text-lg font-semibold">
                        {result.impact_evaluation.overall_impact_score?.normalized_score}
                      </div>
                    </div>
                  )}
                  {result.trajectory_analysis && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Trajectory Score</div>
                      <div className="text-lg font-semibold">
                        {result.trajectory_analysis.trajectory_score?.overall_score}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {result.trajectory_analysis.progression_analysis?.pattern?.replace('_', ' ')}
                      </div>
                    </div>
                  )}
                  {result.ai_detection && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">AI Likelihood</div>
                      <div className="text-lg font-semibold">
                        {result.ai_detection.overall_assessment?.ai_likelihood_score}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Skill Gaps */}
                {result.skill_evaluation?.skill_gaps && result.skill_evaluation.skill_gaps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Skill Gaps
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.skill_evaluation.skill_gaps.map((gap, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {gap.skill}: {gap.gap_type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {result.final_scoring?.recommendation?.reasoning && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Reasoning</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.final_scoring.recommendation.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* New Evaluation Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                >
                  Evaluate Another Candidate
                </Button>
              </div>
            )}

            {/* Evaluate Button */}
            {!result && (
              <Button
                onClick={handleEvaluate}
                disabled={isEvaluating || !resumeContent.trim()}
                className="w-full bg-gradient-to-r from-primary to-teal-600 hover:from-primary/90 hover:to-teal-600/90"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating Candidate...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Run Evaluation
                  </>
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
