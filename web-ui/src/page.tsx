'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatCard } from '@/components/dashboard/StatCard';
import { ScoreChart } from '@/components/dashboard/ScoreChart';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { CandidateCard } from '@/components/dashboard/CandidateCard';
import { RecentEvaluations } from '@/components/dashboard/RecentEvaluations';
import { EvaluationDialog } from '@/components/dashboard/EvaluationDialog';
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
  AlertTriangle,
  CheckCircle2,
  Info,
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

  // Fetch data
  useEffect(() => {
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

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJob = selectedJob === 'all' || candidate.jobId === selectedJob;
    return matchesSearch && matchesJob;
  }).filter(c => c.status === 'completed');

  // Get rank for selected candidate
  const getSelectedCandidateRank = () => {
    if (!selectedCandidate) return undefined;
    const index = candidates
      .filter(c => c.status === 'completed')
      .sort((a, b) => b.score - a.score)
      .findIndex(c => c.id === selectedCandidate.id);
    return index + 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <TrajectIQLogo size="lg" showText={true} />
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75" />
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse delay-150" />
          </div>
          <p className="text-slate-400 text-sm">Initializing Intelligence Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Version */}
            <div className="flex items-center gap-4">
              <TrajectIQLogo size="md" showText={true} />
              <Badge variant="outline" className="hidden sm:flex text-[10px] font-mono px-2 py-0.5 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 border-blue-500/30 text-blue-400">
                v3.0.0
              </Badge>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', icon: BarChart3, active: true },
                { label: 'Candidates', icon: Users, active: false },
                { label: 'Jobs', icon: Briefcase, active: false },
                { label: 'Reports', icon: FileText, active: false },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative hidden sm:flex">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Settings className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">AD</span>
                    </div>
                    <span className="hidden sm:inline">Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col p-4 gap-2">
              {[
                { label: 'Dashboard', icon: BarChart3, active: true },
                { label: 'Candidates', icon: Users, active: false },
                { label: 'Jobs', icon: Briefcase, active: false },
                { label: 'Reports', icon: FileText, active: false },
              ].map((item) => (
                <Button
                  key={item.label}
                  variant={item.active ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2 justify-start"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Hiring Intelligence Dashboard</h2>
              <p className="text-muted-foreground">Monitor candidate evaluations and hiring metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button 
                size="sm" 
                className="gap-2 bg-gradient-to-r from-primary to-teal-600 hover:from-primary/90 hover:to-teal-600/90"
                onClick={() => setEvaluationDialogOpen(true)}
              >
                <Brain className="h-4 w-4" />
                New Evaluation
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title="Total Candidates"
            value={stats?.totalCandidates || 0}
            description="Evaluated this period"
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Average Score"
            value={stats?.averageScore || 0}
            description="Overall performance"
            icon={TrendingUp}
            trend={{ value: 5.2, isPositive: true }}
          />
          <StatCard
            title="Top Tier Candidates"
            value={stats?.topTierCandidates || 0}
            description="Score 85+ points"
            icon={Award}
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingReviews || 0}
            description="Awaiting evaluation"
            icon={Clock}
            trend={{ value: 8, isPositive: false }}
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
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

        {/* Main Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
          {/* Leaderboard Table - Takes 2 columns */}
          <div className="lg:col-span-2">
            <LeaderboardTable
              candidates={filteredCandidates}
              onViewDetails={(id) => {
                const candidate = candidates.find(c => c.id === id);
                if (candidate) setSelectedCandidate(candidate);
              }}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Score Distribution Chart */}
            {stats && <ScoreChart distribution={stats.scoreDistribution} />}
            
            {/* Recent Evaluations */}
            {stats && <RecentEvaluations evaluations={stats.recentEvaluations} />}
          </div>
        </div>

        {/* Active Jobs Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Positions</h3>
              <Badge variant="outline" className="text-sm">
                {jobs.filter(j => j.status === 'open').length} Open
              </Badge>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {jobs.map((job) => (
                <Card key={job.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-xs',
                          job.status === 'open' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        )}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm mb-1 line-clamp-1">{job.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{job.department}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{job.location}</span>
                      <span className="font-medium">{job.candidatesCount} candidates</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>© 2024 TrajectIQ. Intelligence-Driven Hiring Platform.</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </footer>

      {/* Evaluation Dialog */}
      <EvaluationDialog 
        open={evaluationDialogOpen} 
        onOpenChange={setEvaluationDialogOpen}
        onEvaluationComplete={(result) => {
          console.log('Evaluation complete:', result);
          // Refresh data after evaluation
        }}
      />

      {/* Candidate Details Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
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
