import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const stylesByType = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100',
  info: 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
} as const;

export default function ToastHost() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] pointer-events-none">
      <div className="max-w-xl mx-auto px-4 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto border rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3 ${stylesByType[t.type]}`}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold leading-snug flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

