import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({ className = '' }) {
  return <div className={`rounded bg-raised animate-pulse ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 6, className = '' }) {
  return (
    <div className={`divide-y divide-line ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1 max-w-[320px]" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      {Icon && (
        <div className="w-10 h-10 mb-3 rounded-lg bg-raised flex items-center justify-center text-fg-subtle">
          <Icon className="w-5 h-5" aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Network failures (backend down) get their own message: the fix is different
export function ErrorState({ error, onRetry, title = 'Could not load this page' }) {
  const offline = error && (error.name === 'TypeError' || /fetch|network/i.test(error.message || ''));
  return (
    <EmptyState
      icon={offline ? WifiOff : AlertCircle}
      title={offline ? 'The BankDesk server is not reachable' : title}
      description={
        offline
          ? 'Check that the backend is running, then try again.'
          : error?.message || 'Something went wrong on our side. Try again in a moment.'
      }
      action={
        onRetry && (
          <Button icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
