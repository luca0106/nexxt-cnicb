import React, { cloneElement, isValidElement, useId } from 'react';

const CONTROL =
  'w-full h-9 px-3 rounded-md bg-canvas border border-line text-sm text-fg placeholder:text-fg-subtle ' +
  'hover:border-line-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'aria-[invalid=true]:border-danger disabled:opacity-60';

// Label above, error below. The error row always reserves its height so the layout never jumps.
export function Field({ label, hint, error, required, className = '', children }) {
  const id = useId();
  const errorId = `${id}-error`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
        required,
      })
    : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="block mb-1.5 text-[13px] font-medium text-fg-muted">
        {label}
        {required && <span className="text-fg-subtle"> *</span>}
      </label>
      {control}
      <p id={errorId} className={`min-h-[18px] mt-1 text-xs ${error ? 'text-danger' : 'text-fg-subtle'}`}>
        {error || hint || ''}
      </p>
    </div>
  );
}

export const Input = ({ className = '', ...props }) => <input className={`${CONTROL} ${className}`} {...props} />;
export const Select = ({ className = '', children, ...props }) => (
  <select className={`${CONTROL} pr-8 ${className}`} {...props}>
    {children}
  </select>
);
export const Textarea = ({ className = '', ...props }) => (
  <textarea className={`${CONTROL} h-auto py-2 resize-y ${className}`} rows={3} {...props} />
);
