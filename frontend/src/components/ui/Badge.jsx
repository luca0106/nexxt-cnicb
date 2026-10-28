import React from 'react';
import { humanize } from '../../lib/format';

const TONES = {
  neutral: 'bg-raised text-fg-muted border-line',
  info: 'bg-info/10 text-info border-info/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  accent: 'bg-accent/10 text-accent border-accent/30',
};

const DOTS = {
  neutral: 'bg-fg-subtle',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  accent: 'bg-accent',
};

export function Badge({ tone = 'neutral', dot = false, icon: Icon, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded border text-xs font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone]}`} aria-hidden />}
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </span>
  );
}

// Case workflow statuses as stored by the API
export const CASE_STATUS = {
  in_progress: { label: 'In progress', tone: 'info' },
  in_review: { label: 'In review', tone: 'warning' },
  pending: { label: 'Pending', tone: 'neutral' },
  completed: { label: 'Completed', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export function CaseStatusBadge({ status }) {
  const meta = CASE_STATUS[status] || { label: humanize(status), tone: 'neutral' };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export const PRIORITY = {
  urgent: { label: 'Urgent', tone: 'danger' },
  high: { label: 'High', tone: 'warning' },
  normal: { label: 'Normal', tone: 'neutral' },
};

export const RISK = {
  low: { label: 'Low risk', tone: 'success' },
  medium: { label: 'Medium risk', tone: 'warning' },
  high: { label: 'High risk', tone: 'danger' },
  critical: { label: 'Critical risk', tone: 'danger' },
};
