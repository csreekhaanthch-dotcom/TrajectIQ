'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type?: 'candidate' | 'job' | 'email' | 'sync';
}

export function StatusBadge({ status, type = 'candidate' }: StatusBadgeProps) {
  const statusConfig: Record<string, { class: string; label: string }> = {
    // Candidate statuses
    'NEW': { class: 'status-new', label: 'New' },
    'SCREENING': { class: 'status-screening', label: 'Screening' },
    'INTERVIEWED': { class: 'status-interviewed', label: 'Interviewed' },
    'OFFERED': { class: 'status-active', label: 'Offered' },
    'HIRED': { class: 'status-hired', label: 'Hired' },
    'REJECTED': { class: 'status-rejected', label: 'Rejected' },
    'WITHDRAWN': { class: 'status-closed', label: 'Withdrawn' },
    
    // Job statuses
    'DRAFT': { class: 'status-closed', label: 'Draft' },
    'ACTIVE': { class: 'status-active', label: 'Active' },
    'PAUSED': { class: 'status-paused', label: 'Paused' },
    'CLOSED': { class: 'status-closed', label: 'Closed' },
    'ARCHIVED': { class: 'status-closed', label: 'Archived' },
    
    // Email/Sync statuses
    'CONNECTED': { class: 'status-active', label: 'Connected' },
    'DISCONNECTED': { class: 'status-rejected', label: 'Disconnected' },
    'SYNCING': { class: 'status-screening', label: 'Syncing' },
    'ERROR': { class: 'status-rejected', label: 'Error' },
    'PENDING': { class: 'status-new', label: 'Pending' },
    'SYNCED': { class: 'status-active', label: 'Synced' },
  };

  const config = statusConfig[status] || { class: 'badge-neutral', label: status };

  return (
    <span className={cn('status-badge', config.class)}>
      {config.label}
    </span>
  );
}
