import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Folder, 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  Calendar, 
  User, 
  X,
  CreditCard
} from 'lucide-react';
import { fetchCases, createCase, fetchClients } from '../api/client';

export default function CasesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get('status') || 'all';

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // New Case form state
  const [newTitle, setNewTitle] = useState('Personal Consumer Loan Application');
  const [newType, setNewType] = useState('Personal Consumer Loan');
  const [newClientId, setNewClientId] = useState('');
  const [newAmount, setNewAmount] = useState('35000');
  const [newNotes, setNewNotes] = useState('');

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await fetchCases({
        status: currentStatus,
        search: searchTerm,
      });
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [currentStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCases();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openCreateModal = async () => {
    try {
      const cls = await fetchClients();
      setClients(cls);
      if (cls.length > 0) {
        setNewClientId(cls[0].id);
      }
      setShowModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newClientId) return;
    try {
      const created = await createCase({
        title: newTitle,
        case_type: newType,
        client_id: parseInt(newClientId),
        requested_amount: parseFloat(newAmount) || 0,
        notes: newNotes,
        status: 'in_progress',
      });
      setShowModal(false);
      navigate(`/cases/${created.id}`);
    } catch (err) {
      alert('Error creating case.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_review':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2e1906] text-[#f97316] border border-[#7c2d12]/60">In review</span>;
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#052e16] text-[#22c55e] border border-[#14532d]/60">Completed</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#1e293b] text-[#cbd5e1] border border-[#334155]/60">Pending</span>;
      case 'in_progress':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#0f2347] text-[#38bdf8] border border-[#1e3a8a]/60">In progress</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#3b0b14] text-[#f87171] border border-[#7f1d1d]/60">Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const statusFilters = [
    { label: 'All Cases', value: 'all' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'In Review', value: 'in_review' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Case Portfolio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Departmental loan and underwriting pipeline
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Case</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#090f1e] p-4 rounded-2xl border border-[#142036]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by case number, customer name, ID..."
            className="w-full bg-[#050811] border border-[#192742] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {statusFilters.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSearchParams(tab.value === 'all' ? {} : { status: tab.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                currentStatus === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 hover:bg-[#152340]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading case records...
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <Folder className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No cases found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="p-4 sm:p-5 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3358] hover:bg-[#0c1429] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-900/40 flex items-center justify-center text-blue-400 group-hover:text-blue-300 shrink-0 mt-0.5 sm:mt-0">
                  <Folder className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Case #{c.case_number}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {c.case_type}
                    </span>
                  </div>
                  <h3 className="text-sm text-slate-300 font-medium mt-0.5">
                    {c.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                    {c.client && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {c.client.full_name}
                      </span>
                    )}
                    {c.requested_amount && (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CreditCard className="w-3.5 h-3.5" />
                        {c.requested_amount.toLocaleString()} {c.currency}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {c.documents_count} documents
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/60">
                <span className="text-xs text-slate-500 sm:hidden">Status:</span>
                {getStatusBadge(c.status)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Create New Case</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Case Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Product Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Personal Consumer Loan">Personal Consumer Loan</option>
                    <option value="Residential Mortgage Loan">Residential Mortgage Loan</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Current Account">Current Account</option>
                    <option value="KYC Profile Update">KYC Profile Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Requested Amount (EUR)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Applicant</label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.full_name} (ID: {cl.national_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Case Notes</label>
                <textarea
                  rows="3"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Underwriting remarks..."
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors cursor-pointer"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
