'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Sparkles,
  Zap,
  Shield,
  Target,
  Award,
  Activity,
  UserPlus,
  MailPlus,
  FileCheck,
  ArrowUpRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { StatCard, GradeBadge, ScoreGauge } from '@/components/shared';
import { cn } from '@/lib/utils';

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
// Mock Data for Demo (Static dates to avoid hydration issues)
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
    if (grade.startsWith('A')) return 'grade-a';
    if (grade.startsWith('B')) return 'grade-b';
    if (grade.startsWith('C')) return 'grade-c';
    return 'grade-f';
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div 
          key={item.grade} 
          className="flex items-center gap-3 group"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="w-8 text-sm font-semibold text-foreground">{item.grade}</span>
          <div className="flex-1 distribution-bar">
            <div
              className={cn("distribution-bar-fill", getBarClass(item.grade))}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-16 flex justify-end gap-2">
            <span className="text-sm font-medium text-foreground">{item.count}</span>
            <span className="text-sm text-muted-foreground">({item.percentage}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecentCandidate }) {
  const statusClass: Record<string, string> = {
    NEW: 'status-new',
    SCREENING: 'status-screening',
    INTERVIEWED: 'status-interviewed',
    OFFERED: 'status-offered',
    HIRED: 'status-hired',
    REJECTED: 'status-rejected',
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Link href={`/evaluate?candidate=${candidate.id}`} className="data-row group block">
      <div className="flex items-center gap-3">
        <div className="data-row-avatar">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div>
          <p className="font-medium text-foreground">{candidate.firstName} {candidate.lastName}</p>
          <p className="text-sm text-muted-foreground">{candidate.currentTitle || 'No title'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {candidate.score !== undefined && (
          <div className="hidden md:flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full gradient-primary"
                style={{ width: `${candidate.score}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{candidate.score.toFixed(0)}</span>
          </div>
        )}
        <span className={cn(statusClass[candidate.status])}>
          {formatStatus(candidate.status)}
        </span>
        <span className="text-sm text-muted-foreground hidden lg:inline min-w-[100px] text-right">
          {formatDate(candidate.createdAt)}
        </span>
        <ChevronRight className="nav-arrow" />
      </div>
    </Link>
  );
}

function RequirementRow({ requirement }: { requirement: RecentRequirement }) {
  const statusClass: Record<string, string> = {
    ACTIVE: 'status-active',
    PAUSED: 'status-paused',
    CLOSED: 'status-closed',
    DRAFT: 'status-new',
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <Link href={`/jobs`} className="data-row group block">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{requirement.title}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {requirement._count.candidates} candidates
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn(statusClass[requirement.status])}>
          {formatStatus(requirement.status)}
        </span>
        <ChevronRight className="nav-arrow" />
      </div>
    </Link>
  );
}

function ScoringEngineInfo() {
  const metrics = [
    { abbr: 'SDI', name: 'Skill Depth Index', weight: 0.40, icon: Shield },
    { abbr: 'CSIG', name: 'Critical Skills Gap', weight: 0.15, icon: Target },
    { abbr: 'IAE', name: 'Impact & Achievement', weight: 0.20, icon: Award },
    { abbr: 'CTA', name: 'Career Trajectory', weight: 0.15, icon: TrendingUp },
    { abbr: 'ERR', name: 'Experience Relevance', weight: 0.10, icon: Briefcase },
  ];

  return (
    <div className="info-card gradient-primary text-white shadow-xl shadow-blue-500/20">
      <div className="info-card-glow bg-white/20" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-white/20">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-lg">Hiring Score Formula</h3>
        </div>
        <p className="text-sm text-white/80 mb-4 leading-relaxed">
          The TrajectIQ Hiring Index uses a deterministic multi-factor formula:
        </p>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 font-mono text-xs border border-white/10 mb-4">
          <span className="text-white/60">Score = </span>
          <span className="text-white">(SDI × 0.40)</span>
          <span className="text-white/60"> + </span>
          <span className="text-white">(CSIG × 0.15)</span>
          <span className="text-white/60"> + </span>
          <span className="text-white">(IAE × 0.20)</span>
          <span className="text-white/60"> + </span>
          <span className="text-white">(CTA × 0.15)</span>
          <span className="text-white/60"> + </span>
          <span className="text-white">(ERR × 0.10)</span>
        </div>
        <div className="space-y-2">
          {metrics.map((metric) => (
            <div key={metric.abbr} className="flex items-center gap-2 text-xs">
              <metric.icon className="w-3 h-3 text-white/60" />
              <span className="font-semibold">{metric.abbr}:</span>
              <span className="text-white/70">{metric.name}</span>
              <span className="ml-auto font-mono text-white/50">{(metric.weight * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { 
      icon: MailPlus, 
      title: 'Connect Email', 
      description: 'Link your email account',
      color: 'blue',
      href: '/email'
    },
    { 
      icon: Briefcase, 
      title: 'Create Job Requirement', 
      description: 'Define a new position',
      color: 'green',
      href: '/jobs'
    },
    { 
      icon: UserPlus, 
      title: 'Add Candidate', 
      description: 'Manual candidate entry',
      color: 'purple',
      href: '/candidates'
    },
    { 
      icon: FileCheck, 
      title: 'Start Evaluation', 
      description: 'Score candidates',
      color: 'amber',
      href: '/evaluate'
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50',
  };

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className="quick-action group"
        >
          <div className={cn("quick-action-icon", colorClasses[action.color])}>
            <action.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-foreground">{action.title}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const activities = [
    { id: 1, type: 'candidate', message: 'New candidate Sarah Williams scored 91.3', time: '2 min ago' },
    { id: 2, type: 'job', message: 'Senior Software Engineer reached 24 candidates', time: '15 min ago' },
    { id: 3, type: 'email', message: 'Email connection synced successfully', time: '1 hour ago' },
    { id: 4, type: 'hired', message: 'Mike Johnson was marked as hired', time: '3 hours ago' },
  ];

  const iconMap: Record<string, React.ElementType> = {
    candidate: Users,
    job: Briefcase,
    email: Mail,
    hired: Award,
  };

  const colorMap: Record<string, string> = {
    candidate: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    job: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    email: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
    hired: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = iconMap[activity.type];
        return (
          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className={cn("p-1.5 rounded-lg", colorMap[activity.type])}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-tight">{activity.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
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
  const [stats] = useState<DashboardStats>(mockStats);
  const [scoreDistribution] = useState<ScoreDistribution[]>(mockScoreDistribution);
  const [recentCandidates] = useState<RecentCandidate[]>(mockRecentCandidates);
  const [recentRequirements] = useState<RecentRequirement[]>(mockRecentRequirements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 spinner mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Welcome Section */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here&apos;s your hiring pipeline overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-outline text-sm px-3 py-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="btn-ghost text-sm px-3 py-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Jobs"
          value={stats.activeRequirements}
          change={`${stats.totalRequirements} total`}
          changeType="neutral"
          icon={Briefcase}
          iconGradient="bg-blue-100 dark:bg-blue-900/30"
          index={0}
        />
        <StatCard
          title="Total Candidates"
          value={stats.totalCandidates}
          change={`+${stats.newCandidates} this week`}
          changeType="positive"
          icon={Users}
          iconGradient="bg-emerald-100 dark:bg-emerald-900/30"
          index={1}
        />
        <StatCard
          title="Average Score"
          value={stats.averageScore.toFixed(1)}
          change={`Top grade: ${stats.topGrade.replace('_', '')}`}
          changeType="neutral"
          icon={Target}
          iconGradient="bg-purple-100 dark:bg-purple-900/30"
          index={2}
        />
        <StatCard
          title="Hired"
          value={stats.hiredCount}
          change={`${stats.rejectedCount} rejected`}
          changeType="neutral"
          icon={Award}
          iconGradient="bg-amber-100 dark:bg-amber-900/30"
          index={3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Distribution */}
          <div className="card-base p-6 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-lg text-foreground">Score Distribution</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Candidate grades across all requirements</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                Last 30 days
              </div>
            </div>
            <ScoreDistributionChart data={scoreDistribution} />
          </div>

          {/* Recent Candidates */}
          <div className="card-base p-6 animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg text-foreground">Recent Candidates</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Latest additions to your pipeline</p>
              </div>
              <Link href="/candidates" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
                View all
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentCandidates.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </div>

          {/* Recent Requirements */}
          <div className="card-base p-6 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg text-foreground">Active Requirements</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Open positions and their status</p>
              </div>
              <Link href="/jobs" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
                View all
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentRequirements.map((requirement) => (
                <RequirementRow key={requirement.id} requirement={requirement} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Score Gauge */}
          <div className="card-base p-6 animate-fade-in-up stagger-3">
            <h2 className="font-semibold text-lg mb-4 text-foreground">Average Hiring Score</h2>
            <div className="flex justify-center">
              <ScoreGauge score={stats.averageScore} />
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Most common grade</p>
              <GradeBadge grade={stats.topGrade} size="lg" />
            </div>
          </div>

          {/* Scoring Engine Info */}
          <ScoringEngineInfo />

          {/* Quick Actions */}
          <div className="card-base p-6 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-foreground">Quick Actions</h2>
            </div>
            <QuickActions />
          </div>

          {/* Activity Feed */}
          <div className="card-base p-6 animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-foreground">Recent Activity</h2>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
