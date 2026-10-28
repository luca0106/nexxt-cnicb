import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Folder,
  FileText,
  User,
  Clock,
  AlertTriangle,
  Eye,
  CheckSquare,
  History,
  FileCheck,
  X,
  Bot,
  Sparkles,
  Save,
  Plus,
  Calculator
} from 'lucide-react';
import {
  fetchCaseById,
  updateCaseStatus,
  updateCaseManualForm,
  toggleTask,
  fetchLatestCaseAnalysis,
  createDocument
} from '../api/client';
import AICopilotDrawer from '../components/AICopilotDrawer';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setIsSidebarCollapsed } = outletContext;

  const copilotContainerRef = useRef(null);

  const [caseData, setCaseData] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documente'); // documente, fisa_verificare, sarcini, istoric
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Copilot state: open/closed & viewMode ('split' | 'expanded')
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotViewMode, setCopilotViewMode] = useState('split');

  // Manual Officer Verification Form state
  const [formName, setFormName] = useState('');
  const [formCnp, setFormCnp] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmployer, setFormEmployer] = useState('');
  const [formIncome, setFormIncome] = useState('');
  const [formDebts, setFormDebts] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTerm, setFormTerm] = useState('60');
  const [formNotes, setFormNotes] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  // Upload Document modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Adeverință venit');
  const [newDocContent, setNewDocContent] = useState('');

  const syncFormState = (data) => {
    if (!data) return;
    setFormName(data.client?.full_name || '');
    setFormCnp(data.client?.cnp || '');
    setFormAddress(data.client?.address || '');
    setFormEmployer(data.client?.employer || '');
    setFormIncome(String(data.client?.monthly_income ?? ''));
    setFormDebts(String(data.client?.existing_monthly_debts ?? '0'));
    setFormAmount(String(data.requested_amount ?? ''));
    setFormTerm(String(data.loan_term_months ?? '60'));
    setFormNotes(data.notes || '');
  };

  const loadCase = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCaseById(id);
      setCaseData(data);
      syncFormState(data);
      if (data.documents && data.documents.length > 0 && !selectedDoc) {
        setSelectedDoc(data.documents[0]);
      }
      const existingAnalysis = await fetchLatestCaseAnalysis(data.id);
      setLatestAnalysis(existingAnalysis);
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

  const handleOpenCopilot = () => {
    const nextState = !isCopilotOpen;
    setIsCopilotOpen(nextState);
    if (nextState && setIsSidebarCollapsed) {
      // Collapse left menu automatically on desktop to give maximum breathing room for Split-View
      setIsSidebarCollapsed(true);
    }
    if (nextState) {
      setTimeout(() => {
        copilotContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const updated = await updateCaseStatus(
        caseData.id,
        newStatus,
        `Status modificat manual în ${newStatus}`
      );
      setCaseData(updated);
      syncFormState(updated);
    } catch (err) {
      alert('Eroare la actualizarea statusului.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveManualForm = async (e) => {
    e.preventDefault();
    try {
      setSavingForm(true);
      const updated = await updateCaseManualForm(caseData.id, {
        full_name: formName,
        cnp: formCnp,
        address: formAddress,
        employer: formEmployer,
        monthly_income: parseFloat(formIncome) || 0,
        existing_monthly_debts: parseFloat(formDebts) || 0,
        requested_amount: parseFloat(formAmount) || 0,
        loan_term_months: parseInt(formTerm, 10) || 60,
        notes: formNotes
      });
      setCaseData(updated);
      syncFormState(updated);
    } catch (err) {
      alert('Eroare la salvarea fișei de verificare.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    try {
      await createDocument({
        case_id: caseData.id,
        file_name: newDocName.endsWith('.pdf') ? newDocName : `${newDocName}.pdf`,
        document_type: newDocType,
        file_size_kb: 210,
        content_text: newDocContent
      });
      setShowDocModal(false);
      setNewDocName('');
      setNewDocContent('');
      loadCase();
    } catch (err) {
      alert('Nu s-a putut atașa documentul.');
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

  // Called when clicking a citation inside AICopilotDrawer
  const handleSelectCitation = (documentId, lineNumber) => {
    if (!caseData?.documents) return;
    const foundDoc = caseData.documents.find((d) => d.id === documentId) || caseData.documents[0];
    setActiveTab('documente');
    setSelectedDoc(foundDoc);
    setHighlightedLine(lineNumber);

    setTimeout(() => {
      const el = document.getElementById(`doc-line-${lineNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  const handleAnalysisUpdated = async (updatedAnalysis) => {
    setLatestAnalysis(updatedAnalysis);
    const refreshedCase = await fetchCaseById(id);
    setCaseData(refreshedCase);
    syncFormState(refreshedCase);
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

  const isSplitDesktop = isCopilotOpen && copilotViewMode === 'split';

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Top back navigation & Scenario Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Înapoi la dosare</span>
        </button>

        {caseData.scenario_tag && (
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#0e172a] border border-[#1e3158] text-slate-300 max-w-full truncate">
            {caseData.scenario_tag === 'discrepancy_case' && 'Scenariu Demo 1: Discrepanțe Cross-Check (Venit 5.200 vs 5.700 RON & Nume Ion vs Ioan)'}
            {caseData.scenario_tag === 'expired_id_case' && 'Scenariu Demo 2: Edge Case (Buletin Expirat → Auto-Remediere SMS/Email)'}
            {caseData.scenario_tag === 'valid_green_case' && 'Scenariu Demo 3: Dosar Valid 100% (Green Flags & DTI < 40%)'}
          </span>
        )}
      </div>

      {/* Case Header Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
            <Folder className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Dosar #{caseData.case_number}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-300 font-mono">
                {caseData.case_type}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-400">
                {caseData.department}
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">
              {caseData.title} — Solicitant: <strong className="text-white">{caseData.client.full_name}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Înregistrat: {new Date(caseData.created_at).toLocaleString('ro-RO')} • Responsabil: {caseData.assigned_to}
            </p>
          </div>
        </div>

        {/* Right Controls: Status Dropdown + Extension Trigger Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#050811] px-3 py-2 rounded-xl border border-[#192742]">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={caseData.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-[#0e172a] text-xs font-semibold text-white px-2.5 py-1 rounded-lg border border-[#253960] focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="in_lucru">În lucru</option>
              <option value="in_verificare">În verificare</option>
              <option value="complet">Complet</option>
              <option value="in_asteptare">În așteptare</option>
              <option value="respins">Respins</option>
            </select>
          </div>

          <button
            onClick={handleOpenCopilot}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 ${
              isCopilotOpen
                ? 'bg-slate-800 text-amber-300 border border-amber-400/50'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Bot className="w-4 h-4 stroke-[2.2]" />
            <span>{isCopilotOpen ? 'Închide AI Copilot' : 'Raiffeisen AI Copilot (Triage & Audit)'}</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Workspace Grid:
          - When Copilot is closed: 100% width for BankDesk
          - When Copilot is open in 'split' mode on xl screens: 6 cols BankDesk (Left) + 6 cols AI Copilot (Right)
          - When Copilot is open in 'expanded' mode (or on < xl screens): AI Copilot appears prominently at full width above/alongside BankDesk!
      */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* If Copilot is in EXPANDED mode, render it across all 12 columns at the top */}
        {isCopilotOpen && copilotViewMode === 'expanded' && (
          <div ref={copilotContainerRef} className="xl:col-span-12 w-full min-w-0">
            <AICopilotDrawer
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
              viewMode={copilotViewMode}
              onToggleViewMode={() => setCopilotViewMode('split')}
              caseData={caseData}
              initialAnalysis={latestAnalysis}
              onAnalysisUpdated={handleAnalysisUpdated}
              onSelectCitation={handleSelectCitation}
            />
          </div>
        )}

        {/* LEFT PANE: BANKDESK NATIVE CASE WORKSPACE */}
        <div
          className={`space-y-5 min-w-0 w-full ${
            isSplitDesktop ? 'xl:col-span-6' : 'xl:col-span-12'
          }`}
        >
          {/* Client Info & Notes Cards */}
          <div className={`grid grid-cols-1 ${isSplitDesktop ? 'gap-4' : 'lg:grid-cols-3 gap-5'}`}>
            {/* Client Summary Card */}
            <div className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Date Client în Sistem</span>
                </div>
                <button
                  onClick={() => setActiveTab('fisa_verificare')}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Editează manual
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Nume complet</span>
                  <span className="text-slate-100 font-semibold">{caseData.client.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">CNP</span>
                  <span className="text-slate-200 font-mono">{caseData.client.cnp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Serie & Valabilitate CI</span>
                  <span className="text-slate-200 font-mono text-xs">
                    {caseData.client.id_card_series || 'RK 892011'} ({caseData.client.id_card_expiry || '2031-05-14'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Angajator</span>
                  <span className="text-slate-200 truncate block">{caseData.client.employer || 'Nespecificat'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-xs">Adresă înregistrată</span>
                  <span className="text-slate-200">{caseData.client.address || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#142036] flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-slate-400 block text-xs">Venit net în sistem</span>
                  <span className="text-emerald-400 font-bold text-sm sm:text-base">
                    {caseData.client.monthly_income?.toLocaleString('ro-RO')} RON
                  </span>
                </div>
                {caseData.requested_amount && (
                  <div className="text-right">
                    <span className="text-slate-400 block text-xs">Credit solicitat</span>
                    <span className="text-blue-400 font-bold text-sm sm:text-base">
                      {caseData.requested_amount?.toLocaleString('ro-RO')} {caseData.currency} ({caseData.loan_term_months} luni)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Operational Notes Card */}
            <div className={`${isSplitDesktop ? '' : 'lg:col-span-2'} p-5 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col justify-between space-y-4`}>
              <div>
                <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Observații & Mențiuni Dosar (BankDesk)</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Prioritate: <strong className="text-amber-400 uppercase">{caseData.priority}</strong>
                  </span>
                </div>

                <div className="mt-3 p-3.5 rounded-xl bg-[#050811] border border-[#142036] text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {caseData.notes || 'Nicio observație adițională înregistrată.'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1d2f52] text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {latestAnalysis
                      ? `Ultima analiză AI (${latestAnalysis.analysisId}): ${latestAnalysis.metrics?.redFlagsCount || 0} Alerte (Red Flags), DTI ${latestAnalysis.feasibilityMath?.dti_percentage}%`
                      : 'Dosarul poate fi analizat automat cu extensia Raiffeisen AI Copilot.'}
                  </span>
                </div>
                {!isCopilotOpen && (
                  <button
                    onClick={handleOpenCopilot}
                    className="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 shrink-0 underline cursor-pointer"
                  >
                    {latestAnalysis ? 'Deschide Raportul AI →' : 'Pornește Triajul AI →'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BankDesk Tabs: Documente, Fișa de Verificare, Sarcini, Istoric */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142036] pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('documente')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'documente'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Documente & Sursă ({caseData.documents.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('fisa_verificare')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'fisa_verificare'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Fișă Verificare (Data Entry)</span>
                </button>

                <button
                  onClick={() => setActiveTab('sarcini')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'istoric'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Istoric ({caseData.history_entries.length})</span>
                </button>
              </div>

              {activeTab === 'documente' && (
                <button
                  onClick={() => setShowDocModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#111c33] hover:bg-[#192848] border border-[#21355e] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atașează Document</span>
                </button>
              )}
            </div>

            {/* TAB 1: DOCUMENTE & INSPECTOR RÂND-CU-RÂND */}
            {activeTab === 'documente' && (
              <div className={`grid grid-cols-1 ${isSplitDesktop ? 'gap-4' : 'lg:grid-cols-12 gap-5'}`}>
                {/* Document Selector */}
                <div className={`${isSplitDesktop ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : 'lg:col-span-5 space-y-2.5'}`}>
                  {caseData.documents.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setHighlightedLine(null);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#0e1a33] border-blue-500 shadow-md'
                            : 'bg-[#090f1e] border-[#142036] hover:border-[#1e3256]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              doc.status === 'expired'
                                ? 'bg-red-950/60 text-red-400 border border-red-800/50'
                                : doc.status === 'flagged'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                                : 'bg-blue-950/40 text-blue-400 border border-blue-900/40'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate" title={doc.file_name}>
                              {doc.file_name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                {doc.document_type}
                              </span>
                              <span>{doc.file_size_kb} KB</span>
                            </div>
                          </div>
                        </div>

                        <Eye className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                      </div>
                    );
                  })}
                </div>

                {/* Inline Document Inspector with Line Highlighting */}
                <div className={`${isSplitDesktop ? '' : 'lg:col-span-7'} p-4 sm:p-5 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col justify-between space-y-4`}>
                  {selectedDoc ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142036] pb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                              {selectedDoc.doc_code || `doc-${selectedDoc.id}`}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-white break-all">
                              {selectedDoc.file_name}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Tip document: {selectedDoc.document_type} • Conținut numerotat pe rânduri
                          </p>
                        </div>
                        {highlightedLine && (
                          <span className="px-3 py-1 rounded-lg bg-amber-400/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
                            Rândul {highlightedLine} evidențiat din citarea AI
                          </span>
                        )}
                      </div>

                      <div className="rounded-xl bg-[#050811] border border-[#182642] p-3 font-mono text-xs sm:text-sm space-y-1.5 max-h-[460px] overflow-y-auto">
                        {(selectedDoc.content_text || '').split('\n').map((line, index) => {
                          const lineNum = index + 1;
                          const isHighlighted = highlightedLine === lineNum;
                          return (
                            <div
                              id={`doc-line-${lineNum}`}
                              key={lineNum}
                              onClick={() => setHighlightedLine(lineNum === highlightedLine ? null : lineNum)}
                              className={`px-3 py-2 rounded-lg flex items-start gap-3 cursor-pointer transition-colors ${
                                isHighlighted
                                  ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-100 font-bold shadow-md'
                                  : 'hover:bg-[#0d162b] text-slate-200'
                              }`}
                            >
                              <span className="text-slate-500 select-none w-6 text-right shrink-0">
                                {lineNum}
                              </span>
                              <span className="flex-1 break-words">{line}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-slate-500 text-sm">
                      Selectează un document pentru a inspecta conținutul.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FIȘA DE VERIFICARE MANUALĂ A OFIȚERULUI */}
            {activeTab === 'fisa_verificare' && (
              <form
                onSubmit={handleSaveManualForm}
                className="p-5 sm:p-6 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-5"
              >
                <div className="border-b border-[#142036] pb-3">
                  <h3 className="text-base font-bold text-white">
                    Fișa Internă de Verificare și Eligibilitate (Flux Manual Ofițer)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    În fluxul clasic fără AI, ofițerul citește fiecare PDF și introduce/corectează manual aceste câmpuri (~45 min/dosar). Cu Raiffeisen AI Copilot, valorile validate se aplică cu un singur click.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nume și Prenume Solicitant</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Cod Numeric Personal (CNP)</label>
                    <input
                      type="text"
                      value={formCnp}
                      onChange={(e) => setFormCnp(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Adresă Domiciliu Verificată</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Angajator Confirmat</label>
                    <input
                      type="text"
                      value={formEmployer}
                      onChange={(e) => setFormEmployer(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Venit Lunar Net Eligibil (RON)</label>
                    <input
                      type="number"
                      value={formIncome}
                      onChange={(e) => setFormIncome(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Obligații / Rate Lunare Existente (RON)</label>
                    <input
                      type="number"
                      value={formDebts}
                      onChange={(e) => setFormDebts(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Suma Credit Solicitată (RON)</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-blue-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Perioadă Creditare (Luni)</label>
                    <input
                      type="number"
                      value={formTerm}
                      onChange={(e) => setFormTerm(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-slate-300 font-medium mb-1">Note Verificare Ofițer</label>
                  <textarea
                    rows="3"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-[#050811] border border-[#192742] rounded-xl p-3 text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingForm}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingForm ? 'Se salvează...' : 'Salvează Datele în Dosar'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: SARCINI */}
            {activeTab === 'sarcini' && (
              <div className="space-y-3">
                {caseData.tasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm bg-[#090f1e] rounded-2xl border border-[#142036]">
                    Nicio sarcină activă pentru acest dosar.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {caseData.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className="p-4 rounded-xl bg-[#090f1e] border border-[#142036] hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'finalizat'}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                          />
                          <span className={`text-xs sm:text-sm ${task.status === 'finalizat' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs self-end sm:self-center">
                          <span className="text-slate-400 font-mono">{task.assigned_to}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                              task.status === 'finalizat'
                                ? 'bg-emerald-950/50 text-emerald-400'
                                : 'bg-amber-950/50 text-amber-400'
                            }`}
                          >
                            {task.status === 'finalizat' ? 'Finalizat' : 'În lucru'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ISTORIC / AUDIT TRAIL */}
            {activeTab === 'istoric' && (
              <div className="space-y-3">
                {caseData.history_entries.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-[#090f1e] border border-[#142036] flex items-start gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-950/50 border border-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs sm:text-sm min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-white">{log.action}</span>
                        <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('ro-RO')}</span>
                      </div>
                      <p className="text-slate-300 mt-1 break-words">{log.details}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Efectuat de: <span className="text-slate-400 font-medium">{log.performed_by}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE (WHEN IN SPLIT MODE): RAIFFEISEN AI COPILOT */}
        {isCopilotOpen && copilotViewMode === 'split' && (
          <div ref={copilotContainerRef} className="xl:col-span-6 w-full min-w-0 xl:sticky xl:top-[84px]">
            <AICopilotDrawer
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
              viewMode={copilotViewMode}
              onToggleViewMode={() => setCopilotViewMode('expanded')}
              caseData={caseData}
              initialAnalysis={latestAnalysis}
              onAnalysisUpdated={handleAnalysisUpdated}
              onSelectCitation={handleSelectCitation}
            />
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Atașează Document Nou la Dosar #{caseData.case_number}</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 mb-1">Nume fișier</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="ex: Adeverinta_Rectificata.pdf"
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Tip document</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-white"
                >
                  <option value="Formular cerere">Formular cerere</option>
                  <option value="Adeverință venit">Adeverință venit</option>
                  <option value="Extras financiar">Extras financiar</option>
                  <option value="Copie CI">Copie CI</option>
                  <option value="Factură utilități">Factură utilități</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Conținut text (OCR / Demo)</label>
                <textarea
                  rows="5"
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder={"Rândul 1: ADEVERINȚĂ RECTIFICATĂ\nRândul 2: Nume și prenume solicitant: Ion Popescu\nRândul 3: Venit lunar net: 5.700 RON"}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl p-3 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
                >
                  Încarcă în Dosar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
