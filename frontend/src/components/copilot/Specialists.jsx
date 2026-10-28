import React from 'react';
import { ChevronDown, Play, RefreshCw } from 'lucide-react';
import { Badge, Button, DataList, EmptyState } from '../ui';
import { money, text } from '../../lib/format';
import FindingCard, { Citation } from './FindingCard';
import { SectionTitle } from './Panels';

const ALERT = new Set(['action_required', 'needs_review', 'critical']);
const HIGHLIGHT_TONE = { critical: 'text-danger', warning: 'text-warning', ok: 'text-fg' };

export function moduleTone(mod) {
  if (!mod) return 'neutral';
  if (mod.status === 'critical') return 'danger';
  return ALERT.has(mod.status) ? 'warning' : 'success';
}

function ModuleBody({ mod, onSelectCitation, onResolve, busy }) {
  const sd = mod.structuredData;
  const tx = mod.transactionBreakdown;
  return (
    <div className="space-y-5 pt-1 pb-4">
      {mod.aiNarrative && <p className="text-[13px] text-fg-muted leading-relaxed">{mod.aiNarrative}</p>}

      {mod.highlights?.length > 0 && (
        <dl className="grid grid-cols-2 gap-px rounded-md overflow-hidden border border-line bg-line">
          {mod.highlights.map((h, i) => (
            <div key={i} className="bg-surface px-3 py-2.5 min-w-0">
              <dt className="text-xs text-fg-subtle truncate" title={h.label}>
                {h.label}
              </dt>
              <dd className={`mt-0.5 text-sm font-medium tabular truncate ${HIGHLIGHT_TONE[h.status] || 'text-fg'}`} title={String(h.value)}>
                {text(h.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {sd?.contradictionsAndMissing?.length > 0 && (
        <div>
          <SectionTitle>Missing or contradictory data</SectionTitle>
          <ul className="space-y-1.5">
            {sd.contradictionsAndMissing.map((c, i) => (
              <li key={i} className="text-[13px]">
                <span className="font-medium text-warning">{c.field}:</span> <span className="text-fg-muted">{c.issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sd?.obligations?.activeCreditsList?.length > 0 && (
        <div>
          <SectionTitle>Active credits</SectionTitle>
          <DataList
            items={sd.obligations.activeCreditsList.map((cr, i) => ({
              label: `${cr.lender} · ${cr.creditType}`,
              value: (
                <span className="tabular">
                  {money(cr.monthlyPayment)}/mo <span className="text-fg-subtle">· {money(cr.remainingBalance)} left</span>
                </span>
              ),
              key: i,
            }))}
          />
        </div>
      )}

      {tx && (
        <div>
          <SectionTitle>Unverified spending signals</SectionTitle>
          {tx.suspectedSignals?.length > 0 ? (
            <ul className="space-y-3">
              {tx.suspectedSignals.map((s, i) => (
                <li key={i} className="text-[13px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{text(s.category)}</span>
                    <span className="tabular text-warning">{money(s.monthlyAmount)}/mo</span>
                  </div>
                  {s.evidenceNote && <p className="text-fg-muted">{s.evidenceNote}</p>}
                  {s.actionRequired && <p className="text-fg-subtle">{s.actionRequired}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-muted">No unusual spending found in the statements and expense records.</p>
          )}
        </div>
      )}

      {tx?.salaryInflows?.length > 0 && (
        <div>
          <SectionTitle>Salary inflows on the statement</SectionTitle>
          <div className="space-y-1.5">
            {tx.salaryInflows.map((inf, i) => (
              <Citation
                key={i}
                onSelect={onSelectCitation}
                value={{ documentId: inf.documentId, lineNumber: inf.lineNumber, documentType: inf.month, value: money(inf.amount), quote: inf.quote }}
              />
            ))}
          </div>
        </div>
      )}

      {mod.reconciliationMatrix?.length > 0 && (
        <div className="overflow-x-auto">
          <SectionTitle>Documents vs. system records</SectionTitle>
          <table className="w-full min-w-[460px] text-[13px]">
            <thead>
              <tr className="text-left text-xs text-fg-subtle border-b border-line">
                <th scope="col" className="font-medium py-2 pr-3">Item</th>
                <th scope="col" className="font-medium py-2 pr-3">Documents</th>
                <th scope="col" className="font-medium py-2 pr-3">System / tax</th>
                <th scope="col" className="font-medium py-2 pr-3">Profile</th>
                <th scope="col" className="font-medium py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {mod.reconciliationMatrix.map((row, i) => {
                const mismatch = row.status === 'mismatch';
                return (
                  <tr key={i} className="border-b border-line last:border-0 align-top">
                    <td className="py-2 pr-3">
                      {row.dimension}
                      {row.ruleRef && <span className="block font-mono text-2xs text-fg-subtle">{row.ruleRef}</span>}
                    </td>
                    <td className="py-2 pr-3 text-fg-muted">{text(row.documentsValue)}</td>
                    <td className="py-2 pr-3 text-fg-muted">{text(row.systemRecordValue)}</td>
                    <td className="py-2 pr-3 text-fg-muted">{text(row.financialProfileValue)}</td>
                    <td className={`py-2 text-right font-medium ${mismatch ? 'text-danger' : 'text-success'}`}>{mismatch ? 'Mismatch' : 'Match'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mod.findings?.length > 0 && (
        <div>
          <SectionTitle>Findings</SectionTitle>
          {mod.findings.map((f) => (
            <FindingCard key={f.id} finding={f} onSelectCitation={onSelectCitation} onResolve={onResolve} busy={busy} />
          ))}
        </div>
      )}

      <p className="text-2xs text-fg-subtle">
        {text(mod.engineUsed)} · {text(mod.executedAt)}
      </p>
    </div>
  );
}

export default function SpecialistsPanel({ catalog, results, expanded, onToggle, onRun, runningId, disabled, onSelectCitation, onResolve, busy }) {
  if (!catalog.length) return <EmptyState title="No specialist checks available" />;
  return (
    <div className="divide-y divide-line">
      {catalog.map((agent) => {
        const mod = results[agent.agentId];
        const open = Boolean(expanded[agent.agentId]) && mod;
        const running = runningId === agent.agentId;
        return (
          <section key={agent.agentId} className="py-1">
            <div className="flex items-center gap-3 py-2.5">
              <button
                type="button"
                onClick={() => (mod ? onToggle(agent.agentId) : onRun(agent.agentId))}
                disabled={!mod && (disabled || running)}
                aria-expanded={mod ? open : undefined}
                className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:cursor-not-allowed"
              >
                {mod && <ChevronDown className={`w-4 h-4 shrink-0 text-fg-subtle transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />}
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{agent.name}</span>
                  {!mod && <span className="block text-xs text-fg-subtle line-clamp-1">{agent.description}</span>}
                </span>
              </button>
              {mod && <Badge tone={moduleTone(mod)}>{text(mod.badgeText)}</Badge>}
              <Button
                size="sm"
                variant={mod ? 'ghost' : 'secondary'}
                icon={mod ? RefreshCw : Play}
                loading={running}
                disabled={disabled}
                onClick={() => onRun(agent.agentId)}
                aria-label={mod ? `Run ${agent.name} again` : `Run ${agent.name}`}
              >
                {mod ? '' : 'Run'}
              </Button>
            </div>
            {open && <ModuleBody mod={mod} onSelectCitation={onSelectCitation} onResolve={onResolve} busy={busy} />}
          </section>
        );
      })}
    </div>
  );
}

export function Client360Panel({ summary }) {
  if (!summary) return <EmptyState title="No client summary yet" description="Run the AI review to build the client summary." />;
  const p = summary.clientProfile360 || {};
  const f = summary.financialBalanceSheet || {};
  const cur = f.currency || 'EUR';
  return (
    <div className="space-y-7">
      {summary.executiveNarrative && <p className="text-[13px] text-fg-muted leading-relaxed">{summary.executiveNarrative}</p>}
      <div>
        <SectionTitle>Profile</SectionTitle>
        <DataList
          items={[
            { label: 'Name', value: text(p.fullName) },
            { label: 'Born', value: text(p.birthDate) },
            { label: 'Household', value: `${text(p.maritalStatus)} · ${text(p.dependentsCount, '0')} dependants` },
            { label: 'Housing', value: text(p.housingStatus) },
            { label: 'Employer', value: text(p.employer) },
            { label: 'Contract', value: `${text(p.contractType)} · ${text(p.seniorityCurrent)}` },
            { label: 'Credit score', value: <span className="tabular">{text(p.ficoScore)} / 850</span> },
            { label: 'Bureau', value: text(p.creditBureauStatus) },
            { label: 'PEP / AML', value: `${text(p.pepStatus)} · ${text(p.amlStatus)}` },
          ]}
        />
      </div>
      <div>
        <SectionTitle>Monthly cash flow</SectionTitle>
        <DataList
          items={[
            { label: 'Eligible income', value: <span className="tabular">{money(f.eligibleMonthlyIncome, cur)}</span> },
            { label: 'Other income', value: <span className="tabular">{money(f.supplementalIncome, cur)}</span> },
            { label: 'Living expenses', value: <span className="tabular">{money(f.regularLivingExpenses, cur)}</span> },
            { label: 'Unverified expenses (excluded)', value: <span className="tabular">{money(f.suspectedExpensesIsolated, cur)}</span> },
            { label: 'Existing debt service', value: <span className="tabular">{money(f.existingMonthlyDebts, cur)}</span> },
            { label: 'New installment', value: <span className="tabular">{money(f.proposedNewInstallment, cur, { decimals: 2 })}</span> },
            { label: 'Left after all costs', value: <span className={`tabular font-medium ${Number(f.netDisposableCashflow) < 0 ? 'text-danger' : ''}`}>{money(f.netDisposableCashflow, cur)}</span> },
            { label: 'Account balance', value: <span className="tabular">{money(f.closingBankBalance, cur)}</span> },
          ]}
        />
      </div>
      <p className="text-2xs text-fg-subtle">
        {text(summary.engineUsed)} · {text(summary.generatedAt)}
      </p>
    </div>
  );
}
