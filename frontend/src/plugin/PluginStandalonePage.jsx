import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot,
  ArrowLeft,
  FileText,
  Folder,
  Code2,
  ShieldCheck,
  Server,
  Search,
  Eye,
  ExternalLink,
  CheckCircle2,
  Layers
} from 'lucide-react';
import {
  fetchCases,
  fetchCaseById,
  fetchLatestCaseAnalysis
} from '../api/client';
import AICopilotDrawer from '../components/AICopilotDrawer';
import { useExternalPlugin } from './PluginContext';
import PluginIntegrationModal from './PluginIntegrationModal';

export default function PluginStandalonePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    hostBankProfile,
    setIsIntegrationModalOpen,
    manifest,
  } = useExternalPlugin();

  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(id ? Number(id) : null);
  const [caseData, setCaseData] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'expanded'

  // Load case list from host API
  useEffect(() => {
    fetchCases({ limit: 60 })
      .then((list) => {
        setCases(list || []);
        if (!selectedCaseId && list?.length > 0) {
          const demoCase = list.find((c) => c.case_number === '10482') || list[0];
          setSelectedCaseId(demoCase.id);
        }
      })
      .catch((err) => console.error('Failed to load host cases:', err));
  }, []);

  useEffect(() => {
    if (id && Number(id) !== selectedCaseId) {
      setSelectedCaseId(Number(id));
    }
  }, [id]);

  // Load selected case details + latest AI analysis
  const loadSelectedDossier = async (targetId) => {
    if (!targetId) return;
    try {
      setLoadingCase(true);
      const data = await fetchCaseById(targetId);
      setCaseData(data);
      if (data.documents?.length > 0) {
        setSelectedDoc(data.documents[0]);
      } else {
        setSelectedDoc(null);
      }
      setHighlightedLine(null);
      const existingAnalysis = await fetchLatestCaseAnalysis(data.id);
      setLatestAnalysis(existingAnalysis);
    } catch (err) {
      console.error('Could not load dossier via host API:', err);
    } finally {
      setLoadingCase(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) {
      loadSelectedDossier(selectedCaseId);
    }
  }, [selectedCaseId]);

  const handleSelectCase = (newId) => {
    setSelectedCaseId(Number(newId));
    navigate(`/plugin/${newId}`, { replace: true });
  };

  const handleSelectCitation = (documentId, lineNumber, quote = null, docCode = null, documentName = null) => {
    if (!caseData?.documents?.length) return;
    const foundDoc =
      caseData.documents.find((d) => d.id === documentId) ||
      (docCode && caseData.documents.find((d) => d.doc_code === docCode || `doc-${d.id}` === docCode)) ||
      (documentName && caseData.documents.find((d) => d.file_name === documentName)) ||
      (quote && caseData.documents.find((d) => (d.content_text || '').includes(quote))) ||
      caseData.documents[0];

    let resolvedLine = Number(lineNumber) || 1;
    if (foundDoc?.content_text && quote) {
      const lines = foundDoc.content_text.split('\n');
      if (!lines[resolvedLine - 1] || !lines[resolvedLine - 1].includes(quote.slice(0, 20))) {
        const matchIdx = lines.findIndex((l) => l.includes(quote) || quote.includes(l.trim()));
        if (matchIdx >= 0) {
          resolvedLine = matchIdx + 1;
        }
      }
    }

    setSelectedDoc(foundDoc);
    setHighlightedLine(resolvedLine);
    setTimeout(() => {
      const el = document.getElementById(`standalone-doc-line-${resolvedLine}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleAnalysisUpdated = async (updatedAnalysis) => {
    setLatestAnalysis(updatedAnalysis);
    if (selectedCaseId) {
      const refreshed = await fetchCaseById(selectedCaseId);
      setCaseData(refreshed);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(c.case_number).toLowerCase().includes(q) ||
      (c.client?.full_name || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q)
    );
  });

  // Featured demo cases for 1-click switching during presentation
  const featuredCases = cases.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#040710] text-slate-100 flex flex-col font-sans">
      <PluginIntegrationModal />

      {/* STANDALONE B2B SAAS PLUGIN HEADER */}
      <header className="bg-gradient-to-r from-[#0a1022] via-[#101830] to-[#17152b] border-b-2 border-amber-400/40 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xl">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
              <Bot className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  {manifest?.productName || 'FinSight AI Copilot'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Standalone B2B Plugin Console
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> REST API Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-blue-300 font-medium">
                  <Server className="w-3 h-3" /> Host: {hostBankProfile}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Zero-Raw-PII Cloud Boundary
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsIntegrationModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0d1830] hover:bg-[#15274e] border border-amber-400/40 text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Code2 className="w-4 h-4" />
              <span>SDK & API Integration Spec</span>
            </button>

            <button
              onClick={() => navigate(caseData ? `/cases/${caseData.id}` : '/cases')}
              className="px-3.5 py-2 rounded-xl bg-[#111c33] hover:bg-[#19294b] border border-[#243963] text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Return to BankDesk Host CRM</span>
            </button>
          </div>
        </div>
      </header>

      {/* HOST DOSSIER CONNECTOR BAR */}
      <div className="bg-[#070d1c] border-b border-[#162544] px-4 sm:px-6 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Demo Dossier Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Synced Host Dossiers:</span>
            </span>
            {featuredCases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-[#0c162c] hover:bg-[#132347] text-slate-300 border border-[#1d3159]'
                  }`}
                >
                  <span>#{c.case_number}</span>
                  <span className="truncate max-w-[120px]">{c.client?.full_name}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Full Dropdown Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter host cases..."
                className="bg-[#050914] border border-[#1e3158] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-44"
              />
            </div>

            <select
              value={selectedCaseId || ''}
              onChange={(e) => handleSelectCase(e.target.value)}
              className="bg-[#0b1428] border border-[#243963] rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 max-w-xs"
            >
              {filteredCases.map((c) => (
                <option key={c.id} value={c.id}>
                  Case #{c.case_number} — {c.client?.full_name} (€{Number(c.requested_amount || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN STANDALONE PLUGIN WORKSPACE */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6">
        {loadingCase || !caseData ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Fetching dossier payload from host banking API...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE: HOST DOSSIER PAYLOAD & DOCUMENT STREAM VIEWER */}
            {viewMode === 'split' && (
              <div className="xl:col-span-5 space-y-4 min-w-0">
                {/* Dossier Payload Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#080f20] border border-[#182949] space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#162544] pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block">
                        Inbound Host CRM Payload • Case #{caseData.case_number}
                      </span>
                      <h2 className="text-base font-bold text-white mt-0.5">
                        {caseData.client?.full_name} — {caseData.title}
                      </h2>
                    </div>
                    <button
                      onClick={() => navigate(`/clients/${caseData.client?.id}/finances`)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#0d1830] hover:bg-[#162952] border border-[#243b6b] text-xs font-semibold text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Financial Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#050914] border border-[#14223e]">
                      <span className="text-slate-400 block text-[11px]">Requested Loan</span>
                      <span className="font-bold text-white text-sm">
                        €{Number(caseData.requested_amount || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {caseData.loan_term_months} mos @ {caseData.interest_rate_annual}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050914] border border-[#14223e]">
                      <span className="text-slate-400 block text-[11px]">Declared Income</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        €{Number(caseData.client?.monthly_income || 0).toLocaleString()}/mo
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {caseData.client?.employer}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050914] border border-[#14223e] col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[11px]">FICO & Status</span>
                      <span className="font-bold text-blue-300 text-sm">
                        FICO {caseData.client?.fico_score || 715}
                      </span>
                      <span className="text-[10px] text-amber-300 uppercase font-semibold block">
                        Status: {caseData.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attached Document Stream & Line-by-Line Citation Target */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#080f20] border border-[#182949] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Ingested Dossier Documents ({caseData.documents?.length || 0})</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Synced with AI Citations</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {caseData.documents?.map((doc) => {
                      const isSelected = selectedDoc?.id === doc.id;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setHighlightedLine(null);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#0f1e3c] border-amber-400/70 shadow'
                              : 'bg-[#050914] border-[#152340] hover:border-slate-600'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{doc.file_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {doc.doc_code || `doc-${doc.id}`} • {doc.document_type}
                            </div>
                          </div>
                          <Eye
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {selectedDoc && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-300">
                          {selectedDoc.file_name} ({selectedDoc.doc_code || `doc-${selectedDoc.id}`})
                        </span>
                        {highlightedLine && (
                          <span className="px-2.5 py-0.5 rounded bg-amber-400/20 border border-amber-400 text-amber-300 font-mono text-[11px] font-bold">
                            Citation Line {highlightedLine} Active
                          </span>
                        )}
                      </div>
                      <div className="bg-[#040710] border border-[#162544] rounded-xl p-3.5 font-mono text-xs text-slate-300 max-h-[540px] overflow-y-auto space-y-1">
                        {(selectedDoc.content_text || '').split('\n').map((line, idx) => {
                          const lNum = idx + 1;
                          const isHighlighted = highlightedLine === lNum;
                          return (
                            <div
                              key={idx}
                              id={`standalone-doc-line-${lNum}`}
                              className={`py-1 px-2.5 rounded flex items-start gap-2.5 ${
                                isHighlighted
                                  ? 'bg-amber-400/25 text-amber-200 border-l-4 border-amber-400 font-bold'
                                  : 'text-slate-300 hover:bg-slate-800/40'
                              }`}
                            >
                              <span className="text-slate-600 select-none w-6 text-right shrink-0">
                                {lNum}
                              </span>
                              <span className="break-all whitespace-pre-wrap">{line}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT PANE: THE AI COPILOT ENGINE */}
            <div className={viewMode === 'split' ? 'xl:col-span-7 min-w-0' : 'xl:col-span-12 min-w-0'}>
              <AICopilotDrawer
                isOpen={true}
                onClose={() => navigate(`/cases/${caseData.id}`)}
                viewMode={viewMode}
                onToggleViewMode={() => setViewMode(viewMode === 'split' ? 'expanded' : 'split')}
                caseData={caseData}
                initialAnalysis={latestAnalysis}
                onAnalysisUpdated={handleAnalysisUpdated}
                onSelectCitation={handleSelectCitation}
                isStandalonePage={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

