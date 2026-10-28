import React, { useEffect, useRef } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Badge, Button, EmptyState } from '../ui';
import { humanize, number } from '../../lib/format';

const DOC_STATUS = {
  expired: { label: 'Expired', tone: 'danger' },
  flagged: { label: 'Flagged', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
};

// Documents store "Line N: ..." prefixes; the viewer shows its own line numbers
const stripPrefix = (line) => line.replace(/^Line\s+\d+\s*:\s?/, '');

export default function DocumentsTab({ documents, selectedDoc, highlightedLine, onSelect, onAttach, stacked }) {
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightedLine && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedLine, selectedDoc?.id]);

  if (!documents.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents attached"
        description="Attach the application, ID and income documents so the case can be reviewed."
        action={
          <Button icon={Plus} onClick={onAttach}>
            Attach document
          </Button>
        }
      />
    );
  }

  const lines = (selectedDoc?.content_text || '').split('\n');

  return (
    <div className={`grid gap-4 ${stacked ? '' : 'lg:grid-cols-[minmax(220px,300px)_1fr]'}`}>
      <ul className={`${stacked ? 'flex gap-2 overflow-x-auto pb-1' : 'space-y-1'}`} aria-label="Case documents">
        {documents.map((doc) => {
          const active = selectedDoc?.id === doc.id;
          const status = DOC_STATUS[doc.status];
          return (
            <li key={doc.id} className={stacked ? 'shrink-0 w-60' : ''}>
              <button
                type="button"
                onClick={() => onSelect(doc)}
                aria-current={active || undefined}
                className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                  active ? 'bg-raised border-line-strong' : 'border-transparent hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 shrink-0 ${active ? 'text-accent' : 'text-fg-subtle'}`} aria-hidden />
                  <span className="text-[13px] font-medium truncate" title={doc.file_name}>
                    {doc.document_type}
                  </span>
                  {status && (
                    <Badge tone={status.tone} className="ml-auto h-5 px-1.5 text-2xs">
                      {status.label}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 pl-6 text-xs text-fg-subtle truncate" title={doc.file_name}>
                  {doc.file_name}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-line bg-surface min-w-0">
        {selectedDoc ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-line">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" title={selectedDoc.file_name}>
                  {selectedDoc.file_name}
                </p>
                <p className="text-xs text-fg-subtle">
                  {selectedDoc.document_type} · {selectedDoc.doc_code || `doc-${selectedDoc.id}`} · {number(selectedDoc.file_size_kb)} KB ·{' '}
                  {humanize(selectedDoc.status)}
                </p>
              </div>
              {highlightedLine && (
                <Badge tone="accent">Line {highlightedLine} cited by the AI review</Badge>
              )}
            </div>
            {selectedDoc.content_text ? (
              <ol className="font-mono text-[12.5px] leading-6 py-2 max-h-[520px] overflow-auto">
                {lines.map((line, i) => {
                  const n = i + 1;
                  const hit = highlightedLine === n;
                  return (
                    <li
                      key={n}
                      id={`doc-line-${n}`}
                      ref={hit ? highlightRef : undefined}
                      className={`flex gap-4 pr-4 border-l-2 ${hit ? 'bg-accent/10 border-accent text-fg' : 'border-transparent text-fg-muted'}`}
                    >
                      <span className={`w-10 shrink-0 text-right select-none ${hit ? 'text-accent' : 'text-fg-subtle/70'}`}>{n}</span>
                      <span className="whitespace-pre-wrap break-words min-w-0">{stripPrefix(line) || ' '}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState icon={FileText} title="No readable text" description="This file is a scan without extracted text. Open the original to read it." />
            )}
          </>
        ) : (
          <EmptyState icon={FileText} title="Select a document" description="Choose a document on the left to read it here." />
        )}
      </div>
    </div>
  );
}
