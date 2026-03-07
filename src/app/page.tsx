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
}

interface RecentRequirement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { candidates: number };
}

// ============================================
// Mock Data for Demo
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

// Use static dates to avoid hydration mismatch (server vs client)
const STATIC_NOW = '2024-01-15T10:00:00.000Z';

const mockRecentCandidates: RecentCandidate[] = [
  { id: '1', firstName: 'John', lastName: 'Smith', currentTitle: 'Senior Engineer', createdAt: STATIC_NOW, status: 'NEW' },
  { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', createdAt: '2024-01-15T09:00:00.000Z', status: 'SCREENING' },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', currentTitle: 'Python Developer', createdAt: '2024-01-15T08:00:00.000Z', status: 'NEW' },
  { id: '4', firstName: 'Sarah', lastName: 'Williams', currentTitle: 'Tech Lead', createdAt: '2024-01-15T07:00:00.000Z', status: 'INTERVIEWED' },
  { id: '5', firstName: 'Alex', lastName: 'Brown', currentTitle: 'Backend Developer', createdAt: '2024-01-15T06:00:00.000Z', status: 'NEW' },
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
          className="mobile-menu-overlay lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-gradient">TrajectIQ</span>
              <p className="text-[10px] text-gray-400 -mt-0.5">Hiring Intelligence</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                item.active
                  ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                item.active 
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" 
                  : "group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              {item.label}
              {item.active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </a>
          ))}
        </nav>
        
        {/* Pro Feature Banner */}
        <div className="absolute bottom-24 left-4 right-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-white/80 mb-3">Unlock advanced analytics and unlimited candidates</p>
            <button className="w-full py-2 px-3 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm">
              Learn More
            </button>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium shadow-md">
              DU
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Demo User</p>
              <p className="text-xs text-gray-500 truncate">demo@trajectiq.com</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 w-full py-2 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates, jobs..."
            className="pl-10 pr-4 py-2.5 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">⌘K</kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors notification-pulse">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:-translate-y-0.5 btn-glow">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Job</span>
        </button>
      </div>
    </header>
  );
}

function StatCard({ title, value, change, changeType, icon: Icon, gradient }: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  gradient?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 card-hover group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {change && (
            <div className={cn(
              "flex items-center gap-1.5 mt-2 text-sm font-medium",
              changeType === 'positive' && "text-emerald-600 dark:text-emerald-400",
              changeType === 'negative' && "text-red-600 dark:text-red-400",
              changeType === 'neutral' && "text-gray-500 dark:text-gray-400"
            )}>
              {changeType === 'positive' && <ArrowUpRight className="w-4 h-4" />}
              {changeType === 'negative' && <ArrowDownRight className="w-4 h-4" />}
              {change}
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
          gradient || "bg-blue-50 dark:bg-blue-900/20"
        )}>
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 85) return '#22c55e';
    if (s >= 70) return '#3b82f6';
    if (s >= 55) return '#eab308';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative w-36 h-36 score-gauge-container">
      <svg className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-gray-100 dark:text-gray-800"
        />
        <circle
          cx="72"
          cy="72"
          r="45"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-gauge-fill"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score.toFixed(1)}</span>
        <span className="text-xs text-gray-500 font-medium">Avg Score</span>
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const gradeClass = grade.startsWith('A') ? 'grade-a' :
                     grade.startsWith('B') ? 'grade-b' :
                     grade.startsWith('C') ? 'grade-c' :
                     grade.startsWith('D') ? 'grade-d' : 'grade-f';
  
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
    <span className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold", gradeClass)}>
      {formatGrade(grade)}
    </span>
  );
}

function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  const maxCount = Math.max(...data.map(d => d.count));

  const getBarColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-gradient-to-r from-emerald-500 to-green-500';
    if (grade.startsWith('B')) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (grade.startsWith('C')) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    return 'bg-gradient-to-r from-red-500 to-rose-500';
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.grade} className="flex items-center gap-3 group" style={{ animationDelay: `${index * 50}ms` }}>
          <span className="w-8 text-sm font-semibold text-gray-700 dark:text-gray-300">{item.grade}</span>
          <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <div
              className={cn("h-full rounded-lg transition-all duration-500 group-hover:opacity-80", getBarColor(item.grade))}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-12 text-sm text-gray-500 text-right font-medium">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecentCandidate }) {
  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    SCREENING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    INTERVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    OFFERED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    HIRED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
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
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center font-medium text-white text-sm shadow-md">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{candidate.firstName} {candidate.lastName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{candidate.currentTitle || 'No title'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", statusColors[candidate.status])}>
          {candidate.status}
        </span>
        <span className="text-sm text-gray-500 hidden sm:inline">{formatDate(candidate.createdAt)}</span>
        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function RequirementRow({ requirement }: { requirement: RecentRequirement }) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    DRAFT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{requirement.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{requirement._count.candidates} candidates</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", statusColors[requirement.status])}>
          {requirement.status}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function ScoringEngineInfo() {
  return (
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Hiring Score Formula</h3>
        </div>
        <div className="text-sm opacity-90 space-y-3">
          <p className="leading-relaxed">The TrajectIQ Hiring Index uses a deterministic formula:</p>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 font-mono text-xs border border-white/10">
            Score = (SDI × 0.40) + (CSIG × 0.15) + (IAE × 0.20) + (CTA × 0.15) + (ERR × 0.10)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /><strong>SDI:</strong> Skill Depth</div>
            <div className="flex items-center gap-1.5"><Target className="w-3 h-3" /><strong>CSIG:</strong> Critical Skills</div>
            <div className="flex items-center gap-1.5"><Award className="w-3 h-3" /><strong>IAE:</strong> Impact Score</div>
            <div className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /><strong>CTA:</strong> Career Path</div>
            <div className="flex items-center gap-1.5 col-span-2"><Briefcase className="w-3 h-3" /><strong>ERR:</strong> Experience Match</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Dashboard
// ============================================

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>(mockScoreDistribution);
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>(mockRecentCandidates);
  const [recentRequirements, setRecentRequirements] = useState<RecentRequirement[]>(mockRecentRequirements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-72">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back! Here&apos;s your hiring pipeline overview.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="animate-fade-in-up stagger-1">
              <StatCard
                title="Active Jobs"
                value={stats.activeRequirements}
                change={`${stats.totalRequirements} total`}
                changeType="neutral"
                icon={Briefcase}
                gradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
              />
            </div>
            <div className="animate-fade-in-up stagger-2">
              <StatCard
                title="Total Candidates"
                value={stats.totalCandidates}
                change={`+${stats.newCandidates} new this week`}
                changeType="positive"
                icon={Users}
                gradient="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20"
              />
            </div>
            <div className="animate-fade-in-up stagger-3">
              <StatCard
                title="Average Score"
                value={stats.averageScore.toFixed(1)}
                change="Top grade: B+"
                changeType="neutral"
                icon={Target}
                gradient="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20"
              />
            </div>
            <div className="animate-fade-in-up stagger-4">
              <StatCard
                title="Hired"
                value={stats.hiredCount}
                change={`${stats.rejectedCount} rejected`}
                changeType="neutral"
                icon={Award}
                gradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Score Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-fade-in-up stagger-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Score Distribution</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4" />
                    Last 30 days
                  </div>
                </div>
                <ScoreDistributionChart data={scoreDistribution} />
              </div>

              {/* Recent Candidates */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-fade-in-up stagger-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Recent Candidates</h2>
                  <a href="/candidates" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1 group">
                    View all
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentCandidates.map((candidate) => (
                    <CandidateRow key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              </div>

              {/* Recent Requirements */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-fade-in-up stagger-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Active Requirements</h2>
                  <a href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1 group">
                    View all
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentRequirements.map((requirement) => (
                    <RequirementRow key={requirement.id} requirement={requirement} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Score Gauge */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-fade-in-up stagger-3">
                <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Average Hiring Score</h2>
                <div className="flex justify-center">
                  <ScoreGauge score={stats.averageScore} />
                </div>
                <div className="mt-4 text-center">
                  <GradeBadge grade={stats.topGrade} />
                  <p className="text-sm text-gray-500 mt-2">Most common grade</p>
                </div>
              </div>

              {/* Scoring Engine Info */}
              <ScoringEngineInfo />

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-fade-in-up stagger-5">
                <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-all group hover:border-blue-200 dark:hover:border-blue-800">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Connect Email</p>
                      <p className="text-xs text-gray-500">Link your email account</p>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-all group hover:border-green-200 dark:hover:border-green-800">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Create Job Requirement</p>
                      <p className="text-xs text-gray-500">Define a new position</p>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-all group hover:border-purple-200 dark:hover:border-purple-800">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Add Candidate</p>
                      <p className="text-xs text-gray-500">Manual candidate entry</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
