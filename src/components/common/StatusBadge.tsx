import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudOff,
  FileEdit,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  SearchCheck,
} from 'lucide-react';
import {
  ASSIGNMENT_STATUS_LABELS,
  REPORT_STATUS_LABELS,
  SYNC_STATUS_LABELS,
  WORK_STATUS_CONCISE,
} from '../../domain/constants';
import type { AssignmentStatus, FieldReportStatus, SyncState, WorkStatus } from '../../types/domain';

/**
 * Indicateurs sémantiques institutionnels sans capsules « pill » décoratives :
 * typographie nette, contraste WCAG AA et icône fonctionnelle explicite (jamais de couleur seule).
 */
export const WorkStatusText: React.FC<{ status: WorkStatus }> = ({ status }) => {
  switch (status) {
    case 'ACHEVE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          {WORK_STATUS_CONCISE[status]}
        </span>
      );
    case 'EN_COURS':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 whitespace-nowrap">
          <PlayCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          {WORK_STATUS_CONCISE[status]}
        </span>
      );
    case 'A_L_ARRET':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
          {WORK_STATUS_CONCISE[status]}
        </span>
      );
    case 'NON_DEMARRE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
          <PauseCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {WORK_STATUS_CONCISE[status]}
        </span>
      );
  }
};

export const ReportStatusText: React.FC<{ status: FieldReportStatus }> = ({ status }) => {
  switch (status) {
    case 'VALIDE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
    case 'SOUMIS':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
    case 'EN_COURS_VERIFICATION':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 whitespace-nowrap">
          <SearchCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
    case 'RETOURNE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <RotateCcw className="w-3.5 h-3.5 text-red-600 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
    case 'EN_ATTENTE_SYNC':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
          <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
    case 'BROUILLON':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
          <FileEdit className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {REPORT_STATUS_LABELS[status]}
        </span>
      );
  }
};

export const SyncStatusText: React.FC<{ syncStatus: SyncState }> = ({ syncStatus }) => {
  if (syncStatus === 'SYNCHRONISE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        {SYNC_STATUS_LABELS[syncStatus]}
      </span>
    );
  }
  if (syncStatus === 'CONFLIT_AFFECTATION' || syncStatus === 'ERREUR_SYNC') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        {SYNC_STATUS_LABELS[syncStatus]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      {SYNC_STATUS_LABELS[syncStatus]}
    </span>
  );
};

export const AssignmentStatusText: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
  const color =
    status === 'ACTIVE'
      ? 'text-emerald-800'
      : status === 'REAFFECTEE'
      ? 'text-amber-800'
      : 'text-slate-600';
  return <span className={`text-xs font-semibold ${color}`}>{ASSIGNMENT_STATUS_LABELS[status]}</span>;
};
