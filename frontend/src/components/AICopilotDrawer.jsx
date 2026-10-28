import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Send,
  Activity,
  X,
  Play,
  ExternalLink,
  Lock,
  Check,
  FileText,
  Mail,
  MessageSquare,
  UserCheck,
  Zap,
  Maximize2,
  Columns,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Cpu,
  User,
  Briefcase,
  Building2,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  ScanSearch
} from 'lucide-react';
import {
  fetchCaseAgents,
  runModularAgent,
  runCaseAnalysis,
  resolveFinding,
  sendRemediationNotification,
  submitHumanDecision
} from '../api/client';

function AgentReportCard({ analysis }) {
  const m = analysis?.metrics;
  if (!m?.agentMode) return null;
  const agentFindings = (analysis.findings || []).filter((f) => f.source === 'review_agent');
  const company = m.companyVerification;
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a1326] border border-violet-500/40 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-300" />
          <h4 className="text-sm sm:text-base font-bold text-white">Autonomous Review Agent</h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
            {analysis.engineUsed}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {m.agentToolCalls}/{m.agentMaxSteps} tool calls • {m.aiProcessingSeconds}s
        </span>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-lg bg-[#101c36] border border-[#1e3158] text-slate-300">
          {agentFindings.length} finding(s) added by the agent
        </span>
        {company && (
          <span className={`px-2 py-1 rounded-lg border ${company.found ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            Employer {company.companyName}: {company.found ? company.status : 'not found in registry'}
          </span>
        )}
        {m.requestedDocuments?.length > 0 && (
          <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            Waiting for: {m.requestedDocuments.map((d) => d.documentType).join(', ')}
          </span>
        )}
        {m.agentUnverified?.length > 0 && (
          <span className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            Not verified: {m.agentUnverified.join('; ')}
          </span>
        )}
      </div>
    </div>
  );
}

const DEFAULT_AGENT_CATALOG = [
  {
    agentId: 'dti_repayment_capacity',
    name: 'DTI & Repayment Capacity Verification Agent',
    shortLabel: '1. DTI & Repayment Capacity',
    color: 'emerald',
    description:
      'Structures income sources, active loan installments, and household living expenses; computes regulatory DTI (40% cap), +2% rate stress-test, and net disposable cashflow.',
    isRecommended: true,
  },
  {
    agentId: 'unusual_transactions',
    name: 'Unusual Transactions & Expense Anomaly Agent',
    shortLabel: '2. Unusual Transactions',
    color: 'purple',
    description:
      'Analyzes 3-month bank statement inflows/outflows, aggregates baseline living expenses, detects unusual spending variations, and isolates unverified ("suspected") signals for officer review.',
    isRecommended: true,
  },
  {
    agentId: 'doc_reconciliation',
    name: 'Document Verification & Data Reconciliation Agent',
    shortLabel: '3. Document Reconciliation',
    color: 'amber',
    description:
      'Extracts structured fields from attached financial and KYC documents, cross-checks them against internal CRM, ANAF, and Financial Profile records, and flags discrepancies.',
    isRecommended: true,
  },
];

export default function AICopilotDrawer({
  isOpen,
  onClose,
  viewMode = 'split',
  onToggleViewMode,
  caseData,
  initialAnalysis,
  onAnalysisUpdated,
  onSelectCitation
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis || null);
  const [agentCatalog, setAgentCatalog] = useState(DEFAULT_AGENT_CATALOG);
  const [runningAll, setRunningAll] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [activeTab, setActiveTab] = useState('modular_hub'); // modular_hub, summary_360, findings, math, remediation, pii_data, trace
  const [showMaskedPii, setShowMaskedPii] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [officerComment, setOfficerComment] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [inlinePreviewDoc, setInlinePreviewDoc] = useState(null);

  useEffect(() => {
    setAnalysis(initialAnalysis || null);
    if (initialAnalysis?.metrics?.modularResults) {
      const autoExpand = {};
      Object.keys(initialAnalysis.metrics.modularResults).forEach((k) => {
        autoExpand[k] = true;
      });
      setExpandedModules((prev) => ({ ...autoExpand, ...prev }));
    }
  }, [initialAnalysis, caseData?.id]);

  useEffect(() => {
    if (!caseData?.id) return;
    fetchCaseAgents(caseData.id)
      .then((data) => {
        if (data?.agents?.length) {
          setAgentCatalog(data.agents);
        }
      })
      .catch((err) => console.error('Failed to load agent catalog:', err));
  }, [caseData?.id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Run a single modular AI agent independently without conflicting with other agents
  const handleRunSingleAgent = async (agentId) => {
    if (!caseData || runningAgentId || runningAll) return;
    try {
      setRunningAgentId(agentId);
      setActiveTab('modular_hub');
      const updatedAnalysis = await runModularAgent(caseData.id, agentId);
      setAnalysis(updatedAnalysis);
      setExpandedModules((prev) => ({ ...prev, [agentId]: true }));
      if (onAnalysisUpdated) onAnalysisUpdated(updatedAnalysis);
      const agentMeta = agentCatalog.find((a) => a.agentId === agentId);
      showToast(`${agentMeta?.shortLabel || agentId} completed via AWS Bedrock!`);
    } catch (err) {
      console.error(err);
      showToast(`Error running agent module: ${agentId}`);
    } finally {
      setRunningAgentId(null);
    }
  };

  // Toggle expand/collapse of a modular analysis card; if not yet run, runs it automatically
  const handleAgentButtonClick = (agentId) => {
    const modularResults = analysis?.metrics?.modularResults || {};
    if (!modularResults[agentId]) {
      handleRunSingleAgent(agentId);
    } else {
      setActiveTab('modular_hub');
      setExpandedModules((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
    }
  };

  // Run all 3 core pillars + generate full 360° client executive summary
  const handleRunAllAgents = async () => {
    if (!caseData || runningAll || runningAgentId) return;
    try {
      setRunningAll(true);
      const res = await runCaseAnalysis(caseData.id, {});
      setAnalysis(res);
      if (res?.metrics?.modularResults) {
        const allOpen = {};
        Object.keys(res.metrics.modularResults).forEach((k) => {
          allOpen[k] = true;
        });
        setExpandedModules(allOpen);
      }
      if (onAnalysisUpdated) onAnalysisUpdated(res);
      showToast('All 3 Core AI Pillars & 360° Client Executive Summary completed!');
    } catch (err) {
      console.error(err);
      showToast('Error executing full AI suite.');
    } finally {
      setRunningAll(false);
    }
  };

  const handleResolveFinding = async (findingId, action, resolvedValue = null) => {
    if (!analysis) return;
    try {
      setActionLoading(true);
      const updated = await resolveFinding(analysis.analysisId, findingId, {
        action,
        resolved_value: resolvedValue,
      });
      setAnalysis(updated);
      if (onAnalysisUpdated) onAnalysisUpdated(updated);
      showToast(
        resolvedValue !== null
          ? `Value "${resolvedValue}" applied to case and DTI recalculated in Python!`
          : 'Finding updated in audit trail!'
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendRemediation = async () => {
    if (!analysis) return;
    try {
      setActionLoading(true);
      const updated = await sendRemediationNotification(analysis.analysisId, {
        channel: 'email_and_sms',
      });
      setAnalysis(updated);
      if (onAnalysisUpdated) onAnalysisUpdated(updated);
      showToast('SMS and Email with secure re-upload link dispatched to customer!');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalDecision = async (decision) => {
    if (!analysis) return;
    try {
      setActionLoading(true);
      const updated = await submitHumanDecision(analysis.analysisId, {
        decision,
        officer_comments: officerComment || undefined,
        apply_extracted_data: true,
      });
      setAnalysis(updated);
      if (onAnalysisUpdated) onAnalysisUpdated(updated);
      const labels = {
        approve: 'Case APPROVED by loan officer (Human-in-the-Loop)!',
        request_clarification: 'Case transitioned to PENDING CLARIFICATION!',
        reject: 'Case REJECTED by loan officer!',
      };
      showToast(labels[decision] || 'Decision recorded!');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCitationClick = (documentId, lineNumber, quote) => {
    if (onSelectCitation) {
      onSelectCitation(documentId, lineNumber, quote);
    }
    const foundDoc = caseData?.documents?.find((d) => d.id === documentId);
    if (foundDoc) {
      setInlinePreviewDoc({
        doc: foundDoc,
        lineNumber,
      });
    }
  };

  if (!isOpen) return null;

  const redFlags = analysis?.findings?.filter((f) => f.flagType === 'red_flag') || [];
  const greenFlags = analysis?.findings?.filter((f) => f.flagType === 'green_flag') || [];
  const modularResults = analysis?.metrics?.modularResults || {};
  const clientSummary360 = analysis?.metrics?.clientSummary360 || null;
  const executedModulesCount = agentCatalog.filter((a) => Boolean(modularResults[a.agentId])).length;

  const renderClientExecutiveSummary360 = (summaryObj) => {
    if (!summaryObj) return null;
    const prof = summaryObj.clientProfile360 || {};
    const fin = summaryObj.financialBalanceSheet || {};
    const pillars = summaryObj.pillarsSynthesis || [];
    const rem = summaryObj.remediation || analysis?.remediation || {};

    const isHold = summaryObj.verdictStatus === 'high_risk_hold';
    const isConditional = summaryObj.verdictStatus === 'conditional_clarification';

    return (
      <div className="rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-[#0b152c] to-[#070d1c] shadow-2xl overflow-hidden space-y-5 p-4 sm:p-6">
        {/* Top Banner of 360° Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1d315c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Complete 360° Client Executive Summary
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {summaryObj.engineUsed}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consolidated dossier synthesis: Identity, Employment, Credit Bureau, Repayment Cashflow & Transaction Behavior
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider border ${
              isHold
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isConditional
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {summaryObj.verdictLabel}
          </span>
        </div>

        {/* Executive AI Synthesis Paragraph */}
        <div className="p-4 rounded-xl bg-[#050a15] border border-amber-400/30 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <span>Executive Underwriting Synthesis (AWS Bedrock)</span>
            <span className="font-mono text-slate-400">{summaryObj.generatedAt}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
            {summaryObj.executiveNarrative}
          </p>
        </div>

        {/* Section 1: 360° Client Demographic, Employment & Credit Bureau Profile */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <User className="w-4 h-4 text-blue-400" />
            <span>1. Client Demographic, Employment & Credit Bureau Profile</span>
          </div>
          <div
            className={`grid gap-2.5 ${
              viewMode === 'expanded' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Applicant & National ID</span>
              <span className="font-bold text-white block mt-0.5 truncate" title={prof.fullName}>
                {prof.fullName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono block truncate">
                ID: {prof.nationalId} • Born {prof.birthDate}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Employer & Contract Tenure</span>
              <span className="font-bold text-white block mt-0.5 truncate" title={prof.employer}>
                {prof.employer}
              </span>
              <span className="text-[11px] text-blue-300 block truncate" title={`${prof.contractType} • ${prof.seniorityCurrent}`}>
                {prof.contractType} • {prof.seniorityCurrent}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Household & Housing Status</span>
              <span className="font-bold text-white block mt-0.5 truncate">
                {prof.maritalStatus} • {prof.dependentsCount} Dependent(s)
              </span>
              <span className="text-[11px] text-slate-300 block truncate" title={prof.housingStatus}>
                {prof.housingStatus}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Credit Bureau & FICO Score</span>
              <span
                className={`font-bold block mt-0.5 ${
                  (prof.ficoScore || 700) >= 680
                    ? 'text-emerald-400'
                    : (prof.ficoScore || 700) >= 620
                    ? 'text-amber-300'
                    : 'text-red-400'
                }`}
              >
                FICO {prof.ficoScore} / 850
              </span>
              <span className="text-[11px] text-slate-300 block truncate" title={prof.creditBureauStatus}>
                {prof.creditBureauStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Consolidated Financial Balance Sheet & Disposable Cashflow */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>2. Consolidated Monthly Cashflow & Debt Sustainability</span>
          </div>
          <div
            className={`grid gap-2.5 ${
              viewMode === 'expanded' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Verified Monthly Income</span>
              <span className="font-bold text-emerald-300 text-sm block mt-0.5">
                €{Number(fin.eligibleMonthlyIncome || 0).toLocaleString('en-US')} / mo
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {fin.supplementalIncome > 0
                  ? `+ €${Number(fin.supplementalIncome).toLocaleString('en-US')} supplemental`
                  : prof.anafConsent
                  ? 'ANAF Electronically Verified'
                  : 'Salary Certificate Verified'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Regular Household Expenses</span>
              <span className="font-bold text-white text-sm block mt-0.5">
                €{Number(fin.regularLivingExpenses || 0).toLocaleString('en-US')} / mo
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {fin.suspectedExpensesCount > 0
                  ? `+ €${fin.suspectedExpensesIsolated} suspected (isolated)`
                  : 'Declared & confirmed baseline'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Total Debt Service & DTI</span>
              <span
                className={`font-bold text-sm block mt-0.5 ${
                  (fin.dtiPercentage || 0) > 40 ? 'text-red-400' : 'text-blue-300'
                }`}
              >
                {fin.dtiPercentage}% DTI (€{Number(fin.totalMonthlyDebtService || 0).toLocaleString('en-US')}/mo)
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                New: €{fin.proposedNewInstallment}/mo + Existing: €{fin.existingMonthlyDebts}/mo
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#060c1a] border border-[#172646] text-xs min-w-0">
              <span className="text-slate-400 block text-[11px]">Net Disposable Cashflow</span>
              <span
                className={`font-bold text-sm block mt-0.5 ${
                  (fin.netDisposableCashflow || 0) < 300 ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                €{Number(fin.netDisposableCashflow || 0).toLocaleString('en-US')} / mo left
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                Account Reserve: €{Number(fin.closingBankBalance || 0).toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: 3-Pillar Verification Status Matrix */}
        {pillars.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>3. Synthesis Across the 3 Core Verification Pillars</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {pillars.map((p) => {
                const isWarn = p.status === 'action_required' || p.status === 'needs_review' || p.status === 'critical';
                return (
                  <div
                    key={p.agentId}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isWarn
                        ? 'bg-amber-950/20 border-amber-500/35'
                        : 'bg-emerald-950/15 border-emerald-500/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{p.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isWarn
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{p.summary}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('modular_hub');
                        setExpandedModules((prev) => ({ ...prev, [p.agentId]: true }));
                      }}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 shrink-0 underline cursor-pointer self-start sm:self-center"
                    >
                      Inspect Pillar →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Integrated Smart Remediation Action (if discrepancies exist) */}
        {rem?.required && (
          <div className="p-4 rounded-xl bg-[#070f20] border border-amber-400/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Send className="w-4 h-4" />
                <span>Recommended Remediation Outreach ({rem.recipientEmail} • {rem.recipientPhone})</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-400/15 text-amber-300">
                {rem.status === 'sent_by_officer' ? `SENT (${rem.sentAt})` : 'READY FOR DISPATCH'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Trigger Reason: <strong className="text-white">{rem.triggerReason}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSendRemediation}
                disabled={actionLoading || rem.status === 'sent_by_officer'}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {rem.status === 'sent_by_officer'
                    ? 'Clarification Link Already Sent'
                    : 'Send Email & SMS Clarification Link'}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('remediation')}
                className="px-3 py-2 rounded-xl bg-[#0c1730] hover:bg-[#132448] border border-[#223867] text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Preview Full Email & SMS Draft
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl bg-[#080f20] border-2 border-amber-400/40 shadow-[0_10px_50px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
      {/* Top Extension Header */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#0e172c] via-[#131e38] to-[#1a1c2e] border-b border-[#223254] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white tracking-tight">
                Raiffeisen AI Copilot
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30">
                3-Pillar Underwriting & 360° Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Case #{caseData?.case_number} ({caseData?.title})</span>
              <span>•</span>
              <span className="text-blue-400 flex items-center gap-1 font-medium">
                <Cpu className="w-3 h-3" /> {analysis?.metrics?.agentMode ? 'Claude on AWS Bedrock' : 'AWS Bedrock (Nova Pro)'}
              </span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> GDPR Shield Active
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunAllAgents}
            disabled={runningAll || Boolean(runningAgentId)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Play className={`w-3.5 h-3.5 fill-slate-950 ${runningAll ? 'animate-spin' : ''}`} />
            <span>{runningAll ? 'Running Full Analysis...' : 'Run Full Analysis + 360° Summary'}</span>
          </button>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#091020] hover:bg-[#111e3b] border border-[#24375e] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              title={viewMode === 'split' ? 'Expand Copilot to Full Width' : 'Dock Copilot Side-by-Side (Split-View)'}
            >
              {viewMode === 'split' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <Columns className="w-3.5 h-3.5 text-amber-400" />
                  <span>Split-View</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#091020] hover:bg-red-950/60 border border-[#24375e] hover:border-red-500/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close AI Copilot Extension"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 CORE PILLARS SELECTOR BAR */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#060b17] border-b border-[#192848] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>3 Specialized AI Verification Pillars + Complete 360° Client Summary:</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Dossier Type: <strong className="text-amber-300">{caseData?.case_type || caseData?.title}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {agentCatalog.map((agent) => {
            const modResult = modularResults[agent.agentId];
            const isRunningThis = runningAgentId === agent.agentId;
            const isExpanded = Boolean(expandedModules[agent.agentId]);
            const hasWarning =
              modResult &&
              (modResult.status === 'action_required' ||
                modResult.status === 'needs_review' ||
                modResult.status === 'critical');

            return (
              <div
                key={agent.agentId}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all min-w-0 overflow-hidden ${
                  isRunningThis
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40 animate-pulse'
                    : modResult
                    ? isExpanded
                      ? 'bg-[#0f1d38] border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                      : 'bg-[#0b1428] border-blue-500/40 hover:border-blue-400/60'
                    : 'bg-[#091020] border-[#182744] hover:border-slate-600'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                      ★ Core Pillar
                    </span>

                    {modResult && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          hasWarning
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {modResult.badgeText}
                      </span>
                    )}
                  </div>

                  <div
                    className="text-xs sm:text-sm font-bold text-white leading-snug truncate"
                    title={agent.shortLabel}
                  >
                    {agent.shortLabel}
                  </div>
                  <p
                    className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug"
                    title={agent.description}
                  >
                    {agent.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5">
                  <button
                    onClick={() => handleAgentButtonClick(agent.agentId)}
                    disabled={isRunningThis || runningAll}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0 ${
                      modResult
                        ? isExpanded
                          ? 'bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow'
                          : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm font-bold'
                    }`}
                  >
                    {isRunningThis ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="truncate">Running...</span>
                      </>
                    ) : modResult ? (
                      <>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{isExpanded ? 'Hide Report' : 'Expand Report'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current shrink-0" />
                        <span className="truncate">Run Pillar</span>
                      </>
                    )}
                  </button>

                  {modResult && (
                    <button
                      onClick={() => handleRunSingleAgent(agent.agentId)}
                      disabled={isRunningThis || runningAll}
                      title="Re-run this specific AI pillar"
                      className="p-1.5 rounded-lg bg-[#070c18] hover:bg-[#132242] border border-[#1f325a] hover:border-amber-400 text-slate-300 hover:text-amber-300 cursor-pointer shrink-0 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRunningThis ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toastMsg && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* INLINE DOCUMENT CITATION PREVIEW */}
      {inlinePreviewDoc && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-[#050914] border-2 border-amber-400/60 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Source Excerpt: {inlinePreviewDoc.doc.file_name}</span>
              <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 font-mono text-xs">
                Line {inlinePreviewDoc.lineNumber}
              </span>
            </div>
            <button
              onClick={() => setInlinePreviewDoc(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              title="Close inline preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl bg-[#080f1e] border border-[#192948] p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
            {(inlinePreviewDoc.doc.content_text || '').split('\n').map((line, i) => {
              const lNum = i + 1;
              const isTarget = lNum === inlinePreviewDoc.lineNumber;
              return (
                <div
                  key={i}
                  className={`px-2.5 py-1 rounded ${
                    isTarget
                      ? 'bg-amber-400/25 border-l-4 border-amber-400 text-white font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!analysis && !runningAll && !runningAgentId ? (
        <div className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-300">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-white">
              3-Pillar AI Analysis & 360° Client Summary Ready
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Select any of the <strong>3 Core AI Pillars</strong> above (1. DTI & Repayment Capacity, 2. Unusual Transactions, 3. Document Reconciliation) or click <strong>Run Full Analysis + 360° Summary</strong> to generate the complete client underwriting report.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="px-4 sm:px-6 pt-3 bg-[#091224] border-b border-[#1b2c4d] flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('modular_hub')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'modular_hub'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>3 Pillars & 360° Report ({executedModulesCount}/3)</span>
            </button>

            <button
              onClick={() => setActiveTab('summary_360')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'summary_360'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>360° Client Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('findings')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'findings'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>All Citations & Flags</span>
              {redFlags.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                  {redFlags.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('math')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'math'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Python Math ({analysis?.feasibilityMath?.dti_percentage}%)</span>
            </button>

            <button
              onClick={() => setActiveTab('remediation')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'remediation'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Customer Outreach</span>
            </button>

            <button
              onClick={() => setActiveTab('pii_data')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'pii_data'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>GDPR & OCR</span>
            </button>

            <button
              onClick={() => setActiveTab('trace')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'trace'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Trace ({analysis?.executionTrace?.length || 0})</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* TAB: DEDICATED 360° CLIENT SUMMARY */}
            {activeTab === 'summary_360' && renderClientExecutiveSummary360(clientSummary360)}

            {/* TAB 0: 3 CORE PILLARS + COMPLETE 360° CLIENT SUMMARY AT THE BOTTOM */}
            {activeTab === 'modular_hub' && (
              <div className="space-y-5">
                <AgentReportCard analysis={analysis} />
                {executedModulesCount === 0 && !clientSummary360 ? (
                  <div className="p-6 rounded-2xl bg-[#0a1326] border border-[#1b2d50] text-center space-y-3">
                    <p className="text-sm text-slate-300">
                      Click any of the 3 Core Pillar buttons above or <strong>Run Full Analysis + 360° Summary</strong> to generate the modular verification reports.
                    </p>
                  </div>
                ) : (
                  <>
                    {agentCatalog.map((agent) => {
                      const mod = modularResults[agent.agentId];
                      if (!mod) return null;
                      const isExpanded = Boolean(expandedModules[agent.agentId]);
                      const isAlert =
                        mod.status === 'action_required' ||
                        mod.status === 'needs_review' ||
                        mod.status === 'critical';

                      return (
                        <div
                          key={agent.agentId}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isAlert
                              ? 'bg-[#140d18]/90 border-amber-500/45'
                              : 'bg-[#0a1428] border-emerald-500/35'
                          }`}
                        >
                          {/* Expandable Module Header */}
                          <div
                            onClick={() =>
                              setExpandedModules((prev) => ({
                                ...prev,
                                [agent.agentId]: !prev[agent.agentId],
                              }))
                            }
                            className="px-4 sm:px-5 py-3.5 bg-[#0d1830] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-[#122142] transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  isAlert
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {mod.badgeText}
                              </span>
                              <h4 className="text-sm sm:text-base font-bold text-white">
                                {mod.name}
                              </h4>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-mono text-blue-300 hidden sm:inline">
                                {mod.engineUsed}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-300" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                          </div>

                          {/* Expandable Module Body */}
                          {isExpanded && (
                            <div className="p-4 sm:p-5 space-y-4">
                              {/* AWS Bedrock Executive Synthesis */}
                              <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#1b2d52] space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold uppercase tracking-wider">
                                  <span>AWS Bedrock Agent Assessment</span>
                                  <span className="font-mono text-slate-400">{mod.executedAt}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                                  {mod.aiNarrative}
                                </p>
                              </div>

                              {/* Key Highlights Grid */}
                              {mod.highlights && mod.highlights.length > 0 && (
                                <div
                                  className={`grid gap-2.5 ${
                                    viewMode === 'expanded'
                                      ? 'grid-cols-2 sm:grid-cols-4'
                                      : 'grid-cols-1 sm:grid-cols-2'
                                  }`}
                                >
                                  {mod.highlights.map((h, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-xl bg-[#070d1b] border border-[#162442] text-xs min-w-0 overflow-hidden"
                                    >
                                      <span
                                        className="text-slate-400 block text-[11px] font-medium truncate"
                                        title={h.label}
                                      >
                                        {h.label}
                                      </span>
                                      <span
                                        title={String(h.value)}
                                        className={`font-bold text-xs sm:text-sm block mt-1 truncate ${
                                          h.status === 'critical'
                                            ? 'text-red-400'
                                            : h.status === 'warning'
                                            ? 'text-amber-300'
                                            : 'text-emerald-300'
                                        }`}
                                      >
                                        {h.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* PILLAR 1 SPECIFIC: Missing / Contradictory Financial Data & Active Credits */}
                              {mod.structuredData && (
                                <div className="space-y-3">
                                  {mod.structuredData.contradictionsAndMissing?.length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-2">
                                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                                        Contradictory or Missing Financial Data Flagged:
                                      </span>
                                      {mod.structuredData.contradictionsAndMissing.map((c, idx) => (
                                        <div key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                          <div>
                                            <strong className="text-white">{c.field}:</strong> {c.issue}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {mod.structuredData.obligations?.activeCreditsList?.length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-[#070d1b] border border-[#162442] space-y-2">
                                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                                        Active & Overdue Credit Obligations (Financial Profile):
                                      </span>
                                      <div className="grid grid-cols-1 gap-2">
                                        {mod.structuredData.obligations.activeCreditsList.map((cr, i) => (
                                          <div
                                            key={i}
                                            className="p-2.5 rounded-lg bg-[#050914] border border-[#15223c] flex flex-wrap items-center justify-between gap-2 text-xs"
                                          >
                                            <div>
                                              <span className="font-bold text-white">{cr.lender}</span>{' '}
                                              <span className="text-slate-400">({cr.creditType})</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <span className="text-slate-300">
                                                Balance: <strong>€{cr.remainingBalance.toLocaleString('en-US')}</strong>
                                              </span>
                                              <span className="text-amber-300 font-bold">
                                                €{cr.monthlyPayment.toLocaleString('en-US')} / mo
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* PILLAR 2 SPECIFIC: Unusual Transactions & Isolated Suspected Expenses */}
                              {mod.transactionBreakdown && (
                                <div className="space-y-3">
                                  {mod.transactionBreakdown.suspectedSignals?.length > 0 ? (
                                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/45 space-y-2.5">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                                          Isolated Unverified ("Suspected") Signals — For Officer Verification:
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 font-semibold">
                                          Excluded from baseline living total
                                        </span>
                                      </div>
                                      {mod.transactionBreakdown.suspectedSignals.map((sig, i) => (
                                        <div
                                          key={i}
                                          className="p-3 rounded-lg bg-[#060b16] border border-amber-500/30 space-y-1 text-xs"
                                        >
                                          <div className="flex items-center justify-between font-bold">
                                            <span className="text-white">{sig.category}</span>
                                            <span className="text-amber-300">
                                              €{Number(sig.monthlyAmount).toLocaleString('en-US')} / month ({sig.verificationStatus})
                                            </span>
                                          </div>
                                          <p className="text-slate-300 text-[11px]">
                                            <strong>Evidence Note:</strong> {sig.evidenceNote}
                                          </p>
                                          <p className="text-amber-200/90 text-[11px] italic">
                                            {sig.actionRequired}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <span>
                                        No unverified ("suspected") merchant signals or unusual monthly spending spikes detected across account statements and expense records.
                                      </span>
                                    </div>
                                  )}

                                  {mod.transactionBreakdown.salaryInflows?.length > 0 && (
                                    <div className="p-3.5 rounded-xl bg-[#070d1b] border border-[#162442] space-y-2">
                                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                                        Observed 3-Month Bank Statement Salary Inflows ({mod.transactionBreakdown.bankStatementDocument}):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {mod.transactionBreakdown.salaryInflows.map((inf, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() =>
                                              handleCitationClick(inf.documentId, inf.lineNumber, inf.quote)
                                            }
                                            className="p-2.5 rounded-lg bg-[#050914] hover:bg-[#0e1b36] border border-[#182744] hover:border-amber-400 text-left text-xs cursor-pointer transition-colors"
                                          >
                                            <span className="text-slate-400 block text-[11px]">{inf.month}</span>
                                            <span className="font-bold text-emerald-300 block mt-0.5">
                                              +€{Number(inf.amount).toLocaleString('en-US')}
                                            </span>
                                            <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                                              Line {inf.lineNumber} <ExternalLink className="w-2.5 h-2.5" />
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* PILLAR 3 SPECIFIC: 3-Way Data Reconciliation Matrix */}
                              {mod.reconciliationMatrix && mod.reconciliationMatrix.length > 0 && (
                                <div className="p-3.5 rounded-xl bg-[#070d1b] border border-[#162442] space-y-2.5 overflow-x-auto">
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                                    3-Way Data Reconciliation Matrix (Documents vs. System/ANAF vs. Financial Profile):
                                  </span>
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-[#1b2c4e] text-slate-400 text-[11px]">
                                        <th className="py-2 pr-2">Dimension</th>
                                        <th className="py-2 px-2">Extracted from Docs</th>
                                        <th className="py-2 px-2">System / ANAF</th>
                                        <th className="py-2 px-2">Financial Profile</th>
                                        <th className="py-2 pl-2 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#13203a]">
                                      {mod.reconciliationMatrix.map((row, rIdx) => {
                                        const isMismatch = row.status === 'mismatch';
                                        return (
                                          <tr key={rIdx} className={isMismatch ? 'bg-red-950/20' : ''}>
                                            <td className="py-2 pr-2 font-semibold text-white">
                                              {row.dimension}
                                              <span className="block text-[10px] font-mono text-slate-400">
                                                {row.ruleRef}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2 text-slate-200 font-mono text-[11px]">
                                              {row.documentsValue}
                                            </td>
                                            <td className="py-2 px-2 text-slate-200 font-mono text-[11px]">
                                              {row.systemRecordValue}
                                            </td>
                                            <td className="py-2 px-2 text-slate-200 font-mono text-[11px]">
                                              {row.financialProfileValue}
                                            </td>
                                            <td className="py-2 pl-2 text-right">
                                              <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                  isMismatch
                                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                }`}
                                              >
                                                {isMismatch ? 'MISMATCH' : 'MATCHED'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Module-Specific Findings & Interactive Citations */}
                              {mod.findings && mod.findings.length > 0 && (
                                <div className="space-y-2.5">
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                                    Document Citations & Interactive Resolution:
                                  </span>
                                  {mod.findings.map((f) => {
                                    const isRed = f.flagType === 'red_flag';
                                    const isResolved =
                                      f.status === 'resolved_by_officer' || f.status === 'confirmed_by_officer';
                                    return (
                                      <div
                                        key={f.id}
                                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                                          isResolved
                                            ? 'bg-[#0a1628] border-blue-500/40'
                                            : isRed
                                            ? 'bg-red-950/25 border-red-500/40'
                                            : 'bg-emerald-950/20 border-emerald-500/30'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <span className="text-xs sm:text-sm font-bold text-white">
                                            {f.title}
                                          </span>
                                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                                            {f.ruleRef}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-300">{f.description}</p>

                                        {f.values && f.values.length > 0 && (
                                          <div className="grid grid-cols-1 gap-1.5">
                                            {f.values.map((v, i) => (
                                              <button
                                                key={i}
                                                onClick={() =>
                                                  handleCitationClick(v.documentId, v.lineNumber, v.quote)
                                                }
                                                className="w-full text-left p-2.5 rounded-lg bg-[#050914] hover:bg-[#0e1b36] border border-[#1a2b4c] hover:border-amber-400 flex items-center justify-between gap-2 text-xs cursor-pointer"
                                              >
                                                <div className="truncate">
                                                  <span className="font-semibold text-blue-300">
                                                    {v.documentName} (Line {v.lineNumber}):
                                                  </span>{' '}
                                                  <span className="font-mono text-slate-300">"{v.quote}"</span>
                                                </div>
                                                <span className="text-amber-400 shrink-0 font-semibold flex items-center gap-1">
                                                  {v.formattedValue || v.value}{' '}
                                                  <ExternalLink className="w-3 h-3" />
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        )}

                                        {isRed && f.selectableValues && f.selectableValues.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2 pt-1">
                                            {f.selectableValues.map((val, idx) => (
                                              <button
                                                key={idx}
                                                disabled={actionLoading}
                                                onClick={() =>
                                                  handleResolveFinding(f.id, 'override_value', val)
                                                }
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>
                                                  Validate & Apply:{' '}
                                                  {typeof val === 'number'
                                                    ? `€${val.toLocaleString('en-US')}`
                                                    : val}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* COMPLETE 360° CLIENT EXECUTIVE SUMMARY AT THE END OF THE ANALYSIS */}
                    {clientSummary360 && renderClientExecutiveSummary360(clientSummary360)}
                  </>
                )}
              </div>
            )}

            {/* TAB 1: ALL CITATIONS & FLAGS */}
            {activeTab === 'findings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                    All Cross-Document Verification Findings:
                  </span>
                  <span className="text-xs text-slate-400">
                    Click any citation to preview the exact line in the source document
                  </span>
                </div>

                {analysis?.findings?.map((f) => {
                  const isRed = f.flagType === 'red_flag';
                  const isResolved = f.status === 'resolved_by_officer' || f.status === 'confirmed_by_officer';
                  return (
                    <div
                      key={f.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                        isResolved
                          ? 'bg-[#0a1628] border-blue-500/50'
                          : isRed
                          ? 'bg-[#190d14]/90 border-red-500/45'
                          : 'bg-[#081917]/80 border-emerald-500/35'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700">
                              {f.ruleRef}
                            </span>
                            {isResolved && (
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                ✓ Reviewed by Officer {f.resolvedValue ? `(${f.resolvedValue})` : ''}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white mt-2">
                            {f.title}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {f.description}
                      </p>

                      {f.values && f.values.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                            Evidence & Source Citations (Regulatory Audit Trail):
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {f.values.map((v, i) => (
                              <button
                                key={i}
                                onClick={() => handleCitationClick(v.documentId, v.lineNumber, v.quote)}
                                className="w-full text-left p-3 rounded-xl bg-[#060b16] hover:bg-[#0e1b36] border border-[#1a2b4c] hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group cursor-pointer"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-300 group-hover:text-amber-300 flex-wrap">
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{v.documentName}</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono text-xs shrink-0">
                                      Line {v.lineNumber}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-mono mt-1.5 break-words">
                                    "{v.quote}"
                                  </p>
                                </div>
                                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                                  <span className="text-sm font-bold text-white block">
                                    {v.formattedValue || v.value}
                                  </span>
                                  <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                                    Inspect line <ExternalLink className="w-3 h-3" />
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isRed && (
                        <div className="pt-3 border-t border-white/10 space-y-2.5">
                          <div className="text-xs sm:text-sm text-amber-300 font-medium">
                            💡 Recommendation: {f.suggestedAction}
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            {f.selectableValues && f.selectableValues.length > 0 ? (
                              f.selectableValues.map((val, idx) => (
                                <button
                                  key={idx}
                                  disabled={actionLoading}
                                  onClick={() => handleResolveFinding(f.id, 'override_value', val)}
                                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    String(f.resolvedValue) === String(val)
                                      ? 'bg-emerald-500 text-slate-950 font-bold'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span>
                                    Validate & Apply:{' '}
                                    {typeof val === 'number' ? `€${val.toLocaleString('en-US')}` : val}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleResolveFinding(f.id, 'confirm')}
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold cursor-pointer"
                              >
                                Mark as Verified by Officer
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: DETERMINISTIC PYTHON MATH */}
            {activeTab === 'math' && analysis?.feasibilityMath && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    <strong>Zero-Hallucination Guarantee:</strong> Financial indicators, monthly annuity installments, and Debt-to-Income (DTI) ratios are computed strictly in deterministic Python code, never estimated by an LLM.
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0b1325] border border-[#1c2e54] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Debt-to-Income Ratio (DTI)
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
                        {analysis.feasibilityMath.dti_percentage}%
                        <span className="text-sm font-normal text-slate-400 ml-2">
                          (Max Ceiling: {analysis.feasibilityMath.max_allowed_dti_percentage}%)
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                        analysis.feasibilityMath.is_feasible
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {analysis.feasibilityMath.status_label}
                    </span>
                  </div>

                  <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        analysis.feasibilityMath.dti_percentage <= 40 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, analysis.feasibilityMath.dti_percentage)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                      style={{ left: '40%' }}
                      title="Regulatory Ceiling: 40%"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>0%</span>
                    <span className="text-amber-400 font-semibold">Regulatory Limit: 40%</span>
                    <span>100%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#16233d] text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Requested Loan</span>
                      <span className="font-bold text-white text-base">
                        €{analysis.feasibilityMath.requested_amount?.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        over {analysis.feasibilityMath.loan_term_months} months ({analysis.feasibilityMath.annual_interest_rate_percent}%/yr)
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Monthly Installment</span>
                      <span className="font-bold text-blue-400 text-base">
                        €{analysis.feasibilityMath.calculated_monthly_installment}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        + €{analysis.feasibilityMath.existing_monthly_debts} existing obligations
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Eligible Monthly Income</span>
                      <span className="font-bold text-emerald-400 text-base">
                        €{analysis.feasibilityMath.monthly_income_used?.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Total Debt Service: €{analysis.feasibilityMath.total_monthly_debt_service}/mo
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050811] border border-slate-800 font-mono text-xs text-slate-300">
                    Formula: {analysis.feasibilityMath.formula_used}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REMEDIATION & CUSTOMER OUTREACH */}
            {activeTab === 'remediation' && analysis?.remediation && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1326] border border-[#1e3158] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                        Automated Customer Remediation Bridge
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {analysis.remediation.required
                          ? `Trigger: ${analysis.remediation.triggerReason}`
                          : 'No Remediation Needed — All Documents Valid'}
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        analysis.remediation.status === 'sent_by_officer'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : analysis.remediation.required
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {analysis.remediation.status === 'sent_by_officer'
                        ? `Dispatched (${analysis.remediation.sentAt})`
                        : analysis.remediation.status}
                    </span>
                  </div>

                  {analysis.remediation.required && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-300">
                          <MessageSquare className="w-4 h-4" />
                          <span>SMS Preview ({analysis.remediation.recipientPhone}):</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#182744] text-xs sm:text-sm text-slate-200 font-mono">
                          {analysis.remediation.smsPreview}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-300">
                          <Mail className="w-4 h-4" />
                          <span>Email Preview ({analysis.remediation.recipientEmail}):</span>
                        </div>
                        <div className="p-4 rounded-xl bg-[#060b16] border border-[#182744] space-y-2 text-xs sm:text-sm">
                          <div className="font-bold text-white border-b border-slate-800 pb-2">
                            Subject: {analysis.remediation.emailSubject}
                          </div>
                          <pre className="text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                            {analysis.remediation.emailBody}
                          </pre>
                        </div>
                      </div>

                      <button
                        disabled={actionLoading || analysis.remediation.status === 'sent_by_officer'}
                        onClick={handleSendRemediation}
                        className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>
                          {analysis.remediation.status === 'sent_by_officer'
                            ? 'Clarification Request Already Sent to Customer'
                            : 'Approve & Dispatch SMS + Email with Secure Re-Upload Link'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: GDPR PII SHIELD & EXTRACTED OCR */}
            {activeTab === 'pii_data' && (
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm sm:text-base">
                      <Lock className="w-4 h-4" />
                      <span>Local PII Anonymization Shield (GDPR Art. 4 & 32)</span>
                    </div>
                    <button
                      onClick={() => setShowMaskedPii(!showMaskedPii)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 cursor-pointer"
                    >
                      {showMaskedPii ? 'Show Re-Hydrated Officer View' : 'Show Masked LLM Tokens'}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {analysis?.piiMasking?.explanation}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {analysis?.piiMasking?.tokens?.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#060b16] border border-[#16233d] text-xs">
                        <span className="text-slate-400 block">{t.category}</span>
                        <span className="font-mono font-bold text-amber-300 text-sm block mt-1 break-all">
                          {showMaskedPii ? t.masked_token : t.original_preview}
                        </span>
                        <span className="text-[11px] text-emerald-400/80 block mt-1">{t.gdpr_article}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EXECUTION TRACE */}
            {activeTab === 'trace' && (
              <div className="space-y-5">
                <AgentReportCard analysis={analysis} />
                <div className="space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400">
                    Execution Trace (Technical Audit Trail):
                  </h4>
                  {analysis?.executionTrace?.map((step, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#0a1224] border border-[#192846] space-y-1.5 text-xs sm:text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          Step {step.step}: {step.agent}
                        </span>
                        <span className="font-mono text-xs text-emerald-400">
                          {step.durationMs} ms • {step.status}
                        </span>
                      </div>
                      <div className="text-xs text-blue-300 font-mono">
                        Tool: {step.tool}{step.toolInput ? `(${step.toolInput})` : ''} ({step.executionMode})
                      </div>
                      {step.reason && (
                        <p className="text-xs text-violet-300 italic">Why: {step.reason}</p>
                      )}
                      <p className="text-slate-300">{step.outputSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Final Human-in-the-Loop Decision Bar */}
          <div className="p-4 sm:p-5 bg-[#0a1326] border-t border-[#1e3158] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Final Credit Officer Decision (Human-in-the-Loop):
              </span>
              <span className="text-xs text-slate-400">
                AI prepares 3-pillar audit & 360° summary • Human takes lending decision
              </span>
            </div>

            <input
              type="text"
              value={officerComment}
              onChange={(e) => setOfficerComment(e.target.value)}
              placeholder="Optional: Enter officer remarks or resolution for regulatory audit..."
              className="w-full bg-[#050811] border border-[#1b2c4e] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('approve')}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Case</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('request_clarification')}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Request Clarification</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('reject')}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Reject Case</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
