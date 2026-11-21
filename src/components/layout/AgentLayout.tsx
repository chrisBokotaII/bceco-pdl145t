import React from 'react';
import {
  Building2,
  Cloud,
  CloudOff,
  FilePlus2,
  FolderKanban,
  History,
  MapPinned,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { APP_TITLE } from '../../domain/constants';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { UserAccountMenu } from '../common/UserAccountMenu';

export type AgentTab = 'projects' | 'form' | 'roadmap' | 'history' | 'sync';

interface Props {
  activeTab: AgentTab;
  onSelectTab: (tab: AgentTab) => void;
  children: React.ReactNode;
}

export const AgentLayout: React.FC<Props> = ({ activeTab, onSelectTab, children }) => {
  const {
    isOnline,
    syncQueue,
    localDrafts,
    reports,
    isSyncing,
  } = useApp();
  const reduced = usePrefersReducedMotion();

  const returnedCount = reports.filter((r) => r.status === 'RETOURNE').length;
  const pendingSyncCount = syncQueue.length;

  const tabs: {
    id: AgentTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'projects', label: 'Mes chantiers', shortLabel: 'Chantiers', icon: FolderKanban },
    { id: 'form', label: 'Fiche terrain', shortLabel: 'Collecte', icon: FilePlus2 },
    { id: 'roadmap', label: 'Feuille de route', shortLabel: 'Annexe', icon: MapPinned },
    {
      id: 'history',
      label: 'Mes soumissions',
      shortLabel: 'Fiches',
      icon: History,
      count: returnedCount + localDrafts.length,
    },
    {
      id: 'sync',
      label: 'Synchronisation',
      shortLabel: 'Synchro',
      icon: isOnline ? Cloud : CloudOff,
      count: pendingSyncCount,
    },
  ];

  return (
    <div className="min-h-screen bg-app-page flex flex-col">
      {/* Compact Sticky Top Bar (52px height — respects 15% mobile sticky cap combined with bottom nav) */}
      <header className="sticky top-0 z-30 bg-app-sidebar text-white h-[52px] px-3 sm:px-6 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="w-5 h-5 text-blue-300 shrink-0" />
          <p className="text-sm font-semibold leading-tight truncate">{APP_TITLE}</p>
        </div>

        {/* Desktop horizontal nav tabs */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navigation Agent de Terrain">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count ? (
                  <span className="font-mono text-[11px] text-amber-300 font-semibold">({tab.count})</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('sync')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              isOnline
                ? 'bg-emerald-700/30 text-emerald-100 border border-emerald-400/30'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isOnline ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isSyncing ? 'Synchro…' : isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="font-mono font-semibold">· {pendingSyncCount}</span>
            )}
          </button>

          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>

          <UserAccountMenu compact />
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-1.5 text-[11px] font-semibold text-red-800 no-print">
          Mode hors ligne actif — Sauvegarde locale IndexedDB opérationnelle
        </div>
      )}

      {/* Responsive Workspace Content (wide on desktop, padded above bottom nav on mobile) */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation (56px height, >= 44px touch targets) */}
      <nav
        aria-label="Navigation mobile Agent"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-app-nav border-t border-app-border grid grid-cols-5 pb-safe no-print"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[54px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium relative transition-colors ${
                active ? 'text-[#0F2544] font-semibold' : 'text-slate-500'
              }`}
            >
              {active && !reduced && (
                <motion.span
                  layoutId="agent-bottom-tab-indicator"
                  className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-slate-50 border border-slate-100 -z-0"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <div className="relative z-[1]">
                <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
                {tab.count ? (
                  <span className="absolute -top-1.5 -right-2.5 text-[10px] font-mono font-bold text-red-700 bg-amber-100 border border-amber-300 px-1 rounded">
                    {tab.count}
                  </span>
                ) : null}
              </div>
              <span className="relative z-[1] truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
