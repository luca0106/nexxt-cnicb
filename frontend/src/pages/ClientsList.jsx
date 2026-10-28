import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, X, ArrowRight } from 'lucide-react';
import { fetchClients, createClient } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { money, number, text } from '../lib/format';
import { Avatar, Button, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, SkeletonRows, useToast } from '../components/ui';

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function ClientsList() {
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [creating, setCreating] = useState(false);
  const { data: clients, loading, error, reload } = useAsync(() => fetchClients(query), [query]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients"
        description={clients ? `${number(clients.length)} ${query ? 'matching' : 'registered'}` : 'Client directory'}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New client
          </Button>
        }
      />

      <div className="relative sm:w-80 mb-4">
        <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, national ID or email"
          aria-label="Search clients"
          className="w-full h-9 pl-9 pr-8 rounded-md bg-surface border border-line text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded text-fg-subtle hover:text-fg">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && !clients ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !clients ? (
        <SkeletonRows rows={8} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? 'No clients match this search' : 'No clients yet'}
          description={query ? 'Check the spelling or search by national ID.' : 'Register a client to open their first case.'}
          action={
            query ? (
              <Button onClick={() => setSearch('')}>Clear search</Button>
            ) : (
              <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                New client
              </Button>
            )
          }
        />
      ) : (
        <div className={`overflow-x-auto -mx-4 sm:mx-0 ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle border-b border-line">
                <th scope="col" className="font-medium py-2.5 pl-4 sm:pl-0 pr-4">Client</th>
                <th scope="col" className="font-medium py-2.5 pr-4">Contact</th>
                <th scope="col" className="font-medium py-2.5 pr-4 hidden lg:table-cell">Employer</th>
                <th scope="col" className="font-medium py-2.5 pr-4 text-right">Net income</th>
                <th scope="col" className="py-2.5 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="py-3 pl-4 sm:pl-0 pr-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{text(c.full_name)}</p>
                        <p className="text-xs text-fg-subtle font-mono">{text(c.national_id)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 max-w-[240px]">
                    <p className="truncate text-fg-muted" title={c.email || undefined}>{text(c.email)}</p>
                    <p className="text-xs text-fg-subtle">{text(c.phone)}</p>
                  </td>
                  <td className="py-3 pr-4 text-fg-muted hidden lg:table-cell max-w-[220px] truncate">{text(c.employer)}</td>
                  <td className="py-3 pr-4 text-right tabular">{money(c.monthly_income)}</td>
                  <td className="py-3 pr-4 sm:pr-0 text-right">
                    <Link to={`/clients/${c.id}/finances`} className="inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg whitespace-nowrap">
                      Finances <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewClientDialog open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </div>
  );
}

const EMPTY = { full_name: '', national_id: '', email: '', phone: '', employer: '', address: '', monthly_income: '' };

function NewClientDialog({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.full_name.trim()) next.full_name = 'Enter the client’s full legal name.';
    if (!/^\d{13}$/.test(form.national_id.trim())) next.national_id = 'The national ID has 13 digits.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.phone && !/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    if (form.monthly_income !== '' && !(Number(form.monthly_income) >= 0)) next.monthly_income = 'Enter 0 or more.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await createClient({
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        employer: form.employer.trim(),
        address: form.address.trim(),
        monthly_income: Number(form.monthly_income) || 0,
      });
      toast({ tone: 'success', title: `${form.full_name.trim()} registered`, description: 'You can now open a case for this client.' });
      onClose();
      onCreated();
    } catch (err) {
      setErrors({ national_id: 'The client could not be saved. This national ID may already be registered.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New client"
      description="Only the name and national ID are required."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-client-form" loading={saving}>
            Register client
          </Button>
        </>
      }
    >
      <form id="new-client-form" onSubmit={submit} noValidate className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Full name" required error={errors.full_name} className="sm:col-span-2">
          <Input value={form.full_name} onChange={set('full_name')} autoComplete="off" autoFocus />
        </Field>
        <Field label="National ID" required error={errors.national_id}>
          <Input value={form.national_id} onChange={set('national_id')} inputMode="numeric" maxLength={13} className="font-mono" />
        </Field>
        <Field label="Net monthly income (EUR)" error={errors.monthly_income}>
          <Input type="number" inputMode="decimal" min="0" value={form.monthly_income} onChange={set('monthly_income')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="off" />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="off" />
        </Field>
        <Field label="Employer" className="sm:col-span-2">
          <Input value={form.employer} onChange={set('employer')} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={form.address} onChange={set('address')} />
        </Field>
      </form>
    </Dialog>
  );
}
