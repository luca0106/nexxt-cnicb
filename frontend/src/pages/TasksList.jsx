import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckSquare } from 'lucide-react';
import { fetchTasks, toggleTask } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { dateTime, number, relative, text } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageHeader, SkeletonRows, Tabs, useToast } from '../components/ui';

const isDone = (t) => t.status === 'completed' || t.status === 'finalizat';
const isOverdue = (t) => !isDone(t) && t.due_date && new Date(/[zZ]$/.test(t.due_date) ? t.due_date : `${t.due_date}Z`) < new Date();

export default function TasksList() {
  const toast = useToast();
  const { data: tasks, loading, error, reload, setData } = useAsync(() => fetchTasks(), []);
  const [view, setView] = useState('open');

  const toggle = async (task) => {
    const next = isDone(task) ? 'in_progress' : 'completed';
    setData((list) => list.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      await toggleTask(task.id);
    } catch (err) {
      setData((list) => list.map((t) => (t.id === task.id ? task : t)));
      toast({ tone: 'danger', title: 'The task was not updated', description: 'Try again in a moment.' });
    }
  };

  const open = (tasks || []).filter((t) => !isDone(t));
  const done = (tasks || []).filter(isDone);
  const shown = view === 'open' ? open : done;

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageHeader title="Tasks" description={tasks ? `${number(open.length)} open · ${number(done.length)} done` : 'Follow-ups across your cases'} />

      <Tabs
        className="mb-2"
        value={view}
        onChange={setView}
        tabs={[
          { value: 'open', label: 'Open', count: tasks ? open.length : undefined },
          { value: 'done', label: 'Done', count: tasks ? done.length : undefined },
        ]}
      />

      {error && !tasks ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !tasks ? (
        <SkeletonRows rows={8} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={view === 'open' ? 'No open tasks' : 'Nothing completed yet'}
          description={view === 'open' ? 'You are up to date.' : 'Completed tasks appear here.'}
        />
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((t) => {
            const done = isDone(t);
            const overdue = isOverdue(t);
            return (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={done ? `Reopen "${t.title}"` : `Complete "${t.title}"`}
                  onClick={() => toggle(t)}
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded border inline-flex items-center justify-center transition-colors ${
                    done ? 'bg-success border-success text-canvas' : 'border-line-strong hover:border-fg-muted'
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? 'line-through text-fg-subtle' : ''}`}>{text(t.title)}</p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {t.due_date && (
                      <span className={overdue ? 'text-danger' : ''} title={dateTime(t.due_date)}>
                        {overdue ? 'Overdue · due ' : 'Due '}
                        {relative(t.due_date)}
                      </span>
                    )}
                    {t.due_date && ' · '}
                    {text(t.assigned_to)}
                  </p>
                </div>
                {t.priority && t.priority !== 'normal' && !done && (
                  <Badge tone={t.priority === 'urgent' ? 'danger' : 'warning'}>{t.priority === 'urgent' ? 'Urgent' : 'High'}</Badge>
                )}
                {t.case_id && (
                  <Link to={`/cases/${t.case_id}`} className="text-[13px] text-fg-muted hover:text-fg whitespace-nowrap">
                    Open case
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
