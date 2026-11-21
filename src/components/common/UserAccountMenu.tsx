import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { menuPanel } from '../../motion/presets';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
  /** Compact trigger for the navy top bar */
  compact?: boolean;
  className?: string;
}

/**
 * Profile / settings menu: identity, theme (Light / Dark / System), logout.
 */
export const UserAccountMenu: React.FC<Props> = ({ compact = true, className = '' }) => {
  const { currentUser, logout } = useApp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!currentUser) return null;

  const roleLabel =
    currentUser.role === 'COORDINATEUR' ? 'Coordonnateur' : 'Agent de terrain';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md text-slate-100 hover:bg-white/10 border border-transparent hover:border-white/15 min-h-[40px]'
            : 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 min-h-[40px]'
        }
        title="Compte et paramètres"
      >
        <span
          className={
            compact
              ? 'w-7 h-7 rounded-md bg-white/15 border border-white/20 flex items-center justify-center'
              : 'w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600'
          }
        >
          <UserRound className="w-4 h-4" />
        </span>
        <span className="hidden lg:flex flex-col items-start leading-tight min-w-0 max-w-[140px]">
          <span className="truncate font-semibold">{currentUser.fullName.split('(')[0].trim()}</span>
          <span className={`truncate text-[10px] ${compact ? 'text-blue-200' : 'text-slate-500'}`}>
            {roleLabel}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="inline-flex"
        >
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={reduced ? false : 'hidden'}
            animate="show"
            exit={reduced ? undefined : 'exit'}
            variants={menuPanel}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-1.5rem,300px)] rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden origin-top-right"
          >
            <div className="px-3.5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.fullName}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
              <p className="text-[11px] font-medium text-slate-600 mt-1">{roleLabel}</p>
            </div>

            <div className="p-3 border-b border-slate-100">
              <ThemeSwitcher variant="list" showLabel />
            </div>

            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 min-h-[44px]"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
