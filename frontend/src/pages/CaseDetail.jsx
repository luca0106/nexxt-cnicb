import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Folder, 
  FileText, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Building, 
  Phone, 
  Mail, 
  CreditCard,
  Eye,
  CheckSquare,
  History,
  ShieldAlert,
  FileCheck,
  X
} from 'lucide-react';
import { fetchCaseById, updateCaseStatus, toggleTask } from '../api/client';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documente'); // documente, sarcini, istoric
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCaseById(id);
      setCaseData(data);
    } catch (err) {
      console.error(err);
      setError('Nu s-a putut încărca dosarul specificat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const updated = await updateCaseStatus(caseData.id, newStatus, `Status modificat manual în ${newStatus}`);
      setCaseData(updated);
    } catch (err) {
      alert('Eroare la actualizarea statusului.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await toggleTask(taskId);
      loadCase();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        Se încarcă detaliile dosarului...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/30 border border-red-800/40 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'Dosarul nu a fost găsit.'}</p>
        <button
          onClick={() => navigate('/dosare')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700"
        >
          Înapoi la lista dosarelor
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Înapoi</span>
      </button>

      {/* Case Header Card */}
      <div className="p-6 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
            <Folder className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Dosar #{caseData.case_number}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-300 font-mono">
                {caseData.case_type}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-400">
                {caseData.department}
              </span>
            </div>
            <p className="text-slate-300 text-sm mt-1 font-medium">
              {caseData.title}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Înregistrat: {new Date(caseData.created_at).toLocaleString('ro-RO')} • Responsabil: {caseData.assigned_to}
            </p>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-3 bg-[#050811] p-2 rounded-xl border border-[#192742] self-start md:self-center">
          <span className="text-xs text-slate-400 pl-2">Status dosar:</span>
          <select
            value={caseData.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[#0e172a] text-xs font-semibold text-white px-3 py-1.5 rounded-lg border border-[#253960] focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="in_lucru">În lucru</option>
            <option value="in_verificare">În verificare</option>
            <option value="complet">Complet</option>
            <option value="in_asteptare">În așteptare</option>
            <option value="respins">Respins</option>
          </select>
        </div>
      </div>

      {/* Grid: Client Details & Future AI Readiness Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info Card */}
        <div className="p-6 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-4">
          <div className="flex items-center gap-2.5 text-white font-semibold text-sm border-b border-[#142036] pb-3">
            <User className="w-4 h-4 text-blue-400" />
            <span>Date Solicitant / Client</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Nume complet</span>
              <span className="text-slate-200 font-semibold text-sm">{caseData.client.full_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">CNP</span>
                <span className="text-slate-200 font-mono">{caseData.client.cnp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Telefon</span>
                <span className="text-slate-200">{caseData.client.phone || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Email</span>
              <span className="text-slate-200">{caseData.client.email || 'N/A'}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Angajator</span>
              <span className="text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {caseData.client.employer || 'Nespecificat'}
              </span>
            </div>

            <div className="pt-2 border-t border-[#142036] flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[11px]">Venit net declarat</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {caseData.client.monthly_income?.toLocaleString()} RON
                </span>
              </div>
              {caseData.requested_amount && (
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Credit solicitat</span>
                  <span className="text-blue-400 font-bold text-sm">
                    {caseData.requested_amount?.toLocaleString()} {caseData.currency}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Operational Notes / Overview */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#142036] pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Observații & Mențiuni Dosar</span>
              </div>
              <span className="text-xs text-slate-400">Prioritate: <span className="font-semibold text-amber-400 uppercase">{caseData.priority}</span></span>
            </div>

            <div className="mt-3 p-3.5 rounded-xl bg-[#050811] border border-[#142036] text-xs text-slate-300 leading-relaxed font-sans min-h-[90px]">
              {caseData.notes || 'Nicio observație adițională înregistrată.'}
            </div>
          </div>

          {/* AI Workflow slot preparation notice */}
          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-xs flex items-center justify-between text-blue-300">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Modul AI pregătit conform specificației din documentație (BankDesk AI).</span>
            </div>
            <span className="text-[11px] text-blue-400/80 font-mono">Modul decuplat</span>
          </div>
        </div>
      </div>

      {/* Tabs Section: Documente, Sarcini, Istoric */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#142036] pb-2">
          <button
            onClick={() => setActiveTab('documente')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'documente'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documente ({caseData.documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sarcini')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sarcini'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Sarcini ({caseData.tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('istoric')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'istoric'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Istoric Dosar ({caseData.history_entries.length})</span>
          </button>
        </div>

        {/* TAB 1: Documente */}
        {activeTab === 'documente' && (
          <div className="space-y-3">
            {caseData.documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm bg-[#090f1e] rounded-2xl border border-[#142036]">
                Niciun document atașat acestui dosar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caseData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3256] transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-blue-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {doc.file_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                            {doc.document_type}
                          </span>
                          <span>{doc.file_size_kb} KB</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="px-3 py-1.5 rounded-lg bg-[#111c33] border border-[#1e2f50] text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Vizualizează</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Sarcini */}
        {activeTab === 'sarcini' && (
          <div className="space-y-3">
            {caseData.tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm bg-[#090f1e] rounded-2xl border border-[#142036]">
                Nicio sarcină activă pentru acest dosar.
              </div>
            ) : (
              <div className="space-y-2">
                {caseData.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className="p-3.5 rounded-xl bg-[#090f1e] border border-[#142036] hover:border-slate-700 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'finalizat'}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span className={`text-sm ${task.status === 'finalizat' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 font-mono">
                        {task.assigned_to}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-medium ${
                        task.status === 'finalizat'
                          ? 'bg-emerald-950/50 text-emerald-400'
                          : 'bg-amber-950/50 text-amber-400'
                      }`}>
                        {task.status === 'finalizat' ? 'Finalizat' : 'În lucru'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Istoric */}
        {activeTab === 'istoric' && (
          <div className="space-y-3">
            {caseData.history_entries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm bg-[#090f1e] rounded-2xl border border-[#142036]">
                Niciun eveniment înregistrat în jurnal.
              </div>
            ) : (
              <div className="space-y-3">
                {caseData.history_entries.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-[#090f1e] border border-[#142036] flex items-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-950/50 border border-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">
                          {log.action}
                        </span>
                        <span className="text-slate-500">
                          {new Date(log.timestamp).toLocaleString('ro-RO')}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1">
                        {log.details}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Efectuat de: <span className="text-slate-400 font-medium">{log.performed_by}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Content Modal / Viewer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {selectedDoc.file_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tip: {selectedDoc.document_type} • Mărime: {selectedDoc.file_size_kb} KB
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Conținut Text Extras din Document:
              </span>
              <pre className="p-4 rounded-xl bg-[#050811] border border-[#192742] text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {selectedDoc.content_text || 'Nu există conținut text pre-extras pentru acest document.'}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

