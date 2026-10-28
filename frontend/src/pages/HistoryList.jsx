import React from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { fetchHistory } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { dateTime, number, relative, stripEmoji, text } from '../lib/format';
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from '../components/ui';

export default function HistoryList() {
  const { data: entries, loading, error, reload } = useAsync(() => fetchHistory(), []);

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageHeader
        title="Audit log"
        description={entries ? `${number(entries.length)} recorded actions by officers and the AI review` : 'Every action on every case'}
      />

      {error && !entries ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !entries ? (
        <SkeletonRows rows={10} />
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="Nothing recorded yet" description="Changes to cases and AI reviews are logged here automatically." />
      ) : (
        <ol className="divide-y divide-line">
          {entries.map((h) => (
            <li key={h.id} className="py-3.5 grid sm:grid-cols-[1fr_auto] gap-x-6 gap-y-0.5">
              <p className="text-sm font-medium">{stripEmoji(h.action)}</p>
              <time className="sm:row-start-1 sm:col-start-2 text-xs text-fg-subtle whitespace-nowrap" dateTime={h.timestamp} title={dateTime(h.timestamp)}>
                {relative(h.timestamp)}
              </time>
              {h.details && <p className="text-[13px] text-fg-muted break-words">{stripEmoji(h.details)}</p>}
              <p className="text-xs text-fg-subtle">
                {text(h.performed_by)}
                {h.case_id && (
                  <>
                    {' · '}
                    <Link to={`/cases/${h.case_id}`} className="text-fg-muted hover:text-fg underline-offset-2 hover:underline">
                      Open case
                    </Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
