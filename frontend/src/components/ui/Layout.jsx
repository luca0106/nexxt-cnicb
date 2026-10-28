import React from 'react';
import { initials } from '../../lib/format';

export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="mb-6">
      {back}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// A titled region of a page. Plain by default; `boxed` only where a surface is needed.
export function Section({ title, description, actions, boxed = false, className = '', children }) {
  return (
    <section className={`${boxed ? 'rounded-lg border border-line bg-surface' : ''} ${className}`}>
      {(title || actions) && (
        <div className={`flex items-center justify-between gap-3 ${boxed ? 'px-4 sm:px-5 pt-4 pb-3' : 'mb-3'}`}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px]">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={boxed ? 'px-4 sm:px-5 pb-4' : ''}>{children}</div>
    </section>
  );
}

// Label / value pairs (client data, loan terms...)
export function DataList({ items, columns = 1 }) {
  return (
    <dl className={`grid gap-x-8 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map(({ label, value, mono }, i) => (
        <div
          key={`${label}-${i}`}
          className={`flex items-baseline justify-between gap-4 py-2 border-b border-line last:border-0 ${
            columns === 2 ? 'sm:[&:nth-last-child(2)]:border-0' : ''
          }`}
        >
          <dt className="text-[13px] text-fg-muted shrink-0">{label}</dt>
          <dd className={`text-sm text-fg text-right min-w-0 truncate ${mono ? 'font-mono tabular' : ''}`} title={typeof value === 'string' ? value : undefined}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, size = 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs';
  return (
    <span className={`${dim} inline-flex items-center justify-center rounded-full bg-raised border border-line font-semibold text-fg-muted shrink-0`} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 border-b border-line overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative h-10 px-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
              active ? 'text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-fg-subtle tabular">{t.count}</span>}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
