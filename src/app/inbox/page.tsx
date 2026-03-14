'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Inbox,
  FileText,
  UserPlus,
  Briefcase,
  Clock,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Ban,
  Wifi,
  WifiOff,
  RotateCw,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  isResume: boolean;
  isProcessed: boolean;
}

interface EmailThread {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  receivedAt: string;
  isRequirement: boolean;
  hasReplies: boolean;
  replyCount: number;
  preview: string;
  emailAccount: {
    email: string;
    provider: string;
  };
  attachments: Attachment[];
}

interface EmailAccountInfo {
  id: string;
  email: string;
  isConnected: boolean;
}

interface FilterCounts {
  all: number;
  attachments: number;
  resumes: number;
  requirements: number;
}

const filterOptions = [
  { id: 'all', label: 'All Emails', icon: Inbox },
  { id: 'attachments', label: 'With Attachments', icon: Paperclip },
  { id: 'resumes', label: 'Resumes', icon: FileText },
  { id: 'requirements', label: 'Requirements', icon: Briefcase },
];

export default function InboxPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountInfo[]>([]);
  const [counts, setCounts] = useState<FilterCounts>({ all: 0, attachments: 0, resumes: 0, requirements: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchThreads = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/inbox?filter=${filter}`);
      const data = await response.json();

      if (data.success) {
        setThreads(data.threads || []);
        setEmailAccounts(data.emailAccounts || []);
        setCounts(data.counts || { all: 0, attachments: 0, resumes: 0, requirements: 0 });
      } else {
        console.error('Failed to fetch threads:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  // Fetch threads when user is available
  useEffect(() => {
    if (user?.id) {
      fetchThreads();
    }
  }, [user?.id, fetchThreads]);

  const handleProcess = async (action: string, threadId: string, attachmentId?: string, requirementId?: string) => {
    setProcessing(threadId);
    setMessage(null);

    try {
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, threadId, attachmentId, requirementId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Action completed successfully' });
        await fetchThreads();
        if (action === 'createCandidate') {
          setTimeout(() => {
            router.push('/candidates');
          }, 1500);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process. Please try again.' });
    } finally {
      setProcessing(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="page-title">Inbox</h1>
            <p className="page-description">Review synced emails and create candidates from resumes</p>
          </div>
          <button
            onClick={fetchThreads}
            disabled={loading}
            className="btn-outline btn-md"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
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

        {/* Email Accounts Status */}
        {emailAccounts.length > 0 && (
          <div className="card bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 animate-fade-in-up stagger-1">
            <div className="card-content">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">Connected Email Accounts</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emailAccounts.map(account => (
                      <div key={account.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-blue-500/20 rounded-lg text-sm">
                        {account.isConnected ? (
                          <Wifi className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-blue-800 dark:text-blue-200">{account.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link href="/email" className="btn-outline btn-sm">
                  <RotateCw className="w-4 h-4" />
                  Sync Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Filters with counts */}
        <div className="flex flex-wrap gap-2 animate-fade-in-up stagger-1">
          {filterOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all",
                filter === option.id
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border hover:border-primary/40"
              )}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                filter === option.id
                  ? "bg-white/20"
                  : "bg-muted"
              )}>
                {counts[option.id as keyof FilterCounts] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="card animate-fade-in-up stagger-2">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading emails...</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No emails found</h3>
              <p className="empty-state-description">
                {emailAccounts.length > 0
                  ? `No emails match the "${filterOptions.find(f => f.id === filter)?.label}" filter. Try a different filter or sync more emails.`
                  : 'Connect and sync your email account to see incoming emails'}
              </p>
              {emailAccounts.length === 0 ? (
                <Link href="/email" className="btn-primary btn-md mt-4">
                  <Mail className="w-4 h-4" />
                  Connect Email
                </Link>
              ) : (
                <button 
                  onClick={() => setFilter('all')}
                  className="btn-outline btn-md mt-4"
                >
                  View All Emails
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((thread) => (
                <div key={thread.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    {/* Thread Header */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        thread.isRequirement
                          ? "bg-blue-100 dark:bg-blue-500/20"
                          : thread.attachments.some(a => a.isResume)
                            ? "bg-emerald-100 dark:bg-emerald-500/20"
                            : thread.attachments.length > 0
                              ? "bg-amber-100 dark:bg-amber-500/20"
                              : "bg-gray-100 dark:bg-gray-500/20"
                      )}>
                        {thread.isRequirement ? (
                          <Briefcase className="w-5 h-5 text-blue-600" />
                        ) : thread.attachments.some(a => a.isResume) ? (
                          <FileText className="w-5 h-5 text-emerald-600" />
                        ) : thread.attachments.length > 0 ? (
                          <Paperclip className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Mail className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{thread.subject || '(No Subject)'}</p>
                          {thread.isRequirement && (
                            <span className="badge-primary text-xs">Requirement</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="font-medium">{thread.sender || 'Unknown Sender'}</span>
                          {thread.senderEmail && (
                            <>
                              <span>•</span>
                              <span className="truncate">{thread.senderEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(thread.receivedAt)}
                        </div>
                        {thread.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Paperclip className="w-3 h-3" />
                            {thread.attachments.length} attachment{thread.attachments.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attachments */}
                    {thread.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3 ml-14">
                        {thread.attachments.map(att => (
                          <div
                            key={att.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                              att.isResume
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="font-medium">{att.filename}</span>
                            <span className="opacity-70">({formatFileSize(att.fileSize)})</span>
                            {att.isProcessed && (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview */}
                    {thread.preview && (
                      <p className="text-sm text-muted-foreground ml-14 line-clamp-2">
                        {thread.preview}...
                      </p>
                    )}

                    {/* Actions */}
                    {!thread.isRequirement && thread.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 ml-14">
                        {thread.attachments.filter(a => a.isResume && !a.isProcessed).map(att => (
                          <button
                            key={att.id}
                            onClick={() => handleProcess('createCandidate', thread.id, att.id)}
                            disabled={processing === thread.id}
                            className="btn-primary btn-sm"
                          >
                            {processing === thread.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                            Create Candidate
                          </button>
                        ))}
                        <button
                          onClick={() => handleProcess('markAsRequirement', thread.id)}
                          disabled={processing === thread.id}
                          className="btn-outline btn-sm"
                        >
                          <Briefcase className="w-3 h-3" />
                          Mark as Requirement
                        </button>
                        <button
                          onClick={() => handleProcess('ignore', thread.id)}
                          disabled={processing === thread.id}
                          className="btn-outline btn-sm text-muted-foreground"
                        >
                          <Ban className="w-3 h-3" />
                          Ignore
                        </button>
                      </div>
                    )}

                    {/* Processed indicator */}
                    {thread.attachments.length > 0 && thread.attachments.every(a => a.isProcessed) && (
                      <div className="flex items-center gap-2 mt-3 ml-14 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        All attachments processed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="card animate-fade-in-up stagger-3">
          <div className="card-header">
            <h2 className="card-title">How It Works</h2>
            <p className="card-description">Process your emails into candidates</p>
          </div>
          <div className="card-content">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Sync Email</h4>
                  <p className="text-sm text-muted-foreground">Connect and sync your email account</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Review Emails</h4>
                  <p className="text-sm text-muted-foreground">See emails with resume attachments</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Create Candidates</h4>
                  <p className="text-sm text-muted-foreground">Convert resumes into candidates</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-medium">Score & Evaluate</h4>
                  <p className="text-sm text-muted-foreground">Score candidates against requirements</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
