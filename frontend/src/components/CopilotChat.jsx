import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Send, Search, FileText, AlertTriangle, ChevronDown, ChevronUp, Loader2, Calculator } from 'lucide-react';
import { chatWithAnalysis } from '../api/client';

const SUGGESTIONS = [
  'Why was this case flagged?',
  'Which documents disagree on income?',
  'What would the DTI be if the requested amount were 20% lower?',
  'Which expenses are only suspected, and what is the evidence?',
];

const KIND_ICON = { document: FileText, finding: AlertTriangle, what_if: Calculator };

// Inline **bold** and [n] citation markers.
function renderInline(text, citations, onCite) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="text-white">{bold[1]}</strong>;
    const marker = part.match(/^\[(\d+)\]$/);
    const cite = marker && citations[Number(marker[1]) - 1];
    if (cite) {
      return (
        <button
          key={i}
          onClick={() => onCite(cite)}
          title={cite.label}
          className="mx-0.5 px-1.5 py-0 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold align-baseline hover:bg-amber-500/25 cursor-pointer"
        >
          {marker[1]}
        </button>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function AnswerText({ text, citations, onCite }) {
  return (
    <div className="space-y-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
      {text.split('\n').filter((l) => l.trim()).map((line, i) => {
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        return bullet ? (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-amber-400">•</span>
            <span>{renderInline(bullet[1], citations, onCite)}</span>
          </div>
        ) : (
          <p key={i}>{renderInline(line, citations, onCite)}</p>
        );
      })}
    </div>
  );
}

function AssistantMessage({ msg, onCite }) {
  const [showSteps, setShowSteps] = useState(false);
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-amber-300" />
      </div>
      <div className="flex-1 min-w-0 p-4 rounded-xl bg-[#0a1224] border border-[#192846] space-y-3">
        {msg.mode === 'retrieval_only' && (
          <div className="text-[11px] px-2 py-1 rounded-lg bg-slate-500/10 border border-slate-500/30 text-slate-300 inline-block">
            Retrieval only: the language model is not configured or unavailable
          </div>
        )}
        <AnswerText text={msg.content} citations={msg.citations || []} onCite={onCite} />

        {msg.citations?.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sources</div>
            {msg.citations.map((c) => {
              const Icon = KIND_ICON[c.kind] || Search;
              return (
                <button
                  key={c.n}
                  onClick={() => onCite(c)}
                  className="w-full text-left flex items-start gap-2 p-2 rounded-lg bg-[#0e182e] border border-[#1b2c4d] hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-amber-300 shrink-0">[{c.n}]</span>
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-[11px] sm:text-xs font-semibold text-slate-200 truncate">{c.label}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{c.quote}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {msg.steps?.length > 0 && (
          <div>
            <button
              onClick={() => setShowSteps((s) => !s)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {msg.steps.length} agent step(s) · {msg.engineUsed} · {(msg.durationMs / 1000).toFixed(1)}s
            </button>
            {showSteps && (
              <ol className="mt-1.5 space-y-1 text-[11px] text-slate-400">
                {msg.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={s.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}>{i + 1}.</span>
                    <span><span className="text-slate-300">{s.label}</span> — {s.summary}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CopilotChat({ analysisId, messages, onMessagesChange, onCitationClick, onOpenFindings }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, sending]);

  const ask = async (question) => {
    const text = question.trim();
    if (!text || sending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    const withQuestion = [...messages, { role: 'user', content: text }];
    onMessagesChange(withQuestion);
    setInput('');
    setError(null);
    setSending(true);
    try {
      const res = await chatWithAnalysis(analysisId, text, history);
      onMessagesChange([...withQuestion, { role: 'assistant', content: res.answer, ...res }]);
    } catch (err) {
      setError(err.message || 'The copilot could not answer.');
      onMessagesChange(messages);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleCite = (c) => {
    if (c.kind === 'document') {
      onCitationClick(c.documentId, c.lineNumber, c.quote, c.docCode, c.documentName);
    } else if (c.kind === 'finding') {
      onOpenFindings?.(c.findingId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#0a1224] border border-[#192846] text-xs sm:text-sm text-slate-300 leading-relaxed">
        Ask about this analysis. The copilot searches the case documents, findings, policies, specialist reports and
        the financial profile, and cites every source. It is read-only: it does not change findings or decisions, and
        what-if DTI scenarios are hypothetical.
      </div>

      {messages.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={sending}
              className="text-left p-3 rounded-xl bg-[#0e182e] border border-[#1b2c4d] text-xs sm:text-sm text-slate-300 hover:border-amber-500/40 hover:text-slate-100 transition-all cursor-pointer disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex gap-3 justify-end">
              <div className="max-w-[85%] p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-slate-100 whitespace-pre-wrap">
                {m.content}
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0e182e] border border-[#1b2c4d] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ) : (
            <AssistantMessage key={i} msg={m} onCite={handleCite} />
          )
        )}
        {sending && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            Searching the case and preparing a cited answer…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 pt-1"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Ask about income, documents, flags, policies or a what-if DTI…"
          className="flex-1 resize-none px-3 py-2 rounded-xl bg-[#0e182e] border border-[#1b2c4d] text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Ask
        </button>
      </form>
    </div>
  );
}
