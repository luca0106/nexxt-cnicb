import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(() => {});

const TONES = {
  success: { icon: CheckCircle2, color: 'text-success' },
  danger: { icon: AlertCircle, color: 'text-danger' },
  info: { icon: Info, color: 'text-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    ({ tone = 'info', title, description, duration = 5000 }) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, tone, title, description }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(380px,calc(100%-2rem))]">
        {toasts.map((t) => {
          const { icon: Icon, color } = TONES[t.tone] || TONES.info;
          return (
            <div key={t.id} role="status" className="flex gap-3 p-3.5 rounded-lg bg-raised shadow-overlay animate-toast-in">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="w-6 h-6 -mr-1 -mt-1 inline-flex items-center justify-center rounded text-fg-subtle hover:text-fg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
