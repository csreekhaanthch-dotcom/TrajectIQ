'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  Mail, 
  Settings,
  LogOut,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Award,
  Clock,
  Sparkles,
  Zap,
  Shield,
  ChevronDown,
  Moon,
  Sun,
  Layers,
  Activity,
  UserPlus,
  MailPlus,
  FileCheck,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
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

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/', active: true },
    { icon: Mail, label: 'Email Connect', href: '/email' },
    { icon: Briefcase, label: 'Job Requirements', href: '/jobs' },
    { icon: Users, label: 'Candidates', href: '/candidates' },
    { icon: Target, label: 'Evaluation', href: '/evaluate' },
    { icon: FileText, label: 'Reports', href: '/reports' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="overlay lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "sidebar",
        isOpen && "open"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gradient">TrajectIQ</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-wide">Hiring Intelligence</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden btn-icon"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
          </div>
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "sidebar-item group",
                item.active && "active"
              )}
            >
              <div className={cn(
                "sidebar-item-icon",
                item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                <item.icon className="w-[18px] h-[18px]" />
              </div>
              <span className={item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
                {item.label}
              </span>
              {item.active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </a>
          ))}
        </nav>
        
        {/* Pro Feature Banner */}
        <div className="absolute bottom-28 left-4 right-4">
          <div className="info-card gradient-primary text-white shadow-xl shadow-blue-500/20">
            <div className="info-card-glow bg-white/20" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-white/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-white/80 mb-3 leading-relaxed">
                Unlock advanced analytics, AI insights, and unlimited candidates
              </p>
              <button className="w-full py-2.5 px-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm flex items-center justify-center gap-2 group">
                Learn More
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="avatar avatar-md text-sm">
              DU
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Demo User</p>
              <p className="text-xs text-muted-foreground truncate">demo@trajectiq.com</p>
            </div>
            <button className="btn-icon">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 w-full py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <header className="header flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="lg:hidden btn-icon"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block input-with-icon">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search candidates, jobs..."
            className="search-input w-72"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 kbd">⌘K</kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="btn-icon"
        >
          {darkMode ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
        </button>
        <button className="btn-icon notification-dot">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="btn-primary btn-glow px-4 py-2.5 text-sm ml-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Job</span>
        </button>
      </div>
    </header>
  );
}

function StatCard({ title, value, change, changeType, icon: Icon, iconGradient, index }: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  iconGradient?: string;
  index?: number;
}) {
  return (
    <div 
      className={cn("stats-card group", index && `stagger-${index + 1}`)}
      style={{ animationDelay: `${(index || 0) * 50}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
          {change && (
            <div className={cn(
              "flex items-center gap-1.5 mt-2.5 text-sm font-medium",
              changeType === 'positive' && "text-emerald-600 dark:text-emerald-400",
              changeType === 'negative' && "text-red-600 dark:text-red-400",
              changeType === 'neutral' && "text-muted-foreground"
            )}>
              {changeType === 'positive' && (
                <span className="p-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              )}
              {changeType === 'negative' && (
                <span className="p-0.5 rounded-full bg-red-100 dark:bg-red-900/30">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              )}
              {change}
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
          iconGradient || "bg-primary/10"
        )}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getGradient = (s: number) => {
    if (s >= 85) return { start: '#22C55E', end: '#10B981' };
    if (s >= 70) return { start: '#3B82F6', end: '#6366F1' };
    if (s >= 55) return { start: '#F59E0B', end: '#EAB308' };
    if (s >= 40) return { start: '#F97316', end: '#EF4444' };
    return { start: '#EF4444', end: '#DC2626' };
  };

  const gradient = getGradient(score);

  return (
    <div className="relative w-40 h-40 score-gauge-container">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradient.start} />
            <stop offset="100%" stopColor={gradient.end} />
          </linearGradient>
          <filter id="scoreGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Background circle */}
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-gauge-fill"
          filter="url(#scoreGlow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{score.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">Avg Score</span>
      </div>
    </div>
  );
}

function GradeBadge({ grade, size = 'default' }: { grade: string; size?: 'sm' | 'default' | 'lg' }) {
  const gradeClass = grade.startsWith('A') ? 'grade-a' :
                     grade.startsWith('B') ? 'grade-b' :
                     grade.startsWith('C') ? 'grade-c' :
                     grade.startsWith('D') ? 'grade-d' : 'grade-f';
  
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 
                    size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm';
  
  const formatGrade = (g: string) => {
    if (g === 'A_PLUS') return 'A+';
    if (g === 'A_MINUS') return 'A-';
    if (g === 'B_PLUS') return 'B+';
    if (g === 'B_MINUS') return 'B-';
    if (g === 'C_PLUS') return 'C+';
    if (g === 'C_MINUS') return 'C-';
    if (g === 'D_PLUS') return 'D+';
    if (g === 'D_MINUS') return 'D-';
    return g;
  };

  return (
    <span className={cn(gradeClass, sizeClass, "animate-badge-pop")}>
      {formatGrade(grade)}
    </span>
  );
}

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
    <div className="data-row group">
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
    </div>
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
    <div className="data-row group">
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
    </div>
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
      href: '/jobs/new'
    },
    { 
      icon: UserPlus, 
      title: 'Add Candidate', 
      description: 'Manual candidate entry',
      color: 'purple',
      href: '/candidates/new'
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
        <a
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
        </a>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="min-h-screen bg-background gradient-mesh">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-[280px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
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
                  <a href="/candidates" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
                    View all
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
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
                  <a href="/jobs" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
                    View all
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
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
        </main>
      </div>
    </div>
  );
}
