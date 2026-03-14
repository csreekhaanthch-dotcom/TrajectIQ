'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye, Trash2, Mail, FileText, Upload, X, MapPin, Building2, Target, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { GradeBadge } from '@/components/shared/GradeBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  status: string;
  topScore: number | null;
  source: string;
  yearsExperience: number | null;
  createdAt: string;
  skills: string[];
}

const statusOptions = ['all', 'NEW', 'SCREENING', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];

export default function CandidatesPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchCandidates = useCallback(async () => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/candidates?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCandidates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, statusFilter]);

  // Fetch candidates when user is available
  useEffect(() => {
    if (user?.organizationId) {
      fetchCandidates();
    }
  }, [user?.organizationId, fetchCandidates]);

  const filteredCandidates = candidates
    .filter(candidate => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        candidate.firstName.toLowerCase().includes(query) ||
        candidate.lastName.toLowerCase().includes(query) ||
        (candidate.email?.toLowerCase().includes(query)) ||
        (candidate.currentTitle?.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.topScore || 0;
        const scoreB = b.topScore || 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'name') {
        return a.lastName.localeCompare(b.lastName);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleDelete = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCandidates(candidates.filter(c => c.id !== candidateId));
      }
    } catch (error) {
      console.error('Failed to delete candidate:', error);
    }
    setShowMenu(null);
  };

  const statusCounts = {
    all: candidates.length,
    NEW: candidates.filter(c => c.status === 'NEW').length,
    SCREENING: candidates.filter(c => c.status === 'SCREENING').length,
    INTERVIEWED: candidates.filter(c => c.status === 'INTERVIEWED').length,
    OFFERED: candidates.filter(c => c.status === 'OFFERED').length,
    HIRED: candidates.filter(c => c.status === 'HIRED').length,
    REJECTED: candidates.filter(c => c.status === 'REJECTED').length,
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'NEW': return 'status-new';
      case 'SCREENING': return 'status-screening';
      case 'INTERVIEWED': return 'status-interviewed';
      case 'OFFERED': return 'status-active';
      case 'HIRED': return 'status-hired';
      case 'REJECTED': return 'status-rejected';
      default: return 'status-closed';
    }
  };

  const getGradeFromScore = (score: number | null): string => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'A_PLUS';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A_MINUS';
    if (score >= 75) return 'B_PLUS';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B_MINUS';
    if (score >= 60) return 'C_PLUS';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C_MINUS';
    return 'D';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
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
            <h1 className="page-title">Candidates</h1>
            <p className="page-description">View and manage all candidates in your hiring pipeline</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 animate-fade-in-up stagger-1">
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "stat-card p-4 text-center transition-all",
                statusFilter === status && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <p className="text-2xl font-bold text-foreground">{statusCounts[status as keyof typeof statusCounts]}</p>
              <p className="text-xs text-muted-foreground mt-1">{status === 'all' ? 'All' : status}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search candidates by name, email, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-11"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'name')}
              className="form-select w-40"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <div className="card">
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading candidates...</p>
            </div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No candidates found</h3>
              <p className="empty-state-description">
                {candidates.length === 0
                  ? 'Sync your email or create candidates from the Inbox'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="card card-hover p-5 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-semibold shadow-md">
                      {candidate.firstName[0]}{candidate.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {candidate.firstName} {candidate.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {candidate.currentTitle || 'No title'}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === candidate.id ? null : candidate.id)}
                      className="btn-icon"
                    >
                      <span className="text-muted-foreground">•••</span>
                    </button>

                    {showMenu === candidate.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                        <div className="dropdown right-0 top-full mt-1 w-48">
                          <button
                            onClick={() => { setSelectedCandidate(candidate); setShowMenu(null); }}
                            className="dropdown-item"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button className="dropdown-item">
                            <Mail className="w-4 h-4" />
                            Send Email
                          </button>
                          <div className="dropdown-divider" />
                          <button
                            onClick={() => handleDelete(candidate.id)}
                            className="dropdown-item destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={cn("status-badge", getStatusBadgeClass(candidate.status))}>
                    {candidate.status.toLowerCase()}
                  </span>
                  {candidate.topScore !== null && (
                    <GradeBadge grade={getGradeFromScore(candidate.topScore)} size="sm" />
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {candidate.topScore !== null ? (
                    <ScoreGauge score={candidate.topScore} size="sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No score</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium">{candidate.source.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(candidate.createdAt)}</p>
                  </div>
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.slice(0, 3).map((skill: string) => (
                      <span key={skill} className="badge-neutral">
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span className="badge-neutral">
                        +{candidate.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <>
            <div className="modal-overlay" onClick={() => setSelectedCandidate(null)} />
            <div className="modal-container max-w-2xl">
              <div className="modal-header">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white text-xl font-semibold shadow-md">
                    {selectedCandidate.firstName[0]}{selectedCandidate.lastName[0]}
                  </div>
                  <div>
                    <h3 className="modal-title">{selectedCandidate.firstName} {selectedCandidate.lastName}</h3>
                    <p className="modal-description">
                      {selectedCandidate.currentTitle || 'No title'}
                      {selectedCandidate.currentCompany && ` at ${selectedCandidate.currentCompany}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-body">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("status-badge", getStatusBadgeClass(selectedCandidate.status))}>
                        {selectedCandidate.status.toLowerCase()}
                      </span>
                      {selectedCandidate.topScore !== null && (
                        <GradeBadge grade={getGradeFromScore(selectedCandidate.topScore)} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Status & Grade</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-center">
                    {selectedCandidate.topScore !== null ? (
                      <ScoreGauge score={selectedCandidate.topScore} size="sm" />
                    ) : (
                      <div className="text-center">
                        <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Not scored yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedCandidate.email && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="font-medium text-foreground">{selectedCandidate.email}</p>
                    </div>
                  )}
                  {selectedCandidate.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="font-medium text-foreground">{selectedCandidate.phone}</p>
                    </div>
                  )}
                  {selectedCandidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCandidate.location}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skills</p>
                    {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill: string) => (
                          <span key={skill} className="badge-primary">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No skills recorded</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="btn-outline btn-md"
                >
                  Close
                </button>
                {selectedCandidate.topScore === null && (
                  <button className="btn-primary btn-md">
                    <Target className="w-4 h-4" />
                    Evaluate Candidate
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
