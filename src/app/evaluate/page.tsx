'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Search,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  Briefcase,
  User,
  GraduationCap,
  Star,
  Target,
  AlertTriangle,
  FileUp,
  Bot,
  AlertOctagon,
  Info,
  Zap,
  Database,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface JobRequirement {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: number;
  educationLevel: string;
  location: string;
  salaryRange: string;
}

interface Resume {
  id: string;
  filename: string;
  source: 'email' | 'upload';
  senderEmail?: string;
  senderName?: string;
  receivedAt?: string;
  content: string;
  parsedData: {
    name: string;
    email: string;
    phone?: string;
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
    }>;
  };
  score?: ResumeScore;
  aiDetection?: AIDetection;
}

interface AIDetection {
  detected: boolean;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: Array<{
    category: string;
    severity: string;
    description: string;
  }>;
  explanation: string;
  suggestions: string[];
}

interface ResumeScore {
  overallScore: number;
  grade: string;
  tier: number;
  breakdown: {
    sdi: { score: number; weight: number; weighted: number; details: string[] };
    csig: { score: number; weight: number; weighted: number; details: string[] };
    iae: { score: number; weight: number; weighted: number; details: string[] };
    cta: { score: number; weight: number; weighted: number; details: string[] };
    err: { score: number; weight: number; weighted: number; details: string[] };
  };
  skillsMatch: {
    matched: string[];
    missing: string[];
    additional: string[];
  };
  experience: {
    relevance: number;
    totalYears: number;
    highlights: string[];
    gaps: string[];
  };
  education: {
    fit: boolean;
    details: string;
  };
  keywords: {
    found: string[];
    missing: string[];
  };
  recommendation: string;
  strengths: string[];
  concerns: string[];
  aiDetection?: AIDetection;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  isConnected: boolean;
  syncStatus?: string;
  errorMessage?: string | null;
}

// ============================================
// Main Component
// ============================================

export default function EvaluatePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<'requirement' | 'search' | 'results'>('requirement');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [syncDateRange, setSyncDateRange] = useState<string>('30');

  // Job Requirement
  const [requirementText, setRequirementText] = useState('');
  const [requirementFile, setRequirementFile] = useState<File | null>(null);
  const [parsedRequirement, setParsedRequirement] = useState<JobRequirement | null>(null);

  // Email & Resumes
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);

  // Analysis
  const [analyzedResumes, setAnalyzedResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    skills: true,
    experience: true,
    education: true,
    breakdown: false,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchEmailAccounts = useCallback(async () => {
    try {
      if (!user?.id || !user?.organizationId) {
        console.error('Missing user ID or organization ID');
        return;
      }
      
      const response = await fetch(`/api/email-accounts?userId=${user.id}&organizationId=${user.organizationId}`);
      const data = await response.json();
      if (data.accounts) {
        setEmailAccounts(data.accounts.map((a: any) => ({
          id: a.id,
          email: a.email,
          provider: a.provider,
          isConnected: a.isConnected,
          syncStatus: a.syncStatus,
          errorMessage: a.errorMessage,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch email accounts:', error);
    }
  }, [user?.id, user?.organizationId]);

  // Fetch email accounts on mount
  useEffect(() => {
    if (user?.organizationId) {
      fetchEmailAccounts();
    }
  }, [user?.organizationId, fetchEmailAccounts]);

  // ============================================
  // Handlers
  // ============================================

  const handleRequirementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRequirementFile(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setRequirementText(content);
    };
    reader.readAsText(file);
  };

  const parseRequirement = async () => {
    if (!requirementText.trim()) {
      setMessage({ type: 'error', text: 'Please enter or upload a job requirement' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/evaluate/parse-requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: requirementText }),
      });

      const data = await response.json();

      if (data.success) {
        setParsedRequirement(data.requirement);
        setMessage({ type: 'success', text: 'Job requirement parsed successfully' });
      } else {
        // Create a basic requirement from text
        setParsedRequirement({
          id: 'temp-' + Date.now(),
          title: 'Job Requirement',
          description: requirementText,
          requiredSkills: extractKeywords(requirementText),
          preferredSkills: [],
          experienceRequired: 0,
          educationLevel: '',
          location: '',
          salaryRange: '',
        });
        setMessage({ type: 'success', text: 'Requirement ready for analysis' });
      }
    } catch (error) {
      // Fallback: create basic requirement
      setParsedRequirement({
        id: 'temp-' + Date.now(),
        title: 'Job Requirement',
        description: requirementText,
        requiredSkills: extractKeywords(requirementText),
        preferredSkills: [],
        experienceRequired: 0,
        educationLevel: '',
        location: '',
        salaryRange: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const extractKeywords = (text: string): string[] => {
    // Simple keyword extraction - common tech skills
    const skills = [
      'javascript', 'typescript', 'python', 'java', 'react', 'node', 'angular', 'vue',
      'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes',
      'machine learning', 'data science', 'agile', 'scrum', 'git', 'ci/cd',
      'html', 'css', 'rest', 'graphql', 'microservices', 'linux', 'tensorflow',
    ];
    const lowerText = text.toLowerCase();
    return skills.filter(skill => lowerText.includes(skill));
  };

  const searchEmails = async () => {
    if (!parsedRequirement) {
      setMessage({ type: 'error', text: 'Please parse the requirement first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/evaluate/search-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: parsedRequirement,
          keywords: parsedRequirement.requiredSkills,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResumes(data.resumes || []);
        setSelectedResumes((data.resumes || []).map((r: Resume) => r.id));
        
        if (data.resumes?.length === 0) {
          setMessage({ 
            type: 'error', 
            text: data.message || 'No resumes found. Make sure your emails are synced.' 
          });
        } else {
          setMessage({ type: 'success', text: `Found ${data.resumes?.length || 0} resumes from your email` });
          setStep('search');
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to search emails' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to search emails. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const syncEmailAccount = async (accountId: string) => {
    setSyncing(accountId);
    setMessage(null);

    try {
      const response = await fetch('/api/email-accounts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, dateRange: syncDateRange }),
      });

      // Handle non-JSON responses (like Vercel timeout errors)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        
        if (response.status === 504 || text.includes('timeout') || text.includes('TIMEDOUT')) {
          setMessage({ 
            type: 'error', 
            text: 'Server timeout. Your email server is slow to respond. Try selecting "7 days" for a faster sync.' 
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: `Server error (${response.status}). Please try again or use a shorter date range.` 
          });
        }
        fetchEmailAccounts();
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        const stats = data.stats || {};
        
        // Show detailed message
        if (stats.emailsFetched === 0 && stats.message) {
          setMessage({ type: 'error', text: stats.message });
        } else if (stats.emailsFetched === 0) {
          setMessage({ 
            type: 'error', 
            text: `No emails found in the last ${stats.dateRange || '30 days'}. Try selecting a longer date range.` 
          });
        } else if (stats.newThreads === 0 && stats.skipped > 0) {
          setMessage({ 
            type: 'success', 
            text: `All ${stats.emailsFetched} emails were already synced. ${stats.withAttachments || 0} have attachments.` 
          });
        } else {
          setMessage({ 
            type: 'success', 
            text: `Synced ${stats.newThreads || 0} new emails, ${stats.newAttachments || 0} attachments. (${stats.withAttachments || 0} emails have attachments)` 
          });
        }
        // Refresh email accounts to update lastSyncAt
        fetchEmailAccounts();
      } else {
        // Show detailed error message from server
        const errorMessage = data.error || data.details || 'Failed to sync emails';
        console.error('Sync failed:', errorMessage, data);
        setMessage({ type: 'error', text: errorMessage });
        
        // Refresh to show updated error state
        if (data.needsReconnect || data.needsCredentials) {
          fetchEmailAccounts();
        }
      }
    } catch (error) {
      console.error('Sync exception:', error);
      
      // Handle JSON parse errors and network errors
      if (error instanceof SyntaxError) {
        setMessage({ 
          type: 'error', 
          text: 'Server timeout. Try selecting "7 days" for a faster sync, or check your email server connection.' 
        });
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to sync emails. Please try again.';
        setMessage({ type: 'error', text: errorMsg });
      }
      fetchEmailAccounts();
    } finally {
      setSyncing(null);
    }
  };



  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/evaluate/debug-emails');
      const data = await response.json();
      setDebugData(data);
      setShowDebug(true);
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));

      const response = await fetch('/api/evaluate/upload-resumes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResumes(prev => [...prev, ...data.resumes]);
        setSelectedResumes(prev => [...prev, ...data.resumes.map((r: Resume) => r.id)]);
        setMessage({ type: 'success', text: `Uploaded ${data.resumes.length} resume(s)` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload resumes' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload resumes' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeResume = (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
    setSelectedResumes(prev => prev.filter(rid => rid !== id));
  };

  const toggleResumeSelection = (id: string) => {
    setSelectedResumes(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const analyzeResumes = async () => {
    if (selectedResumes.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one resume to analyze' });
      return;
    }

    if (!parsedRequirement) {
      setMessage({ type: 'error', text: 'No job requirement found' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/evaluate/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: parsedRequirement,
          resumeIds: selectedResumes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.results && data.results.length > 0) {
          setAnalyzedResumes(data.results);
          setStep('results');
          setMessage({ type: 'success', text: `Analysis complete! ${data.results.length} candidate(s) analyzed.` });
        } else {
          setMessage({ type: 'error', text: 'No results returned. Make sure you have synced emails with resume attachments.' });
        }
      } else {
        // Show detailed error
        const errorMsg = data.error || data.details || 'Analysis failed';
        setMessage({ type: 'error', text: errorMsg });
        console.error('Analyze failed:', data);
      }
    } catch (error) {
      console.error('Analyze exception:', error);
      setMessage({ type: 'error', text: 'Failed to analyze resumes. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/evaluate/export-pdf?resumeId=${resumeId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate-analysis-${resumeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export PDF' });
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20';
    if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100 dark:bg-blue-500/20';
    if (grade.startsWith('C')) return 'text-amber-600 bg-amber-100 dark:bg-amber-500/20';
    return 'text-red-600 bg-red-100 dark:bg-red-500/20';
  };

  // ============================================
  // Loading State
  // ============================================

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="page-title">Evaluate Resumes</h1>
            <p className="page-description">
              Input job requirement → Search emails for matching resumes → Analyze & Score
            </p>
          </div>
          {step === 'results' && (
            <button
              onClick={() => {
                setStep('requirement');
                setAnalyzedResumes([]);
                setResumes([]);
                setSelectedResumes([]);
                setParsedRequirement(null);
              }}
              className="btn-outline btn-md"
            >
              <RefreshCw className="w-4 h-4" />
              Start New Analysis
            </button>
          )}
        </div>

        {/* Message Alert */}
        {message && (
          <div className={cn(
            "card animate-fade-in",
            message.type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
          )}>
            <div className="card-content flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={message.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                {message.text}
              </span>
              <button onClick={() => setMessage(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center gap-2 animate-fade-in-up">
          {['requirement', 'search', 'results'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s ? "bg-primary text-white" :
                ['requirement', 'search', 'results'].indexOf(step) > i
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {i + 1}
              </div>
              <span className={cn(
                "ml-2 text-sm",
                step === s ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {s === 'requirement' ? 'Job Requirement' : s === 'search' ? 'Find Resumes' : 'Results'}
              </span>
              {i < 2 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  ['requirement', 'search', 'results'].indexOf(step) > i
                    ? "bg-emerald-500"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* ============================================ */}
        {/* STEP 1: Job Requirement */}
        {/* ============================================ */}
        {step === 'requirement' && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in-up">
            {/* Requirement Input */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Job Requirement
                </h2>
                <p className="card-description">Paste or upload the job description</p>
              </div>
              <div className="card-content space-y-4">
                <textarea
                  value={requirementText}
                  onChange={(e) => setRequirementText(e.target.value)}
                  placeholder="Paste the job description here...

Example:
Senior Software Engineer
- 5+ years experience in JavaScript/TypeScript
- Experience with React, Node.js
- Knowledge of AWS, Docker
- Bachelor's degree in Computer Science
- Strong communication skills"
                  className="form-textarea min-h-[300px] resize-y"
                />

                <div className="flex items-center gap-4">
                  <label className="btn-outline btn-md cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload File
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleRequirementUpload}
                      className="hidden"
                    />
                  </label>
                  {requirementFile && (
                    <span className="text-sm text-muted-foreground">
                      {requirementFile.name}
                    </span>
                  )}
                </div>

                <button
                  onClick={parseRequirement}
                  disabled={loading || !requirementText.trim()}
                  className="btn-primary btn-md w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Parse Requirement
                </button>
              </div>
            </div>

            {/* Email Status & Preview */}
            <div className="space-y-6">
              {/* Email Connection Status */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Connection
                  </h2>
                </div>
                <div className="card-content">
                  {emailAccounts.length === 0 ? (
                    <div className="text-center py-4">
                      <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground mb-3">No email accounts connected</p>
                      <Link href="/email" className="btn-primary btn-md inline-flex">
                        <Plus className="w-4 h-4" />
                        Connect Email Account
                      </Link>
                      <p className="text-xs text-muted-foreground mt-3">
                        💡 Use &quot;Custom IMAP&quot; option with your email server details (host, port, password) to sync real emails
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {emailAccounts.map(account => {
                        const isOAuthAccount = ['GMAIL', 'OUTLOOK', 'YAHOO'].includes(account.provider);
                        const hasError = account.syncStatus === 'ERROR' || account.errorMessage;
                        
                        return (
                          <div key={account.id} className={`flex items-center gap-3 p-3 rounded-lg ${hasError ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20' : 'bg-muted/50'}`}>
                            {account.isConnected && !hasError ? (
                              <Wifi className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <WifiOff className="w-5 h-5 text-red-600" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate block">{account.email}</span>
                              {account.errorMessage && (
                                <span className="text-xs text-red-600 dark:text-red-400 truncate block">{account.errorMessage}</span>
                              )}
                              {isOAuthAccount && !hasError && (
                                <span className="text-xs text-amber-600 dark:text-amber-400">OAuth account - needs Custom IMAP credentials</span>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                              hasError
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                : account.isConnected
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            )}>
                              {hasError ? 'Error' : account.isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                            {account.isConnected && !isOAuthAccount && (
                              <button
                                onClick={() => syncEmailAccount(account.id)}
                                disabled={syncing === account.id}
                                className="btn-outline btn-sm flex-shrink-0"
                                title="Sync emails to fetch resumes"
                              >
                                {syncing === account.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                                Sync
                              </button>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Warning for OAuth accounts */}
                      {emailAccounts.some(a => ['GMAIL', 'OUTLOOK', 'YAHOO'].includes(a.provider)) && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20 mt-2">
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            ⚠️ OAuth accounts (Gmail, Outlook, Yahoo) cannot sync emails. 
                            <Link href="/email" className="underline ml-1">Connect with Custom IMAP</Link> instead.
                          </p>
                        </div>
                      )}
                      
                      {/* Date Range Selector */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="text-xs text-muted-foreground block mb-2">
                          Sync emails from the last:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: '7', label: '7 days' },
                            { value: '30', label: '30 days' },
                            { value: '60', label: '60 days' },
                            { value: '90', label: '90 days' },
                            { value: 'all', label: 'All time' },
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => setSyncDateRange(option.value)}
                              className={cn(
                                "px-3 py-1 text-xs rounded-full transition-colors",
                                syncDateRange === option.value
                                  ? "bg-primary text-white"
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        💡 Click &quot;Sync&quot; to fetch emails with resume attachments from your inbox
                      </p>
                    </div>
                  )}
                  
                  {/* Debug Button */}
                  <button
                    onClick={fetchDebugData}
                    className="btn-outline btn-sm w-full mt-4"
                  >
                    <Database className="w-4 h-4" />
                    Debug: Check Sync Status
                  </button>
                </div>
              </div>
              
              {/* Debug Panel */}
              {showDebug && debugData && (
                <div className="card bg-gray-50 dark:bg-gray-900/50">
                  <div className="card-header">
                    <h2 className="card-title text-sm font-mono">Debug: Email Sync Status</h2>
                    <button onClick={() => setShowDebug(false)} className="btn-icon">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="card-content">
                    <pre className="text-xs overflow-auto max-h-96 bg-gray-100 dark:bg-gray-800 p-3 rounded">
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Parsed Requirement Preview */}
              {parsedRequirement && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Parsed Requirement
                    </h2>
                  </div>
                  <div className="card-content space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Title</p>
                      <p className="font-medium">{parsedRequirement.title}</p>
                    </div>
                    {parsedRequirement.requiredSkills.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Detected Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {parsedRequirement.requiredSkills.map(skill => (
                            <span key={skill} className="badge-primary text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm line-clamp-3">{parsedRequirement.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Button */}
              <button
                onClick={searchEmails}
                disabled={loading || !parsedRequirement}
                className="btn-primary btn-lg w-full"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search for Matching Resumes
              </button>
              
              {emailAccounts.filter(a => a.isConnected).length === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  💡 No email accounts connected. Generate demo data or connect an email account to search for resumes.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: Search & Select Resumes */}
        {/* ============================================ */}
        {step === 'search' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Upload More */}
            <div className="card bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20">
              <div className="card-content flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Found {resumes.length} resumes from your email
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Upload more resumes from your computer if needed
                  </p>
                </div>
                <label className="btn-outline btn-md cursor-pointer bg-white dark:bg-blue-500/20">
                  <FileUp className="w-4 h-4" />
                  Upload More
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Resume List */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h2 className="card-title">Resume Pool</h2>
                  <p className="card-description">
                    {selectedResumes.length} of {resumes.length} selected for analysis
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedResumes(resumes.map(r => r.id))}
                    className="btn-outline btn-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedResumes([])}
                    className="btn-outline btn-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border">
                {resumes.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No resumes found</p>
                    <label className="btn-primary btn-md mt-4 cursor-pointer inline-flex">
                      <Upload className="w-4 h-4" />
                      Upload Resumes
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  resumes.map(resume => (
                    <div key={resume.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={selectedResumes.includes(resume.id)}
                        onChange={() => toggleResumeSelection(resume.id)}
                        className="w-5 h-5 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{resume.parsedData?.name || resume.filename}</p>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            resume.source === 'email'
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-500/20"
                          )}>
                            {resume.source === 'email' ? 'Email' : 'Uploaded'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {resume.parsedData?.email || resume.senderEmail || 'No email'}
                        </p>
                        {resume.parsedData?.skills && resume.parsedData.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {resume.parsedData.skills.slice(0, 4).map(skill => (
                              <span key={skill} className="badge-neutral text-xs">{skill}</span>
                            ))}
                            {resume.parsedData.skills.length > 4 && (
                              <span className="badge-neutral text-xs">+{resume.parsedData.skills.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeResume(resume.id)}
                        className="btn-icon text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('requirement')}
                className="btn-outline btn-md"
              >
                ← Back to Requirement
              </button>
              <button
                onClick={analyzeResumes}
                disabled={loading || selectedResumes.length === 0}
                className="btn-primary btn-lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
                Analyze {selectedResumes.length} Resume{selectedResumes.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3: Results */}
        {/* ============================================ */}
        {step === 'results' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{analyzedResumes.length}</p>
                <p className="text-sm text-muted-foreground">Resumes Analyzed</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {analyzedResumes.filter(r => r.score && r.score.overallScore >= 70).length}
                </p>
                <p className="text-sm text-muted-foreground">Qualified Candidates</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {analyzedResumes.length > 0
                    ? (analyzedResumes.reduce((sum, r) => sum + (r.score?.overallScore || 0), 0) / analyzedResumes.length).toFixed(1)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {analyzedResumes.filter(r => r.score && r.score.overallScore >= 85).length}
                </p>
                <p className="text-sm text-muted-foreground">Top Candidates</p>
              </div>
            </div>

            {/* Results List */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Analysis Results</h2>
                <p className="card-description">Ranked by match score</p>
              </div>
              <div className="divide-y divide-border">
                {analyzedResumes
                  .sort((a, b) => (b.score?.overallScore || 0) - (a.score?.overallScore || 0))
                  .map((resume, index) => (
                    <div key={resume.id} className="p-4 hover:bg-muted/30">
                      <div className="flex items-start gap-4">
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 ? "bg-amber-100 text-amber-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{resume.parsedData?.name || resume.filename}</p>
                            <span className={cn(
                              "text-sm font-bold px-2 py-0.5 rounded",
                              getGradeColor(resume.score?.grade || 'D')
                            )}>
                              {resume.score?.grade || 'N/A'}
                            </span>
                            {/* AI Detection Badge */}
                            {resume.aiDetection?.detected && (
                              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                <Bot className="w-3 h-3" />
                                AI Detected ({resume.aiDetection.confidence}%)
                              </span>
                            )}
                            {!resume.aiDetection?.detected && resume.aiDetection?.riskLevel === 'medium' && (
                              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3" />
                                AI Suspected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {resume.parsedData?.email || resume.senderEmail}
                          </p>

                          {/* Score Bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  (resume.score?.overallScore || 0) >= 80 ? "bg-emerald-500" :
                                  (resume.score?.overallScore || 0) >= 60 ? "bg-blue-500" :
                                  (resume.score?.overallScore || 0) >= 40 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${resume.score?.overallScore || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold min-w-[48px] text-right">
                              {resume.score?.overallScore || 0}%
                            </span>
                          </div>

                          {/* Quick Stats */}
                          {resume.score && (
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Skills: {resume.score.skillsMatch.matched.length}/{resume.score.skillsMatch.matched.length + resume.score.skillsMatch.missing.length}</span>
                              <span>Exp: {resume.score.experience.totalYears}y</span>
                              {resume.score.strengths.length > 0 && (
                                <span className="text-emerald-600">+{resume.score.strengths.length} strengths</span>
                              )}
                              {resume.score.concerns.length > 0 && (
                                <span className="text-amber-600">!{resume.score.concerns.length} concerns</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedResume(resume)}
                            className="btn-outline btn-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                          <button
                            onClick={() => exportPDF(resume.id)}
                            className="btn-outline btn-sm"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* Detail Modal */}
        {/* ============================================ */}
        {selectedResume && selectedResume.score && (
          <>
            <div className="modal-overlay" onClick={() => setSelectedResume(null)} />
            <div className="modal-container max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="modal-header sticky top-0 bg-card z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="modal-title">{selectedResume.parsedData?.name || selectedResume.filename}</h3>
                    <p className="modal-description">{selectedResume.parsedData?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xl font-bold px-3 py-1 rounded-lg",
                      getGradeColor(selectedResume.score.grade)
                    )}>
                      {selectedResume.score.grade} - {selectedResume.score.overallScore}%
                    </span>
                    <button onClick={() => setSelectedResume(null)} className="btn-icon">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-body space-y-6">
                {/* Recommendation */}
                <div className={cn(
                  "p-4 rounded-xl",
                  selectedResume.score.overallScore >= 70
                    ? "bg-emerald-50 dark:bg-emerald-500/10"
                    : "bg-amber-50 dark:bg-amber-500/10"
                )}>
                  <p className={cn(
                    "font-medium",
                    selectedResume.score.overallScore >= 70
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-amber-800 dark:text-amber-200"
                  )}>
                    {selectedResume.score.recommendation}
                  </p>
                </div>

                {/* AI Detection Section */}
                {selectedResume.aiDetection && (
                  <div className={cn(
                    "card",
                    selectedResume.aiDetection.detected 
                      ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" 
                      : selectedResume.aiDetection.riskLevel === 'medium'
                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                        : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                  )}>
                    <div className="card-header flex items-center gap-3">
                      {selectedResume.aiDetection.detected ? (
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20">
                          <Bot className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                      ) : selectedResume.aiDetection.riskLevel === 'medium' ? (
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                          <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          AI Content Detection
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            selectedResume.aiDetection.detected 
                              ? "bg-red-200 text-red-800 dark:bg-red-500/30 dark:text-red-200"
                              : selectedResume.aiDetection.riskLevel === 'medium'
                                ? "bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200"
                                : "bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200"
                          )}>
                            {selectedResume.aiDetection.detected 
                              ? `AI Generated (${selectedResume.aiDetection.confidence}% confidence)`
                              : selectedResume.aiDetection.riskLevel === 'medium'
                                ? `AI Suspected (${selectedResume.aiDetection.confidence}% confidence)`
                                : `Likely Authentic (${selectedResume.aiDetection.confidence}% AI indicators)`
                            }
                          </span>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedResume.aiDetection.explanation}
                        </p>
                      </div>
                    </div>
                    
                    {/* AI Detection Indicators */}
                    {selectedResume.aiDetection.indicators && selectedResume.aiDetection.indicators.length > 0 && (
                      <div className="card-content pt-4">
                        <p className="text-xs text-muted-foreground mb-2">Detection Indicators:</p>
                        <div className="space-y-2">
                          {selectedResume.aiDetection.indicators.map((indicator, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Info className={cn(
                                "w-4 h-4 mt-0.5 flex-shrink-0",
                                indicator.severity === 'high' 
                                  ? "text-red-500" 
                                  : indicator.severity === 'medium' 
                                    ? "text-amber-500" 
                                    : "text-blue-500"
                              )} />
                              <div>
                                <span className="font-medium">{indicator.category}:</span>{' '}
                                <span className="text-muted-foreground">{indicator.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {selectedResume.aiDetection.suggestions && selectedResume.aiDetection.suggestions.length > 0 && (
                      <div className="card-content pt-4 border-t border-border mt-4">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3" />
                          Recommended Actions:
                        </p>
                        <ul className="space-y-1">
                          {selectedResume.aiDetection.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Score Breakdown */}
                <div className="card">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, breakdown: !prev.breakdown }))}
                    className="card-header w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold">Score Breakdown</h4>
                    {expandedSections.breakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.breakdown && (
                    <div className="card-content space-y-4">
                      {Object.entries(selectedResume.score.breakdown).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          sdi: 'Skills & Domain Intelligence',
                          csig: 'Career & Stability Indicators',
                          iae: 'Impact & Achievements Evidence',
                          cta: 'Cultural & Team Alignment',
                          err: 'Education & Role Relevance',
                        };
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{labels[key]}</span>
                              <span className="text-sm">{value.score}% × {value.weight * 100}% = {value.weighted.toFixed(1)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${value.score}%` }} />
                            </div>
                            {value.details.length > 0 && (
                              <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                                {value.details.map((detail, i) => (
                                  <li key={i}>{detail}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Skills Match */}
                <div className="card">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, skills: !prev.skills }))}
                    className="card-header w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Skills Match
                    </h4>
                    {expandedSections.skills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.skills && (
                    <div className="card-content space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Matched Skills ({selectedResume.score.skillsMatch.matched.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedResume.score.skillsMatch.matched.map(skill => (
                            <span key={skill} className="badge-primary text-xs">{skill}</span>
                          ))}
                          {selectedResume.score.skillsMatch.matched.length === 0 && (
                            <span className="text-sm text-muted-foreground">None matched</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Missing Skills ({selectedResume.score.skillsMatch.missing.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedResume.score.skillsMatch.missing.map(skill => (
                            <span key={skill} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">{skill}</span>
                          ))}
                        </div>
                      </div>
                      {selectedResume.score.skillsMatch.additional.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Additional Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedResume.score.skillsMatch.additional.map(skill => (
                              <span key={skill} className="badge-neutral text-xs">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Experience */}
                <div className="card">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, experience: !prev.experience }))}
                    className="card-header w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Experience Analysis
                    </h4>
                    {expandedSections.experience ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.experience && (
                    <div className="card-content space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">{selectedResume.score.experience.totalYears}</span>
                        <span className="text-muted-foreground">years total experience</span>
                        <span className={cn(
                          "text-sm px-2 py-0.5 rounded",
                          selectedResume.score.experience.relevance >= 70
                            ? "bg-emerald-100 text-emerald-700"
                            : selectedResume.score.experience.relevance >= 40
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        )}>
                          {selectedResume.score.experience.relevance}% relevant
                        </span>
                      </div>
                      {selectedResume.score.experience.highlights.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Highlights</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {selectedResume.score.experience.highlights.map((h, i) => (
                              <li key={i} className="text-emerald-700 dark:text-emerald-300">{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedResume.score.experience.gaps.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Gaps Identified</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {selectedResume.score.experience.gaps.map((g, i) => (
                              <li key={i} className="text-amber-700 dark:text-amber-300">{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Education */}
                <div className="card">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, education: !prev.education }))}
                    className="card-header w-full flex items-center justify-between"
                  >
                    <h4 className="font-semibold flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Education Fit
                    </h4>
                    {expandedSections.education ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.education && (
                    <div className="card-content">
                      <p className={cn(
                        selectedResume.score.education.fit ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                      )}>
                        {selectedResume.score.education.details}
                      </p>
                    </div>
                  )}
                </div>

                {/* Strengths & Concerns */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-semibold text-emerald-700 dark:text-emerald-300">Strengths</h4>
                    </div>
                    <div className="card-content">
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedResume.score.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                        {selectedResume.score.strengths.length === 0 && (
                          <li className="text-muted-foreground">No specific strengths identified</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-semibold text-amber-700 dark:text-amber-300">Concerns</h4>
                    </div>
                    <div className="card-content">
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedResume.score.concerns.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                        {selectedResume.score.concerns.length === 0 && (
                          <li className="text-emerald-600">No major concerns identified</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Keywords Analysis
                    </h4>
                  </div>
                  <div className="card-content">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Found ({selectedResume.score.keywords.found.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedResume.score.keywords.found.map(kw => (
                            <span key={kw} className="badge-primary text-xs">{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Missing ({selectedResume.score.keywords.missing.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedResume.score.keywords.missing.map(kw => (
                            <span key={kw} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  onClick={() => setSelectedResume(null)}
                  className="btn-outline btn-md"
                >
                  Close
                </button>
                <button
                  onClick={() => exportPDF(selectedResume.id)}
                  className="btn-primary btn-md"
                >
                  <Download className="w-4 h-4" />
                  Export PDF Report
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
