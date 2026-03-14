'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  Mail,
  ChevronRight,
  Download,
  RefreshCw,
  Clock,
  Shield,
  Target,
  Award,
  Activity,
  UserPlus,
  MailPlus,
  FileCheck,
  ArrowUpRight,
  Calendar,
  Sparkles,
  Filter,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { StatCard, GradeBadge, ScoreGauge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// ============================================
// Types
// ============================================

interface DashboardStats {
  totalRequirements: number;
  activeRequirements: number;
  totalCandidates: number;
  newCandidates: number;
  averageScore: number;
  topGrade: string;
  hiredCount: number;
  rejectedCount: number;
}

interface ScoreDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface RecentCandidate {
  id: string;
  firstName: string;
  lastName: string;
  currentTitle: string | null;
  createdAt: string;
  status: string;
  score?: number;
}

interface RecentRequirement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { candidates: number };
}

// ============================================
// Mock Data
// ============================================

const mockStats: DashboardStats = {
  totalRequirements: 12,
  activeRequirements: 8,
  totalCandidates: 156,
  newCandidates: 23,
  averageScore: 72.5,
  topGrade: 'B_PLUS',
  hiredCount: 18,
  rejectedCount: 34,
};

const mockScoreDistribution: ScoreDistribution[] = [
  { grade: 'A', count: 12, percentage: 8 },
  { grade: 'B+', count: 28, percentage: 18 },
  { grade: 'B', count: 35, percentage: 22 },
  { grade: 'B-', count: 25, percentage: 16 },
  { grade: 'C+', count: 22, percentage: 14 },
  { grade: 'C', count: 18, percentage: 12 },
  { grade: 'C-', count: 10, percentage: 6 },
  { grade: 'F', count: 6, percentage: 4 },
];

const STATIC_NOW = '2024-01-15T10:00:00.000Z';

const mockRecentCandidates: RecentCandidate[] = [
  { id: '1', firstName: 'John', lastName: 'Smith', currentTitle: 'Senior Engineer', createdAt: STATIC_NOW, status: 'NEW', score: 85.2 },
  { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', createdAt: '2024-01-15T09:00:00.000Z', status: 'SCREENING', score: 78.4 },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', currentTitle: 'Python Developer', createdAt: '2024-01-15T08:00:00.000Z', status: 'NEW', score: 72.1 },
  { id: '4', firstName: 'Sarah', lastName: 'Williams', currentTitle: 'Tech Lead', createdAt: '2024-01-15T07:00:00.000Z', status: 'INTERVIEWED', score: 91.3 },
  { id: '5', firstName: 'Alex', lastName: 'Brown', currentTitle: 'Backend Developer', createdAt: '2024-01-15T06:00:00.000Z', status: 'NEW', score: 68.7 },
];

const mockRecentRequirements: RecentRequirement[] = [
  { id: '1', title: 'Senior Software Engineer', status: 'ACTIVE', createdAt: STATIC_NOW, _count: { candidates: 24 } },
  { id: '2', title: 'Full Stack Developer', status: 'ACTIVE', createdAt: '2024-01-14T10:00:00.000Z', _count: { candidates: 18 } },
  { id: '3', title: 'Python Developer', status: 'ACTIVE', createdAt: '2024-01-13T10:00:00.000Z', _count: { candidates: 12 } },
  { id: '4', title: 'Frontend Engineer', status: 'PAUSED', createdAt: '2024-01-12T10:00:00.000Z', _count: { candidates: 8 } },
  { id: '5', title: 'DevOps Engineer', status: 'CLOSED', createdAt: '2024-01-11T10:00:00.000Z', _count: { candidates: 15 } },
];

// ============================================
// Components
// ============================================

function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  const maxCount = Math.max(...data.map(d => d.count));

  const getBarClass = (grade: string) => {
    if (grade === 'A') return 'grade-a';
    if (grade === 'B+') return 'grade-bplus';
    if (grade === 'B') return 'grade-b';
    if (grade === 'B-') return 'grade-bminus';
    if (grade === 'C+') return 'grade-cplus';
    if (grade === 'C') return 'grade-c';
    if (grade === 'C-') return 'grade-cminus';
    return 'grade-f';
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div 
          key={item.grade} 
          className="distribution-row animate-slide-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className="distribution-label font-semibold">{item.grade}</span>
          <div className="distribution-bar">
            <div
              className={cn("distribution-fill", getBarClass(item.grade))}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-3 w-20 justify-end">
            <span className="text-sm font-semibold text-foreground">{item.count}</span>
            <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecentCandidate }) {
  const statusMap: Record<string, string> = {
    'NEW': 'status-new',
    'SCREENING': 'status-screening',
    'INTERVIEWED': 'status-interviewed',
    'HIRED': 'status-hired',
    'REJECTED': 'status-rejected',
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 55) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Link href={`/candidates?id=${candidate.id}`} className="data-list-item group">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="data-list-item-avatar">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div className="data-list-item-content">
          <p className="data-list-item-title">{candidate.firstName} {candidate.lastName}</p>
          <p className="data-list-item-subtitle">{candidate.currentTitle || 'No title'}</p>
        </div>
      </div>
      <div className="data-list-item-actions">
        {candidate.score !== undefined && (
          <span className={cn("text-sm font-bold hidden sm:block", getScoreColor(candidate.score))}>
            {candidate.score.toFixed(0)}
          </span>
        )}
        <span className={cn("status-badge", statusMap[candidate.status] || 'status-new')}>
          {candidate.status.toLowerCase()}
        </span>
        <span className="text-xs text-muted-foreground hidden lg:block w-24 text-right">
          {formatDate(candidate.createdAt)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function RequirementRow({ requirement }: { requirement: RecentRequirement }) {
  const statusMap: Record<string, string> = {
    'ACTIVE': 'status-active',
    'PAUSED': 'status-paused',
    'CLOSED': 'status-closed',
  };

  return (
    <Link href="/jobs" className="data-list-item group">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="data-list-item-icon">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="data-list-item-content">
          <p className="data-list-item-title">{requirement.title}</p>
          <p className="data-list-item-subtitle">{requirement._count.candidates} candidates</p>
        </div>
      </div>
      <div className="data-list-item-actions">
        <span className={cn("status-badge", statusMap[requirement.status] || 'status-closed')}>
          {requirement.status.toLowerCase()}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function ScoringEngineInfo() {
  const metrics = [
    { abbr: 'SDI', name: 'Skill Depth Index', weight: '40%', icon: Shield },
    { abbr: 'CSIG', name: 'Critical Skills Gate', weight: '15%', icon: Target },
    { abbr: 'IAE', name: 'Impact Authenticity', weight: '20%', icon: Award },
    { abbr: 'CTA', name: 'Career Trajectory', weight: '15%', icon: TrendingUp },
    { abbr: 'ERR', name: 'Experience Relevance', weight: '10%', icon: Briefcase },
  ];

  return (
    <div className="card card-hover">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary/20">
            <Sparkles className="w-5 h-5 text-primary dark:text-primary-300" />
          </div>
          <h3 className="font-semibold text-foreground">Hiring Score Formula</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          TrajectIQ uses a deterministic multi-factor scoring model to evaluate candidates:
        </p>
        <div className="bg-muted/50 rounded-xl p-4 mb-5 font-mono text-xs border border-border">
          <span className="text-muted-foreground">Score = </span>
          <span className="text-primary font-bold">(SDI × 0.40)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-primary font-bold">(CSIG × 0.15)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-primary font-bold">(IAE × 0.20)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-primary font-bold">(CTA × 0.15)</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-primary font-bold">(ERR × 0.10)</span>
        </div>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.abbr} className="flex items-center gap-3 text-sm">
              <metric.icon className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground w-12">{metric.abbr}</span>
              <span className="text-muted-foreground flex-1">{metric.name}</span>
              <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">{metric.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { icon: MailPlus, title: 'Connect Email', description: 'Link email account', href: '/email', color: 'blue' },
    { icon: Briefcase, title: 'Create Job', description: 'Define new position', href: '/jobs', color: 'green' },
    { icon: UserPlus, title: 'Add Candidate', description: 'Manual entry', href: '/candidates', color: 'purple' },
    { icon: FileCheck, title: 'Start Evaluation', description: 'Score candidates', href: '/evaluate', color: 'amber' },
  ];

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <Link key={action.title} href={action.href} className="quick-action group">
          <div className="quick-action-icon">
            <action.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="quick-action-title">{action.title}</p>
            <p className="quick-action-description">{action.description}</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const activities = [
    { id: 1, type: 'candidate', message: 'Sarah Williams scored 91.3', time: '2 min ago' },
    { id: 2, type: 'job', message: 'Senior Engineer reached 24 candidates', time: '15 min ago' },
    { id: 3, type: 'email', message: 'Email connection synced', time: '1 hour ago' },
    { id: 4, type: 'hired', message: 'Mike Johnson marked as hired', time: '3 hours ago' },
  ];

  const iconMap: Record<string, React.ElementType> = {
    candidate: Users,
    job: Briefcase,
    email: Mail,
    hired: Award,
  };

  const colorMap: Record<string, string> = {
    candidate: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    job: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    email: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    hired: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  };

  return (
    <div className="activity-feed">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type];
        return (
          <div key={activity.id} className="activity-item">
            <div className={cn("activity-icon", colorMap[activity.type])}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="activity-content">
              <p className="activity-message">{activity.message}</p>
              <p className="activity-time">{activity.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Main Dashboard
// ============================================

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats] = useState<DashboardStats>(mockStats);
  const [scoreDistribution] = useState<ScoreDistribution[]>(mockScoreDistribution);
  const [recentCandidates] = useState<RecentCandidate[]>(mockRecentCandidates);
  const [recentRequirements] = useState<RecentRequirement[]>(mockRecentRequirements);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Welcome back! Here&apos;s your hiring pipeline overview.</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost btn-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="btn-ghost btn-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="btn-ghost btn-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Active Jobs" value={stats.activeRequirements} change={`${stats.totalRequirements} total`} changeType="neutral" icon={Briefcase} iconGradient="blue" index={0} />
        <StatCard title="Total Candidates" value={stats.totalCandidates} change={`+${stats.newCandidates} this week`} changeType="positive" icon={Users} iconGradient="green" index={1} />
        <StatCard title="Average Score" value={stats.averageScore.toFixed(1)} change={`Top: ${stats.topGrade.replace('_', '')}`} changeType="neutral" icon={Target} iconGradient="purple" index={2} />
        <StatCard title="Hired" value={stats.hiredCount} change={`${stats.rejectedCount} rejected`} changeType="neutral" icon={Award} iconGradient="amber" index={3} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Distribution */}
          <div className="card animate-fade-in-up stagger-1">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="card-title">Score Distribution</h2>
                <p className="card-description">Candidate grades across all requirements</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
                Last 30 days
              </div>
            </div>
            <div className="card-content pt-2">
              <ScoreDistributionChart data={scoreDistribution} />
            </div>
          </div>

          {/* Recent Candidates */}
          <div className="card animate-fade-in-up stagger-2">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="card-title">Recent Candidates</h2>
                <p className="card-description">Latest additions to your pipeline</p>
              </div>
              <Link href="/candidates" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="data-list divide-y divide-border">
              {recentCandidates.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </div>

          {/* Recent Requirements */}
          <div className="card animate-fade-in-up stagger-3">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="card-title">Active Requirements</h2>
                <p className="card-description">Open positions and their status</p>
              </div>
              <Link href="/jobs" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="data-list divide-y divide-border">
              {recentRequirements.map((requirement) => (
                <RequirementRow key={requirement.id} requirement={requirement} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Score Gauge */}
          <div className="card animate-fade-in-up stagger-2">
            <div className="card-header">
              <h2 className="card-title">Average Hiring Score</h2>
            </div>
            <div className="card-content flex flex-col items-center">
              <ScoreGauge score={stats.averageScore} />
              <div className="mt-5 text-center">
                <p className="text-xs text-muted-foreground mb-2">Most common grade</p>
                <GradeBadge grade={stats.topGrade} size="lg" />
              </div>
            </div>
          </div>

          {/* Scoring Engine Info */}
          <ScoringEngineInfo />

          {/* Quick Actions */}
          <div className="card animate-fade-in-up stagger-3">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div className="card-content pt-2">
              <QuickActions />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card animate-fade-in-up stagger-4">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title">Recent Activity</h2>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="card-content pt-2">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
