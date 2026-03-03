'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatCard } from '@/components/dashboard/StatCard';
import { ScoreChart } from '@/components/dashboard/ScoreChart';
import { CandidateCard } from '@/components/dashboard/CandidateCard';
import { EvaluationDialog } from '@/components/dashboard/EvaluationDialog';
import { ScoreGauge, MiniScoreBar } from '@/components/dashboard/ScoreGauge';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { TrajectIQLogo } from '@/components/TrajectIQLogo';
import {
  Users,
  TrendingUp,
  Award,
  Clock,
  Search,
  Bell,
  Settings,
  ChevronDown,
  Brain,
  BarChart3,
  Briefcase,
  FileText,
  RefreshCw,
  Menu,
  X,
  Sparkles,
  Zap,
  Target,
  Shield,
  ArrowRight,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Star,
  Crown,
  Medal,
} from 'lucide-react';
import type { Candidate, DashboardStats, Job } from '@/types/dashboard';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    async function fetchData() {
      try {
        const [statsRes, candidatesRes, jobsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/candidates'),
          fetch('/api/jobs'),
        ]);

        const statsData = await statsRes.json();
        const candidatesData = await candidatesRes.json();
        const jobsData = await jobsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (candidatesData.success) setCandidates(candidatesData.data);
        if (jobsData.success) setJobs(jobsData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJob = selectedJob === 'all' || candidate.jobId === selectedJob;
    return matchesSearch && matchesJob;
  }).filter(c => c.status === 'completed').sort((a, b) => b.score - a.score);

  const getSelectedCandidateRank = () => {
    if (!selectedCandidate) return undefined;
    const index = candidates
      .filter(c => c.status === 'completed')
      .sort((a, b) => b.score - a.score)
      .findIndex(c => c.id === selectedCandidate.id);
    return index + 1;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Brand */}
            <TrajectIQLogo variant="full" size="md" showTagline />

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-full p-1">
              {[
                { label: 'Dashboard', icon: BarChart3, active: true },
                { label: 'Candidates', icon: Users, active: false },
                { label: 'Jobs', icon: Briefcase, active: false },
                { label: 'Reports', icon: FileText, active: false },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 rounded-full transition-all',
                    item.active && 'bg-white dark:bg-slate-700 shadow-sm'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative hidden sm:flex hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
              
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/25 hidden sm:inline-flex"
                onClick={() => setEvaluationDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                New Evaluation
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">AD</span>
                    </div>
                    <span className="hidden sm:inline font-medium">Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
            <nav className="flex flex-col p-4 gap-2">
              {[
                { label: 'Dashboard', icon: BarChart3, active: true },
                { label: 'Candidates', icon: Users, active: false },
                { label: 'Jobs', icon: Briefcase, active: false },
                { label: 'Reports', icon: FileText, active: false },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 justify-start"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
              <div className="pt-2 mt-2 border-t">
                <Button 
                  size="sm" 
                  className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  onClick={() => setEvaluationDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  New Evaluation
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className={cn(
          'mb-8 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        )}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">AI-Powered</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Hiring Intelligence Dashboard</h2>
              <p className="text-muted-foreground mt-1">Monitor candidate evaluations and make data-driven hiring decisions</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button 
                size="sm" 
                className="gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/25 sm:hidden"
                onClick={() => setEvaluationDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                New Evaluation
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8 stagger-children">
          <StatCard
            title="Total Candidates"
            value={stats?.totalCandidates || 0}
            description="Evaluated this period"
            icon={Users}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
            index={0}
          />
          <StatCard
            title="Average Score"
            value={stats?.averageScore || 0}
            description="Overall performance"
            icon={TrendingUp}
            variant="success"
            trend={{ value: 5.2, isPositive: true }}
            index={1}
          />
          <StatCard
            title="Top Tier Candidates"
            value={stats?.topTierCandidates || 0}
            description="Score 85+ points"
            icon={Award}
            variant="warning"
            index={2}
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingReviews || 0}
            description="Awaiting evaluation"
            icon={Clock}
            variant="danger"
            trend={{ value: 8, isPositive: false }}
            index={3}
          />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3 mb-8">
          {/* Candidates Table - Takes 2 columns */}
          <div className="xl:col-span-2 space-y-6">
            {/* Filters */}
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger className="w-full sm:w-[280px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Candidates Leaderboard */}
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Candidate Leaderboard
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top {filteredCandidates.length} candidates ranked by evaluation score
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    Live Rankings
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {filteredCandidates.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No candidates found</p>
                    </div>
                  ) : (
                    filteredCandidates.map((candidate, index) => (
                      <CandidateRow
                        key={candidate.id}
                        candidate={candidate}
                        rank={index + 1}
                        onClick={() => setSelectedCandidate(candidate)}
                        delay={index * 50}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Score Distribution Chart */}
            {stats && (
              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
                <ScoreChart distribution={stats.scoreDistribution} />
              </Card>
            )}
            
            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-indigo-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5" />
                  <h3 className="font-semibold">Quick Insights</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Hiring Velocity</span>
                    <span className="font-bold">+23%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-white rounded-full" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">AI Detection Rate</span>
                    <span className="font-bold">12%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/6 bg-white rounded-full" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Avg Time to Hire</span>
                    <span className="font-bold">14 days</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-white rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredCandidates.slice(0, 3).map((candidate, index) => (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold',
                      index === 0 && 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
                      index === 1 && 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800',
                      index === 2 && 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{candidate.currentRole || candidate.jobTitle}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold gradient-text">{candidate.score}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Active Jobs Section */}
        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-500" />
                  Active Positions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Open positions actively recruiting</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {jobs.filter(j => j.status === 'open').length} Open
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {jobs.map((job, index) => (
                <JobCard key={job.id} job={job} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <TrajectIQLogo variant="full" size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2024 TrajectIQ. Intelligence-Driven Hiring Platform.
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </footer>

      {/* Evaluation Dialog */}
      <EvaluationDialog 
        open={evaluationDialogOpen} 
        onOpenChange={setEvaluationDialogOpen}
        onEvaluationComplete={(result) => {
          console.log('Evaluation complete:', result);
        }}
      />

      {/* Candidate Details Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-transparent border-0 shadow-2xl">
          <ScrollArea className="max-h-[85vh]">
            {selectedCandidate && (
              <CandidateCard
                candidate={selectedCandidate}
                rank={getSelectedCandidateRank()}
                onClose={() => setSelectedCandidate(null)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center">
      <div className="text-center space-y-6">
        <TrajectIQLogo variant="icon" size="lg" className="mx-auto" />
        <div>
          <TrajectIQLogo variant="text" size="lg" className="mx-auto" />
          <p className="text-muted-foreground mt-2">Loading your hiring intelligence...</p>
        </div>
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Candidate row component
interface CandidateRowProps {
  candidate: Candidate;
  rank: number;
  onClick: () => void;
  delay: number;
}

function CandidateRow({ candidate, rank, onClick, delay }: CandidateRowProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    if (rank === 2) return { icon: Medal, color: 'from-slate-300 to-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' };
    if (rank === 3) return { icon: Medal, color: 'from-orange-300 to-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return null;
  };

  const rankStyle = getRankStyle(rank);
  const RankIcon = rankStyle?.icon;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-indigo-600 dark:text-indigo-400';
    if (score >= 55) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all duration-300',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4',
        rankStyle?.bg
      )}
      onClick={onClick}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        {RankIcon ? (
          <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center mx-auto', rankStyle.color)}>
            <RankIcon className="h-4 w-4 text-white" />
          </div>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-white">
          {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{candidate.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {candidate.currentRole || candidate.jobTitle}
        </p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block w-24">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r',
                candidate.score >= 85 && 'from-emerald-400 to-teal-500',
                candidate.score >= 70 && candidate.score < 85 && 'from-indigo-400 to-purple-500',
                candidate.score >= 55 && candidate.score < 70 && 'from-amber-400 to-orange-500',
                candidate.score < 55 && 'from-red-400 to-rose-500'
              )}
              style={{ width: `${candidate.score}%`, transition: 'width 1s ease-out' }}
            />
          </div>
        </div>
        <span className={cn('text-lg font-bold tabular-nums', getScoreColor(candidate.score))}>
          {candidate.score}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// Job card component
interface JobCardProps {
  job: Job;
  index: number;
}

function JobCard({ job, index }: JobCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs',
            job.status === 'open' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400'
          )}
        >
          {job.status}
        </Badge>
      </div>
      <h4 className="font-medium text-sm mb-1 line-clamp-1">{job.title}</h4>
      <p className="text-xs text-muted-foreground mb-3">{job.department}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{job.location}</span>
        <span className="font-medium text-indigo-600 dark:text-indigo-400">{job.candidatesCount} candidates</span>
      </div>
    </div>
  );
}
