import { EXECUTION_STAGES } from './constants';
import type { ExecutionStage, ReceptionEntry, ReportPeriodicity } from '../types/domain';

export function formatDateFr(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const normalized = isoDate.includes('T') ? isoDate : `${isoDate}T00:00:00`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeFr(isoDate?: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatPercentFr(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} %`;
}

export function formatSignedGapFr(gap: number): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(gap));
  if (gap > 0) return `+${formatted} pts`;
  if (gap < 0) return `-${formatted} pts`;
  return `0,0 pt`;
}

export function formatIntegerFr(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

export function computePeriodKey(
  periodicity: ReportPeriodicity,
  collectionDate: string,
  weekNumber: string,
  month: string
): string {
  if (periodicity === 'HEBDOMADAIRE') {
    return weekNumber.trim() ? `SEM-${weekNumber.trim().toUpperCase()}` : `SEM-${collectionDate.slice(0, 10)}`;
  }
  if (periodicity === 'MENSUEL') {
    return month.trim() ? `MOIS-${month.trim()}` : `MOIS-${collectionDate.slice(0, 7)}`;
  }
  return `JOUR-${collectionDate.slice(0, 10)}`;
}

export function formatExecutionStagesLabel(stages: ExecutionStage[]): string {
  if (!stages || stages.length === 0) return 'Aucune étape renseignée';
  return stages
    .map((s) => EXECUTION_STAGES.find((item) => item.id === s)?.label ?? s)
    .join(', ');
}

export function formatExecutionStagesShort(stages: ExecutionStage[]): string {
  if (!stages || stages.length === 0) return '—';
  return stages
    .map((s) => EXECUTION_STAGES.find((item) => item.id === s)?.shortCode ?? s)
    .join(' · ');
}

export function formatReceptionCell(rec: ReceptionEntry): string {
  if (rec.status === 'NA') return 'N/A';
  const datePart = rec.date ? ` (${formatDateFr(rec.date)})` : '';
  const pvPart = rec.pvReference ? ` · PV ${rec.pvReference}` : '';
  const resPart = rec.reserves ? ` · Réserves: ${rec.reserves}` : '';
  return `${rec.status}${datePart}${pvPart}${resPart}`;
}

export function generateUniqueId(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthIso(): string {
  return new Date().toISOString().slice(0, 7);
}

export function currentIsoWeekLabel(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `S${String(week).padStart(2, '0')}-${d.getFullYear()}`;
}
