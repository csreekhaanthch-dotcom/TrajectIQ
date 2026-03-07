'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'candidate' | 'job' | 'email' | 'sync';
}

export function StatusBadge({ status, type = 'candidate' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    const candidateStatuses: Record<string, { bg: string; text: string; label: string }> = {
      'NEW': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', label: 'New' },
      'SCREENING': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', label: 'Screening' },
      'INTERVIEWED': { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300', label: 'Interviewed' },
      'OFFERED': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: 'Offered' },
      'HIRED': { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-300', label: 'Hired' },
      'REJECTED': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Rejected' },
      'WITHDRAWN': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: 'Withdrawn' },
    };

    const jobStatuses: Record<string, { bg: string; text: string; label: string }> = {
      'DRAFT': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: 'Draft' },
      'ACTIVE': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: 'Active' },
      'PAUSED': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', label: 'Paused' },
      'CLOSED': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Closed' },
      'ARCHIVED': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Archived' },
    };

    const emailStatuses: Record<string, { bg: string; text: string; label: string }> = {
      'CONNECTED': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: 'Connected' },
      'DISCONNECTED': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Disconnected' },
      'SYNCING': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', label: 'Syncing' },
      'ERROR': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Error' },
    };

    const syncStatuses: Record<string, { bg: string; text: string; label: string }> = {
      'PENDING': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', label: 'Pending' },
      'SYNCING': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', label: 'Syncing' },
      'SYNCED': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: 'Synced' },
      'ERROR': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Error' },
    };

    const statusMaps = {
      candidate: candidateStatuses,
      job: jobStatuses,
      email: emailStatuses,
      sync: syncStatuses,
    };

    const map = statusMaps[type];
    return map[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  const config = getStatusConfig();

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold',
      config.bg,
      config.text
    )}>
      {config.label}
    </span>
  );
}
