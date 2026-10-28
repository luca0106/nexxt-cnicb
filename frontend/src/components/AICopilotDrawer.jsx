import React, { useEffect, useState } from 'react';
import { Bot, Columns2, Maximize2, Play, RefreshCw, X } from 'lucide-react';
import {
  fetchCaseAgents,
  runModularAgent,
  runCaseAnalysis,
  resolveFinding,
  sendRemediationNotification,
  submitHumanDecision,
} from '../api/client';
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, RISK, Tabs, useToast } from './ui';
import { number, percent, relative, stripEmoji, text } from '../lib/format';
import FindingCard, { isResolved } from './copilot/FindingCard';
import { AffordabilityPanel, AuditPanel, DtiMeter, MessagePanel, SectionTitle } from './copilot/Panels';
import SpecialistsPanel, { Client360Panel, moduleTone } from './copilot/Specialists';

const DEFAULT_CATALOG = [
  { agentId: 'dti_repayment_capacity', name: 'Repayment capacity', description: 'Income, existing credits and living costs; DTI with a +2% rate stress test.' },
  { agentId: 'unusual_transactions', name: 'Unusual transactions', description: 'Statement inflows and outflows; unusual or unverified spending.' },
  { agentId: 'doc_reconciliation', name: 'Document reconciliation', description: 'Documents compared with CRM, tax authority and financial profile records.' },
];

const DECISIONS = {
  approve: { title: 'Approve this case?', description: 'The case is marked as approved and the decision is written to the audit log.', confirm: 'Approve case', toast: 'Case approved' },
  reject: { title: 'Reject this case?', description: 'The case is closed as rejected and the decision is written to the audit log.', confirm: 'Reject case', tone: 'danger', toast: 'Case rejected' },
};

const DECISION_LABEL = {
  approve: 'Approved',
  approved: 'Approved',
  reject: 'Rejected',
  rejected: 'Rejected',
  request_clarification: 'Clarification requested',
  clarification_sent: 'Clarification requested',
};

function useElapsed(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    setSeconds(0);
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);
  return seconds;
}

export default function AICopilotDrawer({ onClose, viewMode = 'split', onToggleViewMode, caseData, initialAnalysis, onAnalysisUpdated, onSelectCitation }) {
  const toast = useToast();
  const [analysis, setAnalysis] = useState(initialAnalysis || null);
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [tab, setTab] = useState('overview');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [runningModule, setRunningModule] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null);
  const elapsed = useElapsed(running);

  useEffect(() => setAnalysis(initialAnalysis || null), [initialAnalysis, caseData?.id]);

  useEffect(() => {
    if (!caseData?.id) return;
    fetchCaseAgents(caseData.id)
      .then((data) => {
        if (data?.agents?.length) {
          setCatalog(data.agents.map((a) => ({ ...a, name: DEFAULT_CATALOG.find((d) => d.agentId === a.agentId)?.name || a.name })));
        }
      })
      .catch(() => {});
  }, [caseData?.id]);

  const update = (next) => {
    setAnalysis(next);
    onAnalysisUpdated?.(next);
  };

  const runReview = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await runCaseAnalysis(caseData.id, {});
      update(res);
      setTab('overview');
      const red = (res.findings || []).filter((f) => f.flagType === 'red_flag').length;
      toast({ tone: 'success', title: 'AI review finished', description: red ? `${red} item(s) need your attention.` : 'No issues found.' });
    } catch (err) {
      setRunError(err);
    } finally {
      setRunning(false);
    }
  };

  const runModule = async (agentId) => {
    setRunningModule(agentId);
    try {
      update(await runModularAgent(caseData.id, agentId));
      setExpanded((e) => ({ ...e, [agentId]: true }));
      setTab('specialists');
    } catch (err) {
      toast({ tone: 'danger', title: 'The check did not run', description: 'Try again in a moment.' });
    } finally {
      setRunningModule(null);
    }
  };

  const withBusy = (fn, failure) => async (...args) => {
    setBusy(true);
    try {
      await fn(...args);
    } catch (err) {
      toast({ tone: 'danger', title: failure, description: 'Check the connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  const onResolve = withBusy(async (findingId, action, value = null) => {
    update(await resolveFinding(analysis.analysisId, findingId, { action, resolved_value: value }));
    toast({
      tone: 'success',
      title: value !== null ? 'Value applied to the case' : 'Finding marked as checked',
      description: value !== null ? 'Affordability was recalculated.' : undefined,
    });
  }, 'The finding was not updated');

  const onSend = withBusy(async () => {
    update(await sendRemediationNotification(analysis.analysisId, { channel: 'email_and_sms' }));
    toast({ tone: 'success', title: 'Message sent to the client', description: 'The case is now waiting for the client.' });
  }, 'The message was not sent');

  const decide = withBusy(async (decision) => {
    update(await submitHumanDecision(analysis.analysisId, { decision, officer_comments: comment.trim() || undefined, apply_extracted_data: true }));
    setComment('');
    toast({ tone: 'success', title: DECISIONS[decision]?.toast || 'Clarification requested' });
  }, 'The decision was not recorded');

  const findings = analysis?.findings || [];
  const open = findings.filter((f) => f.flagType === 'red_flag' && !isResolved(f));
  const reviewed = findings.filter((f) => isResolved(f));
  const verified = findings.filter((f) => f.flagType === 'green_flag' && !isResolved(f));
  const metrics = analysis?.metrics || {};
  const modules = metrics.modularResults || {};
  const summary360 = metrics.clientSummary360;
  const risk = RISK[analysis?.riskScore];
  const decided = analysis?.humanDecision && analysis.humanDecision !== 'pending';
  const decision = pendingDecision && DECISIONS[pendingDecision];

  return (
    <div className="h-full flex flex-col bg-surface border-l xl:border border-line xl:rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-line shrink-0">
        <span className="w-7 h-7 rounded-md bg-accent text-accent-fg flex items-center justify-center shrink-0" aria-hidden>
          <Bot className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Raiffeisen AI Copilot</p>
          <p className="text-2xs text-fg-subtle truncate">
            Case #{caseData?.case_number}
            {analysis && <> · reviewed {relative(analysis.completedAt || analysis.createdAt)}</>}
          </p>
        </div>
        {onToggleViewMode && (
          <IconButton
            className="hidden xl:inline-flex"
            icon={viewMode === 'split' ? Maximize2 : Columns2}
            label={viewMode === 'split' ? 'Widen panel' : 'Narrow panel'}
            onClick={onToggleViewMode}
          />
        )}
        <IconButton icon={X} label="Close AI Copilot" onClick={onClose} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {running ? (
          <RunningState elapsed={elapsed} />
        ) : !analysis ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-medium">Review this case with AI</p>
            <p className="mt-2 text-[13px] text-fg-muted max-w-sm mx-auto">
              The review agent reads every document, checks identity, income and affordability, and cites the exact line behind each
              finding. You make the decision.
            </p>
            {runError && <p className="mt-4 text-[13px] text-danger">The review could not be completed. Check that the server is running and try again.</p>}
            <Button variant="primary" icon={Play} className="mt-5" onClick={runReview}>
              Run AI review
            </Button>
            <p className="mt-3 text-xs text-fg-subtle">Usually takes 25–40 seconds.</p>
          </div>
        ) : (
          <>
            <div className="px-4 sticky top-0 bg-surface z-10">
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'findings', label: 'Findings', count: open.length || undefined },
                  { value: 'affordability', label: 'Affordability' },
                  { value: 'specialists', label: 'Specialists' },
                  { value: 'client', label: 'Client 360' },
                  { value: 'message', label: 'Message' },
                  { value: 'audit', label: 'Audit' },
                ]}
              />
            </div>
            <div className="px-4 py-5">
              {runError && (
                <p className="mb-4 text-[13px] text-danger">The new review could not be completed. The results below are from the previous run.</p>
              )}

              {tab === 'overview' && (
                <div className="space-y-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {risk && <Badge tone={risk.tone} dot>{risk.label}</Badge>}
                      {decided && <Badge tone="neutral">{DECISION_LABEL[analysis.humanDecision] || text(analysis.humanDecision)}</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed">{stripEmoji(analysis.summary)}</p>
                    <p className="mt-2 text-2xs text-fg-subtle">
                      {text(analysis.engineUsed)}
                      {metrics.agentMode && (
                        <>
                          {' '}· {number(metrics.agentToolCalls)} tool calls · {number(metrics.aiProcessingSeconds, 1)} s
                        </>
                      )}
                    </p>
                  </div>

                  <div>
                    <SectionTitle aside={<span className="text-xs text-fg-subtle tabular">{open.length} open</span>}>Needs your decision</SectionTitle>
                    {open.length ? (
                      <div className="divide-y divide-line border-y border-line">
                        {open.map((f) => (
                          <FindingCard key={f.id} finding={f} compact onSelectCitation={onSelectCitation} onResolve={onResolve} busy={busy} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-fg-muted">Nothing open. All flagged items have been reviewed.</p>
                    )}
                    {open.length > 0 && (
                      <button type="button" onClick={() => setTab('findings')} className="mt-2 text-[13px] text-fg-muted hover:text-fg underline underline-offset-2">
                        See sources and details
                      </button>
                    )}
                  </div>

                  {analysis.feasibilityMath?.dti_percentage !== undefined && (
                    <div>
                      <SectionTitle aside={<span className={`text-sm font-semibold tabular ${analysis.feasibilityMath.is_feasible ? '' : 'text-danger'}`}>{percent(analysis.feasibilityMath.dti_percentage)}</span>}>
                        Debt-to-income
                      </SectionTitle>
                      <DtiMeter value={analysis.feasibilityMath.dti_percentage} limit={analysis.feasibilityMath.max_dti_limit_percent || 40} />
                    </div>
                  )}

                  <div>
                    <SectionTitle>Specialist checks</SectionTitle>
                    <ul className="divide-y divide-line border-y border-line">
                      {catalog.map((a) => (
                        <li key={a.agentId}>
                          <button
                            type="button"
                            onClick={() => {
                              setExpanded((e) => ({ ...e, [a.agentId]: true }));
                              setTab('specialists');
                            }}
                            className="w-full flex items-center justify-between gap-3 py-2.5 text-left text-[13px] hover:text-fg"
                          >
                            <span>{a.name}</span>
                            {modules[a.agentId] ? <Badge tone={moduleTone(modules[a.agentId])}>{text(modules[a.agentId].badgeText)}</Badge> : <span className="text-fg-subtle">Not run</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {analysis.remediation?.required && analysis.remediation.status !== 'sent_by_officer' && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-3">
                      <p className="text-[13px] text-fg-muted">A message to the client is drafted and waiting for your approval.</p>
                      <Button size="sm" onClick={() => setTab('message')}>
                        Review message
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'findings' && (
                <div className="space-y-6">
                  <FindingGroup title="Needs your decision" items={open} empty="Nothing open." onSelectCitation={onSelectCitation} onResolve={onResolve} busy={busy} />
                  {reviewed.length > 0 && <FindingGroup title="Reviewed by you" items={reviewed} onSelectCitation={onSelectCitation} />}
                  <details className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-fg-muted uppercase tracking-wide py-1 hover:text-fg">
                      Verified
                      <span className="normal-case font-normal tracking-normal text-fg-subtle">{verified.length} items · show</span>
                    </summary>
                    <div className="mt-2">
                      {verified.map((f) => (
                        <FindingCard key={f.id} finding={f} onSelectCitation={onSelectCitation} />
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {tab === 'affordability' && <AffordabilityPanel math={analysis.feasibilityMath} />}

              {tab === 'specialists' && (
                <SpecialistsPanel
                  catalog={catalog}
                  results={modules}
                  expanded={expanded}
                  onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))}
                  onRun={runModule}
                  runningId={runningModule}
                  disabled={Boolean(runningModule)}
                  onSelectCitation={onSelectCitation}
                  onResolve={onResolve}
                  busy={busy}
                />
              )}

              {tab === 'client' && <Client360Panel summary={summary360} />}
              {tab === 'message' && <MessagePanel remediation={analysis.remediation} onSend={onSend} busy={busy} />}
              {tab === 'audit' && <AuditPanel analysis={analysis} />}

              <div className="mt-8 pt-4 border-t border-line">
                <Button size="sm" variant="ghost" icon={RefreshCw} onClick={runReview}>
                  Run the review again
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Decision bar */}
      {analysis && !running && (
        <div className="shrink-0 border-t border-line bg-canvas/40 px-4 py-3 space-y-2.5">
          <label htmlFor="officer-comment" className="sr-only">
            Comment for the audit log
          </label>
          <input
            id="officer-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment for the audit log (optional)"
            className="w-full h-9 px-3 rounded-md bg-canvas border border-line text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" disabled={busy} onClick={() => setPendingDecision('reject')}>
              Reject
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => decide('request_clarification')}>
              Ask client
            </Button>
            <Button variant="primary" className="flex-1" disabled={busy} onClick={() => setPendingDecision('approve')}>
              Approve
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(decision)}
        title={decision?.title}
        description={
          decision && open.length && pendingDecision === 'approve'
            ? `${open.length} flagged item(s) are still open. ${decision.description}`
            : decision?.description
        }
        confirmLabel={decision?.confirm}
        tone={decision?.tone}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => {
          const d = pendingDecision;
          setPendingDecision(null);
          decide(d);
        }}
      />
    </div>
  );
}

function FindingGroup({ title, items, empty, onSelectCitation, onResolve, busy }) {
  return (
    <div>
      <SectionTitle aside={<span className="text-xs text-fg-subtle tabular">{items.length}</span>}>{title}</SectionTitle>
      {items.length ? (
        <div className="border-t border-line">
          {items.map((f) => (
            <FindingCard key={f.id} finding={f} onSelectCitation={onSelectCitation} onResolve={onResolve} busy={busy} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-fg-muted">{empty}</p>
      )}
    </div>
  );
}

function RunningState({ elapsed }) {
  return (
    <div className="px-6 py-14 text-center" role="status" aria-live="polite">
      <div className="mx-auto w-48 h-1 rounded-full bg-raised overflow-hidden">
        <div className="h-full w-1/3 bg-accent rounded-full animate-indeterminate" />
      </div>
      <p className="mt-5 text-sm font-medium">The review agent is working on this case</p>
      <p className="mt-1 text-[13px] text-fg-muted max-w-xs mx-auto">
        It reads the documents and chooses its own checks. This usually takes 25–40 seconds.
      </p>
      <p className="mt-3 text-xs text-fg-subtle tabular">{elapsed} s</p>
    </div>
  );
}
