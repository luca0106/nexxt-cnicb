import React from 'react';
import { Check, CheckSquare, History } from 'lucide-react';
import { Badge, DataList, EmptyState } from '../ui';
import { dateTime, money, relative, text } from '../../lib/format';

export function BureauTab({ caseData }) {
  const client = caseData.client || {};
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-fg-muted mb-4">From the client record (credit bureau, tax authority and screening data on file).</p>
      <DataList
        items={[
          { label: 'Credit score', value: client.fico_score ? <span className="tabular">{client.fico_score} / 850</span> : text(null) },
          { label: 'Bureau status', value: text(client.credit_bureau_status) },
          { label: 'Active loans at other banks', value: <span className="tabular">{text(client.credit_bureau_active_loans)}</span> },
          { label: 'Existing monthly debt', value: <span className="tabular">{money(client.existing_monthly_debts, caseData.currency)}</span> },
          { label: 'Income reported to tax authority', value: <span className="tabular">{money(client.anaf_income, caseData.currency)}</span> },
          { label: 'Tax authority consent', value: client.anaf_consent ? 'Given electronically' : 'Not given — paper certificate needed' },
          { label: 'PEP screening', value: text(client.pep_status) },
          { label: 'AML screening', value: text(client.aml_status) },
        ]}
      />
    </div>
  );
}

export function TasksTab({ tasks, onToggle }) {
  if (!tasks.length) {
    return <EmptyState icon={CheckSquare} title="No tasks on this case" description="Tasks created during the review appear here." />;
  }
  return (
    <ul className="divide-y divide-line max-w-3xl">
      {tasks.map((t) => {
        const done = t.status === 'completed';
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
              onClick={() => onToggle(t.id)}
              className={`w-5 h-5 shrink-0 rounded border inline-flex items-center justify-center transition-colors ${
                done ? 'bg-success border-success text-canvas' : 'border-line-strong hover:border-fg-muted'
              }`}
            >
              {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-sm ${done ? 'line-through text-fg-subtle' : ''}`}>{t.title}</span>
            {t.priority && t.priority !== 'normal' && (
              <Badge tone={t.priority === 'urgent' ? 'danger' : 'warning'}>{t.priority === 'urgent' ? 'Urgent' : 'High'}</Badge>
            )}
            <span className="hidden sm:block text-xs text-fg-subtle w-28 text-right truncate">{text(t.assigned_to)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityTab({ entries }) {
  if (!entries.length) {
    return <EmptyState icon={History} title="No activity yet" description="Every change and AI review on this case is recorded here." />;
  }
  return (
    <ol className="relative max-w-3xl ml-1.5 border-l border-line">
      {entries.map((log) => (
        <li key={log.id} className="pl-5 pb-5 last:pb-0 relative">
          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-raised border border-line-strong" aria-hidden />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-sm font-medium">{text(log.action)}</p>
            <time className="text-xs text-fg-subtle" dateTime={log.timestamp} title={dateTime(log.timestamp)}>
              {relative(log.timestamp)}
            </time>
          </div>
          {log.details && <p className="mt-0.5 text-[13px] text-fg-muted break-words">{log.details}</p>}
          <p className="mt-0.5 text-xs text-fg-subtle">{text(log.performed_by)}</p>
        </li>
      ))}
    </ol>
  );
}
