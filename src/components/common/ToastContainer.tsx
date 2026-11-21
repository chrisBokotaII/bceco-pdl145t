import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { toastMotion } from '../../motion/presets';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-md w-[calc(100vw-2rem)] no-print pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const toneStyles =
            t.tone === 'success'
              ? 'border-emerald-300 bg-app-card text-app-primary'
              : t.tone === 'warning'
              ? 'border-amber-300 bg-app-card text-app-primary'
              : t.tone === 'error'
              ? 'border-red-300 bg-app-card text-app-primary'
              : 'border-blue-300 bg-app-card text-app-primary';
          const Icon =
            t.tone === 'success'
              ? CheckCircle2
              : t.tone === 'warning'
              ? AlertTriangle
              : t.tone === 'error'
              ? AlertCircle
              : Info;
          const iconColor =
            t.tone === 'success'
              ? 'text-emerald-700'
              : t.tone === 'warning'
              ? 'text-amber-600'
              : t.tone === 'error'
              ? 'text-red-600'
              : 'text-blue-700';

          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              initial={reduced ? false : 'hidden'}
              animate="show"
              exit={reduced ? undefined : 'exit'}
              variants={toastMotion}
              className={`border rounded-md p-3.5 shadow-sm flex items-start gap-3 pointer-events-auto ${toneStyles}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-app-primary">{t.title}</p>
                {t.detail && (
                  <p className="text-xs text-app-secondary mt-0.5 leading-relaxed">{t.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-app-muted-fg hover:text-app-primary p-0.5"
                aria-label="Fermer la notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
