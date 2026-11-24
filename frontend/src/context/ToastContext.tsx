import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.random();
      let added = false;

      setToasts((prev) => {
        if (prev.some((t) => t.message === message && t.variant === variant)) {
          return prev;
        }
        added = true;
        return [...prev, { id, message, variant }].slice(-4);
      });

      if (added) {
        const timer = window.setTimeout(() => removeToast(id), 4200);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  const contextValue = useMemo(
    () => ({ showToast, success, error, info }),
    [showToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const styles =
            t.variant === 'success'
              ? 'bg-emerald-950 text-emerald-50 border-emerald-700/60'
              : t.variant === 'error'
              ? 'bg-rose-950 text-rose-50 border-rose-700/60'
              : 'bg-slate-900 text-slate-50 border-slate-700';

          const Icon =
            t.variant === 'success'
              ? CheckCircle2
              : t.variant === 'error'
              ? AlertTriangle
              : Info;

          const iconColor =
            t.variant === 'success'
              ? 'text-emerald-400'
              : t.variant === 'error'
              ? 'text-rose-400'
              : 'text-sky-400';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm text-sm transition-all ${styles}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <p className="flex-1 leading-snug font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="Bağla"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
