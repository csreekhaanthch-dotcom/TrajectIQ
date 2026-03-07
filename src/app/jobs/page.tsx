'use client';

import { useState } from 'react';
import { Briefcase, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Pause, Play, Copy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GradeBadge } from '@/components/shared/GradeBadge';
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
  
  // Form state for creating new job
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Job Requirements</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your open positions and candidate requirements
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pausedCount}</p>
            <p className="text-sm text-gray-500">Paused</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{closedCount}</p>
            <p className="text-sm text-gray-500">Closed</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'ACTIVE', 'PAUSED', 'CLOSED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  statusFilter === status
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No jobs found</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first job requirement to get started</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                Create Job
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{job.title}</h3>
                        <StatusBadge status={job.status} type="job" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>{job.department}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.experienceRequired}+ years exp</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.requiredSkills.slice(0, 4).map(skill => (
                          <span key={skill} className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 4 && (
                          <span className="px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                            +{job.requiredSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{job.candidatesCount}</p>
                        <p className="text-xs text-gray-500">candidates</p>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setShowMenu(showMenu === job.id ? null : job.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {showMenu === job.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              {job.status === 'ACTIVE' ? (
                                <button 
                                  onClick={() => handleStatusChange(job.id, 'PAUSED')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <Pause className="w-4 h-4" />
                                  Pause
                                </button>
                              ) : job.status === 'PAUSED' ? (
                                <button 
                                  onClick={() => handleStatusChange(job.id, 'ACTIVE')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <Play className="w-4 h-4" />
                                  Activate
                                </button>
                              ) : null}
                              <div className="border-t border-gray-200 dark:border-gray-800">
                                <button 
                                  onClick={() => handleDelete(job.id)}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create Job Requirement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Job Title *</label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department *</label>
                  <input
                    type="text"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                    placeholder="e.g., Engineering"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g., Remote"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Experience Required (years)</label>
                <input
                  type="number"
                  value={newJob.experienceRequired}
                  onChange={(e) => setNewJob({ ...newJob, experienceRequired: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="20"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Required Skills</label>
                <input
                  type="text"
                  value={newJob.requiredSkills}
                  onChange={(e) => setNewJob({ ...newJob, requiredSkills: e.target.value })}
                  placeholder="e.g., TypeScript, React, Node.js"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateJob}
                disabled={!newJob.title || !newJob.department || !newJob.location}
                className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
