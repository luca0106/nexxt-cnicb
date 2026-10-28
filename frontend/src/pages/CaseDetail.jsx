import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Bot, Plus } from 'lucide-react';
import { fetchCaseById, updateCaseStatus, toggleTask, fetchLatestCaseAnalysis } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { dateTime, relative, text } from '../lib/format';
import {
  Button, CaseStatusBadge, CASE_STATUS, ConfirmDialog, ErrorState, PRIORITY, Badge, Skeleton, Tabs, useToast,
} from '../components/ui';
import CaseSummary from '../components/case/CaseSummary';
import DocumentsTab from '../components/case/DocumentsTab';
import WorksheetTab from '../components/case/WorksheetTab';
import { ActivityTab, BureauTab, TasksTab } from '../components/case/OtherTabs';
import AttachDocumentDialog from '../components/case/AttachDocumentDialog';
import AICopilotDrawer from '../components/AICopilotDrawer';

const DECISIONS = {
  completed: {
    title: 'Approve this application?',
    description: 'The case is marked as completed and the contract can be generated. You can change the status later.',
    confirm: 'Approve application',
    note: 'Application approved by the loan officer',
  },
  rejected: {
    title: 'Reject this application?',
    description: 'The case is closed as rejected. Write the reason in the case notes so the client can be informed.',
    confirm: 'Reject application',
    note: 'Application rejected by the loan officer',
    tone: 'danger',
  },
};

export default function CaseDetail() {
  const { id } = useParams();
  const { setIsSidebarCollapsed } = useOutletContext() || {};
  const toast = useToast();

  const { data, loading, error, reload, setData } = useAsync(async () => {
    const caseData = await fetchCaseById(id);
    const analysis = await fetchLatestCaseAnalysis(caseData.id).catch(() => null);
    return { caseData, analysis };
  }, [id]);
  const caseData = data?.caseData;

  const [tab, setTab] = useState('documents');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState('split');
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    setSelectedDocId(null);
    setHighlightedLine(null);
  }, [id]);

  if (error && !caseData) {
    return (
      <>
        <BackLink />
        <ErrorState error={error} onRetry={reload} title="This case could not be loaded" />
      </>
    );
  }

  if (loading && !caseData) {
    return (
      <div role="status" aria-label="Loading case">
        <BackLink />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full mt-3" />
        <Skeleton className="h-56 w-full mt-8" />
        <Skeleton className="h-72 w-full mt-6" />
      </div>
    );
  }

  const documents = caseData.documents || [];
  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0] || null;
  const priority = PRIORITY[caseData.priority];
  const docked = copilotOpen;
  const setCase = (updated) => setData((d) => ({ ...d, caseData: updated }));

  const openCopilot = () => {
    setCopilotOpen((open) => {
      if (!open) setIsSidebarCollapsed?.(true);
      return !open;
    });
  };

  const changeStatus = async (status, note) => {
    setUpdatingStatus(true);
    try {
      const updated = await updateCaseStatus(caseData.id, status, note || `Status changed to ${CASE_STATUS[status]?.label || status}`);
      setCase(updated);
      toast({ tone: 'success', title: `Case marked as ${CASE_STATUS[status]?.label.toLowerCase() || status}` });
    } catch (err) {
      toast({ tone: 'danger', title: 'The status was not changed', description: 'Check the connection and try again.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onToggleTask = async (taskId) => {
    try {
      await toggleTask(taskId);
      setCase(await fetchCaseById(id));
    } catch (err) {
      toast({ tone: 'danger', title: 'The task was not updated', description: 'Try again in a moment.' });
    }
  };

  const onSelectCitation = (documentId, lineNumber) => {
    setTab('documents');
    setSelectedDocId(documentId);
    setHighlightedLine(lineNumber);
    if (window.matchMedia('(max-width: 1279px)').matches) setCopilotOpen(false);
  };

  const onAnalysisUpdated = async (analysis) => {
    setData((d) => ({ ...d, analysis }));
    try {
      setCase(await fetchCaseById(id));
    } catch (err) {
      /* the analysis is saved; the case refreshes on the next load */
    }
  };

  const decision = pendingDecision && DECISIONS[pendingDecision];

  return (
    <div className="animate-fade-in">
      <BackLink />

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl">Case #{caseData.case_number}</h1>
            <CaseStatusBadge status={caseData.status} />
            {priority && caseData.priority !== 'normal' && <Badge tone={priority.tone}>{priority.label} priority</Badge>}
          </div>
          <p className="mt-1 text-sm text-fg">
            {text(caseData.title)} <span className="text-fg-subtle">·</span> {text(caseData.client?.full_name)}
          </p>
          <p className="mt-0.5 text-[13px] text-fg-subtle">
            {text(caseData.case_type)} · {text(caseData.branch)} · {text(caseData.channel)} · registered{' '}
            <span title={dateTime(caseData.created_at)}>{relative(caseData.created_at)}</span> · {text(caseData.assigned_to)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="sr-only" htmlFor="case-status">
            Case status
          </label>
          <select
            id="case-status"
            value={caseData.status}
            disabled={updatingStatus}
            onChange={(e) => changeStatus(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-md bg-raised border border-line text-sm hover:border-line-strong focus:outline-none focus:border-accent"
          >
            {Object.entries(CASE_STATUS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <Button variant={copilotOpen ? 'secondary' : 'primary'} icon={Bot} onClick={openCopilot} aria-expanded={copilotOpen}>
            {copilotOpen ? 'Hide AI Copilot' : 'Review with AI'}
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-6 items-start ${
          docked
            ? copilotMode === 'expanded'
              ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
              : 'xl:grid-cols-[minmax(0,1fr)_minmax(460px,540px)]'
            : ''
        }`}
      >
        <div className="min-w-0 space-y-8">
          <CaseSummary caseData={caseData} stacked={docked} />

          {caseData.notes && (
            <div className="text-sm">
              <h2 className="text-[13px] font-semibold text-fg-muted uppercase tracking-wide mb-1">Case notes</h2>
              <p className="text-fg whitespace-pre-line">{caseData.notes}</p>
            </div>
          )}

          <div>
            <div className="flex items-end gap-3">
              <Tabs
                className="flex-1"
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'documents', label: 'Documents', count: documents.length },
                  { value: 'worksheet', label: 'Worksheet' },
                  { value: 'bureau', label: 'Credit bureau' },
                  { value: 'tasks', label: 'Tasks', count: caseData.tasks?.length || 0 },
                  { value: 'activity', label: 'Activity', count: caseData.history_entries?.length || 0 },
                ]}
              />
              {tab === 'documents' && documents.length > 0 && (
                <Button size="sm" icon={Plus} onClick={() => setAttachOpen(true)} className="mb-1.5">
                  Attach
                </Button>
              )}
            </div>
            <div className="pt-5" role="tabpanel">
              {tab === 'documents' && (
                <DocumentsTab
                  documents={documents}
                  selectedDoc={selectedDoc}
                  highlightedLine={selectedDoc && selectedDoc.id === selectedDocId ? highlightedLine : null}
                  onSelect={(doc) => {
                    setSelectedDocId(doc.id);
                    setHighlightedLine(null);
                  }}
                  onAttach={() => setAttachOpen(true)}
                  stacked={docked}
                />
              )}
              {tab === 'worksheet' && <WorksheetTab caseData={caseData} onSaved={setCase} />}
              {tab === 'bureau' && <BureauTab caseData={caseData} />}
              {tab === 'tasks' && <TasksTab tasks={caseData.tasks || []} onToggle={onToggleTask} />}
              {tab === 'activity' && <ActivityTab entries={caseData.history_entries || []} />}
            </div>
          </div>

          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-line">
            <div>
              <h2 className="text-[15px]">Decision</h2>
              <p className="mt-0.5 text-[13px] text-fg-muted">The final decision on this application is yours.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" disabled={updatingStatus} onClick={() => setPendingDecision('rejected')}>
                Reject
              </Button>
              <Button
                disabled={updatingStatus}
                onClick={() => changeStatus('pending', 'Clarifications requested from the applicant')}
              >
                Request clarification
              </Button>
              <Button variant="primary" disabled={updatingStatus} onClick={() => setPendingDecision('completed')}>
                Approve
              </Button>
            </div>
          </section>
        </div>

        {copilotOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 xl:hidden animate-fade-in" onClick={() => setCopilotOpen(false)} aria-hidden />
            <aside
              aria-label="AI Copilot"
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] animate-slide-in
                xl:sticky xl:inset-auto xl:top-6 xl:z-auto xl:w-auto xl:h-[calc(100vh-3rem)]"
            >
              <AICopilotDrawer
                isOpen
                onClose={() => setCopilotOpen(false)}
                viewMode={copilotMode}
                onToggleViewMode={() => setCopilotMode((m) => (m === 'split' ? 'expanded' : 'split'))}
                caseData={caseData}
                initialAnalysis={data.analysis}
                onAnalysisUpdated={onAnalysisUpdated}
                onSelectCitation={onSelectCitation}
              />
            </aside>
          </>
        )}
      </div>

      <AttachDocumentDialog
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        caseData={caseData}
        onAttached={async () => setCase(await fetchCaseById(id))}
      />

      <ConfirmDialog
        open={Boolean(decision)}
        title={decision?.title}
        description={decision?.description}
        confirmLabel={decision?.confirm}
        tone={decision?.tone}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => {
          const status = pendingDecision;
          setPendingDecision(null);
          changeStatus(status, DECISIONS[status].note);
        }}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/cases" className="inline-flex items-center gap-1.5 mb-4 text-[13px] text-fg-muted hover:text-fg">
      <ArrowLeft className="w-4 h-4" aria-hidden /> Cases
    </Link>
  );
}
