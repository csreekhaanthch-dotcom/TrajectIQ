'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Loader2,
  User,
  Mail,
  Building,
  Briefcase,
  Star,
  Filter,
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Award,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface CandidateMatch {
  candidate_id: string;
  similarity_score: number;
  match_level: 'excellent' | 'high' | 'medium' | 'low';
  name?: string;
  email?: string;
  current_title?: string;
  current_company?: string;
  years_experience?: number;
  skills?: string[];
  highlights?: string[];
}

interface SearchResult {
  success: boolean;
  query: string;
  results: CandidateMatch[];
  total_count: number;
  search_time_ms: number;
  model_used: string;
}

interface SearchFilters {
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  threshold: number;
}

// ============================================
// Main Component
// ============================================

export default function CandidateSearchPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // State
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    skills: [],
    experienceMin: null,
    experienceMax: null,
    threshold: 0.5,
  });
  const [newSkill, setNewSkill] = useState('');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  // Example queries
  const exampleQueries = [
    "Backend engineer with distributed systems experience",
    "Full stack developer with React and Node.js skills",
    "DevOps engineer experienced with Kubernetes and AWS",
    "Machine learning engineer with Python expertise",
    "Senior software architect with leadership experience",
    "Data scientist with NLP and deep learning background",
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Perform semantic search
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/search/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit: 20,
          threshold: filters.threshold,
          skills_filter: filters.skills.length > 0 ? filters.skills : undefined,
          experience_min: filters.experienceMin || undefined,
          experience_max: filters.experienceMax || undefined,
          organization_id: user?.organizationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Add skill filter
  const addSkillFilter = () => {
    if (newSkill.trim() && !filters.skills.includes(newSkill.trim())) {
      setFilters(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  // Remove skill filter
  const removeSkillFilter = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  // Get match level styling
  const getMatchLevelStyle = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'high':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-emerald-600';
    if (score >= 0.8) return 'text-blue-600';
    if (score >= 0.6) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Loading state
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
        {/* Header */}
        <div className="page-header animate-fade-in">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              Semantic Candidate Search
            </h1>
            <p className="page-description">
              Find the best candidates using natural language queries.
              Our AI understands context and finds matches even without exact keywords.
            </p>
          </div>
        </div>

        {/* Search Section */}
        <div className="card animate-fade-in-up">
          <div className="card-content space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Describe the candidate you're looking for..."
                className="form-input pl-12 pr-4 py-4 text-lg w-full"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary btn-md"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                Search
              </button>
            </div>

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Try:</span>
              {exampleQueries.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q)}
                  className="text-sm px-3 py-1 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  {q.length > 40 ? q.substring(0, 40) + '...' : q}
                </button>
              ))}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}

            {/* Filters Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Sliders className="w-4 h-4" />
                Advanced Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {results && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {results.search_time_ms.toFixed(0)}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {results.total_count} candidates
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {results.model_used}
                  </span>
                </div>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                {/* Skills Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Required Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {filters.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {skill}
                        <button onClick={() => removeSkillFilter(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillFilter())}
                      placeholder="Add a skill..."
                      className="form-input flex-1"
                    />
                    <button onClick={addSkillFilter} className="btn-outline btn-sm">
                      Add
                    </button>
                  </div>
                </div>

                {/* Experience Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Years of Experience</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.experienceMin || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, experienceMin: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Min"
                      className="form-input w-24"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="number"
                      value={filters.experienceMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, experienceMax: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Max"
                      className="form-input w-24"
                    />
                    <span className="text-muted-foreground">years</span>
                  </div>
                </div>

                {/* Similarity Threshold */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Similarity: {(filters.threshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.threshold * 100}
                    onChange={(e) => setFilters(prev => ({ ...prev, threshold: parseInt(e.target.value) / 100 }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Show all</span>
                    <span>Best matches only</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {results.total_count} candidate{results.total_count !== 1 ? 's' : ''} found
              </h2>
            </div>

            {/* Results List */}
            {results.results.length === 0 ? (
              <div className="card">
                <div className="card-content py-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No candidates found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search query or lowering the similarity threshold.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {results.results.map((candidate, index) => (
                  <div
                    key={candidate.candidate_id}
                    className="card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedCandidate(
                      expandedCandidate === candidate.candidate_id ? null : candidate.candidate_id
                    )}
                  >
                    <div className="card-content">
                      <div className="flex items-start justify-between gap-4">
                        {/* Candidate Info */}
                        <div className="flex items-start gap-4 flex-1">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>

                          {/* Avatar */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {candidate.name || 'Unknown Candidate'}
                              </h3>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                getMatchLevelStyle(candidate.match_level)
                              )}>
                                {candidate.match_level} match
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                              {candidate.current_title && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {candidate.current_title}
                                </span>
                              )}
                              {candidate.current_company && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-4 h-4" />
                                  {candidate.current_company}
                                </span>
                              )}
                              {candidate.years_experience !== undefined && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4" />
                                  {candidate.years_experience} years exp
                                </span>
                              )}
                            </div>

                            {/* Skills */}
                            {candidate.skills && candidate.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.skills.slice(0, 5).map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-xs px-2 py-0.5 bg-muted rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 5 && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                    +{candidate.skills.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Highlights (Expanded) */}
                            {expandedCandidate === candidate.candidate_id && candidate.highlights && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <Info className="w-4 h-4" />
                                  Match Highlights
                                </h4>
                                <ul className="space-y-1">
                                  {candidate.highlights.map((highlight, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                      {highlight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 text-right">
                          <div className={cn("text-3xl font-bold", getScoreColor(candidate.similarity_score))}>
                            {(candidate.similarity_score * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">match score</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        {!results && (
          <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="card-content">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Semantic Search Powered by AI</h3>
                  <p className="text-muted-foreground mb-4">
                    Unlike traditional keyword search, our semantic search understands the meaning behind your query.
                    Describe the ideal candidate in natural language, and we'll find matches based on context and intent.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="text-sm">Context-aware matching</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="text-sm">No exact keywords needed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="text-sm">Sub-second results</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
