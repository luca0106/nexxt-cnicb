import React, { useEffect, useMemo, useState } from 'react';
import { Field, Input, Textarea, Button, useToast } from '../ui';
import { updateCaseManualForm } from '../../api/client';

const fromCase = (c) => ({
  full_name: c.client?.full_name || '',
  national_id: c.client?.national_id || '',
  address: c.client?.address || '',
  employer: c.client?.employer || '',
  monthly_income: String(c.client?.monthly_income ?? ''),
  existing_monthly_debts: String(c.client?.existing_monthly_debts ?? '0'),
  requested_amount: String(c.requested_amount ?? ''),
  loan_term_months: String(c.loan_term_months ?? '60'),
  notes: c.notes || '',
});

function validate(f) {
  const e = {};
  if (!f.full_name.trim()) e.full_name = 'Enter the applicant’s legal name.';
  if (!/^\d{13}$/.test(f.national_id.trim())) e.national_id = 'The national ID has 13 digits.';
  const nonNegative = (k, msg) => {
    if (f[k] === '' || Number.isNaN(Number(f[k])) || Number(f[k]) < 0) e[k] = msg;
  };
  nonNegative('monthly_income', 'Enter the verified net income (0 or more).');
  nonNegative('existing_monthly_debts', 'Enter 0 if the client has no other debts.');
  if (!(Number(f.requested_amount) > 0)) e.requested_amount = 'Enter an amount greater than 0.';
  const term = Number(f.loan_term_months);
  if (!Number.isInteger(term) || term < 1 || term > 480) e.loan_term_months = 'Between 1 and 480 months.';
  return e;
}

export default function WorksheetTab({ caseData, onSaved }) {
  const toast = useToast();
  const initial = useMemo(() => fromCase(caseData), [caseData]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const cur = caseData.currency || 'EUR';

  useEffect(() => setForm(initial), [initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await updateCaseManualForm(caseData.id, {
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        address: form.address.trim(),
        employer: form.employer.trim(),
        monthly_income: Number(form.monthly_income),
        existing_monthly_debts: Number(form.existing_monthly_debts),
        requested_amount: Number(form.requested_amount),
        loan_term_months: Number(form.loan_term_months),
        notes: form.notes,
      });
      toast({ tone: 'success', title: 'Worksheet saved', description: 'Affordability figures above are updated.' });
      onSaved(updated);
    } catch (err) {
      setErrors({ full_name: 'Could not save. Check the connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl">
      <p className="text-sm text-fg-muted mb-5">
        Enter the figures you verified against the documents and core banking records. They replace the declared values on this case.
      </p>
      <div className="grid sm:grid-cols-2 gap-x-5">
        <Field label="Applicant legal name" required error={errors.full_name}>
          <Input value={form.full_name} onChange={set('full_name')} autoComplete="off" />
        </Field>
        <Field label="National ID" required error={errors.national_id}>
          <Input value={form.national_id} onChange={set('national_id')} inputMode="numeric" className="font-mono" />
        </Field>
        <Field label="Verified address">
          <Input value={form.address} onChange={set('address')} />
        </Field>
        <Field label="Confirmed employer">
          <Input value={form.employer} onChange={set('employer')} />
        </Field>
        <Field label={`Eligible net monthly income (${cur})`} required error={errors.monthly_income}>
          <Input type="number" inputMode="decimal" min="0" value={form.monthly_income} onChange={set('monthly_income')} />
        </Field>
        <Field label={`Existing monthly debt (${cur})`} required error={errors.existing_monthly_debts}>
          <Input type="number" inputMode="decimal" min="0" value={form.existing_monthly_debts} onChange={set('existing_monthly_debts')} />
        </Field>
        <Field label={`Loan amount (${cur})`} required error={errors.requested_amount}>
          <Input type="number" inputMode="decimal" min="1" value={form.requested_amount} onChange={set('requested_amount')} />
        </Field>
        <Field label="Term (months)" required error={errors.loan_term_months}>
          <Input type="number" inputMode="numeric" min="1" max="480" value={form.loan_term_months} onChange={set('loan_term_months')} />
        </Field>
        <Field label="Underwriter notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set('notes')} rows={3} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
          Save worksheet
        </Button>
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setForm(initial);
              setErrors({});
            }}
          >
            Discard changes
          </Button>
        )}
      </div>
    </form>
  );
}
