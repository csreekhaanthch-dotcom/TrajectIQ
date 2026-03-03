'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [resumeContent, setResumeContent] = useState(`MICHAEL ZHANG
Principal Software Engineer | Mountain View, CA
michael.zhang@email.com | (555) 999-1234

PROFESSIONAL SUMMARY
Principal Engineer with 12+ years building large-scale distributed systems. 
Previously at Google and Stripe. Expert in Python, Kubernetes, and ML infrastructure.

EXPERIENCE
Stripe | Principal Engineer | 2020 - Present
- Led migration of 200+ microservices to Kubernetes
- Architected payment system processing $500B annually
- Reduced infrastructure costs by 60%, saving $2M/year

Google | Staff Software Engineer | 2015 - 2020
- Built ML platform serving 1B predictions daily
- Led migration from monolith to microservices

StartupXYZ | Founding Engineer | 2012 - 2015
- Built core platform from 0 to 5M users

EDUCATION
MIT | MS Computer Science | 2010-2012
Stanford | BS Computer Science | 2006-2010

SKILLS
Python (12 yrs, Expert), Kubernetes (7 yrs, Expert), AWS (10 yrs, Expert)
PostgreSQL, Docker, Go, Machine Learning`);

  const [jobRequirements, setJobRequirements] = useState(JSON.stringify({
    job_id: "JOB-SE-001",
    job_title: "Senior Software Engineer",
    required_skills: [
      { name: "Python", minimum_years: 5, minimum_proficiency: "advanced", weight: 1.0, is_critical: true },
      { name: "Kubernetes", minimum_years: 3, minimum_proficiency: "intermediate", weight: 0.9, is_critical: true },
      { name: "AWS", minimum_years: 3, minimum_proficiency: "intermediate", weight: 0.7, is_critical: false }
    ]
  }, null, 2));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_content: resumeContent,
          job_requirements: JSON.parse(jobRequirements)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Evaluation failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade?.startsWith('A')) return 'text-green-600 bg-green-100';
    if (grade?.startsWith('B')) return 'text-blue-600 bg-blue-100';
    if (grade?.startsWith('C')) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold">TI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
                TrajectIQ
              </h1>
              <p className="text-xs text-slate-400">Intelligence-Driven Hiring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">API:</span>
            <span className="text-sm text-emerald-400">{API_URL}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!result ? (
          /* Input Section */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume Input */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">📄</span>
                Resume Content
              </h2>
              <textarea
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                className="w-full h-96 bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Paste resume content here..."
              />
            </div>

            {/* Job Requirements Input */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400">📋</span>
                Job Requirements (JSON)
              </h2>
              <textarea
                value={jobRequirements}
                onChange={(e) => setJobRequirements(e.target.value)}
                className="w-full h-96 bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Paste job requirements JSON..."
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="lg:col-span-2 bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-200">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Evaluate Button */}
            <div className="lg:col-span-2">
              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Evaluating...
                  </>
                ) : (
                  <>🚀 Run Evaluation</>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            {/* Hero Score Card */}
            <div className="bg-gradient-to-r from-indigo-600 to-teal-600 rounded-2xl p-8 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Evaluation Complete</h2>
                  <p className="text-white/80">ID: {result.candidate_id}</p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold">
                    {result.final_scoring?.final_score?.normalized_score || 0}
                  </div>
                  <div className="text-xl mt-1">out of 100</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold px-6 py-2 rounded-xl ${getGradeColor(result.final_scoring?.final_score?.grade || 'F')}`}>
                    Grade: {result.final_scoring?.final_score?.grade || 'N/A'}
                  </div>
                  <div className="mt-2 text-lg">
                    {result.final_scoring?.recommendation?.decision?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                  </div>
                </div>
              </div>
            </div>

            {/* Factor Scores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Skills', score: result.skill_evaluation?.overall_score?.normalized_score, weight: '35%', icon: '🔧' },
                { label: 'Impact', score: result.impact_evaluation?.overall_impact_score?.normalized_score, weight: '25%', icon: '📈' },
                { label: 'Trajectory', score: result.trajectory_analysis?.trajectory_score?.overall_score, weight: '25%', icon: '🔄' },
                { label: 'AI Risk', score: `${result.ai_detection?.overall_assessment?.ai_likelihood_score}%`, weight: '', icon: '🤖' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{item.icon}</span>
                    <span className="text-slate-400 text-sm">{item.label}</span>
                    {item.weight && <span className="text-xs text-slate-500">({item.weight})</span>}
                  </div>
                  <div className="text-3xl font-bold text-white">{item.score || 0}</div>
                </div>
              ))}
            </div>

            {/* Critical Skills */}
            {result.skill_evaluation?.critical_skills_status && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Critical Skills Status</h3>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                    result.skill_evaluation.critical_skills_status.all_critical_met 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {result.skill_evaluation.critical_skills_status.all_critical_met ? '✅' : '⚠️'}
                  </div>
                  <div>
                    <div className="text-white text-lg">
                      {result.skill_evaluation.critical_skills_status.critical_skills_met_count} / {result.skill_evaluation.critical_skills_status.critical_skills_count} Critical Skills Met
                    </div>
                    {result.skill_evaluation.critical_skills_status.unmet_critical_skills?.length > 0 && (
                      <div className="text-red-400 text-sm mt-1">
                        Missing: {result.skill_evaluation.critical_skills_status.unmet_critical_skills.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Concerns */}
            {result.final_scoring?.recommendation?.key_strengths && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">✨ Key Strengths</h3>
                  <ul className="space-y-2">
                    {result.final_scoring.recommendation.key_strengths.map((s: string, i: number) => (
                      <li key={i} className="text-slate-300 flex items-start gap-2">
                        <span className="text-green-400">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">⚠️ Key Concerns</h3>
                  <ul className="space-y-2">
                    {result.final_scoring.recommendation.key_concerns?.map((c: string, i: number) => (
                      <li key={i} className="text-slate-300 flex items-start gap-2">
                        <span className="text-yellow-400">•</span> {c}
                      </li>
                    )) || <li className="text-slate-400">No major concerns identified</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Modules Completed */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Modules Executed</h3>
              <div className="flex flex-wrap gap-2">
                {result.modules_completed?.map((m: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                    ✓ {m.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-slate-400 text-sm">
                Execution time: {result.execution_time_ms}ms
              </div>
            </div>

            {/* New Evaluation Button */}
            <button
              onClick={() => setResult(null)}
              className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-200"
            >
              Evaluate Another Candidate
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>TrajectIQ v1.0.0 | Deterministic • Explainable • Auditable</p>
        </div>
      </footer>
    </main>
  );
}
