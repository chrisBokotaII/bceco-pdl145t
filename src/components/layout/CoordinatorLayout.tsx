import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckSquare,
  ClipboardList,
  Database,
  Ellipsis,
  FileSpreadsheet,
  FolderKanban,
  LogOut,
  RefreshCw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { APP_TITLE } from '../../domain/constants';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { fadeIn, sheetPanel } from '../../motion/presets';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import { UserAccountMenu } from '../common/UserAccountMenu';

export type CoordinatorSection =
  | 'dashboard'
  | 'register'
  | 'assignments'
  | 'agents'
  | 'reviews'
  | 'reporting'
  | 'audit';

interface Props {
  activeSection: CoordinatorSection;
  onSelectSection: (section: CoordinatorSection) => void;
  children: React.ReactNode;
}

type NavItem = {
  id: CoordinatorSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ALL_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', shortLabel: 'Tableau', icon: BarChart3 },
  { id: 'register', label: 'Registre des ouvrages', shortLabel: 'Ouvrages', icon: FolderKanban },
  { id: 'assignments', label: 'Gestion des affectations', shortLabel: 'Affect.', icon: ClipboardList },
  { id: 'agents', label: 'Agents de terrain', shortLabel: 'Agents', icon: Users },
  { id: 'reviews', label: 'Validation des fiches', shortLabel: 'Fiches', icon: CheckSquare },
  { id: 'reporting', label: 'Moteur de rapports', shortLabel: 'Rapports', icon: FileSpreadsheet },
  { id: 'audit', label: 'Audit & Sécurité', shortLabel: 'Audit', icon: Shield },
];

/** Primary thumb-zone tabs (agent-style 5 slots). Secondary live under « Plus ». */
const BOTTOM_PRIMARY: CoordinatorSection[] = [
  'dashboard',
  'register',
  'reviews',
  'reporting',
];

const MORE_SECTIONS: CoordinatorSection[] = ['assignments', 'agents', 'audit'];

export const CoordinatorLayout: React.FC<Props> = ({
  activeSection,
  onSelectSection,
  children,
}) => {
  const {
    authMode,
    logout,
    reports,
    projects,
    refreshData,
    dataLoading,
    seedFirestoreWithDemo,
  } = useApp();

  const [moreOpen, setMoreOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const reduced = usePrefersReducedMotion();

  const pendingReviewsCount = reports.filter(
    (r) => r.status === 'SOUMIS' || r.status === 'EN_COURS_VERIFICATION'
  ).length;

  const moreIsActive = MORE_SECTIONS.includes(activeSection);

  const bottomTabs = useMemo(() => {
    const primary = BOTTOM_PRIMARY.map((id) => ALL_NAV.find((n) => n.id === id)!);
    return primary;
  }, []);

  const handleSeedFirestore = async () => {
    setSeeding(true);
    try {
      await seedFirestoreWithDemo();
    } finally {
      setSeeding(false);
    }
  };

  const selectSection = (id: CoordinatorSection) => {
    onSelectSection(id);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-app-page flex flex-col">
      {/* Compact Sticky Top Bar — same pattern as AgentLayout */}
      <header className="sticky top-0 z-30 bg-app-sidebar text-white h-[52px] px-3 sm:px-6 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="w-5 h-5 text-blue-300 shrink-0" />
          <p className="text-sm font-semibold leading-tight truncate">{APP_TITLE}</p>
        </div>

        {/* Desktop horizontal nav — all sections */}
        <nav
          className="hidden md:flex items-center gap-1 overflow-x-auto max-w-[58vw]"
          aria-label="Navigation Coordonnateur"
        >
          {ALL_NAV.map((tab) => {
            const active = tab.id === activeSection;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectSection(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.shortLabel}</span>
                {tab.id === 'reviews' && pendingReviewsCount > 0 ? (
                  <span className="font-mono text-[11px] text-amber-300 font-semibold">
                    ({pendingReviewsCount})
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={dataLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 bg-white/10 text-slate-100 border border-white/15 hover:bg-white/15 disabled:opacity-50"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>

          <UserAccountMenu compact />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1520px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom thumb-zone nav — mirrors AgentLayout */}
      <nav
        aria-label="Navigation mobile Coordonnateur"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-app-nav border-t border-app-border grid grid-cols-5 pb-safe no-print"
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeSection;
          const count = tab.id === 'reviews' ? pendingReviewsCount : undefined;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectSection(tab.id)}
              className={`min-h-[54px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium relative transition-colors ${
                active ? 'text-[#0F2544] font-semibold' : 'text-slate-500'
              }`}
            >
              {active && !reduced && (
                <motion.span
                  layoutId="coord-bottom-tab-indicator"
                  className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-slate-50 border border-slate-100 -z-0"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <div className="relative z-[1]">
                <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
                {count ? (
                  <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold text-red-700 bg-amber-100 border border-amber-300 px-1 rounded">
                    {count}
                  </span>
                ) : null}
              </div>
              <span className="relative z-[1] truncate">{tab.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`min-h-[54px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium relative transition-colors ${
            moreIsActive || moreOpen
              ? 'text-[#0F2544] font-semibold'
              : 'text-slate-500'
          }`}
        >
          {(moreIsActive || moreOpen) && !reduced && (
            <motion.span
              layoutId="coord-bottom-tab-indicator"
              className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-slate-50 border border-slate-100 -z-0"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Ellipsis className={`relative z-[1] w-5 h-5 ${moreIsActive || moreOpen ? 'text-blue-700' : 'text-slate-500'}`} />
          <span className="relative z-[1] truncate">Plus</span>
        </button>
      </nav>

      {/* « Plus » sheet — secondary sections on mobile */}
      <AnimatePresence>
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end no-print">
            <motion.button
              type="button"
              aria-label="Fermer"
              className="flex-1 bg-slate-900/40"
              onClick={() => setMoreOpen(false)}
              initial={reduced ? false : 'hidden'}
              animate="show"
              exit={reduced ? undefined : 'exit'}
              variants={fadeIn}
            />
            <motion.div
              className="bg-app-card rounded-t-2xl border-t border-app-border shadow-xl pb-safe max-h-[85vh] overflow-y-auto"
              initial={reduced ? false : 'hidden'}
              animate="show"
              exit={reduced ? undefined : 'exit'}
              variants={sheetPanel}
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-app-border">
                <p className="text-sm font-semibold text-app-primary">Plus d’outils</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-md text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {MORE_SECTIONS.map((id) => {
                  const item = ALL_NAV.find((n) => n.id === id)!;
                  const Icon = item.icon;
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-left min-h-[48px] ${
                        active
                          ? 'bg-blue-50 text-[#0F2544]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div className="pt-2 pb-1 border-t border-app-border mt-2">
                  <ThemeSwitcher variant="list" showLabel />
                </div>

                {authMode === 'FIREBASE_AUTH' && projects.length === 0 && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedFirestore}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-amber-950 bg-amber-50 border border-amber-200 min-h-[48px]"
                  >
                    <Database className="w-5 h-5 shrink-0" />
                    {seeding ? 'Initialisation…' : 'Charger données Démo Firestore'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 min-h-[48px]"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
