'use client';

import { useState } from 'react';
import { Target, Upload, ChevronDown, Check, AlertCircle, TrendingUp, Briefcase, Users, Award } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { GradeBadge } from '@/components/shared/GradeBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { cn } from '@/lib/utils';

interface ScoringResult {
  finalScore: number;
  grade: string;
  tier: number;
  recommendation: string;
  sdi: { score: number; weight: number; breakdown: string[] };
  csig: { score: number; weight: number; breakdown: string[] };
  iae: { score: number; weight: number; breakdown: string[] };
  cta: { score: number; weight: number; breakdown: string[] };
  err: { score: number; weight: number; breakdown: string[] };
}

const mockJobs = [
  { id: '1', title: 'Senior Software Engineer', department: 'Engineering' },
  { id: '2', title: 'Full Stack Developer', department: 'Engineering' },
  { id: '3', title: 'Python Developer', department: 'Data' },
  { id: '4', title: 'DevOps Engineer', department: 'Infrastructure' },
];

const mockCandidates = [
  { id: '1', name: 'John Smith', email: 'john.smith@email.com' },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@email.com' },
  { id: '3', name: 'Mike Johnson', email: 'mike.j@email.com' },
];

export default function EvaluatePage() {
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [resumeText, setResumeText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

  const handleEvaluate = async () => {
    if (!selectedJob || !selectedCandidate) return;
    
    setIsEvaluating(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResult: ScoringResult = {
        finalScore: 78.5,
        grade: 'B_PLUS',
        tier: 2,
        recommendation: 'HIRE',
        sdi: { 
          score: 82, 
          weight: 0.40, 
          breakdown: ['Strong technical depth', 'Diverse skill set', 'Recent experience in required skills'] 
        },
        csig: { 
          score: 75, 
          weight: 0.15, 
          breakdown: ['3 of 4 critical skills matched', 'Missing: Kubernetes', 'Partial match: AWS'] 
        },
        iae: { 
          score: 70, 
          weight: 0.20, 
          breakdown: ['Quantified achievements: 3', 'Leadership signals detected', 'Impact score: Good'] 
        },
        cta: { 
          score: 85, 
          weight: 0.15, 
          breakdown: ['Career progression: Strong', 'Average tenure: 2.5 years', 'Promotion rate: High'] 
        },
        err: { 
          score: 80, 
          weight: 0.10, 
          breakdown: ['Relevant experience: 6 years', 'Industry match: Yes', 'Technology alignment: 85%'] 
        },
      };
      setResult(mockResult);
      setIsEvaluating(false);
    }, 2000);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_HIRE': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'HIRE': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'CONSIDER': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'REVIEW': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Candidate Evaluation</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Score candidates using the TrajectIQ deterministic hiring formula
          </p>
        </div>

        {/* Evaluation Form */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold mb-4">Select Candidate & Job Requirement</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Job Selection */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1.5">Job Requirement</label>
              <button
                onClick={() => { setShowJobDropdown(!showJobDropdown); setShowCandidateDropdown(false); }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <span className={selectedJob ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {selectedJob 
                    ? mockJobs.find(j => j.id === selectedJob)?.title 
                    : 'Select a job requirement'}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showJobDropdown && "rotate-180")} />
              </button>
              
              {showJobDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowJobDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {mockJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => { setSelectedJob(job.id); setShowJobDropdown(false); }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between",
                          selectedJob === job.id && "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <div>
                          <p className="font-medium">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.department}</p>
                        </div>
                        {selectedJob === job.id && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Candidate Selection */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1.5">Candidate</label>
              <button
                onClick={() => { setShowCandidateDropdown(!showCandidateDropdown); setShowJobDropdown(false); }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <span className={selectedCandidate ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {selectedCandidate 
                    ? mockCandidates.find(c => c.id === selectedCandidate)?.name 
                    : 'Select a candidate'}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showCandidateDropdown && "rotate-180")} />
              </button>
              
              {showCandidateDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCandidateDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {mockCandidates.map(candidate => (
                      <button
                        key={candidate.id}
                        onClick={() => { setSelectedCandidate(candidate.id); setShowCandidateDropdown(false); }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between",
                          selectedCandidate === candidate.id && "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-gray-500">{candidate.email}</p>
                        </div>
                        {selectedCandidate === candidate.id && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Resume Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">Resume Content (Optional)</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume text here or upload a file..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Upload className="w-4 h-4" />
              Upload Resume
            </button>
            <button 
              onClick={handleEvaluate}
              disabled={!selectedJob || !selectedCandidate || isEvaluating}
              className="flex-1 gradient-primary text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Evaluate Candidate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scoring Result */}
        {result && (
          <div className="space-y-6">
            {/* Main Score */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center">
                  <ScoreGauge score={result.finalScore} size="lg" />
                  <div className="mt-4 flex items-center gap-2">
                    <GradeBadge grade={result.grade} size="lg" />
                    <span className={cn("px-3 py-1 rounded-lg text-sm font-semibold", getRecommendationColor(result.recommendation))}>
                      {result.recommendation.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4">Score Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'sdi', name: 'Skill Depth Index', icon: TrendingUp, ...result.sdi },
                      { key: 'csig', name: 'Critical Skill Gate', icon: Check, ...result.csig },
                      { key: 'iae', name: 'Impact Authenticity', icon: Award, ...result.iae },
                      { key: 'cta', name: 'Career Trajectory', icon: Briefcase, ...result.cta },
                      { key: 'err', name: 'Experience Relevance', icon: Users, ...result.err },
                    ].map(component => (
                      <div key={component.key} className="flex items-center gap-3">
                        <div className="w-32 flex items-center gap-2">
                          <component.icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{component.name}</span>
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${component.score}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-sm font-semibold">{component.score}</span>
                          <span className="text-xs text-gray-400 ml-1">×{component.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Final Score</span>
                      <span className="text-2xl font-bold">{result.finalScore}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Formula: SDI×0.40 + CSIG×0.15 + IAE×0.20 + CTA×0.15 + ERR×0.10
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'sdi', name: 'Skill Depth Index (SDI)', data: result.sdi },
                { key: 'csig', name: 'Critical Skill Gate (CSIG)', data: result.csig },
                { key: 'iae', name: 'Impact Authenticity (IAE)', data: result.iae },
                { key: 'cta', name: 'Career Trajectory (CTA)', data: result.cta },
                { key: 'err', name: 'Experience Relevance (ERR)', data: result.err },
              ].map(component => (
                <div key={component.key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{component.name}</h4>
                    <span className="text-lg font-bold">{component.data.score}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {component.data.breakdown.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                Export Report
              </button>
              <button className="flex-1 gradient-primary text-white py-2.5 px-4 rounded-xl font-medium">
                Save Evaluation
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
