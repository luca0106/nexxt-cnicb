import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover font-semibold',
  secondary: 'bg-raised text-fg border border-line hover:bg-hover hover:border-line-strong',
  ghost: 'text-fg-muted hover:text-fg hover:bg-raised',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className = '', size = 'md', ...props }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-raised transition-colors ${dim} ${className}`}
      {...props}
    >
      <Icon className="w-4 h-4" aria-hidden />
    </button>
  );
}
