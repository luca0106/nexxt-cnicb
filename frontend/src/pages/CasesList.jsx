import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Folder, Plus, Search, X } from 'lucide-react';
import { fetchCases, createCase, fetchClients } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { number } from '../lib/format';
import {
  Button, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, Select, SkeletonRows, Tabs, Textarea, useToast,
} from '../components/ui';
import CaseTable from '../components/CaseTable';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'In review', value: 'in_review' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

const PRODUCTS = [
  'Personal Consumer Loan',
  'Residential Mortgage Loan',
  'Credit Card',
  'Current Account',
  'KYC Profile Update',
];

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CasesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || 'all';
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [creating, setCreating] = useState(false);

  const { data: cases, loading, error, reload } = useAsync(() => fetchCases({ status, search: query }), [status, query]);
  const filtered = status !== 'all' || query;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cases"
        description={cases ? `${number(cases.length)} ${filtered ? 'matching' : 'in the pipeline'}` : 'Loan and account applications'}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New case
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
        <Tabs
          className="flex-1"
          tabs={FILTERS}
          value={status}
          onChange={(v) => setSearchParams(v === 'all' ? {} : { status: v })}
        />
        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Case number, client or ID"
            aria-label="Search cases"
            className="w-full h-9 pl-9 pr-8 rounded-md bg-surface border border-line text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded text-fg-subtle hover:text-fg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && !cases ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !cases ? (
        <SkeletonRows rows={8} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={filtered ? 'No cases match these filters' : 'No cases yet'}
          description={filtered ? 'Try another status or search term.' : 'Register the first application to start the review.'}
          action={
            filtered ? (
              <Button
                onClick={() => {
                  setSearch('');
                  setSearchParams({});
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                New case
              </Button>
            )
          }
        />
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <CaseTable cases={cases} />
        </div>
      )}

      <NewCaseDialog open={creating} onClose={() => setCreating(false)} onCreated={(c) => navigate(`/cases/${c.id}`)} />
    </div>
  );
}

function NewCaseDialog({ open, onClose, onCreated }) {
  const toast = useToast();
  const [clients, setClients] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ title: '', case_type: PRODUCTS[0], client_id: '', requested_amount: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({ title: '', case_type: PRODUCTS[0], client_id: '', requested_amount: '', notes: '' });
    setLoadError(null);
    fetchClients().then(setClients).catch(setLoadError);
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Give the case a short title.';
    if (!form.client_id) next.client_id = 'Choose the applicant.';
    const amount = Number(form.requested_amount);
    if (form.requested_amount === '' || !(amount > 0)) next.requested_amount = 'Enter an amount greater than 0.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const created = await createCase({
        title: form.title.trim(),
        case_type: form.case_type,
        client_id: Number(form.client_id),
        requested_amount: amount,
        notes: form.notes.trim(),
        status: 'in_progress',
      });
      toast({ tone: 'success', title: `Case #${created.case_number} created`, description: 'Attach the documents to start the review.' });
      onClose();
      onCreated(created);
    } catch (err) {
      setErrors({ title: 'The case could not be created. Check the connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New case"
      description="Register an application for an existing client."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-case-form" loading={saving}>
            Create case
          </Button>
        </>
      }
    >
      <form id="new-case-form" onSubmit={submit} noValidate className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Title" required error={errors.title} className="sm:col-span-2">
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Personal loan for home renovation" autoFocus />
        </Field>
        <Field label="Applicant" required error={errors.client_id || (loadError && 'Clients could not be loaded.')} className="sm:col-span-2">
          <Select value={form.client_id} onChange={set('client_id')} disabled={!clients}>
            <option value="">{clients ? 'Choose a client' : 'Loading clients…'}</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Product" required>
          <Select value={form.case_type} onChange={set('case_type')}>
            {PRODUCTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Requested amount (EUR)" required error={errors.requested_amount}>
          <Input type="number" inputMode="decimal" min="1" step="100" value={form.requested_amount} onChange={set('requested_amount')} placeholder="35000" />
        </Field>
        <Field label="Notes" className="sm:col-span-2" hint="Optional. Visible to everyone working on the case.">
          <Textarea value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Dialog>
  );
}
