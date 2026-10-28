import React from 'react';
import { AlertTriangle, CheckCircle2, FileText, UserCheck } from 'lucide-react';
import { Badge, Button } from '../ui';
import { money, stripEmoji, text } from '../../lib/format';

export const isResolved = (f) => f.status === 'resolved_by_officer' || f.status === 'confirmed_by_officer';

function formatChoice(value) {
  return typeof value === 'number' ? money(value) : text(value);
}

export function Citation({ value, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value.documentId, value.lineNumber)}
      className="group w-full text-left rounded-md border border-line bg-canvas/60 px-3 py-2 hover:border-line-strong hover:bg-canvas transition-colors"
    >
      <span className="flex items-center gap-1.5 text-xs text-fg-muted group-hover:text-fg">
        <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span className="truncate">{text(value.documentType || value.documentName)}</span>
        <span className="shrink-0 font-mono text-accent">line {value.lineNumber}</span>
        {(value.formattedValue || value.value) !== undefined && (value.formattedValue || value.value) !== '' && (
          <span className="ml-auto shrink-0 font-medium text-fg tabular">{text(value.formattedValue ?? value.value)}</span>
        )}
      </span>
      {value.quote && (
        <span className="block mt-1 font-mono text-[12px] text-fg-muted break-words line-clamp-2">
          {value.quote.replace(/^Line\s+\d+\s*:\s?/, '')}
        </span>
      )}
    </button>
  );
}

export default function FindingCard({ finding: f, onSelectCitation, onResolve, busy, compact = false }) {
  const red = f.flagType === 'red_flag';
  const resolved = isResolved(f);
  const Icon = resolved ? UserCheck : red ? AlertTriangle : CheckCircle2;
  const iconColor = resolved ? 'text-fg-muted' : red ? 'text-danger' : 'text-success';

  return (
    <article className={`py-4 ${compact ? '' : 'border-b border-line last:border-0'}`}>
      <div className="flex gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} aria-label={resolved ? 'Reviewed' : red ? 'Needs attention' : 'Verified'} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-medium">{stripEmoji(f.title)}</h4>
            {f.source === 'review_agent' && <Badge tone="accent" className="h-5 px-1.5 text-2xs">Found by AI agent</Badge>}
            {f.type === 'escalation' && !resolved && <Badge tone="warning" className="h-5 px-1.5 text-2xs">Your decision</Badge>}
          </div>
          {(f.ruleRef || resolved) && (
            <p className="mt-0.5 text-xs text-fg-subtle">
              {f.ruleRef && <span className="font-mono">{f.ruleRef}</span>}
              {f.ruleRef && resolved && ' · '}
              {resolved && <span>Reviewed by officer{f.resolvedValue ? `: ${formatChoice(f.resolvedValue)}` : ''}</span>}
            </p>
          )}
          {!compact && f.description && <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">{stripEmoji(f.description)}</p>}

          {!compact && f.values?.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {f.values.map((v, i) => (
                <Citation key={i} value={v} onSelect={onSelectCitation} />
              ))}
            </div>
          )}

          {red && !resolved && onResolve && (
            <div className="mt-3">
              {f.suggestedAction && !compact && <p className="text-[13px] text-fg-muted mb-2">{stripEmoji(f.suggestedAction)}</p>}
              <div className="flex flex-wrap gap-2">
                {f.selectableValues?.length > 0 ? (
                  f.selectableValues.map((val, i) => (
                    <Button key={i} size="sm" disabled={busy} onClick={() => onResolve(f.id, 'override_value', val)}>
                      Use {formatChoice(val)}
                    </Button>
                  ))
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => onResolve(f.id, 'confirm')}>
                    Mark as checked
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
