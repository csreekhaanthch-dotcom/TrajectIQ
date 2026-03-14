'use client';

import { useState } from 'react';
import { FileText, Download, Plus, BarChart3, Users, Briefcase, TrendingUp, Calendar, ChevronDown, Eye, Sparkles, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  candidateCount?: number;
  jobTitle?: string;
}

const mockReports: Report[] = [
  { id: '1', type: 'CANDIDATE_SCORECARD', title: 'John Smith - Senior Software Engineer', status: 'READY', createdAt: '2024-01-15', candidateCount: 1, jobTitle: 'Senior Software Engineer' },
  { id: '2', type: 'CANDIDATE_COMPARISON', title: 'Full Stack Developer Candidates Comparison', status: 'READY', createdAt: '2024-01-14', candidateCount: 5, jobTitle: 'Full Stack Developer' },
  { id: '3', type: 'REQUIREMENT_SUMMARY', title: 'Q1 2024 Hiring Pipeline Summary', status: 'READY', createdAt: '2024-01-13', candidateCount: 45, jobTitle: 'Multiple' },
  { id: '4', type: 'HIRING_PIPELINE', title: 'Engineering Department Pipeline', status: 'GENERATING', createdAt: '2024-01-12', candidateCount: 78, jobTitle: 'Engineering' },
  { id: '5', type: 'ANALYTICS_DASHBOARD', title: 'Monthly Analytics Report - January', status: 'READY', createdAt: '2024-01-11', candidateCount: 156, jobTitle: 'All Positions' },
];

const reportTypes = [
  { id: 'CANDIDATE_SCORECARD', name: 'Candidate Scorecard', icon: Users, description: 'Detailed evaluation of a single candidate', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  { id: 'CANDIDATE_COMPARISON', name: 'Candidate Comparison', icon: BarChart3, description: 'Compare multiple candidates side by side', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { id: 'REQUIREMENT_SUMMARY', name: 'Requirement Summary', icon: Briefcase, description: 'Overview of candidates for a job requirement', color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
  { id: 'HIRING_PIPELINE', name: 'Hiring Pipeline', icon: TrendingUp, description: 'Full pipeline analytics and metrics', color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  { id: 'ANALYTICS_DASHBOARD', name: 'Analytics Dashboard', icon: BarChart3, description: 'Comprehensive hiring analytics', color: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400' },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');

  const filteredReports = reports.filter(r => filterType === 'all' || r.type === filterType);

  const getReportTypeName = (type: string) => {
    return reportTypes.find(t => t.id === type)?.name || type;
  };

  const getReportTypeColor = (type: string) => {
    return reportTypes.find(t => t.id === type)?.color || 'bg-gray-100 text-gray-600';
  };

  const handleDownload = (reportId: string) => {
    alert(`Downloading report ${reportId}...`);
  };

  const handleCreateReport = () => {
    const newReport: Report = {
      id: Date.now().toString(),
      type: selectedReportType,
      title: `New ${getReportTypeName(selectedReportType)}`,
      status: 'GENERATING',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReports([newReport, ...reports]);
    setShowCreateModal(false);
    setSelectedReportType('');
    
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === newReport.id ? { ...r, status: 'READY' } : r
      ));
    }, 3000);
  };

  const getStatusClass = (status: string) => {
    return status === 'READY' ? 'status-active' : 'status-screening';
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between flex-wrap gap-4 animate-fade-in">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-description">Generate and download hiring reports and analytics</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>

        {/* Report Types Quick Access */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up stagger-1">
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => { setSelectedReportType(type.id); setShowCreateModal(true); }}
              className="card card-hover p-4 text-center group"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110", type.color)}>
                <type.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">{type.name}</p>
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap animate-fade-in-up stagger-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterType === 'all' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                filterType === type.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="card animate-fade-in-up stagger-3">
          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No reports found</h3>
              <p className="empty-state-description">Create your first report to get started</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary btn-md"
              >
                <Plus className="w-4 h-4" />
                Create Report
              </button>
            </div>
          ) : (
            <div className="data-list">
              {filteredReports.map((report) => (
                <div key={report.id} className="data-list-item">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", getReportTypeColor(report.type))}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="data-list-item-content">
                      <h3 className="font-semibold text-foreground">{report.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{getReportTypeName(report.type)}</span>
                        {report.candidateCount && (
                          <>
                            <span>•</span>
                            <span>{report.candidateCount} candidates</span>
                          </>
                        )}
                        {report.jobTitle && (
                          <>
                            <span>•</span>
                            <span>{report.jobTitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="data-list-item-actions">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium">{report.createdAt}</p>
                    </div>
                    <span className={cn("status-badge", getStatusClass(report.status))}>
                      {report.status.toLowerCase()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        className="btn-icon"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownload(report.id)}
                        disabled={report.status !== 'READY'}
                        className={cn(
                          "btn-icon",
                          report.status !== 'READY' && "opacity-50 cursor-not-allowed"
                        )}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Templates */}
        <div className="card animate-fade-in-up stagger-4">
          <div className="card-header">
            <h2 className="card-title">Report Templates</h2>
            <p className="card-description">Quick access to report generation templates</p>
          </div>
          <div className="card-content pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportTypes.map(type => (
                <button 
                  key={type.id}
                  className="quick-action text-left"
                  onClick={() => { setSelectedReportType(type.id); setShowCreateModal(true); }}
                >
                  <div className={cn("quick-action-icon", type.color)}>
                    <type.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <>
          <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setSelectedReportType(''); }} />
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">Create Report</h3>
              <p className="modal-description">Select a report type to generate</p>
            </div>
            
            <div className="modal-body">
              <div className="space-y-2">
                {reportTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReportType(type.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                      selectedReportType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", type.color)}>
                      <type.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => { setShowCreateModal(false); setSelectedReportType(''); }}
                className="btn-outline btn-md"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateReport}
                disabled={!selectedReportType}
                className="btn-primary btn-md"
              >
                <Sparkles className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
