import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { DataList } from '../ui';
import { money, percent, text, date } from '../../lib/format';

// Standard annuity formula, same as the backend's deterministic engine
export function monthlyInstallment(principal, annualRate, months) {
  if (!principal || !months || months <= 0) return null;
  const r = (annualRate || 0) / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return Math.round(((principal * r * f) / (f - 1)) * 100) / 100;
}

const DTI_LIMIT = 40;

function isExpired(value) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d < new Date();
}

export default function CaseSummary({ caseData, stacked }) {
  const c = caseData;
  const client = c.client || {};
  const cur = c.currency || 'EUR';
  const installment = monthlyInstallment(c.requested_amount, c.interest_rate_annual, c.loan_term_months);
  const debts = Number(client.existing_monthly_debts || 0);
  const income = Number(client.monthly_income || 0);
  const dti = installment !== null && income > 0 ? ((installment + debts) / income) * 100 : null;
  const overLimit = dti !== null && dti > DTI_LIMIT;
  const idExpired = isExpired(client.id_card_expiry);

  const columns = [
    {
      title: 'Applicant',
      items: [
        { label: 'Name', value: text(client.full_name) },
        { label: 'National ID', value: text(client.national_id), mono: true },
        {
          label: 'ID card',
          value: (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono">{text(client.id_card_series)}</span>
              {idExpired ? (
                <span className="inline-flex items-center gap-1 text-danger text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Expired
                </span>
              ) : (
                client.id_card_expiry && <span className="text-fg-subtle text-xs">until {date(client.id_card_expiry)}</span>
              )}
            </span>
          ),
        },
        { label: 'Address', value: text(client.address) },
        { label: 'AML / PEP', value: text(client.aml_status) },
      ],
    },
    {
      title: 'Employment and income',
      items: [
        { label: 'Employer', value: text(client.employer) },
        { label: 'Contract', value: text(client.employment_contract_type) },
        { label: 'Time with employer', value: text(client.seniority_current_employer) },
        { label: 'Declared net income', value: <span className="tabular">{money(client.monthly_income, cur)}</span> },
        { label: 'Existing monthly debt', value: <span className="tabular">{money(client.existing_monthly_debts, cur)}</span> },
      ],
    },
    {
      title: 'Loan and affordability',
      items: [
        { label: 'Requested', value: <span className="tabular font-medium">{money(c.requested_amount, cur)}</span> },
        { label: 'Term', value: c.loan_term_months ? `${c.loan_term_months} months` : text(null) },
        {
          label: 'Interest',
          value: c.interest_rate_annual ? `${percent(c.interest_rate_annual, 2)} ${text(c.interest_type, '').toLowerCase()}` : text(null),
        },
        { label: 'Monthly installment', value: <span className="tabular">{money(installment, cur, { decimals: 2 })}</span> },
        { label: 'Total monthly debt', value: <span className="tabular">{money(installment !== null ? installment + debts : null, cur, { decimals: 2 })}</span> },
      ],
      footer: (
        <div className="pt-3">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-fg-muted">Debt-to-income</span>
            <span className={`tabular font-semibold ${dti === null ? 'text-fg-muted' : overLimit ? 'text-danger' : 'text-success'}`}>
              {percent(dti)} <span className="font-normal text-fg-subtle">of {DTI_LIMIT}% limit</span>
            </span>
          </div>
          <div
            className="relative mt-2 h-1.5 rounded-full bg-raised"
            role="meter"
            aria-label="Debt-to-income ratio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={dti === null ? undefined : Math.round(dti)}
          >
            <div
              className={`h-full rounded-full ${overLimit ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${Math.min(dti || 0, 100)}%` }}
            />
            <span className="absolute top-[-3px] h-3 w-px bg-fg-muted" style={{ left: `${DTI_LIMIT}%` }} aria-hidden />
          </div>
          <p className="mt-1.5 text-2xs text-fg-subtle">Estimate from the case terms. The AI review recalculates it from the documents.</p>
        </div>
      ),
    },
  ];

  return (
    <div className={`grid rounded-lg border border-line bg-surface ${stacked ? '' : 'lg:grid-cols-3 lg:divide-x divide-line'}`}>
      {columns.map((col, i) => (
        <div key={col.title} className={`p-4 sm:p-5 ${i > 0 ? (stacked ? 'border-t border-line' : 'border-t border-line lg:border-t-0') : ''}`}>
          <h3 className="text-[13px] font-semibold text-fg-muted uppercase tracking-wide mb-1">{col.title}</h3>
          <DataList items={col.items} />
          {col.footer}
        </div>
      ))}
    </div>
  );
}
