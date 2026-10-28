import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  CheckCircle2,
  Power,
  Code2,
  ShieldCheck,
  ExternalLink,
  Cpu,
  Layers,
  Copy,
  Check,
  Server
} from 'lucide-react';
import { useExternalPlugin } from './PluginContext';

const SDK_SNIPPET = `// 1. Mount External AI Underwriting Copilot in any Core Banking CRM
import { FinSightCopilotPlugin } from '@finsight-ai/banking-copilot-sdk';

FinSightCopilotPlugin.mount('#banking-copilot-slot', {
  endpoint: 'https://copilot-gateway.bank-internal.net/api',
  apiKey: process.env.FINSIGHT_PLUGIN_KEY,
  caseId: currentDossier.id,
  gdprLocalPiiShield: true, // Tokenizes CNP, IBAN & ID before LLM call
  pillars: ['dti_repayment_capacity', 'unusual_transactions', 'doc_reconciliation'],
  onHumanDecision: (decision) => hostBankingCrm.syncUnderwritingStatus(decision)
});`;

export default function PluginIntegrationModal() {
  const navigate = useNavigate();
  const {
    isPluginConnected,
    togglePluginConnection,
    hostBankProfile,
    setHostBankProfile,
    isIntegrationModalOpen,
    setIsIntegrationModalOpen,
    manifest,
  } = useExternalPlugin();

  const [copied, setCopied] = useState(false);

  if (!isIntegrationModalOpen) return null;

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(SDK_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenStandalone = () => {
    setIsIntegrationModalOpen(false);
    navigate('/plugin');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => setIsIntegrationModalOpen(false)}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-[#070d1b] border-2 border-amber-400/50 shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#0d162c] via-[#131f3a] to-[#1b1a2e] border-b border-[#22345a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {manifest?.productName || 'FinSight AI Copilot — External B2B Banking Plugin'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {manifest?.version || 'v2.4.0-enterprise'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Decoupled White-Label Underwriting Plugin • Plug-and-Play via REST API & JS SDK
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsIntegrationModalOpen(false)}
            className="p-2 rounded-xl bg-[#0a1224] hover:bg-red-950/60 border border-[#22345a] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Live Connection Switcher (Great for Demo!) */}
          <div className="p-4 rounded-2xl bg-[#0b1428] border border-[#1f345d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPluginConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="text-sm font-bold text-white">
                  Host CRM Plugin Injection:{' '}
                  <span className={isPluginConnected ? 'text-emerald-400' : 'text-slate-400'}>
                    {isPluginConnected ? 'CONNECTED & ACTIVE' : 'DISCONNECTED (Pure Banking Mode)'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Toggle off to view <strong>BankDesk</strong> as a traditional standalone banking CRM without AI, or toggle on to inject the AI Copilot Plugin into every case file.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={togglePluginConnection}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isPluginConnected
                    ? 'bg-emerald-500/20 hover:bg-red-500/20 text-emerald-300 hover:text-red-300 border border-emerald-500/40 hover:border-red-500/40'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isPluginConnected ? 'Disconnect Plugin' : 'Connect AI Plugin'}</span>
              </button>

              <button
                onClick={handleOpenStandalone}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Open Standalone App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Target Host Bank Selector & Architecture Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#091122] border border-[#182744] space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-semibold">
                <Server className="w-3.5 h-3.5 text-blue-400" /> Connected Banking Host
              </span>
              <select
                value={hostBankProfile}
                onChange={(e) => setHostBankProfile(e.target.value)}
                className="w-full mt-1 bg-[#050914] border border-[#22365f] rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="BankDesk Core CRM (REST API)">BankDesk Core CRM (REST API)</option>
                <option value="Raiffeisen Retail Lending Core">Raiffeisen Retail Lending Core</option>
                <option value="Temenos Transact / nCino Adapter">Temenos Transact / nCino Adapter</option>
                <option value="Custom Enterprise Webhook Host">Custom Enterprise Webhook Host</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-[#091122] border border-[#182744] space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> GDPR & Security Boundary
              </span>
              <div className="text-xs font-bold text-emerald-300 pt-1">
                Local On-Premise PII Shield
              </div>
              <p className="text-[11px] text-slate-400">
                CNP, IBAN & ID Series are tokenized before leaving the bank perimeter.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#091122] border border-[#182744] space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-semibold">
                <Cpu className="w-3.5 h-3.5 text-amber-400" /> Hybrid Underwriting Engine
              </span>
              <div className="text-xs font-bold text-amber-300 pt-1">
                AWS Bedrock + Python Math
              </div>
              <p className="text-[11px] text-slate-400">
                Zero-Hallucination DTI & 3-Way Document Reconciliation.
              </p>
            </div>
          </div>

          {/* 3. Plug-and-Play SDK Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>5-Minute Drop-in SDK Integration for Any Bank CRM:</span>
              </span>
              <button
                onClick={handleCopySnippet}
                className="px-2.5 py-1 rounded-lg bg-[#0d1830] hover:bg-[#16284c] border border-[#243b6b] text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SDK Snippet'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#040811] border border-[#192848] font-mono text-xs text-blue-200 overflow-x-auto leading-relaxed">
              {SDK_SNIPPET}
            </pre>
          </div>

          {/* 4. Decoupled REST API Contract */}
          {manifest?.endpoints && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Decoupled Plugin REST API Endpoints:</span>
              </span>
              <div className="rounded-xl bg-[#050914] border border-[#182744] divide-y divide-[#121e36] text-xs">
                {manifest.endpoints.map((ep, idx) => (
                  <div key={idx} className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ep.method === 'GET'
                            ? 'bg-blue-500/20 text-blue-300'
                            : ep.method === 'POST'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-white">{ep.path}</span>
                    </div>
                    <span className="text-slate-400">{ep.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

