import React, { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { Badge, Button, DataList, EmptyState } from '../ui';
import { money, number, percent, text, humanize } from '../../lib/format';

export function SectionTitle({ children, aside }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">{children}</h3>
      {aside}
    </div>
  );
}

export function DtiMeter({ value, limit = 40 }) {
  const over = Number(value) > limit;
  return (
    <div>
      <div
        className="relative h-2 rounded-full bg-raised"
        role="meter"
        aria-label="Debt-to-income ratio"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(value) || 0}
      >
        <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min(Number(value) || 0, 100)}%` }} />
        <span className="absolute -top-1 h-4 w-px bg-fg-muted" style={{ left: `${limit}%` }} aria-hidden />
      </div>
      <div className="relative mt-1 h-4 text-2xs text-fg-subtle">
        <span className="absolute -translate-x-1/2" style={{ left: `${limit}%` }}>
          {limit}% limit
        </span>
      </div>
    </div>
  );
}

export function AffordabilityPanel({ math }) {
  if (!math || math.dti_percentage === undefined) {
    return <EmptyState title="No affordability calculation yet" description="Run the AI review to calculate the installment and DTI." />;
  }
  const over = !math.is_feasible;
  const alt = math.alternative_income_scenario;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] text-fg-muted">Debt-to-income</p>
        <p className={`text-3xl font-semibold tabular ${over ? 'text-danger' : 'text-fg'}`}>{percent(math.dti_percentage)}</p>
        <p className={`text-[13px] ${over ? 'text-danger' : 'text-success'}`}>
          {over ? `Above the ${math.max_dti_limit_percent}% limit` : `Within the ${math.max_dti_limit_percent}% limit`}
        </p>
        <div className="mt-3">
          <DtiMeter value={math.dti_percentage} limit={math.max_dti_limit_percent || 40} />
        </div>
      </div>

      <DataList
        items={[
          { label: 'Loan', value: <span className="tabular">{money(math.requested_amount)} · {math.loan_term_months} months · {percent(math.annual_interest_rate_percent, 2)}</span> },
          { label: 'New monthly installment', value: <span className="tabular">{money(math.calculated_monthly_installment, 'EUR', { decimals: 2 })}</span> },
          { label: 'Existing monthly debt', value: <span className="tabular">{money(math.existing_monthly_debts, 'EUR', { decimals: 2 })}</span> },
          { label: 'Total monthly obligations', value: <span className="tabular font-medium">{money(math.total_monthly_obligation, 'EUR', { decimals: 2 })}</span> },
          { label: 'Income used', value: <span className="tabular">{money(math.monthly_income_used)}</span> },
          { label: 'Maximum installment allowed', value: <span className="tabular">{money(math.max_allowed_installment, 'EUR', { decimals: 2 })}</span> },
        ]}
      />

      {alt && (
        <div>
          <SectionTitle>If the higher documented income is used</SectionTitle>
          <DataList
            items={[
              { label: 'Declared income', value: <span className="tabular">{money(alt.declared_income)} → {percent(alt.declared_dti_percent)}</span> },
              { label: 'Verified income', value: <span className="tabular">{money(alt.verified_income)} → {percent(alt.verified_dti_percent)}</span> },
              { label: 'Difference', value: <span className="tabular">{money(alt.difference)}</span> },
            ]}
          />
        </div>
      )}

      <p className="text-xs text-fg-subtle">
        Calculated in code with the standard annuity formula, not by the language model.
        <span className="block mt-1 font-mono break-words">{text(math.formula_used)}</span>
      </p>
    </div>
  );
}

export function MessagePanel({ remediation: r, onSend, busy }) {
  if (!r || !r.required) {
    return <EmptyState icon={Mail} title="No message needed" description="Nothing has to be requested from the client for this case." />;
  }
  const sent = r.status === 'sent_by_officer' || r.status === 'sent_automatically';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={sent ? 'success' : 'warning'} dot>
          {sent ? `Sent ${text(r.sentAt, '')}` : 'Draft — waiting for your approval'}
        </Badge>
      </div>
      <p className="text-[13px] text-fg-muted">{stripReason(r.triggerReason)}</p>

      <div>
        <SectionTitle aside={<span className="text-xs text-fg-subtle">{text(r.recipientEmail)}</span>}>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" aria-hidden /> Email
          </span>
        </SectionTitle>
        <div className="rounded-md border border-line bg-canvas/60">
          <p className="px-3.5 py-2.5 text-sm font-medium border-b border-line">{text(r.emailSubject)}</p>
          <p className="px-3.5 py-3 text-[13px] text-fg-muted whitespace-pre-wrap leading-relaxed">{text(r.emailBody)}</p>
        </div>
      </div>

      <div>
        <SectionTitle aside={<span className="text-xs text-fg-subtle">{text(r.recipientPhone)}</span>}>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" aria-hidden /> SMS
          </span>
        </SectionTitle>
        <p className="rounded-md border border-line bg-canvas/60 px-3.5 py-3 text-[13px] text-fg-muted">{text(r.smsPreview)}</p>
      </div>

      {!sent && (
        <Button variant="primary" icon={Send} loading={busy} onClick={onSend}>
          Send email and SMS to client
        </Button>
      )}
    </div>
  );
}

const stripReason = (s) => text(s).replace(/^Review agent:\s*/i, 'Reason: ');

export function AuditPanel({ analysis }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const pii = analysis?.piiMasking;
  const trace = analysis?.executionTrace || [];
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle
          aside={
            pii?.tokens?.length > 0 && (
              <button type="button" onClick={() => setShowOriginal((v) => !v)} className="text-xs text-fg-muted hover:text-fg underline underline-offset-2">
                {showOriginal ? 'Show tokens sent to the model' : 'Show original values'}
              </button>
            )
          }
        >
          Personal data protection
        </SectionTitle>
        <p className="text-[13px] text-fg-muted mb-3">{text(pii?.explanation, 'No personal data was sent to a language model for this analysis.')}</p>
        {pii?.tokens?.length > 0 && (
          <table className="w-full text-[13px]">
            <tbody>
              {pii.tokens.map((t, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 text-fg-muted">{t.category}</td>
                  <td className="py-2 text-right font-mono break-all">{showOriginal ? t.original_preview : t.masked_token}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <SectionTitle aside={<span className="text-xs text-fg-subtle tabular">{trace.length} steps</span>}>Execution trace</SectionTitle>
        <ol className="space-y-0">
          {trace.map((s, i) => (
            <li key={i} className="py-2.5 border-b border-line last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px]">
                  <span className="text-fg-subtle tabular mr-2">{s.step}.</span>
                  <span className="font-medium">{text(s.agent)}</span>
                  <span className="ml-2 font-mono text-xs text-fg-muted">{text(s.tool)}</span>
                </p>
                <span className={`shrink-0 text-xs tabular ${s.status === 'completed' ? 'text-fg-subtle' : 'text-danger'}`}>
                  {s.status === 'completed' ? `${number(s.durationMs)} ms` : humanize(s.status)}
                </span>
              </div>
              {s.reason && <p className="mt-0.5 pl-5 text-xs text-fg-muted">Why: {s.reason}</p>}
              <p className="mt-0.5 pl-5 text-xs text-fg-subtle">{text(s.outputSummary)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
