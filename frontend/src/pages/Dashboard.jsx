import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Folder } from 'lucide-react';
import { fetchStats } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { number } from '../lib/format';
import { PageHeader, Section, Skeleton, SkeletonRows, EmptyState, ErrorState } from '../components/ui';
import CaseTable from '../components/CaseTable';

const FIGURES = [
  { key: 'to_verify', label: 'Waiting for review', status: 'in_review', tone: 'text-warning' },
  { key: 'in_progress', label: 'In progress', status: 'in_progress', tone: 'text-fg' },
  { key: 'pending', label: 'Waiting for client', status: 'pending', tone: 'text-fg' },
  { key: 'completed', label: 'Completed', status: 'completed', tone: 'text-fg' },
];

export default function Dashboard() {
  const { data: stats, loading, error, reload } = useAsync(fetchStats, []);

  if (error && !stats) {
    return (
      <>
        <PageHeader title="Overview" />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Overview" description="Retail Lending · your case pipeline" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg overflow-hidden border border-line bg-line">
        {FIGURES.map((f) => (
          <Link
            key={f.key}
            to={`/cases?status=${f.status}`}
            className="group p-4 sm:p-5 bg-surface hover:bg-raised transition-colors"
          >
            <p className="text-[13px] text-fg-muted">{f.label}</p>
            {loading && !stats ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className={`mt-1 text-3xl font-semibold tabular ${f.tone}`}>{number(stats?.[f.key])}</p>
            )}
            <p className="mt-2 text-xs text-fg-subtle group-hover:text-fg-muted flex items-center gap-1">
              View cases <ArrowRight className="w-3 h-3" aria-hidden />
            </p>
          </Link>
        ))}
      </div>

      <Section
        className="mt-10"
        title="Recent cases"
        description={stats ? `${number(stats.total_cases)} cases in total` : undefined}
        actions={
          <Link to="/cases" className="text-[13px] text-fg-muted hover:text-fg inline-flex items-center gap-1">
            All cases <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        }
      >
        {loading && !stats ? (
          <SkeletonRows rows={5} />
        ) : stats?.recent_cases?.length ? (
          <CaseTable cases={stats.recent_cases} compact />
        ) : (
          <EmptyState icon={Folder} title="No cases yet" description="New applications will appear here as soon as they are registered." />
        )}
      </Section>
    </div>
  );
}
