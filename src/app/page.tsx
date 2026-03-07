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
  { grade: 'B_PLUS', count: 28, percentage: 18 },
  { grade: 'B', count: 35, percentage: 22 },
  { grade: 'B_MINUS', count: 25, percentage: 16 },
  { grade: 'C_PLUS', count: 22, percentage: 14 },
  { grade: 'C', count: 18, percentage: 12 },
  { grade: 'C_MINUS', count: 10, percentage: 6 },
  { grade: 'F', count: 6, percentage: 4 },
];

const mockRecentCandidates: RecentCandidate[] = [
  { id: '1', firstName: 'John', lastName: 'Smith', currentTitle: 'Senior Engineer', createdAt: new Date().toISOString(), status: 'NEW' },
  { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'SCREENING' },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', currentTitle: 'Python Developer', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'NEW' },
  { id: '4', firstName: 'Sarah', lastName: 'Williams', currentTitle: 'Tech Lead', createdAt: new Date(Date.now() - 10800000).toISOString(), status: 'INTERVIEWED' },
  { id: '5', firstName: 'Alex', lastName: 'Brown', currentTitle: 'Backend Developer', createdAt: new Date(Date.now() - 14400000).toISOString(), status: 'NEW' },
];

const mockRecentRequirements: RecentRequirement[] = [
  { id: '1', title: 'Senior Software Engineer', status: 'ACTIVE', createdAt: new Date().toISOString(), _count: { candidates: 24 } },
  { id: '2', title: 'Full Stack Developer', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { candidates: 18 } },
  { id: '3', title: 'Python Developer', status: 'ACTIVE', createdAt: new Date(Date.now() - 172800000).toISOString(), _count: { candidates: 12 } },
  { id: '4', title: 'Frontend Engineer', status: 'PAUSED', createdAt: new Date(Date.now() - 259200000).toISOString(), _count: { candidates: 8 } },
  { id: '5', title: 'DevOps Engineer', status: 'CLOSED', createdAt: new Date(Date.now() - 345600000).toISOString(), _count: { candidates: 15 } },
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">TrajectIQ</span>
          </div>
          <button onClick={onClose} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                item.active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </a>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Demo User</p>
              <p className="text-xs text-gray-500">demo@trajectiq.com</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 w-full">
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
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates, jobs..."
            className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="gradient-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>
    </header>
  );
}

function StatCard({ title, value, change, changeType, icon: Icon }: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-sm",
              changeType === 'positive' && "text-green-600",
              changeType === 'negative' && "text-red-600",
              changeType === 'neutral' && "text-gray-500"
            )}>
              {changeType === 'positive' && <ArrowUpRight className="w-4 h-4" />}
              {changeType === 'negative' && <ArrowDownRight className="w-4 h-4" />}
              {change}
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-gauge-fill"
          style={{ '--score-offset': offset } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score.toFixed(1)}</span>
        <span className="text-xs text-gray-500">Avg Score</span>
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
    <span className={cn("px-2 py-1 rounded text-sm font-medium", gradeClass)}>
      {formatGrade(grade)}
    </span>
  );
}

function ScoreDistributionChart({ data }: { data: ScoreDistribution[] }) {
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.grade} className="flex items-center gap-3">
          <span className="w-8 text-sm font-medium">{item.grade}</span>
          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-12 text-sm text-gray-500 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecentCandidate }) {
  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    SCREENING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    INTERVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    OFFERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    HIRED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
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
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div>
          <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
          <p className="text-sm text-gray-500">{candidate.currentTitle || 'No title'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn("px-2 py-1 rounded text-xs font-medium", statusColors[candidate.status])}>
          {candidate.status}
        </span>
        <span className="text-sm text-gray-500">{formatDate(candidate.createdAt)}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

function RequirementRow({ requirement }: { requirement: RecentRequirement }) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    DRAFT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-medium">{requirement.title}</p>
          <p className="text-sm text-gray-500">{requirement._count.candidates} candidates</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn("px-2 py-1 rounded text-xs font-medium", statusColors[requirement.status])}>
          {requirement.status}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

function ScoringEngineInfo() {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
      <h3 className="font-semibold text-lg mb-2">Hiring Score Formula</h3>
      <div className="text-sm opacity-90 space-y-2">
        <p>The TrajectIQ Hiring Index uses a deterministic formula:</p>
        <div className="bg-white/10 rounded-lg p-3 font-mono text-xs">
          Score = (SDI × 0.40) + (CSIG × 0.15) + (IAE × 0.20) + (CTA × 0.15) + (ERR × 0.10)
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div><strong>SDI:</strong> Skill Depth Index</div>
          <div><strong>CSIG:</strong> Critical Skill Gate</div>
          <div><strong>IAE:</strong> Impact Authenticity</div>
          <div><strong>CTA:</strong> Career Trajectory</div>
          <div><strong>ERR:</strong> Experience Relevance</div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-4 lg:p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Welcome back! Here&apos;s your hiring pipeline overview.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Active Jobs"
              value={stats.activeRequirements}
              change={`${stats.totalRequirements} total`}
              changeType="neutral"
              icon={Briefcase}
            />
            <StatCard
              title="Total Candidates"
              value={stats.totalCandidates}
              change={`+${stats.newCandidates} new this week`}
              changeType="positive"
              icon={Users}
            />
            <StatCard
              title="Average Score"
              value={stats.averageScore.toFixed(1)}
              change="Top grade: B+"
              changeType="neutral"
              icon={Target}
            />
            <StatCard
              title="Hired"
              value={stats.hiredCount}
              change={`${stats.rejectedCount} rejected`}
              changeType="neutral"
              icon={Award}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Score Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Score Distribution</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Last 30 days
                  </div>
                </div>
                <ScoreDistributionChart data={scoreDistribution} />
              </div>

              {/* Recent Candidates */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Recent Candidates</h2>
                  <a href="/candidates" className="text-sm text-blue-600 hover:underline">
                    View all
                  </a>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentCandidates.map((candidate) => (
                    <CandidateRow key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              </div>

              {/* Recent Requirements */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Active Requirements</h2>
                  <a href="/jobs" className="text-sm text-blue-600 hover:underline">
                    View all
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
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-lg mb-4">Average Hiring Score</h2>
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
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Connect Email</p>
                      <p className="text-xs text-gray-500">Link your email account</p>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                    <Briefcase className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Create Job Requirement</p>
                      <p className="text-xs text-gray-500">Define a new position</p>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">Add Candidate</p>
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
