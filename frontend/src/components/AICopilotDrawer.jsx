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
  Cpu
} from 'lucide-react';
import {
  fetchCaseAgents,
  runModularAgent,
  runCaseAnalysis,
  resolveFinding,
  sendRemediationNotification,
  submitHumanDecision
} from '../api/client';

const DEFAULT_AGENT_CATALOG = [
  {
    agentId: 'kyc_identity',
    name: 'KYC & Identity Verification Agent',
    shortLabel: 'KYC & Identity Audit',
    color: 'blue',
    description: 'Audits National ID validity, expiration dates, legal name consistency across documents, and residential address matching.',
    isRecommended: true,
  },
  {
    agentId: 'income_crosscheck',
    name: 'Income & Employer Cross-Check Agent',
    shortLabel: 'Income Cross-Check',
    color: 'amber',
    description: 'Reconciles net monthly income and employer data across Application Forms, Salary Certificates, and Bank Statements.',
    isRecommended: true,
  },
  {
    agentId: 'dti_affordability',
    name: 'DTI & Interest Rate Stress-Test Agent',
    shortLabel: 'DTI & Stress-Test',
    color: 'emerald',
    description: 'Executes deterministic Python annuity math, 40% regulatory DTI ceiling verification, and +2.0% interest rate shock simulation.',
    isRecommended: true,
  },
  {
    agentId: 'aml_fraud_risk',
    name: 'AML & Fraud Anomaly Detector',
    shortLabel: 'AML & Fraud Screening',
    color: 'purple',
    description: 'Screens account statements and applicant metadata for anti-money laundering (AML) flags, identity anomalies, and behavioral risks.',
    isRecommended: true,
  },
  {
    agentId: 'smart_remediation',
    name: 'Client Remediation & Comms Agent',
    shortLabel: 'Smart Remediation',
    color: 'rose',
    description: 'Drafts personalized customer SMS & Email notifications with encrypted document re-upload links via AWS Bedrock.',
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
  const [activeTab, setActiveTab] = useState('modular_hub'); // modular_hub, findings, math, remediation, pii_data, trace
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

  // Run all agents in the suite
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
      showToast('All Modular AI Agents executed successfully via AWS Bedrock!');
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
  const executedModulesCount = Object.keys(modularResults).length;

  return (
    <div className="w-full rounded-2xl bg-[#080f20] border-2 border-amber-400/40 shadow-[0_10px_50px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
      {/* Top Extension Header (No manual API key input — uses backend AWS key automatically) */}
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
                Modular Multi-Agent Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Case #{caseData?.case_number} ({caseData?.title})</span>
              <span>•</span>
              <span className="text-blue-400 flex items-center gap-1 font-medium">
                <Cpu className="w-3 h-3" /> AWS Bedrock (Nova Pro)
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
            <span>{runningAll ? 'Running All Agents...' : 'Run Full Agent Suite'}</span>
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

      {/* MODULAR AGENT SELECTOR BAR: Separate button for each type of analysis */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#060b17] border-b border-[#192848] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Select Specialized AI Analysis Module (Independent & Conflict-Free):</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Case Type: <strong className="text-amber-300">{caseData?.case_type || caseData?.title}</strong>
          </span>
        </div>

        <div
          className={`grid gap-3 ${
            viewMode === 'expanded'
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
          }`}
        >
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
                className={`rounded-xl border p-3 flex flex-col justify-between transition-all min-w-0 overflow-hidden ${
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
                    {agent.isRecommended ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                        ★ Recommended
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                        Optional Module
                      </span>
                    )}

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
                        <span className="truncate">Run Agent</span>
                      </>
                    )}
                  </button>

                  {modResult && (
                    <button
                      onClick={() => handleRunSingleAgent(agent.agentId)}
                      disabled={isRunningThis || runningAll}
                      title="Re-run this specific AI agent"
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
                  key={lNum}
                  className={`px-2.5 py-1 rounded flex items-start gap-2.5 ${
                    isTarget
                      ? 'bg-amber-400/25 border border-amber-400 text-amber-100 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="w-5 text-right text-slate-500 select-none shrink-0">{lNum}</span>
                  <span className="flex-1 break-words">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!analysis && !runningAll && !runningAgentId ? (
        <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-lg space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Modular AI Copilot Ready for Case #{caseData?.case_number}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Click any <strong>Specialized AI Analysis Button</strong> above to run only the module you need (e.g. <em>KYC Audit</em>, <em>Income Cross-Check</em>, <em>DTI Stress-Test</em>, <em>AML Screening</em>, or <em>Smart Remediation</em>), or run the full suite at once.
            </p>
          </div>
        </div>
      ) : runningAll ? (
        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
          <div className="w-12 h-12 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="text-base font-bold text-white">
              Executing Modular AI Agents on AWS Bedrock...
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              PII Anonymization Shield → OCR Line Extraction → Policy & Deterministic Math → Bedrock Nova Pro Synthesis
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Navigation Bar between Modular Hub and Deep-Dive Views */}
          <div className="px-4 sm:px-6 pt-3 bg-[#070d1b] border-b border-[#16233d] flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('modular_hub')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'modular_hub'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Modular Reports ({executedModulesCount})</span>
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

          <div className="p-4 sm:p-6 space-y-4">
            {/* TAB 0: EXPANDABLE MODULAR REPORTS HUB (NO CONFLICTS BETWEEN MODULES) */}
            {activeTab === 'modular_hub' && (
              <div className="space-y-4">
                {executedModulesCount === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0a1326] border border-[#1b2d50] text-center space-y-3">
                    <p className="text-sm text-slate-300">
                      Click any of the 5 modular agent buttons above to execute and expand its dedicated report.
                    </p>
                  </div>
                ) : (
                  agentCatalog.map((agent) => {
                    const mod = modularResults[agent.agentId];
                    if (!mod) return null;
                    const isExpanded = Boolean(expandedModules[agent.agentId]);
                    const isAlert = mod.status === 'action_required' || mod.status === 'needs_review' || mod.status === 'critical';

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

                            {/* Quick Action for Smart Remediation Module */}
                            {agent.agentId === 'smart_remediation' && mod.remediation?.required && (
                              <div className="p-3.5 rounded-xl bg-[#070d1b] border border-[#1b2e54] space-y-2.5">
                                <div className="text-xs font-semibold text-amber-300">
                                  Generated Email Preview ({mod.remediation.recipientEmail}):
                                </div>
                                <pre className="p-3 rounded-lg bg-[#050811] border border-[#15223c] text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                                  {mod.remediation.emailBody}
                                </pre>
                                <button
                                  onClick={handleSendRemediation}
                                  disabled={actionLoading}
                                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Dispatch SMS & Email with Secure Upload Link</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 1: AUDIT & FINDINGS */}
            {activeTab === 'findings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-400">
                  <span>
                    Click any <strong>source citation</strong> to automatically highlight the corresponding line in the document.
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-semibold">
                    {redFlags.length} Red Flags (Alerts) • {greenFlags.length} Green Flags (Validated)
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
                                      ? 'bg-emerald-600 text-white shadow-md'
                                      : 'bg-blue-600/25 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                  <span>
                                    Validate & Apply:{' '}
                                    {typeof val === 'number' ? `€${val.toLocaleString('en-US')}` : val}
                                  </span>
                                </button>
                              ))
                            ) : null}

                            <button
                              disabled={actionLoading}
                              onClick={() => handleResolveFinding(f.id, 'confirm')}
                              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Confirm Finding
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: PYTHON FINANCIAL MATH */}
            {activeTab === 'math' && analysis?.feasibilityMath && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#0c162c] border border-blue-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Deterministic Python Financial Engine (Zero LLM Hallucination Risk)
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      REG-DTI-04
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    AI agents only extract figures from documents; <strong>all loan installment and debt-to-income calculations are executed strictly in deterministic Python code</strong> for 100% regulatory compliance.
                  </p>
                  <div className="p-3 rounded-xl bg-[#060b16] border border-[#192947] font-mono text-xs text-amber-300 break-words">
                    {analysis.feasibilityMath.formula_used}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm text-slate-400 block">
                        Calculated Debt-to-Income (DTI)
                      </span>
                      <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                        {analysis.feasibilityMath.dti_percentage}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm text-slate-400 block">Regulatory DTI Ceiling</span>
                      <span className="text-2xl font-bold text-slate-200">
                        {analysis.feasibilityMath.max_dti_limit_percent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        analysis.feasibilityMath.is_feasible ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(analysis.feasibilityMath.dti_percentage, 100)}%`,
                      }}
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
                        Max allowable installment: €{analysis.feasibilityMath.max_allowed_installment}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REMEDIATION AGENT */}
            {activeTab === 'remediation' && analysis?.remediation && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#0c162c] border border-[#1d3158] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Remediation Agent (Customer Communication Automation)
                    </span>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        analysis.remediation.status === 'sent_automatically' ||
                        analysis.remediation.status === 'sent_by_officer'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : analysis.remediation.required
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {analysis.remediation.status === 'sent_automatically'
                        ? '✓ Auto-Dispatched at Triage'
                        : analysis.remediation.status === 'sent_by_officer'
                        ? '✓ Dispatched to Customer'
                        : analysis.remediation.required
                        ? 'Ready for Dispatch'
                        : 'Not Required'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200">
                    <strong>Trigger Condition:</strong> {analysis.remediation.triggerReason}
                  </p>
                </div>

                {analysis.remediation.required && (
                  <>
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-blue-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          SMS Notification to {analysis.remediation.recipientPhone}
                        </span>
                        <span className="text-xs text-slate-400">Raiffeisen SMS Gateway</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#15223c] text-xs sm:text-sm text-slate-200 font-mono break-words">
                        {analysis.remediation.smsPreview}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-amber-300 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Official Email to {analysis.remediation.recipientEmail}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        Subject: {analysis.remediation.emailSubject}
                      </div>
                      <pre className="p-4 rounded-xl bg-[#060b16] border border-[#15223c] text-xs sm:text-sm text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                        {analysis.remediation.emailBody}
                      </pre>
                    </div>

                    <button
                      onClick={handleSendRemediation}
                      disabled={actionLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Dispatch SMS & Email with Secure Upload Link Now</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* TAB 4: EXTRACTED DATA & GDPR */}
            {activeTab === 'pii_data' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#0c162c] border border-emerald-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      PII Anonymization Shield (GDPR & Banking Secrecy)
                    </span>
                    <button
                      onClick={() => setShowMaskedPii(!showMaskedPii)}
                      className="px-3 py-1.5 rounded-lg bg-[#060b16] border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50 cursor-pointer"
                    >
                      {showMaskedPii ? 'Show Original Values' : 'Show Masked Tokens'}
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

            {/* TAB 5: EXECUTION TRACE & POLICY RULES */}
            {activeTab === 'trace' && (
              <div className="space-y-5">
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
                        Tool: {step.tool} ({step.executionMode})
                      </div>
                      <p className="text-slate-300">{step.outputSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 bg-[#0a1326] border-t border-[#1e3158] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Final Credit Officer Decision (Human-in-the-Loop):
              </span>
              <span className="text-xs text-slate-400">
                AI prepares audit trail • Human takes lending decision
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
                className="py-2.5 px-4 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Reject Case</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
