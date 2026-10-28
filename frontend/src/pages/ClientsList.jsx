import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Phone, Mail, Building, CreditCard, X } from 'lucide-react';
import { fetchClients, createClient } from '../api/client';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [employer, setEmployer] = useState('');
  const [income, setIncome] = useState('5000');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchClients(searchTerm);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createClient({
        full_name: fullName,
        national_id: nationalId,
        email: email,
        phone: phone,
        address: address,
        employer: employer,
        monthly_income: parseFloat(income) || 0,
      });
      setShowModal(false);
      setFullName('');
      setNationalId('');
      setEmail('');
      setPhone('');
      setAddress('');
      setEmployer('');
      loadData();
    } catch (err) {
      alert('Error registering client.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Bank Clients
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered customer directory in the internal banking system
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      <div className="bg-[#090f1e] p-4 rounded-2xl border border-[#142036]">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, National ID, email..."
            className="w-full bg-[#050811] border border-[#192742] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading client directory...
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No clients found matching the query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3358] transition-all space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    {c.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {c.full_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {c.national_id || c.cnp}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{c.phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.employer || 'Unspecified employer'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#142036] flex items-center justify-between text-xs">
                <span className="text-slate-400">Declared net income:</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {c.monthly_income?.toLocaleString()} RON
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">Register New Client</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">National ID / Tax ID</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="1890101..."
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Monthly Income (RON)</label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+40 7..."
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Employer / Company</label>
                <input
                  type="text"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="e.g. Acme Tech Corp"
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 14 Elm Street, Bucharest"
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
