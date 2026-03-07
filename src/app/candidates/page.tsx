'use client';

import { useState } from 'react';
import { Users, Search, Filter, MoreHorizontal, Eye, Trash2, Mail, FileText, Upload, ChevronDown, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GradeBadge } from '@/components/shared/GradeBadge';
import { ScoreGauge } from '@/components/shared/ScoreGauge';
import { cn } from '@/lib/utils';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle: string;
  currentCompany: string;
  status: string;
  score: number;
  grade: string;
  jobTitle: string;
  appliedAt: string;
  skills: string[];
}

const mockCandidates: Candidate[] = [
  { id: '1', firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', currentTitle: 'Senior Software Engineer', currentCompany: 'Tech Corp', status: 'NEW', score: 85.5, grade: 'A', jobTitle: 'Senior Software Engineer', appliedAt: '2024-01-15', skills: ['TypeScript', 'React', 'Node.js', 'AWS'] },
  { id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@email.com', currentTitle: 'Full Stack Developer', currentCompany: 'Startup Inc', status: 'SCREENING', score: 78.2, grade: 'B_PLUS', jobTitle: 'Full Stack Developer', appliedAt: '2024-01-14', skills: ['Python', 'Django', 'React', 'PostgreSQL'] },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike.j@email.com', currentTitle: 'Python Developer', currentCompany: 'Data Co', status: 'INTERVIEWED', score: 72.8, grade: 'B', jobTitle: 'Python Developer', appliedAt: '2024-01-13', skills: ['Python', 'FastAPI', 'TensorFlow', 'SQL'] },
  { id: '4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah.w@email.com', currentTitle: 'Tech Lead', currentCompany: 'Big Tech', status: 'OFFERED', score: 91.3, grade: 'A_PLUS', jobTitle: 'Senior Software Engineer', appliedAt: '2024-01-12', skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'Kubernetes'] },
  { id: '5', firstName: 'Alex', lastName: 'Brown', email: 'alex.b@email.com', currentTitle: 'Backend Developer', currentCompany: 'Medium Corp', status: 'NEW', score: 68.4, grade: 'B_MINUS', jobTitle: 'Full Stack Developer', appliedAt: '2024-01-11', skills: ['Java', 'Spring Boot', 'MySQL'] },
  { id: '6', firstName: 'Emily', lastName: 'Davis', email: 'emily.d@email.com', currentTitle: 'DevOps Engineer', currentCompany: 'Cloud Inc', status: 'HIRED', score: 88.7, grade: 'A', jobTitle: 'DevOps Engineer', appliedAt: '2024-01-10', skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker'] },
  { id: '7', firstName: 'Chris', lastName: 'Miller', email: 'chris.m@email.com', currentTitle: 'Frontend Developer', currentCompany: 'Agency', status: 'REJECTED', score: 45.2, grade: 'D', jobTitle: 'Full Stack Developer', appliedAt: '2024-01-09', skills: ['HTML', 'CSS', 'JavaScript'] },
];

const statusOptions = ['all', 'NEW', 'SCREENING', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const filteredCandidates = candidates
    .filter(candidate => {
      const matchesSearch = 
        candidate.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.currentTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'name') return a.lastName.localeCompare(b.lastName);
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });

  const handleStatusChange = (candidateId: string, newStatus: string) => {
    setCandidates(candidates.map(c => 
      c.id === candidateId ? { ...c, status: newStatus } : c
    ));
    setShowMenu(null);
  };

  const handleDelete = (candidateId: string) => {
    setCandidates(candidates.filter(c => c.id !== candidateId));
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Candidates</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage all candidates in your hiring pipeline
            </p>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Resume
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "p-3 rounded-xl text-center transition-all",
                statusFilter === status
                  ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500"
                  : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300"
              )}
            >
              <p className="text-lg font-bold">{statusCounts[status as keyof typeof statusCounts]}</p>
              <p className="text-xs text-gray-500">{status === 'all' ? 'All' : status}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'name')}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => (
            <div 
              key={candidate.id} 
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 card-hover group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-md">
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 truncate max-w-[150px]">{candidate.currentTitle}</p>
                  </div>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(showMenu === candidate.id ? null : candidate.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  
                  {showMenu === candidate.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button 
                          onClick={() => { setSelectedCandidate(candidate); setShowMenu(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          <FileText className="w-4 h-4" />
                          View Resume
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Mail className="w-4 h-4" />
                          Send Email
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-800">
                          <select
                            value={candidate.status}
                            onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-transparent focus:outline-none"
                          >
                            {statusOptions.filter(s => s !== 'all').map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-800">
                          <button 
                            onClick={() => handleDelete(candidate.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={candidate.status} type="candidate" />
                <GradeBadge grade={candidate.grade} size="sm" />
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <ScoreGauge score={candidate.score} size="sm" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Applied for</p>
                  <p className="text-sm font-medium truncate">{candidate.jobTitle}</p>
                  <p className="text-xs text-gray-400">{candidate.appliedAt}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {candidate.skills.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {skill}
                  </span>
                ))}
                {candidate.skills.length > 3 && (
                  <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                    +{candidate.skills.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No candidates found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Upload Resume Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Upload Resume</h3>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">Drag and drop your resume here</p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Browse Files
                </span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
              </label>
              <p className="text-xs text-gray-400 mt-3">Supports PDF, DOC, DOCX (max 5MB)</p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-semibold shadow-md">
                  {selectedCandidate.firstName[0]}{selectedCandidate.lastName[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCandidate.firstName} {selectedCandidate.lastName}</h3>
                  <p className="text-gray-500">{selectedCandidate.currentTitle} at {selectedCandidate.currentCompany}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selectedCandidate.status} type="candidate" />
                  <GradeBadge grade={selectedCandidate.grade} />
                </div>
                <p className="text-sm text-gray-500">Status & Grade</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-center">
                <ScoreGauge score={selectedCandidate.score} size="sm" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium">{selectedCandidate.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Applied Position</p>
                <p className="font-medium">{selectedCandidate.jobTitle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map(skill => (
                    <span key={skill} className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              <button className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium">
                Evaluate Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
