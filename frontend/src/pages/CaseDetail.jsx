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
  const [activeTab, setActiveTab] = useState('documents'); // documents, underwriting_sheet, tasks, history
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotViewMode, setCopilotViewMode] = useState('split');

  // Manual Form
  const [formName, setFormName] = useState('');
  const [formNatId, setFormNatId] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmployer, setFormEmployer] = useState('');
  const [formIncome, setFormIncome] = useState('');
  const [formDebts, setFormDebts] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTerm, setFormTerm] = useState('60');
  const [formNotes, setFormNotes] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  // Upload Doc Modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Income Certificate');
  const [newDocContent, setNewDocContent] = useState('');

  const syncFormState = (data) => {
    if (!data) return;
    setFormName(data.client?.full_name || '');
    setFormNatId(data.client?.national_id || '');
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
      setError('Unable to load specified case.');
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

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const updated = await updateCaseStatus(
        caseData.id,
        newStatus,
        `Status updated to ${newStatus}`
      );
      setCaseData(updated);
      syncFormState(updated);
    } catch (err) {
      alert('Error updating status.');
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
        national_id: formNatId,
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
      alert('Error saving underwriting form.');
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
      alert('Could not attach document.');
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
    setActiveTab('documents');
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
        Loading case details...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/30 border border-red-800/40 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'Case not found.'}</p>
        <button
          onClick={() => navigate('/cases')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700 cursor-pointer"
        >
          Return to cases list
        </button>
      </div>
    );
  }

  const isSplitDesktop = isCopilotOpen && copilotViewMode === 'split';

  return (
    <div className="space-y-5 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to cases</span>
        </button>

        {caseData.scenario_tag && (
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#0e172a] border border-[#1e3158] text-slate-300 max-w-full truncate">
            {caseData.scenario_tag === 'discrepancy_case' && 'Demo Scenario 1: Cross-Check Inconsistency (Income €5,200 vs €5,700 & Name John vs Jonathan)'}
            {caseData.scenario_tag === 'expired_id_case' && 'Demo Scenario 2: Critical Edge Case (Expired ID Card → Automated SMS/Email)'}
            {caseData.scenario_tag === 'valid_green_case' && 'Demo Scenario 3: 100% Valid Clean Case (Green Flags & DTI < 40%)'}
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
                Case #{caseData.case_number}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-300 font-mono">
                {caseData.case_type}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#131d30] border border-[#203152] text-slate-400">
                {caseData.department}
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">
              {caseData.title} — Applicant: <strong className="text-white">{caseData.client.full_name}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered: {new Date(caseData.created_at).toLocaleString('en-GB')} • Assigned to: {caseData.assigned_to}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#050811] px-3 py-2 rounded-xl border border-[#192742]">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={caseData.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-[#0e172a] text-xs font-semibold text-white px-2.5 py-1 rounded-lg border border-[#253960] focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="in_progress">In progress</option>
              <option value="in_review">In review</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
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
            <span>{isCopilotOpen ? 'Close AI Copilot' : 'Raiffeisen AI Copilot (Triage & Audit)'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
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

        {/* LEFT PANE: BANKDESK CASE WORKSPACE */}
        <div
          className={`space-y-5 min-w-0 w-full ${
            isSplitDesktop ? 'xl:col-span-6' : 'xl:col-span-12'
          }`}
        >
          <div className={`grid grid-cols-1 ${isSplitDesktop ? 'gap-4' : 'lg:grid-cols-3 gap-5'}`}>
            <div className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Applicant Record</span>
                </div>
                <button
                  onClick={() => setActiveTab('underwriting_sheet')}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Edit manually
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Full Name</span>
                  <span className="text-slate-100 font-semibold">{caseData.client.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">National ID</span>
                  <span className="text-slate-200 font-mono">{caseData.client.national_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">ID Series & Expiry</span>
                  <span className="text-slate-200 font-mono text-xs">
                    {caseData.client.id_card_series || 'ID 892011'} ({caseData.client.id_card_expiry || '2031-05-14'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Employer</span>
                  <span className="text-slate-200 truncate block">{caseData.client.employer || 'Unspecified'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-xs">Permanent Residence</span>
                  <span className="text-slate-200">{caseData.client.address || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#142036] flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-slate-400 block text-xs">Net Monthly Income</span>
                  <span className="text-emerald-400 font-bold text-sm sm:text-base">
                    {caseData.client.monthly_income?.toLocaleString('en-US')} {caseData.currency}
                  </span>
                </div>
                {caseData.requested_amount && (
                  <div className="text-right">
                    <span className="text-slate-400 block text-xs">Loan Requested</span>
                    <span className="text-blue-400 font-bold text-sm sm:text-base">
                      {caseData.requested_amount?.toLocaleString('en-US')} {caseData.currency} ({caseData.loan_term_months} mo)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={`${isSplitDesktop ? '' : 'lg:col-span-2'} p-5 rounded-2xl bg-[#090f1e] border border-[#142036] flex flex-col justify-between space-y-4`}>
              <div>
                <div className="flex items-center justify-between border-b border-[#142036] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Case Remarks & Underwriting History</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Priority: <strong className="text-amber-400 uppercase">{caseData.priority}</strong>
                  </span>
                </div>

                <div className="mt-3 p-3.5 rounded-xl bg-[#050811] border border-[#142036] text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {caseData.notes || 'No additional remarks recorded.'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1629] border border-[#1d2f52] text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {latestAnalysis
                      ? `Latest AI Audit (${latestAnalysis.analysisId}): ${latestAnalysis.metrics?.redFlagsCount || 0} Red Flags, DTI ${latestAnalysis.feasibilityMath?.dti_percentage}%`
                      : 'This file can be audited automatically with the Raiffeisen AI Copilot extension.'}
                  </span>
                </div>
                {!isCopilotOpen && (
                  <button
                    onClick={handleOpenCopilot}
                    className="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 shrink-0 underline cursor-pointer"
                  >
                    {latestAnalysis ? 'View AI Audit Report →' : 'Launch AI Triage →'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142036] pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'documents'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Documents & Source Line Viewer ({caseData.documents.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('underwriting_sheet')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'underwriting_sheet'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Underwriting Sheet (Data Entry)</span>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'tasks'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Tasks ({caseData.tasks.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Audit Trail ({caseData.history_entries.length})</span>
                </button>
              </div>

              {activeTab === 'documents' && (
                <button
                  onClick={() => setShowDocModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#111c33] hover:bg-[#192848] border border-[#21355e] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>

            {/* TAB 1: DOCUMENTS & LINE-BY-LINE VIEWER */}
            {activeTab === 'documents' && (
              <div className={`grid grid-cols-1 ${isSplitDesktop ? 'gap-4' : 'lg:grid-cols-12 gap-5'}`}>
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
                            Type: {selectedDoc.document_type} • Line-numbered document source inspector
                          </p>
                        </div>
                        {highlightedLine && (
                          <span className="px-3 py-1 rounded-lg bg-amber-400/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
                            Line {highlightedLine} highlighted from AI audit
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
                      Select a document from the left to inspect content.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL UNDERWRITING FORM */}
            {activeTab === 'underwriting_sheet' && (
              <form
                onSubmit={handleSaveManualForm}
                className="p-5 sm:p-6 rounded-2xl bg-[#090f1e] border border-[#142036] space-y-5"
              >
                <div className="border-b border-[#142036] pb-3">
                  <h3 className="text-base font-bold text-white">
                    Internal Underwriting & Verification Record (Manual Workflow)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    In traditional banking procedures without AI, the officer cross-checks each PDF manually (~45 mins). With Raiffeisen AI Copilot, validated values can be verified in 3 seconds.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Applicant Legal Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">National ID Number</label>
                    <input
                      type="text"
                      value={formNatId}
                      onChange={(e) => setFormNatId(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Verified Residence Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Confirmed Employer</label>
                    <input
                      type="text"
                      value={formEmployer}
                      onChange={(e) => setFormEmployer(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Net Eligible Monthly Income (EUR)</label>
                    <input
                      type="number"
                      value={formIncome}
                      onChange={(e) => setFormIncome(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Existing Monthly Debt Obligations (EUR)</label>
                    <input
                      type="number"
                      value={formDebts}
                      onChange={(e) => setFormDebts(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Requested Loan Amount (EUR)</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-blue-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Loan Term (Months)</label>
                    <input
                      type="number"
                      value={formTerm}
                      onChange={(e) => setFormTerm(e.target.value)}
                      className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm text-slate-300 font-medium mb-1">Officer Notes & Sign-off</label>
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
                    <span>{savingForm ? 'Saving...' : 'Save Underwriting Record'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: TASKS */}
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {caseData.tasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm bg-[#090f1e] rounded-2xl border border-[#142036]">
                    No active tasks for this case.
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
                            checked={task.status === 'completed'}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                          />
                          <span className={`text-xs sm:text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs self-end sm:self-center">
                          <span className="text-slate-400 font-mono">{task.assigned_to}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                              task.status === 'completed'
                                ? 'bg-emerald-950/50 text-emerald-400'
                                : 'bg-amber-950/50 text-amber-400'
                            }`}
                          >
                            {task.status === 'completed' ? 'Completed' : 'In progress'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUDIT TRAIL */}
            {activeTab === 'history' && (
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
                        <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                      </div>
                      <p className="text-slate-300 mt-1 break-words">{log.details}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Performed by: <span className="text-slate-400 font-medium">{log.performed_by}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: RAIFFEISEN AI COPILOT */}
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

      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Attach Document to Case #{caseData.case_number}</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Revised_Income_Certificate.pdf"
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Document Category</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl px-3 py-2 text-white"
                >
                  <option value="Application Form">Application Form</option>
                  <option value="Income Certificate">Income Certificate</option>
                  <option value="Bank Statement">Bank Statement</option>
                  <option value="ID Card Copy">ID Card Copy</option>
                  <option value="Utility Bill">Utility Bill</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Document Text (OCR Content)</label>
                <textarea
                  rows="5"
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder={"Line 1: REVISED SALARY CERTIFICATE\nLine 2: Employee Name: John Miller\nLine 3: Net Monthly Income: 5,700 EUR"}
                  className="w-full bg-[#050811] border border-[#192742] rounded-xl p-3 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold cursor-pointer"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
