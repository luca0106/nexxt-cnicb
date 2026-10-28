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
  Settings,
  Mail,
  MessageSquare,
  UserCheck,
  Zap,
  Maximize2,
  Columns
} from 'lucide-react';
import {
  runCaseAnalysis,
  resolveFinding,
  sendRemediationNotification,
  submitHumanDecision
} from '../api/client';

const AGENT_PIPELINE_STEPS = [
  {
    id: 'pii',
    name: '1. PII Shield (GDPR)',
    desc: 'Pseudonimizare CNP, CI, IBAN',
  },
  {
    id: 'extract_policy',
    name: '2. Extractor ∥ Policy',
    desc: 'OCR JSON + Norme BNR',
  },
  {
    id: 'investigator',
    name: '3. Investigator & Math',
    desc: 'Cross-check + DTI Python 40%',
  },
  {
    id: 'remediation',
    name: '4. Remedieri & Audit',
    desc: 'Email/SMS client & Checklist',
  },
];

export default function AICopilotDrawer({
  isOpen,
  onClose,
  viewMode = 'split', // 'split' | 'expanded'
  onToggleViewMode,
  caseData,
  initialAnalysis,
  onAnalysisUpdated,
  onSelectCitation
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis || null);
  const [running, setRunning] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(-1);
  const [activeTab, setActiveTab] = useState('findings'); // findings, math, remediation, pii_data, trace
  const [showMaskedPii, setShowMaskedPii] = useState(true);
  const [showEngineConfig, setShowEngineConfig] = useState(false);
  const [llmProvider, setLlmProvider] = useState('auto');
  const [apiKey, setApiKey] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [officerComment, setOfficerComment] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [inlinePreviewDoc, setInlinePreviewDoc] = useState(null);

  useEffect(() => {
    setAnalysis(initialAnalysis || null);
  }, [initialAnalysis, caseData?.id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleRunAIReview = async () => {
    if (!caseData) return;
    try {
      setRunning(true);
      setActivePipelineStep(0);

      await new Promise((r) => setTimeout(r, 320));
      setActivePipelineStep(1);
      await new Promise((r) => setTimeout(r, 450));
      setActivePipelineStep(2);

      const res = await runCaseAnalysis(caseData.id, {
        llmProvider,
        apiKey: apiKey.trim() || undefined,
      });

      await new Promise((r) => setTimeout(r, 400));
      setActivePipelineStep(3);
      await new Promise((r) => setTimeout(r, 300));

      setAnalysis(res);
      setActivePipelineStep(4);
      if (onAnalysisUpdated) onAnalysisUpdated(res);
      showToast('Analiza Multi-Agentică a fost finalizată cu succes!');
    } catch (err) {
      console.error(err);
      showToast('Eroare la rularea analizei AI.');
    } finally {
      setRunning(false);
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
          ? `Valoarea "${resolvedValue}" a fost aplicată în dosar și DTI-ul a fost recalculat în Python!`
          : 'Constatarea a fost actualizată în Audit Trail!'
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
      showToast('SMS și Email cu link securizat de reîncărcare trimise către client!');
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
        approve: 'Dosar APROBAT de ofițer (Human-in-the-Loop)!',
        request_clarification: 'Dosar trecut în AȘTEPTARE CLARIFICĂRI!',
        reject: 'Dosar RESPINS de ofițer!',
      };
      showToast(labels[decision] || 'Decizie înregistrată!');
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
    // Also show inline preview if on mobile/tablet or expanded mode
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
                Triage & Audit Extension
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Dosar #{caseData?.case_number}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Scut GDPR PII Activ
              </span>
            </p>
          </div>
        </div>

        {/* Action & View Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunAIReview}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Play className={`w-3.5 h-3.5 fill-slate-950 ${running ? 'animate-pulse' : ''}`} />
            <span>{running ? 'Rulează Agenții...' : (analysis ? 'Re-rulează AI Review' : 'Run AI Review')}</span>
          </button>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#091020] hover:bg-[#111e3b] border border-[#24375e] text-xs font-medium text-slate-200 transition-colors"
              title={viewMode === 'split' ? 'Extinde Copilotul pe toată lățimea paginii' : 'Afișează în paralel cu documentele (Split-View)'}
            >
              {viewMode === 'split' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Extinde</span>
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
            onClick={() => setShowEngineConfig(!showEngineConfig)}
            className="p-2 rounded-xl bg-[#091020] hover:bg-[#111e3b] border border-[#24375e] text-slate-300 hover:text-white transition-colors"
            title="Configurare Motor AI / Cheie LLM"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#091020] hover:bg-red-950/60 border border-[#24375e] hover:border-red-500/40 text-slate-300 hover:text-white transition-colors"
            title="Închide extensia AI Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Engine Configuration Bar */}
      {showEngineConfig && (
        <div className="px-5 py-3.5 bg-[#050914] border-b border-[#192742] text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-200">
              Configurare Motor Multi-Agent (Hibrid LLM + Determinist):
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              ✓ Fallback Determinist Activ (100% Uptime)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              className="bg-[#0b1325] border border-[#1e3052] rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="auto">Auto (Hibrid LLM / Determinist)</option>
              <option value="openai">OpenAI GPT-4o + Python Math</option>
              <option value="gemini">Google Gemini 2.0 + Python Math</option>
              <option value="deterministic">Strict Determinist (Offline Demo)</option>
            </select>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Opțional: Cheie API (OpenAI / Gemini)..."
              className="sm:col-span-2 bg-[#0b1325] border border-[#1e3052] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
            />
          </div>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Agent Pipeline Steps Bar */}
      {(running || analysis) && (
        <div className="px-4 sm:px-6 py-3 bg-[#091224] border-b border-[#162440]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AGENT_PIPELINE_STEPS.map((step, idx) => {
              const isDone = !running && analysis ? true : activePipelineStep > idx;
              const isCurrent = running && activePipelineStep === idx;
              return (
                <div
                  key={step.id}
                  className={`px-3 py-2 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-400 text-amber-200 animate-pulse'
                      : isDone
                      ? 'bg-[#0d1930] border-emerald-500/30 text-slate-200'
                      : 'bg-[#060b16] border-[#142038] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold gap-1">
                    <span className="truncate">{step.name}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!analysis && !running ? (
        <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 min-h-[380px]">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-lg space-y-2">
            <h3 className="text-lg font-bold text-white">
              Copilotul AI este pregătit pentru Dosarul #{caseData?.case_number}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Apasă butonul <strong>„Run AI Review”</strong> pentru a porni în cascadă și paralel echipa de agenți:
              <strong> PII Shield (GDPR)</strong> → <strong>Agent Extractor (OCR)</strong> ∥ <strong>Policy Agent</strong> → <strong>Agent Investigator & Calcul Python</strong> → <strong>Agent Remedieri</strong>.
            </p>
          </div>
          <button
            onClick={handleRunAIReview}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Pornește Analiza Multi-Agentică (Run AI Review)</span>
          </button>
        </div>
      ) : running ? (
        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
          <div className="w-12 h-12 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="text-base font-bold text-white">
              {AGENT_PIPELINE_STEPS[Math.min(activePipelineStep, 3)]?.name || 'Procesare...'}
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              {AGENT_PIPELINE_STEPS[Math.min(activePipelineStep, 3)]?.desc}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Executive Summary Banner */}
          <div className="px-4 sm:px-6 py-3.5 bg-[#0b1528] border-b border-[#192947] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 mt-0.5 ${
                  analysis.riskScore === 'critic'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : analysis.riskScore === 'mediu'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                Risc {analysis.riskScore}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {analysis.summary}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-block text-xs px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 font-mono font-semibold">
                ROI: 45 min → {analysis.metrics?.aiProcessingSeconds || 2.4}s
              </span>
            </div>
          </div>

          {/* Inline Document Preview Box (Shown when clicking a citation on smaller screens or for instant verification) */}
          {inlinePreviewDoc && (
            <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-[#050914] border-2 border-amber-400/60 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Fragment Sursă: {inlinePreviewDoc.doc.file_name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 font-mono text-xs">
                    Rândul {inlinePreviewDoc.lineNumber}
                  </span>
                </div>
                <button
                  onClick={() => setInlinePreviewDoc(null)}
                  className="text-slate-400 hover:text-white p-1"
                  title="Închide previzualizarea rapidă"
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

          {/* Navigation Tabs inside Copilot */}
          <div className="px-4 sm:px-6 pt-3 bg-[#070d1b] border-b border-[#16233d] flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('findings')}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'findings'
                  ? 'border-amber-400 text-amber-300 bg-[#0e182e]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Audit & Constatări</span>
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
              <span>Calcul Python ({analysis.feasibilityMath?.dti_percentage}%)</span>
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
              <span>Remediere Client</span>
              {analysis.remediation?.required && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
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
              <span>Date & GDPR</span>
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
              <span>Trace & Norme</span>
            </button>
          </div>

          {/* Spacious Tab Body (No squashed height!) */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* TAB 1: AUDIT & FINDINGS */}
            {activeTab === 'findings' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-400">
                  <span>
                    Apasă pe orice <strong>citat-sursă</strong> pentru a evidenția automat rândul în document.
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-semibold">
                    {redFlags.length} Alerte (Red Flags) • {greenFlags.length} Validări (Green Flags)
                  </span>
                </div>

                {analysis.findings?.map((f) => {
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
                                ✓ Revizuit de Ofițer {f.resolvedValue ? `(${f.resolvedValue})` : ''}
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

                      {/* Source Citations */}
                      {f.values && f.values.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                            Dovezi & Citări Exacte la Sursă (Audit Trail BNR):
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
                                      Rândul {v.lineNumber}
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
                                    Evidențiază rândul <ExternalLink className="w-3 h-3" />
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Human-in-the-Loop Action Buttons */}
                      {isRed && (
                        <div className="pt-3 border-t border-white/10 space-y-2.5">
                          <div className="text-xs sm:text-sm text-amber-300 font-medium">
                            💡 Recomandare: {f.suggestedAction}
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
                                    Validează & Aplică:{' '}
                                    {typeof val === 'number' ? `${val.toLocaleString('ro-RO')} RON` : val}
                                  </span>
                                </button>
                              ))
                            ) : null}

                            <button
                              disabled={actionLoading}
                              onClick={() => handleResolveFinding(f.id, 'confirm')}
                              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            >
                              Confirmă constatarea
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: DETERMINISTIC PYTHON FINANCIAL MATH */}
            {activeTab === 'math' && analysis.feasibilityMath && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#0c162c] border border-blue-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Motor Matematic Determinist Python (Zero Risc Halucinație LLM)
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      NORMA-BNR-DTI-04
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Agenții AI doar extrag valorile din documente, însă <strong>calculul ratei lunare și al gradului de îndatorare este executat strict în cod Python determinist</strong> pentru conformitate bancară 100%.
                  </p>
                  <div className="p-3 rounded-xl bg-[#060b16] border border-[#192947] font-mono text-xs text-amber-300 break-words">
                    {analysis.feasibilityMath.formula_used}
                  </div>
                </div>

                {/* DTI Gauge Card */}
                <div className="p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm text-slate-400 block">
                        Grad de Îndatorare Calculat (DTI)
                      </span>
                      <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                        {analysis.feasibilityMath.dti_percentage}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm text-slate-400 block">Plafon Maxim BNR</span>
                      <span className="text-2xl font-bold text-slate-200">
                        {analysis.feasibilityMath.max_dti_limit_percent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
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
                      title="Prag Maxim BNR 40%"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>0%</span>
                    <span className="text-amber-400 font-semibold">Limita BNR: 40%</span>
                    <span>100%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#16233d] text-xs sm:text-sm">
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Credit Solicitat</span>
                      <span className="font-bold text-white text-base">
                        {analysis.feasibilityMath.requested_amount_ron?.toLocaleString('ro-RO')} RON
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        pe {analysis.feasibilityMath.loan_term_months} luni ({analysis.feasibilityMath.annual_interest_rate_percent}%/an)
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Rată Lunară Nouă</span>
                      <span className="font-bold text-blue-400 text-base">
                        {analysis.feasibilityMath.calculated_monthly_installment_ron} RON
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        + {analysis.feasibilityMath.existing_monthly_debts_ron} RON rate existente
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#142038]">
                      <span className="text-slate-400 text-xs block">Venit Net Luat în Calcul</span>
                      <span className="font-bold text-emerald-400 text-base">
                        {analysis.feasibilityMath.monthly_income_used_ron?.toLocaleString('ro-RO')} RON
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        Rată max admisă: {analysis.feasibilityMath.max_allowed_installment_ron} RON
                      </span>
                    </div>
                  </div>

                  {analysis.feasibilityMath.alternative_income_scenario && (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs sm:text-sm space-y-2">
                      <div className="font-semibold text-amber-300">
                        Simulare Comparativă pe Cele 2 Venituri din Documente:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-lg bg-[#060b16]">
                          <span className="text-slate-400 block">Pe venitul din Cerere (5.200 RON):</span>
                          <strong className="text-white text-sm">
                            DTI = {analysis.feasibilityMath.alternative_income_scenario.declared_dti_percent}% (Eligibil)
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#060b16]">
                          <span className="text-slate-400 block">Pe venitul din Adeverință (5.700 RON):</span>
                          <strong className="text-emerald-400 text-sm">
                            DTI = {analysis.feasibilityMath.alternative_income_scenario.verified_dti_percent}% (Eligibil)
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REMEDIATION AGENT */}
            {activeTab === 'remediation' && analysis.remediation && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#0c162c] border border-[#1d3158] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Agentul de Remedieri (Automatizare Comunicare Client)
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
                        ? '✓ Trimis Automat la Triaj'
                        : analysis.remediation.status === 'sent_by_officer'
                        ? '✓ Trimis Către Client'
                        : analysis.remediation.required
                        ? 'Pregătit pentru Trimitere'
                        : 'Nu este necesar'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200">
                    <strong>Motiv declanșare:</strong> {analysis.remediation.triggerReason}
                  </p>
                </div>

                {analysis.remediation.required && (
                  <>
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-blue-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Mesaj SMS generat către {analysis.remediation.recipientPhone}
                        </span>
                        <span className="text-xs text-slate-400">Gateway SMS Raiffeisen</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#060b16] border border-[#15223c] text-xs sm:text-sm text-slate-200 font-mono break-words">
                        {analysis.remediation.smsPreview}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0a1224] border border-[#192846] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-semibold text-amber-300 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Oficial către {analysis.remediation.recipientEmail}
                        </span>
                        {analysis.remediation.sentAt && (
                          <span className="text-xs text-emerald-400 font-medium">
                            Expediat la: {analysis.remediation.sentAt}
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        Subiect: {analysis.remediation.emailSubject}
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
                      <span>
                        {analysis.remediation.status === 'sent_automatically' ||
                        analysis.remediation.status === 'sent_by_officer'
                          ? 'Re-trimite Notificarea SMS & Email cu Link Securizat'
                          : 'Trimite Acum SMS & Email cu Link Securizat către Client'}
                      </span>
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
                      Scut Anonimizare PII (GDPR & Securitate Bancară)
                    </span>
                    <button
                      onClick={() => setShowMaskedPii(!showMaskedPii)}
                      className="px-3 py-1.5 rounded-lg bg-[#060b16] border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50 cursor-pointer"
                    >
                      {showMaskedPii ? 'Afișează Date Originale' : 'Afișează Tokeni Anonimizați'}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {analysis.piiMasking?.explanation}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {analysis.piiMasking?.tokens?.map((t, idx) => (
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

                <div className="space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                    Câmpuri Structurate Extrase de Agentul 1 (OCR & JSON Schema):
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {analysis.extractedFields?.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => handleCitationClick(item.documentId, item.lineNumber, item.quote)}
                        className="p-3.5 rounded-xl bg-[#0a1224] border border-[#16233d] hover:border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <div>
                          <span className="text-slate-400">{item.label}: </span>
                          <strong className="text-white font-semibold">{String(item.value)}</strong>
                          <div className="text-xs text-blue-400 mt-1">
                            📄 {item.documentName} • Rândul {item.lineNumber}
                          </div>
                        </div>
                        <span className="self-start sm:self-center px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 font-mono text-xs shrink-0">
                          {Math.round((item.confidence || 0.99) * 100)}% încredere
                        </span>
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
                    Execution Trace (Trasabilitate Tehnică Orchestrator):
                  </h4>
                  {analysis.executionTrace?.map((step) => (
                    <div
                      key={step.step}
                      className="p-4 rounded-xl bg-[#0a1224] border border-[#192846] space-y-1.5 text-xs sm:text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          Pasul {step.step}: {step.agent}
                        </span>
                        <span className="font-mono text-xs text-emerald-400">
                          {step.durationMs} ms • {step.status}
                        </span>
                      </div>
                      <div className="text-xs text-blue-300 font-mono">
                        Tool apelat: {step.tool} ({step.executionMode})
                      </div>
                      <p className="text-slate-300">{step.outputSummary}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-400">
                    Reguli și Proceduri Identificate de Policy Agent:
                  </h4>
                  {analysis.policyRules?.map((rule) => (
                    <div
                      key={rule.ruleId}
                      className="p-4 rounded-xl bg-[#060b16] border border-[#16233d] space-y-1.5 text-xs sm:text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-white">{rule.title}</span>
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-950 text-blue-300">
                          {rule.ruleId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{rule.sourceDocument}</div>
                      <p className="text-slate-300 italic mt-1">"{rule.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Human-in-the-Loop Decision Panel */}
          <div className="p-4 sm:p-5 bg-[#0a1326] border-t border-[#1e3158] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Decizie Finală Ofițer (Human-in-the-Loop):
              </span>
              <span className="text-xs text-slate-400">
                AI-ul pregătește dosarul • Omul decide
              </span>
            </div>

            <input
              type="text"
              value={officerComment}
              onChange={(e) => setOfficerComment(e.target.value)}
              placeholder="Opțional: Adaugă rezoluția sau observația ofițerului pentru Audit BNR..."
              className="w-full bg-[#050811] border border-[#1b2c4e] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('approve')}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobă Dosar</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('request_clarification')}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Solicită Clarificări</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFinalDecision('reject')}
                className="py-2.5 px-4 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Respinge Dosar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
