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
  Sparkles,
  Save,
  Plus,
  Calculator,
  ShieldCheck,
  CreditCard,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin
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

// Standard banking annuity formula
const calculateMonthlyAnnuity = (principal, annualInterestRate, termMonths) => {
  if (!principal || !termMonths || termMonths <= 0) return 0;
  const r = (annualInterestRate || 8.9) / 100 / 12;
  const payment = (principal * (r * Math.pow(1 + r, termMonths))) / (Math.pow(1 + r, termMonths) - 1);
  return Math.round(payment * 100) / 100;
};

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
  const [activeTab, setActiveTab] = useState('documente'); // documente, fisa_verificare, birou_credit, sarcini, istoric
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Copilot plugin state: open/closed & viewMode ('split' | 'expanded')
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
      setIsSidebarCollapsed(true);
    }
    if (nextState) {
      setTimeout(() => {
        copilotContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  const handleStatusChange = async (newStatus, customNote = null) => {
    try {
      setUpdatingStatus(true);
      const note = customNote || `Status modificat manual în ${newStatus}`;
      const updated = await updateCaseStatus(caseData.id, newStatus, note);
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
        Se încarcă detaliile dosarului de credit...
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
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 cursor-pointer"
        >
          Înapoi la lista dosarelor
        </button>
      </div>
    );
  }

  // Financial calculations
  const monthlyRate = calculateMonthlyAnnuity(
    caseData.requested_amount,
    caseData.interest_rate_annual,
    caseData.loan_term_months
  );
  const existingDebts = caseData.client.existing_monthly_debts || 0;
  const totalMonthlyCommitments = monthlyRate + existingDebts;
  const currentIncome = caseData.client.monthly_income || 1;
  const dtiPercent = ((totalMonthlyCommitments / currentIncome) * 100).toFixed(1);
  const isDtiCompliant = parseFloat(dtiPercent) <= 40.0;

  // KYC validation checks
  const isIdExpired = caseData.client.id_card_expiry
    ? new Date(caseData.client.id_card_expiry) < new Date()
    : false;

  const isSplitDesktop = isCopilotOpen && copilotViewMode === 'split';

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Top back navigation & Banking Metadata Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Înapoi la registru dosare</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-[#0e172a] border border-[#1e3158] text-slate-300 font-medium flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>{caseData.branch || 'Agenția Piața Unirii București'}</span>
          </span>
          <span className="px-3 py-1 rounded-lg bg-[#0e172a] border border-[#1e3158] text-slate-300 font-medium">
            Canal: <strong className="text-white">{caseData.channel || 'Online Onboarding'}</strong>
          </span>
          <span className="px-3 py-1 rounded-lg bg-[#071b12] border border-[#14532d] text-emerald-300 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scor FICO: {caseData.client.fico_score || 715}</span>
          </span>
        </div>
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
              {caseData.title} — Titular: <strong className="text-white">{caseData.client.full_name}</strong> (CNP: <span className="font-mono text-slate-300">{caseData.client.cnp}</span>)
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Înregistrat: {new Date(caseData.created_at).toLocaleString('ro-RO')} • Responsabil dosar: <strong className="text-slate-400">{caseData.assigned_to}</strong>
            </p>
          </div>
        </div>

        {/* Right Controls: Official Status Dropdown + Optional Plugin AI Copilot Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#050811] px-3 py-2 rounded-xl border border-[#192742]">
            <span className="text-xs text-slate-400">Status dosar:</span>
            <select
              value={caseData.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-[#0e172a] text-xs font-semibold text-white px-2.5 py-1 rounded-lg border border-[#253960] focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="in_lucru">În lucru</option>
              <option value="in_verificare">În verificare</option>
              <option value="complet">Aprobat / Complet</option>
              <option value="in_asteptare">În așteptare documente</option>
              <option value="respins">Respins</option>
            </select>
          </div>

          {/* Plugin Copilot Trigger Button (Decoupled as external tool) */}
          <button
            onClick={handleOpenCopilot}
            title="Deschide extensia de asistență AI pentru triaj și audit automat"
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 ${
              isCopilotOpen
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-amber-400/10'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
            <span>{isCopilotOpen ? 'Ascunde Plugin Copilot' : 'Plugin AI Copilot'}</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Grid: BankDesk Native Interface + AI Copilot Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* If Copilot is in EXPANDED mode, render across full width at top */}
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
          {/* Real Banking Summary Cards: 3 Analytical Panels */}
          <div className={`grid grid-cols-1 ${isSplitDesktop ? 'gap-4' : 'lg:grid-cols-3 gap-5'}`}>
            
            {/* Panel 1: Date Solicitant & Identitate KYC */}
            <div className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Identitate & Date KYC</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {caseData.client.marital_status || 'Căsătorit'} • {caseData.client.dependents_count || 0} copii
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Nume complet:</span>
                    <span className="text-white font-semibold">{caseData.client.full_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">CNP:</span>
                    <span className="text-slate-200 font-mono text-xs">{caseData.client.cnp}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Act Identitate:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-200 font-mono text-xs">{caseData.client.id_card_series || 'RK 892011'}</span>
                      {isIdExpired ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                          EXPIRAT
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          (val. {caseData.client.id_card_expiry || '2031-05-14'})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Domiciliu:</span>
                    <span className="text-slate-200 truncate max-w-[180px] text-xs text-right" title={caseData.client.address}>
                      {caseData.client.address || 'București'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Telefon / Email:</span>
                    <span className="text-slate-300 text-xs truncate max-w-[180px]">
                      {caseData.client.phone || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#142036] flex items-center justify-between text-xs">
                <span className="text-slate-400">Verificare AML / PEP:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  {caseData.client.aml_status || 'Conform L129/2019'}
                </span>
              </div>
            </div>

            {/* Panel 2: Situație Profesională & Venituri */}
            <div className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>Situație Profesională & Venit</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Vechime: {caseData.client.seniority_current_employer || '2 ani'}
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Angajator:</span>
                    <span className="text-white font-medium truncate max-w-[170px]" title={caseData.client.employer}>
                      {caseData.client.employer || 'Nespecificat'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Tip contract:</span>
                    <span className="text-slate-200 text-xs">
                      {caseData.client.employment_contract_type || 'Perioadă nedeterminată'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Venit declarat cerere:</span>
                    <span className="text-slate-200 font-semibold">
                      {caseData.client.monthly_income?.toLocaleString('ro-RO')} RON
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Acord interogare ANAF:</span>
                    <span className="text-emerald-400 font-medium text-xs">
                      {caseData.client.anaf_consent ? 'Semnat electronic' : 'Neacordat (necesită adeverință)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Datorii lunare externe:</span>
                    <span className="text-amber-400 font-semibold">
                      {caseData.client.existing_monthly_debts?.toLocaleString('ro-RO')} RON / lună
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#142036] flex items-center justify-between text-xs">
                <span className="text-slate-400">Venit net înregistrat:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {caseData.client.monthly_income?.toLocaleString('ro-RO')} RON
                </span>
              </div>
            </div>

            {/* Panel 3: Parametri Credit & Indicatori BNR (DTI) */}
            <div className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <span>Parametri Credit & DTI (BNR)</span>
                  </div>
                  <span className="text-xs font-mono text-slate-300">
                    {caseData.loan_term_months} luni
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Credit solicitat:</span>
                    <span className="text-white font-bold text-sm">
                      {caseData.requested_amount?.toLocaleString('ro-RO')} {caseData.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Dobândă & DAE:</span>
                    <span className="text-slate-200 text-xs">
                      {caseData.interest_rate_annual}% ({caseData.interest_type || 'Fixă'}) • DAE {caseData.dae_percent || 9.42}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Rată lunară nouă:</span>
                    <span className="text-blue-400 font-bold">
                      {monthlyRate.toLocaleString('ro-RO')} RON / lună
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Total rate lunare:</span>
                    <span className="text-slate-200 font-medium">
                      {totalMonthlyCommitments.toLocaleString('ro-RO')} RON / lună
                    </span>
                  </div>

                  {/* DTI Progress Bar */}
                  <div className="pt-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 text-[11px]">Grad de îndatorare (DTI):</span>
                      <span className={`font-bold text-xs ${isDtiCompliant ? 'text-emerald-400' : 'text-red-400'}`}>
                        {dtiPercent}% (Plafon BNR: 40%)
                      </span>
                    </div>
                    <div className="w-full bg-[#050811] h-2 rounded-full overflow-hidden border border-[#192742]">
                      <div
                        className={`h-full transition-all rounded-full ${
                          isDtiCompliant ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(parseFloat(dtiPercent) * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#142036] flex items-center justify-between text-xs">
                <span className="text-slate-400">Conformitate BNR:</span>
                <span className={`font-semibold flex items-center gap-1 ${isDtiCompliant ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isDtiCompliant ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isDtiCompliant ? 'Eligibil (sub 40%)' : 'Depășit (> 40%)'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Operational Notes Banner */}
          <div className="p-4 rounded-xl bg-[#090f1e] border border-[#142036] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5 text-slate-300">
              <FileCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Observații dosar: </span>
                <span className="text-slate-300">{caseData.notes || 'Nicio observație adițională înregistrată.'}</span>
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              Prioritate dosar: <strong className="text-amber-400 uppercase">{caseData.priority}</strong>
            </span>
          </div>

          {/* Official BankDesk Tabs: Documente, Fișă Verificare, Birou de Credit, Sarcini, Istoric */}
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
                  <span>Documente Atașate ({caseData.documents.length})</span>
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
                  <span>Fișă Verificare Manuală (Data Entry)</span>
                </button>

                <button
                  onClick={() => setActiveTab('birou_credit')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'birou_credit'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Biroul de Credit (FICO {caseData.client.fico_score || 715})</span>
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
                  <span>Jurnal Audit ({caseData.history_entries.length})</span>
                </button>
              </div>

              {activeTab === 'documente' && (
                <button
                  onClick={() => setShowDocModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#111c33] hover:bg-[#192848] border border-[#21355e] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atașează Document Nou</span>
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

                {/* Inline Document Inspector with Line Numbers */}
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
                            Tip document: {selectedDoc.document_type} • Format conform cerințelor de arhivare bancară
                          </p>
                        </div>
                        {highlightedLine && (
                          <span className="px-3 py-1 rounded-lg bg-amber-400/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
                            Rândul {highlightedLine} evidențiat
                          </span>
                        )}
                      </div>

                      {/* Document Content with numbered lines */}
                      <div className="bg-[#050811] border border-[#142036] rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto space-y-1">
                        {selectedDoc.content_text ? (
                          selectedDoc.content_text.split('\n').map((line, idx) => {
                            const lineNum = idx + 1;
                            const isHighlighted = highlightedLine === lineNum;
                            return (
                              <div
                                key={idx}
                                id={`doc-line-${lineNum}`}
                                className={`py-1 px-2.5 rounded transition-colors flex items-start gap-3 ${
                                  isHighlighted
                                    ? 'bg-amber-400/25 text-amber-200 border-l-4 border-amber-400 font-semibold'
                                    : 'hover:bg-slate-800/40 text-slate-300'
                                }`}
                              >
                                <span className="text-slate-600 select-none w-7 text-right shrink-0">
                                  {lineNum}
                                </span>
                                <span className="break-all whitespace-pre-wrap">{line}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-slate-500 py-8 text-center">
                            Conținutul documentului nu a putut fi extras text sau fișierul este imagine scanată.
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex justify-between items-center pt-2 border-t border-[#142036]">
                        <span>Stocare securizată conform politicii de conformitate BNR</span>
                        <span>MIME: {selectedDoc.mime_type || 'application/pdf'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      Selectează un document din stânga pentru a-l vizualiza.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FIȘĂ DE VERIFICARE MANUALĂ (DATA ENTRY & WORKFLOW OFIȚER) */}
            {activeTab === 'fisa_verificare' && (
              <form
                onSubmit={handleSaveManualForm}
                className="p-5 sm:p-6 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-5"
              >
                <div className="border-b border-[#142036] pb-3">
                  <h3 className="text-base font-bold text-white">
                    Fișa Internă de Verificare și Introducere Date (Underwriting Manual)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Ofițerul bancar verifică concordanța documentelor depuse de client cu datele din sistemul central și confirmă valorile finale pentru aprobare.
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
                  <label className="block text-xs sm:text-sm text-slate-300 font-medium mb-1">Note Verificare & Analiză Risc</label>
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
                    <span>{savingForm ? 'Se salvează...' : 'Salvează Modificările în Sistem'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: RAPORT BIROUL DE CREDIT (CRB) */}
            {activeTab === 'birou_credit' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142036] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      <span>Fișă Interogare — Biroul de Credit S.A.</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cod interogare: BC-2026-9921 • Data interogării: {new Date(caseData.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-bold">
                    Calificativ Risc: Foarte Scăzut
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#050811] border border-[#142036] text-center space-y-1">
                    <span className="text-xs text-slate-400">Scor FICO</span>
                    <p className="text-3xl font-extrabold text-emerald-400">
                      {caseData.client.fico_score || 715} <span className="text-xs text-slate-500 font-normal">/ 850</span>
                    </p>
                    <span className="text-[11px] text-slate-400 block">Probabilitate implicită de nerambursare sub 1.2%</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050811] border border-[#142036] text-center space-y-1">
                    <span className="text-xs text-slate-400">Istoric Întârzieri (48 luni)</span>
                    <p className="text-xl font-bold text-white">0 restanțe</p>
                    <span className="text-[11px] text-emerald-400 font-medium block">
                      {caseData.client.credit_bureau_status || 'Clasa A de performanță'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050811] border border-[#142036] text-center space-y-1">
                    <span className="text-xs text-slate-400">Contracte Active în Sistem</span>
                    <p className="text-xl font-bold text-white">
                      {caseData.client.credit_bureau_active_loans || 1} contract(e)
                    </p>
                    <span className="text-[11px] text-amber-400 font-medium block">
                      Total rate externe: {caseData.client.existing_monthly_debts || 200} RON / lună
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Sinteză Credite Active la Alte Instituții Bancare
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-[#142036]">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#050811] text-slate-400 border-b border-[#142036]">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">Bancă Creditoare</th>
                          <th className="py-2.5 px-3 font-medium">Tip Produs</th>
                          <th className="py-2.5 px-3 font-medium">Limită / Sold</th>
                          <th className="py-2.5 px-3 font-medium">Rată Lunară</th>
                          <th className="py-2.5 px-3 font-medium">Status Plăți</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#142036] bg-[#070d1c]">
                        <tr>
                          <td className="py-2.5 px-3 font-medium text-white">Banca Parteneră S.A.</td>
                          <td className="py-2.5 px-3">Card de Credit</td>
                          <td className="py-2.5 px-3">5.000 RON</td>
                          <td className="py-2.5 px-3 font-semibold text-amber-300">
                            {caseData.client.existing_monthly_debts || 200} RON
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400">
                              La zi (0 zile întârziere)
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SARCINI OPERAȚIONALE OFIȚER */}
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

            {/* TAB 5: JURNAL DE AUDIT & ISTORIC BANCAR */}
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

          {/* OFFICIAL OFFICER DECISION PANEL (HUMAN-IN-THE-LOOP) */}
          <div className="p-5 rounded-2xl bg-[#070c18] border border-[#182640] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span>Panou Decizie Ofițer de Credite (Comitet Retail)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Validează conformitatea dosarului și emite decizia bancară oficială.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('respins', 'Dosar respins de către ofițerul de credit')}
                className="px-4 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                Respinge Dosarul
              </button>
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('in_asteptare', 'Solicitare clarificări / documente suplimentare de la client')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                Solicită Clarificări
              </button>
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('complet', 'Dosar aprobat conform normelor de creditare Retail')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                Aprobă Dosarul (Emitere Contract)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE (WHEN IN SPLIT MODE): RAIFFEISEN AI COPILOT EXTENSION */}
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
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                  placeholder="ex: Adeverinta_Venit_Rectificata.pdf"
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
                  <option value="Raport Biroul de Credit">Raport Biroul de Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Conținut text document</label>
                <textarea
                  rows="5"
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder={"Rândul 1: DOCUMENT OFICIAL\nRândul 2: Titular: ...\nRândul 3: Valori confirmate: ..."}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl p-3 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
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
