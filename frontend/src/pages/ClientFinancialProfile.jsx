import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { fetchClientById, fetchFinancialProfile, saveFinancialProfile } from '../api/client';
import { Badge, Button, ConfirmDialog, ErrorState, Field, IconButton, Input, Select, Skeleton, useToast } from '../components/ui';
import { humanize, number } from '../lib/format';

const CATEGORIES = ['housing', 'utilities', 'food', 'transport', 'healthcare', 'education', 'childcare', 'insurance', 'entertainment', 'betting', 'sports_betting', 'gambling', 'other'];
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function Options({ values }) {
  return values.map((v) => (
    <option key={v} value={v}>
      {humanize(v)}
    </option>
  ));
}

const moneyProps = { type: 'number', inputMode: 'decimal', min: '0', max: '999999999999.99', step: '0.01', required: true };

export default function ClientFinancialProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef(null);
  const [client, setClient] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setDirty(false);
    Promise.all([fetchClientById(id, controller.signal), fetchFinancialProfile(id, controller.signal)])
      .then(([person, data]) => {
        setClient(person);
        setProfile(
          data || {
            monthly_salary: String(person.monthly_income || 0),
            other_monthly_income: '0',
            currency: 'EUR',
            marital_status: 'unknown',
            number_of_children: 0,
            as_of_date: localDate(),
            expenses: [],
            credits: [],
          }
        );
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };
  const changeRow = (list, index, key, value) => change(list, profile[list].map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const removeRow = (list, index) => change(list, profile[list].filter((_, i) => i !== index));

  const save = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setSaveError('');
    const form = formRef.current;
    if (!form.checkValidity()) {
      setSaveError('Some fields need attention. They are marked in red.');
      form.querySelector(':invalid')?.focus();
      return;
    }
    setSaving(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { client_id, is_demo, updated_at, ...data } = profile;
      const result = await saveFinancialProfile(id, {
        ...data,
        number_of_children: Number(data.number_of_children),
        credits: data.credits.map((credit) => ({
          ...credit,
          remaining_term_months: credit.remaining_term_months === '' || credit.remaining_term_months == null ? null : Number(credit.remaining_term_months),
          interest_rate_annual: credit.interest_rate_annual === '' ? null : credit.interest_rate_annual,
        })),
      });
      setProfile(result);
      setDirty(false);
      setSubmitted(false);
      toast({ tone: 'success', title: 'Financial profile saved', description: 'The next AI review will use these figures.' });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div role="status" aria-label="Loading financial profile">
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-24 w-full mt-8" />
        <Skeleton className="h-64 w-full mt-6" />
      </div>
    );
  }
  if (loadError || !profile || !client) {
    return (
      <>
        <BackLink />
        <ErrorState error={loadError} onRetry={() => setAttempt((v) => v + 1)} title="The financial profile could not be loaded" />
      </>
    );
  }

  const cur = profile.currency || 'EUR';
  const fmt = (v) => `${number(v, 2)} ${cur}`;
  const total = (rows) => rows.reduce((sum, row) => sum + (Number(row.monthly_amount) || 0), 0);
  const expenses = total(profile.expenses.filter((r) => ['declared', 'confirmed'].includes(r.verification_status)));
  const suspected = total(profile.expenses.filter((r) => r.verification_status === 'suspected'));
  const activeCredits = profile.credits.filter((r) => r.status !== 'paid_off');
  const repayments = activeCredits.reduce((s, r) => s + (Number(r.monthly_payment) || 0), 0);
  const balance = activeCredits.reduce((s, r) => s + (Number(r.remaining_balance) || 0), 0);
  const income = (Number(profile.monthly_salary) || 0) + (Number(profile.other_monthly_income) || 0);

  const figures = [
    { label: 'Monthly income', value: income, note: 'Salary and other income' },
    { label: 'Monthly outgoings', value: expenses + repayments, note: 'Confirmed expenses and loan payments' },
    { label: 'Remaining credit', value: balance, note: `${activeCredits.length} active or overdue loan(s)` },
    { label: 'Unverified expenses', value: suspected, note: 'Excluded from outgoings', tone: suspected > 0 ? 'text-warning' : '' },
  ];

  return (
    <div className="max-w-5xl animate-fade-in">
      <BackLink
        onClick={(e) => {
          if (dirty) {
            e.preventDefault();
            setLeaving(true);
          }
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl">{client.full_name}</h1>
          <p className="mt-1 text-sm text-fg-muted">Income, household expenses and credit commitments.</p>
        </div>
        {profile.is_demo && <Badge>Demo data</Badge>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg overflow-hidden border border-line bg-line mb-10">
        {figures.map((f) => (
          <div key={f.label} className="bg-surface p-4">
            <p className="text-[13px] text-fg-muted">{f.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular ${f.tone || ''}`}>{fmt(f.value)}</p>
            <p className="mt-1 text-xs text-fg-subtle">{f.note}</p>
          </div>
        ))}
      </div>

      <form ref={formRef} onSubmit={save} noValidate data-submitted={submitted || undefined} className="space-y-10 [&[data-submitted]_:invalid]:border-danger">
        <fieldset disabled={saving} className="space-y-10 min-w-0">
          <section>
            <h2 className="text-[15px] mb-4">Income and household</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5">
              <Field label={`Net monthly salary (${cur})`} required>
                <Input {...moneyProps} value={profile.monthly_salary ?? ''} onChange={(e) => change('monthly_salary', e.target.value)} />
              </Field>
              <Field label={`Other monthly income (${cur})`} required>
                <Input {...moneyProps} value={profile.other_monthly_income ?? ''} onChange={(e) => change('other_monthly_income', e.target.value)} />
              </Field>
              <Field label="Currency" required hint="Relabels amounts; does not convert them.">
                <Input value={profile.currency} required pattern="[A-Z]{3}" maxLength={3} onChange={(e) => change('currency', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Marital status">
                <Select value={profile.marital_status} onChange={(e) => change('marital_status', e.target.value)}>
                  <Options values={['unknown', 'single', 'married', 'divorced', 'widowed', 'separated']} />
                </Select>
              </Field>
              <Field label="Children" required>
                <Input type="number" inputMode="numeric" required min="0" step="1" value={profile.number_of_children} onChange={(e) => change('number_of_children', e.target.value)} />
              </Field>
              <Field label="Information as of" required>
                <Input type="date" required value={profile.as_of_date} onChange={(e) => change('as_of_date', e.target.value)} />
              </Field>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-[15px]">Monthly expenses</h2>
              <Button
                size="sm"
                icon={Plus}
                onClick={() => change('expenses', [...profile.expenses, { category: 'other', monthly_amount: '0', verification_status: 'declared', evidence_note: '' }])}
              >
                Add expense
              </Button>
            </div>
            <p className="text-[13px] text-fg-muted mb-4">Monthly totals by category. Keep loan repayments in the loans section so they are not counted twice.</p>
            {!profile.expenses.length && <p className="py-8 text-center text-[13px] text-fg-subtle border border-dashed border-line rounded-lg">No expenses recorded yet.</p>}
            <div className="divide-y divide-line border-y border-line empty:border-0">
              {profile.expenses.map((row, i) => (
                <div key={i} className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium">
                      Expense {i + 1}
                      {row.verification_status === 'suspected' && <span className="ml-2 font-normal text-warning">Unverified — check before relying on it</span>}
                    </p>
                    <IconButton icon={Trash2} size="sm" label={`Remove expense ${i + 1}`} onClick={() => removeRow('expenses', i)} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-x-4">
                    <Field label="Category">
                      <Select value={row.category} onChange={(e) => changeRow('expenses', i, 'category', e.target.value)}>
                        <Options values={CATEGORIES} />
                      </Select>
                    </Field>
                    <Field label={`Monthly amount (${cur})`} required>
                      <Input {...moneyProps} value={row.monthly_amount ?? ''} onChange={(e) => changeRow('expenses', i, 'monthly_amount', e.target.value)} />
                    </Field>
                    <Field label="Verification">
                      <Select value={row.verification_status} onChange={(e) => changeRow('expenses', i, 'verification_status', e.target.value)}>
                        <Options values={['declared', 'suspected', 'confirmed', 'dismissed']} />
                      </Select>
                    </Field>
                    <Field label="Evidence or reviewer note" className="sm:col-span-3">
                      <Input maxLength={2000} value={row.evidence_note ?? ''} placeholder="Source, merchant or reason for checking" onChange={(e) => changeRow('expenses', i, 'evidence_note', e.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px]">Loans and credit</h2>
              <Button
                size="sm"
                icon={Plus}
                onClick={() =>
                  change('credits', [
                    ...profile.credits,
                    { lender: '', credit_type: 'personal_loan', original_amount: '0', remaining_balance: '0', monthly_payment: '0', interest_rate_annual: '', remaining_term_months: '', status: 'active' },
                  ])
                }
              >
                Add loan
              </Button>
            </div>
            {!profile.credits.length && <p className="py-8 text-center text-[13px] text-fg-subtle border border-dashed border-line rounded-lg">No loans recorded.</p>}
            <div className="divide-y divide-line border-y border-line empty:border-0">
              {profile.credits.map((row, i) => (
                <div key={i} className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium">Loan {i + 1}</p>
                    <IconButton icon={Trash2} size="sm" label={`Remove loan ${i + 1}`} onClick={() => removeRow('credits', i)} />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
                    <Field label="Lender" required>
                      <Input required maxLength={150} value={row.lender ?? ''} onChange={(e) => changeRow('credits', i, 'lender', e.target.value)} />
                    </Field>
                    <Field label="Type">
                      <Select value={row.credit_type} onChange={(e) => changeRow('credits', i, 'credit_type', e.target.value)}>
                        <Options values={['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'overdraft', 'other']} />
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select value={row.status} onChange={(e) => changeRow('credits', i, 'status', e.target.value)}>
                        <Options values={['active', 'paid_off', 'overdue']} />
                      </Select>
                    </Field>
                    {[
                      ['original_amount', 'Original amount'],
                      ['remaining_balance', 'Remaining balance'],
                      ['monthly_payment', 'Monthly payment'],
                    ].map(([key, label]) => (
                      <Field key={key} label={`${label} (${cur})`} required>
                        <Input {...moneyProps} value={row[key] ?? ''} onChange={(e) => changeRow('credits', i, key, e.target.value)} />
                      </Field>
                    ))}
                    <Field label="Annual interest (%)" hint="Optional">
                      <Input type="number" inputMode="decimal" min="0" max="100" step="0.0001" value={row.interest_rate_annual ?? ''} onChange={(e) => changeRow('credits', i, 'interest_rate_annual', e.target.value)} />
                    </Field>
                    <Field label="Remaining months" hint="Optional">
                      <Input type="number" inputMode="numeric" min="0" step="1" value={row.remaining_term_months ?? ''} onChange={(e) => changeRow('credits', i, 'remaining_term_months', e.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </fieldset>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line-strong bg-raised px-4 py-3 shadow-overlay">
          <p className={`text-[13px] ${saveError ? 'text-danger' : 'text-fg-muted'}`} role={saveError ? 'alert' : undefined} aria-live="polite">
            {saveError || (dirty ? 'You have unsaved changes.' : 'All changes saved.')}
          </p>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
            Save financial profile
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={leaving}
        title="Leave without saving?"
        description="Your changes to this financial profile will be lost."
        confirmLabel="Leave without saving"
        cancelLabel="Keep editing"
        tone="danger"
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setDirty(false);
          setLeaving(false);
          navigate('/clients');
        }}
      />
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <Link to="/clients" onClick={onClick} className="inline-flex items-center gap-1.5 mb-4 text-[13px] text-fg-muted hover:text-fg">
      <ArrowLeft className="w-4 h-4" aria-hidden /> Clients
    </Link>
  );
}
