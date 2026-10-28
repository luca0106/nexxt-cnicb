import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useBlocker } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Wallet, Users, CreditCard, AlertTriangle } from 'lucide-react';
import { fetchClientById, fetchFinancialProfile, saveFinancialProfile } from '../api/client';
import { financialTotals } from '../utils/financialTotals';

const inputClass = 'w-full rounded-xl border border-[#24334d] bg-[#050b17] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50';
const categories = ['housing', 'utilities', 'food', 'transport', 'healthcare', 'education', 'childcare', 'insurance', 'entertainment', 'betting', 'sports_betting', 'gambling', 'other'];
const title = text => text.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
function Field({ label, value, onChange, options, ...props }) {
  return <label className="block min-w-0 text-xs text-slate-400 space-y-2">
    <span>{label}</span>
    {options ? <select aria-label={label} className={inputClass} value={value} onChange={e => onChange(e.target.value)} {...props}>
      {options.map(option => <option key={option} value={option}>{title(option)}</option>)}
    </select> : <input aria-label={label} className={inputClass} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} />}
  </label>;
}
function MoneyField(props) {
  return <Field type="number" min="0" max="999999999999.99" step="0.01" required {...props} />;
}

export default function ClientFinancialProfile() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || saving) && currentLocation.pathname !== nextLocation.pathname);
  const reload = () => {
    if (!dirty || window.confirm('Discard your changes and reload the latest profile?')) setAttempt(value => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSaved(false); setDirty(false); setClient(null); setProfile(null);
    Promise.all([fetchClientById(id, controller.signal), fetchFinancialProfile(id, controller.signal)])
      .then(([person, data]) => {
        if (controller.signal.aborted) return;
        setClient(person);
        setProfile(data || {
          monthly_salary: '0', other_monthly_income: '0',
          currency: '', marital_status: 'unknown', number_of_children: 0,
          as_of_date: localDate(), expenses: [], credits: [], version: 0,
        });
      }).catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);

  useEffect(() => {
    const warn = event => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  const change = (key, value) => {
    setProfile(previous => ({ ...previous, [key]: value }));
    setDirty(true); setSaved(false);
  };
  const changeRow = (list, index, key, value) => change(list, profile[list].map((row, i) => i === index ? { ...row, [key]: value } : row));
  const removeRow = (list, index) => change(list, profile[list].filter((_, i) => i !== index));
  const save = async event => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(''); setSaved(false);
    try {
      const { client_id, is_demo, updated_at, source_kind, version, expected_version, ...data } = profile;
      const result = await saveFinancialProfile(id, {
        ...data, expected_version: version, number_of_children: Number(data.number_of_children),
        credits: data.credits.map(credit => ({ ...credit,
          remaining_term_months: credit.remaining_term_months === '' || credit.remaining_term_months == null ? null : Number(credit.remaining_term_months),
          interest_rate_annual: credit.interest_rate_annual === '' ? null : credit.interest_rate_annual,
        })),
      });
      setProfile(result); setDirty(false); setSaved(true);
    } catch (err) { setError(err.message); }
    finally { savingRef.current = false; setSaving(false); }
  };

  if (loading) return <p className="p-12 text-center text-slate-400" role="status">Loading financial profile…</p>;
  if (!profile || !client) return <div className="p-8 space-y-4"><p role="alert" className="text-red-300">{error}</p><button className={`${buttonClass} bg-slate-800`} onClick={() => setAttempt(value => value + 1)}>Retry</button><Link className="block text-blue-400" to="/clients">Back to clients</Link></div>;

  const { income, expenses, suspected, repayments, balance, loanCount } = financialTotals(profile);
  const money = value => `${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${profile.currency || '—'}`;
  const removeButton = (list, index) => <button type="button" onClick={() => removeRow(list, index)} aria-label={`Remove ${list === 'credits' ? 'loan' : 'expense'} ${index + 1}`} className="p-2 text-slate-400 hover:text-red-400 rounded-lg"><Trash2 size={17} /></button>;

  return <div className="space-y-6 max-w-7xl mx-auto">
    <Link to="/clients" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> All clients</Link>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest text-blue-400 mb-2">Client finances</p><h1 className="text-2xl font-bold text-white">{client.full_name}</h1><p className="text-sm text-slate-400 mt-2">Income, household expenses and credit commitments in one place.</p></div>
      {profile.source_kind === 'synthetic' && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">Synthetic origin{!profile.is_demo && ' · edited'}</span>}
      {profile.source_kind === 'unknown' && <span className="text-xs text-slate-400">Origin unknown · legacy profile</span>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[[Wallet, 'Monthly income', income, 'Salary + other income'], [Users, 'Monthly outgoings', expenses + repayments, 'Declared / confirmed expenses + loan payments'], [CreditCard, 'Remaining credit', balance, `${loanCount} active or overdue loans`], [AlertTriangle, 'Suspected expenses', suspected, 'Unverified · excluded from outgoings']].map(([Icon, label, value, note]) => <div key={label} className="rounded-2xl bg-[#090f1e] border border-[#1b2942] p-5"><div className="flex justify-between text-slate-400 text-xs"><span>{label}</span><Icon size={17} /></div><p className="text-xl font-semibold text-white mt-4 break-words">{money(value)}</p><p className="text-xs text-slate-500 mt-2">{note}</p></div>)}
    </div>
    {blocker.state === 'blocked' && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <div className="max-w-md rounded-2xl border border-slate-700 bg-[#101a2d] p-6 space-y-4">
        <h2 id="leave-title" className="text-lg font-semibold">{saving ? 'Save in progress' : 'Unsaved changes'}</h2>
        <p className="text-sm text-slate-300">{saving ? 'Wait for the save to finish before leaving.' : 'Leaving this page will discard your changes.'}</p>
        <div className="flex gap-3"><button autoFocus type="button" className={`${buttonClass} bg-blue-600`} onClick={() => blocker.reset()}>Stay on page</button>
          {!saving && <button type="button" className={`${buttonClass} bg-slate-700`} onClick={() => blocker.proceed()}>Discard and leave</button>}</div>
      </div>
    </div>}
    <form onSubmit={save} className="space-y-6">
      <fieldset disabled={saving} className="space-y-6 min-w-0">
        <section className="rounded-2xl bg-[#090f1e] border border-[#1b2942] p-5 sm:p-6 space-y-5">
          <h2 className="font-semibold text-white">Income & household</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <MoneyField label="Net monthly salary" value={profile.monthly_salary} onChange={v => change('monthly_salary', v)} />
            <MoneyField label="Other monthly income" value={profile.other_monthly_income} onChange={v => change('other_monthly_income', v)} />
            <Field label="Currency (all amounts)" value={profile.currency} readOnly={profile.version > 0} placeholder="e.g. EUR or RON" required pattern="[A-Z]{3}" maxLength={3} onChange={v => change('currency', v.toUpperCase())} />
            <Field label="Marital status" options={['unknown', 'single', 'married', 'divorced', 'widowed', 'separated']} value={profile.marital_status} onChange={v => change('marital_status', v)} />
            <Field label="Number of children" type="number" required min="0" step="1" value={profile.number_of_children} onChange={v => change('number_of_children', v)} />
            <Field label="Information as of" type="date" required value={profile.as_of_date} onChange={v => change('as_of_date', v)} />
          </div>
          <p className="text-xs text-slate-500">Choose the currency explicitly for a new profile. Existing profiles keep their currency until an explicit conversion workflow is available. Legacy income is not copied because its currency is unspecified.</p>
        </section>
        <section className="rounded-2xl bg-[#090f1e] border border-[#1b2942] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-semibold text-white">Monthly expenses</h2><button type="button" className={`${buttonClass} bg-slate-800 hover:bg-slate-700`} onClick={() => change('expenses', [...profile.expenses, { category: 'other', monthly_amount: '0', verification_status: 'declared', evidence_note: '' }])}><Plus size={16} /> Add expense</button></div>
          <p className="text-xs text-slate-400">Record monthly totals by category. Keep loan repayments in the loans section to avoid counting them twice.</p>
          {!profile.expenses.length && <p className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500">No expenses recorded. Add an expense to start.</p>}
          {profile.expenses.map((row, index) => <div key={index} className={`rounded-xl border p-4 space-y-4 ${row.verification_status === 'suspected' ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-[#060c18]'}`}>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Expense {index + 1}{row.verification_status === 'suspected' && <span className="text-amber-300 ml-3">Suspected · requires verification</span>}</span>{removeButton('expenses', index)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Category" options={categories} value={row.category} onChange={v => changeRow('expenses', index, 'category', v)} />
              <MoneyField label={`Monthly amount (${profile.currency})`} value={row.monthly_amount} onChange={v => changeRow('expenses', index, 'monthly_amount', v)} />
              <Field label="Verification status" options={['declared', 'suspected', 'confirmed', 'dismissed']} value={row.verification_status} onChange={v => changeRow('expenses', index, 'verification_status', v)} />
            </div>
            <Field label="Evidence / reviewer note" maxLength={2000} value={row.evidence_note} placeholder="Source, merchant details or reason for verification" onChange={v => changeRow('expenses', index, 'evidence_note', v)} />
          </div>)}
        </section>
        <section className="rounded-2xl bg-[#090f1e] border border-[#1b2942] p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-semibold text-white">Loans & credit</h2><button type="button" className={`${buttonClass} bg-slate-800 hover:bg-slate-700`} onClick={() => change('credits', [...profile.credits, { lender: '', credit_type: 'personal_loan', original_amount: '0', remaining_balance: '0', monthly_payment: '0', interest_rate_annual: '', remaining_term_months: '', status: 'active' }])}><Plus size={16} /> Add loan</button></div>
          <p className="text-xs text-slate-400">Paid-off loans must have zero balance, monthly payment and remaining months. Active credit facilities may have a zero balance.</p>
          {!profile.credits.length && <p className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500">No loans recorded.</p>}
          {profile.credits.map((row, index) => <div key={index} className="rounded-xl border border-slate-800 bg-[#060c18] p-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400"><span>Loan {index + 1}</span>{removeButton('credits', index)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Lender" required maxLength={150} value={row.lender} onChange={v => changeRow('credits', index, 'lender', v)} />
              <Field label="Credit type" options={['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'overdraft', 'other']} value={row.credit_type} onChange={v => changeRow('credits', index, 'credit_type', v)} />
              <Field label="Status" options={['active', 'paid_off', 'overdue']} value={row.status} onChange={v => changeRow('credits', index, 'status', v)} />
              {[['original_amount', 'Original amount'], ['remaining_balance', 'Remaining balance'], ['monthly_payment', 'Monthly payment']].map(([key, label]) => <MoneyField key={key} label={`${label} (${profile.currency})`} value={row[key]} onChange={v => changeRow('credits', index, key, v)} />)}
              <Field label="Annual interest (%) · optional" type="number" min="0" max="100" step="0.0001" value={row.interest_rate_annual} onChange={v => changeRow('credits', index, 'interest_rate_annual', v)} />
              <Field label="Remaining months · optional" type="number" min="0" step="1" value={row.remaining_term_months} onChange={v => changeRow('credits', index, 'remaining_term_months', v)} />
            </div>
          </div>)}
        </section>
      </fieldset>
      <div className="sticky bottom-4 bg-[#101a2d] border border-[#293955] rounded-2xl p-4 shadow-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="text-sm" aria-live="polite">{error ? <p role="alert" className="text-red-300">{error}</p> : saved ? <p className="text-emerald-400">Financial profile saved.</p> : <p className="text-slate-400">{dirty ? 'You have unsaved changes.' : 'Profile ready to review.'}</p>}<p className="text-xs text-slate-500 mt-1">Separate financial snapshot; existing case decisions stay unchanged.</p></div>
        <button type="button" disabled={saving} onClick={reload} className={`${buttonClass} bg-slate-800 text-slate-300`}>Reload profile</button>
        <button type="submit" disabled={saving} className={`${buttonClass} bg-blue-600 hover:bg-blue-500 text-white`}><Save size={16} />{saving ? 'Saving…' : 'Save financial profile'}</button>
      </div>
    </form>
  </div>;
}
