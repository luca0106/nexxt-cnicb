import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

// Native <dialog>: modal focus containment and Escape come from the browser.
// Focus returns to the element that opened it.
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const opener = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      opener.current?.focus?.();
    }
  }, [open]);

  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`w-[calc(100%-2rem)] ${width} p-0 rounded-lg bg-surface text-fg shadow-overlay open:animate-fade-in`}
    >
      {open && (
        <div className="flex flex-col max-h-[85vh]">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div>
              <h2 id={titleId} className="text-base">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mr-2 -mt-1" />
          </div>
          <div className="px-5 pb-5 overflow-y-auto">{children}</div>
          {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-canvas/40">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', onConfirm, onCancel }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="h-9 px-3.5 rounded-md text-sm text-fg-muted hover:text-fg hover:bg-raised">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-3.5 rounded-md text-sm font-semibold ${
              tone === 'danger' ? 'bg-danger text-canvas hover:bg-danger/90' : 'bg-accent text-accent-fg hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
