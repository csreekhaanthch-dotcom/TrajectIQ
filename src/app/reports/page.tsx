'use client';

import { useState } from 'react';
import { FileText, Download, Plus, BarChart3, Users, Briefcase, TrendingUp, Calendar, ChevronDown, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
  { id: 'CANDIDATE_SCORECARD', name: 'Candidate Scorecard', icon: Users, description: 'Detailed evaluation of a single candidate' },
  { id: 'CANDIDATE_COMPARISON', name: 'Candidate Comparison', icon: BarChart3, description: 'Compare multiple candidates side by side' },
  { id: 'REQUIREMENT_SUMMARY', name: 'Requirement Summary', icon: Briefcase, description: 'Overview of candidates for a job requirement' },
  { id: 'HIRING_PIPELINE', name: 'Hiring Pipeline', icon: TrendingUp, description: 'Full pipeline analytics and metrics' },
  { id: 'ANALYTICS_DASHBOARD', name: 'Analytics Dashboard', icon: BarChart3, description: 'Comprehensive hiring analytics' },
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

  const handleDownload = (reportId: string) => {
    // Simulate download
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
    
    // Simulate generation complete
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === newReport.id ? { ...r, status: 'READY' } : r
      ));
    }, 3000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Generate and download hiring reports and analytics
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>

        {/* Report Types Quick Access */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => { setSelectedReportType(type.id); setShowCreateModal(true); }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <type.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium">{type.name}</p>
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Filter by:</span>
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filterType === 'all'
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filterType === type.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              )}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No reports found</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first report to get started</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                Create Report
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{report.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
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
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="text-sm font-medium">{report.createdAt}</p>
                      </div>
                      <StatusBadge status={report.status} type="sync" />
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownload(report.id)}
                          disabled={report.status !== 'READY'}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            report.status === 'READY'
                              ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                              : "opacity-50 cursor-not-allowed"
                          )}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportTypes.map(type => (
              <div 
                key={type.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setSelectedReportType(type.id); setShowCreateModal(true); }}
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <type.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Create Report</h3>
            
            <div className="space-y-3 mb-6">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedReportType(type.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                    selectedReportType === type.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                  )}
                >
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <type.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowCreateModal(false); setSelectedReportType(''); }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateReport}
                disabled={!selectedReportType}
                className="flex-1 py-2.5 px-4 rounded-xl gradient-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
