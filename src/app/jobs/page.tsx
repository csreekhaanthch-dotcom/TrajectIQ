'use client';

import { useState } from 'react';
import { Briefcase, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Pause, Play, Copy, MapPin, Building2, Clock, Users, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';

interface JobRequirement {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  candidatesCount: number;
  requiredSkills: string[];
  experienceRequired: number;
  createdAt: string;
}

const mockJobs: JobRequirement[] = [
  { id: '1', title: 'Senior Software Engineer', department: 'Engineering', location: 'San Francisco, CA', status: 'ACTIVE', candidatesCount: 24, requiredSkills: ['TypeScript', 'React', 'Node.js'], experienceRequired: 5, createdAt: '2024-01-15' },
  { id: '2', title: 'Full Stack Developer', department: 'Engineering', location: 'Remote', status: 'ACTIVE', candidatesCount: 18, requiredSkills: ['Python', 'Django', 'PostgreSQL'], experienceRequired: 3, createdAt: '2024-01-14' },
  { id: '3', title: 'DevOps Engineer', department: 'Infrastructure', location: 'New York, NY', status: 'PAUSED', candidatesCount: 12, requiredSkills: ['AWS', 'Kubernetes', 'Terraform'], experienceRequired: 4, createdAt: '2024-01-13' },
  { id: '4', title: 'Product Designer', department: 'Design', location: 'Los Angeles, CA', status: 'ACTIVE', candidatesCount: 8, requiredSkills: ['Figma', 'UI/UX', 'Prototyping'], experienceRequired: 3, createdAt: '2024-01-12' },
  { id: '5', title: 'Data Scientist', department: 'Data', location: 'Remote', status: 'CLOSED', candidatesCount: 15, requiredSkills: ['Python', 'ML', 'TensorFlow'], experienceRequired: 4, createdAt: '2024-01-11' },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRequirement[]>(mockJobs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    location: '',
    experienceRequired: 3,
    requiredSkills: '',
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateJob = () => {
    const job: JobRequirement = {
      id: Date.now().toString(),
      title: newJob.title,
      department: newJob.department,
      location: newJob.location,
      status: 'ACTIVE',
      candidatesCount: 0,
      requiredSkills: newJob.requiredSkills.split(',').map(s => s.trim()),
      experienceRequired: newJob.experienceRequired,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setJobs([job, ...jobs]);
    setShowCreateModal(false);
    setNewJob({ title: '', department: '', location: '', experienceRequired: 3, requiredSkills: '' });
  };

  const handleStatusChange = (jobId: string, newStatus: string) => {
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: newStatus } : job
    ));
    setShowMenu(null);
  };

  const handleDelete = (jobId: string) => {
    setJobs(jobs.filter(job => job.id !== jobId));
    setShowMenu(null);
  };

  const activeCount = jobs.filter(j => j.status === 'ACTIVE').length;
  const pausedCount = jobs.filter(j => j.status === 'PAUSED').length;
  const closedCount = jobs.filter(j => j.status === 'CLOSED').length;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'PAUSED': return 'status-paused';
      case 'CLOSED': return 'status-closed';
      default: return 'status-closed';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="page-title">Job Requirements</h1>
            <p className="page-description">Manage your open positions and candidate requirements</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 animate-fade-in-up stagger-1">
          <div className="stat-card">
            <div className="stat-card-header">
              <p className="stat-card-title">Active</p>
              <div className="stat-card-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Play className="w-5 h-5" />
              </div>
            </div>
            <p className="stat-card-value text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <p className="stat-card-title">Paused</p>
              <div className="stat-card-icon bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Pause className="w-5 h-5" />
              </div>
            </div>
            <p className="stat-card-value text-amber-600 dark:text-amber-400">{pausedCount}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <p className="stat-card-title">Closed</p>
              <div className="stat-card-icon bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <p className="stat-card-value">{closedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up stagger-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs by title or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-11"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'ACTIVE', 'PAUSED', 'CLOSED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  statusFilter === status
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="card animate-fade-in-up stagger-3">
          {filteredJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No jobs found</h3>
              <p className="empty-state-description">Create your first job requirement to get started</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary btn-md"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </button>
            </div>
          ) : (
            <div className="data-list">
              {filteredJobs.map((job) => (
                <div key={job.id} className="data-list-item">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="data-list-item-icon">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="data-list-item-content">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                        <span className={cn("status-badge", getStatusBadgeClass(job.status))}>
                          {job.status.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.department}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.experienceRequired}+ years</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.requiredSkills.slice(0, 4).map(skill => (
                          <span key={skill} className="badge-neutral">
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 4 && (
                          <span className="badge-neutral">
                            +{job.requiredSkills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="data-list-item-actions">
                    <div className="text-right hidden sm:block">
                      <p className="text-lg font-bold text-foreground">{job.candidatesCount}</p>
                      <p className="text-xs text-muted-foreground">candidates</p>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setShowMenu(showMenu === job.id ? null : job.id)}
                        className="btn-icon"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {showMenu === job.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                          <div className="dropdown right-0 top-full mt-1 w-48">
                            <button className="dropdown-item">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button className="dropdown-item">
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button className="dropdown-item">
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            {job.status === 'ACTIVE' ? (
                              <button 
                                onClick={() => handleStatusChange(job.id, 'PAUSED')}
                                className="dropdown-item"
                              >
                                <Pause className="w-4 h-4" />
                                Pause
                              </button>
                            ) : job.status === 'PAUSED' ? (
                              <button 
                                onClick={() => handleStatusChange(job.id, 'ACTIVE')}
                                className="dropdown-item"
                              >
                                <Play className="w-4 h-4" />
                                Activate
                              </button>
                            ) : null}
                            <div className="dropdown-divider" />
                            <button 
                              onClick={() => handleDelete(job.id)}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)} />
          <div className="modal-container max-w-lg">
            <div className="modal-header">
              <h3 className="modal-title">Create Job Requirement</h3>
              <p className="modal-description">Define a new position and its requirements</p>
            </div>
            
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  className="form-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                    placeholder="e.g., Engineering"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g., Remote"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Experience Required (years)</label>
                <input
                  type="number"
                  value={newJob.experienceRequired}
                  onChange={(e) => setNewJob({ ...newJob, experienceRequired: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="20"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Required Skills</label>
                <input
                  type="text"
                  value={newJob.requiredSkills}
                  onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                  placeholder="e.g., TypeScript, React, Node.js"
                  className="form-input"
                />
                <p className="form-hint">Separate skills with commas</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="btn-outline btn-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateJob}
                disabled={!newJob.title || !newJob.department || !newJob.location}
                className="btn-primary btn-md"
              >
                Create Job
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
