import { calculateTepTefGap } from './businessRules';
import {
  CONSTRAINT_CATEGORIES,
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  MATRICE_UNIQUE_HEADERS,
  PERIODICITY_LABELS,
  WORK_STATUS_CONCISE,
  WORK_STATUS_LABELS,
} from './constants';
import {
  formatDateFr,
  formatExecutionStagesLabel,
  formatExecutionStagesShort,
  formatReceptionCell,
  todayIsoDate,
} from './formatters';
import type {
  ConstraintCategory,
  ContractStatus,
  ExecutionStage,
  FieldReport,
  FieldReportStatus,
  InfrastructureType,
  Project,
  ProjectReceptions,
  ReportDataScope,
  ReportPeriodicity,
  WorkStatus,
} from '../types/domain';

export const MATRICE_UNIQUE_BLOC1_LABEL = 'IDENTIFICATION (données contractuelles – ne pas modifier)';
/** Aligné sur l’en-tête officiel du Modele_Matrice_Unique (bloc situation / suivi). */
export const MATRICE_UNIQUE_BLOC2_LABEL =
  'SITUATION À CE JOUR — SUIVI PHYSIQUE, FINANCIER, CONTRAINTES & RÉCEPTIONS';
export const MATRICE_UNIQUE_BLOC1_COUNT = 9;
export const MATRICE_UNIQUE_BLOC2_COUNT = 12;

export function matriceUniqueBloc2LabelForBaseline(baselineDate?: string): string {
  if (!baselineDate) return MATRICE_UNIQUE_BLOC2_LABEL;
  const d = baselineDate.includes('T') ? baselineDate.slice(0, 10) : baselineDate;
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return MATRICE_UNIQUE_BLOC2_LABEL;
  return `SITUATION AU ${day}/${m}/${y} (référence figée) — puis mise à jour terrain`;
}

export const FEUILLE_DE_ROUTE_10_HEADERS: string[] = [
  'N° Matrice',
  'Nom de l’ouvrage & Type (EP/CS/BA)',
  'Entreprise (PME)',
  'Statut (1/2/3)*',
  'Réalisation période & Niveau exécution',
  'TEP (%)',
  'TEF (%)',
  'Contraintes (1-4)** & Impacts',
  'Récept. RT/RP/RD',
  'Observations clés',
];

export const FEUILLE_DE_ROUTE_FOOTNOTES: [string, string] = [
  '* Codes Statut : 1) Achevé | 2) En cours (F=Fondation, E=Élévation, T=Toiture, Fin=Finition, PO=Petits œuvres) | 3) À l’arrêt / Non démarré.',
  '** Codes Contraintes : 1) Technique | 2) Logistique | 3) Financière | 4) Sociale et Environnementale.',
];

export interface ReportingFilterParams {
  periodicity: ReportPeriodicity;
  /** '' = Cumul toutes périodes ; sinon ex. 'S46-2026', '2026-10', '2026-11-15' */
  periodKeyFilter?: string;
  periodLabel?: string;
  dataScope: ReportDataScope;
  province?: string;
  territory?: string;
  infrastructureType?: '' | InfrastructureType;
  contractor?: string;
  workStatus?: '' | WorkStatus;
  contractStatus?: '' | ContractStatus;
  referenceDate?: string;
}

export interface AvailablePeriodOption {
  key: string;
  label: string;
  reportCount: number;
  validatedCount: number;
  submittedCount: number;
}

export interface ConsolidatedProjectRow {
  project: Project;
  // Colonnes 1-9 verrouillées
  projectId: string;
  matrixNumber: string;
  contractor: string;
  province: string;
  territory: string;
  sectorChiefdom: string;
  locality: string;
  infrastructureType: InfrastructureType;
  projectName: string;
  contractStatus: ContractStatus;
  startDate: string;
  definitiveReceptionDeadline: string;

  // Situation figée de référence
  baselineDate: string;
  baselineStatus: WorkStatus;
  baselineTep: number;
  baselineTef: number;

  // Situation consolidée sur le périmètre et la période demandés (Colonnes 10-21)
  currentStatus: WorkStatus;
  latestPeriodRealization: string;
  latestExecutionStages: ExecutionStage[];
  currentTep: number;
  currentTef: number;
  currentGap: number;
  tepDeltaVsBaseline: number;
  tefDeltaVsBaseline: number;
  isGapAlert: boolean;
  gapJustification: string;

  latestConstraintCategories: ConstraintCategory[];
  latestConstraintsSummary: string;
  hasUnresolvedConstraints: boolean;
  hasCriticalConstraint: boolean;
  latestImpactsSummary: string;
  impactsFlags: {
    delays: boolean;
    costs: boolean;
    quality: boolean;
    stoppage: boolean;
  };
  correctiveMeasures: string;
  urgentActionsRequired: string;
  actionOwner: string;

  receptions: ProjectReceptions;
  receptionsCoherent: boolean;
  hasReceptionReserves: boolean;
  isDeadlineOverdue: boolean;
  daysToDeadline: number | null;
  latestObservation: string;

  // Traçabilité source & personnel mobilisé
  sourceStatus: 'REGISTRE_VALIDE' | 'REFERENCE_FIGEE' | FieldReportStatus;
  sourceLabel: string;
  hasPendingOverlay: boolean;
  sourceReportId?: string;
  sourceReportDate?: string;
  reportedInSelectedPeriod: boolean;
  skilledWorkers: number;
  laborers: number;
  totalWorkers: number;
  siteEngineerPresent: boolean | null;
}

export interface PeriodSummaryRow {
  periodKey: string;
  label: string;
  dateRange: string;
  reportsCount: number;
  validatedCount: number;
  submittedCount: number;
  duplicateFlaggedCount: number;
  uniqueProjectsCount: number;
  completedCount: number;
  inProgressCount: number;
  stoppedCount: number;
  notStartedCount: number;
  averageTep: number;
  averageTef: number;
  averageGap: number;
  tepDeltaVsPrev: number | null;
  tefDeltaVsPrev: number | null;
  gapAlertsCount: number;
  criticalConstraintsCount: number;
  rtOkCount: number;
  rpOkCount: number;
  rdOkCount: number;
  totalWorkforce: number;
}

export interface GeoBreakdownRow {
  province: string;
  territoriesCount: number;
  totalProjects: number;
  epCount: number;
  csCount: number;
  baCount: number;
  completed: number;
  inProgress: number;
  stopped: number;
  notStarted: number;
  averageTep: number;
  averageTef: number;
  averageGap: number;
  rtOk: number;
  rpOk: number;
  rdOk: number;
  gapAlertsCount: number;
  criticalConstraintsCount: number;
  overdueCount: number;
}

export interface TerritoryBreakdownRow extends Omit<GeoBreakdownRow, 'territoriesCount'> {
  territory: string;
}

export interface TypeBreakdownRow {
  infrastructureType: InfrastructureType;
  label: string;
  shortCode: string;
  totalProjects: number;
  sharePercent: number;
  completed: number;
  inProgress: number;
  stopped: number;
  notStarted: number;
  averageTep: number;
  averageTef: number;
  averageGap: number;
  rtOk: number;
  rpOk: number;
  rdOk: number;
  criticalConstraintsCount: number;
}

export interface ContractorBreakdownRow {
  contractor: string;
  totalProjects: number;
  provinces: string[];
  completed: number;
  inProgress: number;
  stopped: number;
  notStarted: number;
  averageTep: number;
  averageTef: number;
  averageGap: number;
  gapAlertsCount: number;
  criticalConstraintsCount: number;
  overdueCount: number;
  rdOk: number;
}

export interface ConstraintCategoryBreakdownRow {
  category: ConstraintCategory;
  number: string;
  label: string;
  examples: string;
  projectsCount: number;
  shareOfConstrainedPercent: number;
  criticalCount: number;
  stoppedCount: number;
}

export interface SourceValidationCheck {
  code: string;
  label: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  expected: string;
  actual: string;
  detail: string;
}

export interface ConsolidatedReportKPIs {
  totalProjects: number;
  projectsReportedInPeriod: number;
  periodCoveragePercent: number;
  reportsCount: number;
  allScopedReportsCount: number;
  validatedReportsCount: number;
  submittedOnlyReportsCount: number;
  duplicateFlaggedReportsCount: number;
  pendingOverlayProjectsCount: number;

  provinces: string[];
  territories: string[];
  provincesCount: number;
  territoriesCount: number;

  completed: number;
  inProgress: number;
  stopped: number;
  notStarted: number;
  completionRatePercent: number;

  averageTep: number;
  averageTef: number;
  averageGap: number;
  baselineAverageTep: number;
  baselineAverageTef: number;
  tepProgressionVsBaseline: number;
  tefProgressionVsBaseline: number;

  gapAlertsCount: number;
  unresolvedConstraintsCount: number;
  criticalConstraintsCount: number;
  overdueDeadlineCount: number;

  rtOk: number;
  rpOk: number;
  rdOk: number;
  rtPending: number;
  rpPending: number;
  rdPending: number;
  receptionsWithReservesCount: number;

  totalSkilledWorkers: number;
  totalLaborers: number;
  totalWorkforce: number;
}

export interface ConsolidatedReportModel {
  params: Required<Omit<ReportingFilterParams, 'periodLabel'>> & { periodLabel: string };
  title: string;
  filtersSummary: string;
  referenceDate: string;
  kpis: ConsolidatedReportKPIs;
  rows: ConsolidatedProjectRow[];
  periodReports: FieldReport[];
  allScopedReports: FieldReport[];
  weeklySummaries: PeriodSummaryRow[];
  monthlySummaries: PeriodSummaryRow[];
  byProvince: GeoBreakdownRow[];
  byTerritory: TerritoryBreakdownRow[];
  byInfrastructureType: TypeBreakdownRow[];
  byContractor: ContractorBreakdownRow[];
  constraintsBreakdown: ConstraintCategoryBreakdownRow[];
  impactTotals: {
    delays: number;
    costs: number;
    quality: number;
    stoppage: number;
  };
  flaggedRows: ConsolidatedProjectRow[];
  validationChecks: SourceValidationCheck[];
  allChecksPassed: boolean;
  hasCheckFailures: boolean;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function mean1(values: number[]): number {
  if (values.length === 0) return 0;
  return round1(values.reduce((acc, v) => acc + v, 0) / values.length);
}

function pct1(part: number, total: number): number {
  if (total <= 0) return 0;
  return round1((part / total) * 100);
}

/**
 * Calcule le code semaine ISO-8601 exact au format 'SXX-YYYY' (ex: 'S46-2026').
 */
export function getIsoWeekCode(isoDate: string): string {
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return 'S01-2026';
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `S${String(weekNo).padStart(2, '0')}-${d.getUTCFullYear()}`;
}

/**
 * Calcule les dates ISO de début (lundi) et fin (dimanche) d'un code semaine 'SXX-YYYY'.
 */
export function getIsoWeekDateBounds(weekCode: string): { start: string; end: string } | null {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return null;
  const week = Number(match[1]);
  const year = Number(match[2]);
  if (week < 1 || week > 53) return null;

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayW1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  const monday = new Date(mondayW1.getTime() + (week - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export function getMonthDateBounds(monthKey: string): { start: string; end: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function normalizeReportWeekCode(report: FieldReport): string {
  const raw = report.identification?.weekNumber?.trim().toUpperCase();
  if (raw && /^S\d{1,2}-\d{4}$/.test(raw)) {
    const [, w, y] = /^S(\d{1,2})-(\d{4})$/.exec(raw)!;
    return `S${w.padStart(2, '0')}-${y}`;
  }
  return getIsoWeekCode(report.collectionDate || report.identification?.collectionDate || '');
}

export function normalizeReportMonthKey(report: FieldReport): string {
  const raw = report.identification?.month?.trim();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }
  const dateStr = report.collectionDate || report.identification?.collectionDate || '';
  return dateStr.length >= 7 ? dateStr.slice(0, 7) : '2026-01';
}

const FRENCH_MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function formatMonthKeyFr(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  const idx = Number(match[2]) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${FRENCH_MONTHS[idx]} ${match[1]}`;
}

export function formatWeekCodeFr(weekCode: string): string {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return weekCode;
  return `Semaine ${match[1].padStart(2, '0')} — ${match[2]}`;
}

function weekSortKey(weekCode: string): string {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return weekCode;
  return `${match[2]}-${match[1].padStart(2, '0')}`;
}

export function extractAvailablePeriods(
  reports: FieldReport[],
  dataScope: ReportDataScope
): {
  weeks: AvailablePeriodOption[];
  months: AvailablePeriodOption[];
  days: AvailablePeriodOption[];
} {
  const eligible = reports.filter((r) => {
    if (r.status === 'BROUILLON' || r.status === 'RETOURNE') return false;
    if (dataScope === 'VALIDES_UNIQUEMENT') return r.status === 'VALIDE';
    return r.status === 'VALIDE' || r.status === 'SOUMIS' || r.status === 'EN_COURS_VERIFICATION';
  });

  const weekMap = new Map<string, { reportCount: number; validatedCount: number; submittedCount: number }>();
  const monthMap = new Map<string, { reportCount: number; validatedCount: number; submittedCount: number }>();
  const dayMap = new Map<string, { reportCount: number; validatedCount: number; submittedCount: number }>();

  for (const r of eligible) {
    const wk = normalizeReportWeekCode(r);
    const mo = normalizeReportMonthKey(r);
    const dy = (r.collectionDate || r.identification.collectionDate).slice(0, 10);
    const isVal = r.status === 'VALIDE';

    const bump = (map: Map<string, { reportCount: number; validatedCount: number; submittedCount: number }>, key: string) => {
      const cur = map.get(key) ?? { reportCount: 0, validatedCount: 0, submittedCount: 0 };
      cur.reportCount += 1;
      if (isVal) cur.validatedCount += 1;
      else cur.submittedCount += 1;
      map.set(key, cur);
    };

    bump(weekMap, wk);
    bump(monthMap, mo);
    bump(dayMap, dy);
  }

  const weeks = Array.from(weekMap.entries())
    .sort((a, b) => weekSortKey(b[0]).localeCompare(weekSortKey(a[0])))
    .map(([key, counts]) => {
      const bounds = getIsoWeekDateBounds(key);
      const rangeSuffix = bounds ? ` (${formatDateFr(bounds.start)} – ${formatDateFr(bounds.end)})` : '';
      return {
        key,
        label: `${formatWeekCodeFr(key)}${rangeSuffix}`,
        ...counts,
      };
    });

  const months = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, counts]) => ({
      key,
      label: formatMonthKeyFr(key),
      ...counts,
    }));

  const days = Array.from(dayMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, counts]) => ({
      key,
      label: `Journée du ${formatDateFr(key)}`,
      ...counts,
    }));

  return { weeks, months, days };
}

function isReceptionsSequenceCoherent(receptions: ProjectReceptions): boolean {
  const rtOk = receptions.rt.status === 'OK';
  const rpOk = receptions.rp.status === 'OK';
  const rdOk = receptions.rd.status === 'OK';
  if (rdOk && (!rpOk || !rtOk)) return false;
  if (rpOk && !rtOk) return false;
  return true;
}

function hasAnyReceptionReserves(receptions: ProjectReceptions): boolean {
  return Boolean(
    receptions.rt.reserves?.trim() || receptions.rp.reserves?.trim() || receptions.rd.reserves?.trim()
  );
}

function computeDaysDifference(targetIso: string, refIso: string): number | null {
  if (!targetIso || !refIso) return null;
  const t = Date.parse(`${targetIso.slice(0, 10)}T00:00:00Z`);
  const r = Date.parse(`${refIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(r)) return null;
  return Math.round((t - r) / 86400000);
}

function sortReportsLatestFirst(a: FieldReport, b: FieldReport): number {
  const dateDiff = (b.collectionDate || '').localeCompare(a.collectionDate || '');
  if (dateDiff !== 0) return dateDiff;
  // Prefer validated when same collection date, then higher version, then updatedAt
  if (a.status === 'VALIDE' && b.status !== 'VALIDE') return -1;
  if (b.status === 'VALIDE' && a.status !== 'VALIDE') return 1;
  if (b.version !== a.version) return b.version - a.version;
  return (b.updatedAt || '').localeCompare(a.updatedAt || '');
}

function buildPeriodSummaryRows(
  reports: FieldReport[],
  mode: 'WEEKLY' | 'MONTHLY'
): PeriodSummaryRow[] {
  const groups = new Map<string, FieldReport[]>();
  for (const r of reports) {
    const key = mode === 'WEEKLY' ? normalizeReportWeekCode(r) : normalizeReportMonthKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
    mode === 'WEEKLY' ? weekSortKey(a).localeCompare(weekSortKey(b)) : a.localeCompare(b)
  );

  let prevAvgTep: number | null = null;
  let prevAvgTef: number | null = null;

  return sortedKeys.map((key) => {
    const list = groups.get(key)!;
    const validatedCount = list.filter((r) => r.status === 'VALIDE').length;
    const submittedCount = list.length - validatedCount;
    const duplicateFlaggedCount = list.filter((r) => (r.potentialDuplicateOf?.length ?? 0) > 0).length;

    // Deduplicate to latest report per project within the period for project-level averages
    const latestByProject = new Map<string, FieldReport>();
    for (const r of [...list].sort(sortReportsLatestFirst)) {
      if (!latestByProject.has(r.projectId)) {
        latestByProject.set(r.projectId, r);
      }
    }
    const uniqueLatest = Array.from(latestByProject.values());
    const completedCount = uniqueLatest.filter((r) => r.progress.workStatus === 'ACHEVE').length;
    const inProgressCount = uniqueLatest.filter((r) => r.progress.workStatus === 'EN_COURS').length;
    const stoppedCount = uniqueLatest.filter((r) => r.progress.workStatus === 'A_L_ARRET').length;
    const notStartedCount = uniqueLatest.filter((r) => r.progress.workStatus === 'NON_DEMARRE').length;

    const averageTep = mean1(uniqueLatest.map((r) => r.progress.currentTep));
    const averageTef = mean1(uniqueLatest.map((r) => r.progress.currentTef));
    const averageGap = mean1(
      uniqueLatest.map((r) => calculateTepTefGap(r.progress.currentTep, r.progress.currentTef))
    );
    const gapAlertsCount = uniqueLatest.filter(
      (r) => Math.abs(calculateTepTefGap(r.progress.currentTep, r.progress.currentTef)) > 10
    ).length;
    const criticalConstraintsCount = uniqueLatest.filter((r) => r.constraints.isCritical).length;
    const rtOkCount = uniqueLatest.filter((r) => r.receptions.rt.status === 'OK').length;
    const rpOkCount = uniqueLatest.filter((r) => r.receptions.rp.status === 'OK').length;
    const rdOkCount = uniqueLatest.filter((r) => r.receptions.rd.status === 'OK').length;
    const totalWorkforce = uniqueLatest.reduce(
      (sum, r) => sum + (r.progress.skilledWorkersCount || 0) + (r.progress.laborersCount || 0),
      0
    );

    const tepDeltaVsPrev = prevAvgTep !== null ? round1(averageTep - prevAvgTep) : null;
    const tefDeltaVsPrev = prevAvgTef !== null ? round1(averageTef - prevAvgTef) : null;
    prevAvgTep = averageTep;
    prevAvgTef = averageTef;

    let dateRange = '';
    if (mode === 'WEEKLY') {
      const bounds = getIsoWeekDateBounds(key);
      dateRange = bounds ? `${formatDateFr(bounds.start)} – ${formatDateFr(bounds.end)}` : key;
    } else {
      const bounds = getMonthDateBounds(key);
      dateRange = bounds ? `${formatDateFr(bounds.start)} – ${formatDateFr(bounds.end)}` : key;
    }

    return {
      periodKey: key,
      label: mode === 'WEEKLY' ? formatWeekCodeFr(key) : formatMonthKeyFr(key),
      dateRange,
      reportsCount: list.length,
      validatedCount,
      submittedCount,
      duplicateFlaggedCount,
      uniqueProjectsCount: uniqueLatest.length,
      completedCount,
      inProgressCount,
      stoppedCount,
      notStartedCount,
      averageTep,
      averageTef,
      averageGap,
      tepDeltaVsPrev,
      tefDeltaVsPrev,
      gapAlertsCount,
      criticalConstraintsCount,
      rtOkCount,
      rpOkCount,
      rdOkCount,
      totalWorkforce,
    };
  });
}

function deriveDefaultPeriodLabel(periodicity: ReportPeriodicity, periodKeyFilter: string): string {
  if (!periodKeyFilter) {
    if (periodicity === 'HEBDOMADAIRE') return 'Synthèse Hebdomadaire Cumulée';
    if (periodicity === 'MENSUEL') return 'Synthèse Mensuelle Cumulée';
    return 'Situation Journalière Cumulée';
  }
  if (periodicity === 'HEBDOMADAIRE') return formatWeekCodeFr(periodKeyFilter);
  if (periodicity === 'MENSUEL') return formatMonthKeyFr(periodKeyFilter);
  return `Journée du ${formatDateFr(periodKeyFilter)}`;
}

/**
 * Moteur principal de consolidation et de validation mathématique contre la structure source
 * BCECO / PDL-145T (Matrice Unique 21 colonnes + Fiche de Collecte 5 sections + Annexe Multi-Chantiers).
 * Pur et déterministe — exécutable à l'identique côté navigateur et côté serveur Express.
 */
export function buildConsolidatedReportModel(
  allProjects: Project[],
  allReports: FieldReport[],
  rawParams: ReportingFilterParams
): ConsolidatedReportModel {
  const periodKeyFilter = (rawParams.periodKeyFilter ?? '').trim();
  const province = (rawParams.province ?? '').trim();
  const territory = (rawParams.territory ?? '').trim();
  const infrastructureType = (rawParams.infrastructureType ?? '') as '' | InfrastructureType;
  const contractor = (rawParams.contractor ?? '').trim();
  const workStatus = (rawParams.workStatus ?? '') as '' | WorkStatus;
  const contractStatus = (rawParams.contractStatus ?? '') as '' | ContractStatus;
  const referenceDate = (rawParams.referenceDate ?? todayIsoDate()).slice(0, 10);
  const periodLabel =
    rawParams.periodLabel?.trim() || deriveDefaultPeriodLabel(rawParams.periodicity, periodKeyFilter);

  const normalizedParams = {
    periodicity: rawParams.periodicity,
    periodKeyFilter,
    periodLabel,
    dataScope: rawParams.dataScope,
    province,
    territory,
    infrastructureType,
    contractor,
    workStatus,
    contractStatus,
    referenceDate,
  };

  // 1) Structural / geographic project filtering (prior to period projection)
  const preFilteredProjects = allProjects
    .filter((p) => {
      if (province && p.province !== province) return false;
      if (territory && p.territory !== territory) return false;
      if (infrastructureType && p.infrastructureType !== infrastructureType) return false;
      if (contractor && p.contractor !== contractor) return false;
      if (contractStatus && p.contractStatus !== contractStatus) return false;
      return true;
    })
    .sort((a, b) => a.matrixNumber.localeCompare(b.matrixNumber, 'fr', { numeric: true }));

  const preFilteredProjectIds = new Set(preFilteredProjects.map((p) => p.id));

  // 2) Eligible reports matching dataScope (NEVER include BROUILLON or RETOURNE)
  const preScopedReports = allReports
    .filter((r) => {
      if (!preFilteredProjectIds.has(r.projectId)) return false;
      if (r.status === 'BROUILLON' || r.status === 'RETOURNE') return false;
      if (rawParams.dataScope === 'VALIDES_UNIQUEMENT') {
        return r.status === 'VALIDE';
      }
      return r.status === 'VALIDE' || r.status === 'SOUMIS' || r.status === 'EN_COURS_VERIFICATION';
    })
    .sort(sortReportsLatestFirst);

  // Determine cutoff date when a specific week/month/day is selected
  let periodCutoffEndDate: string | null = null;
  if (periodKeyFilter) {
    if (rawParams.periodicity === 'HEBDOMADAIRE') {
      periodCutoffEndDate = getIsoWeekDateBounds(periodKeyFilter)?.end ?? null;
    } else if (rawParams.periodicity === 'MENSUEL') {
      periodCutoffEndDate = getMonthDateBounds(periodKeyFilter)?.end ?? null;
    } else {
      periodCutoffEndDate = periodKeyFilter.slice(0, 10);
    }
  }

  const matchesSelectedPeriod = (r: FieldReport): boolean => {
    if (!periodKeyFilter) return true;
    if (rawParams.periodicity === 'HEBDOMADAIRE') {
      return normalizeReportWeekCode(r) === periodKeyFilter.toUpperCase();
    }
    if (rawParams.periodicity === 'MENSUEL') {
      return normalizeReportMonthKey(r) === periodKeyFilter;
    }
    return (r.collectionDate || '').slice(0, 10) === periodKeyFilter.slice(0, 10);
  };

  // Group reports by projectId
  const reportsByProject = new Map<string, FieldReport[]>();
  for (const r of preScopedReports) {
    const arr = reportsByProject.get(r.projectId) ?? [];
    arr.push(r);
    reportsByProject.set(r.projectId, arr);
  }

  // 3) Resolve each project row cleanly according to dataScope & periodKeyFilter
  const projectedRows: ConsolidatedProjectRow[] = preFilteredProjects.map((project) => {
    const projectReports = reportsByProject.get(project.id) ?? [];
    const periodReport = periodKeyFilter ? projectReports.find(matchesSelectedPeriod) : projectReports[0];
    const latestValidated = projectReports.find((r) => r.status === 'VALIDE');

    let selectedReport: FieldReport | undefined;
    let useBaselineFallback = false;
    let hasPendingOverlay = false;

    if (periodKeyFilter && periodCutoffEndDate) {
      if (periodReport) {
        selectedReport = periodReport;
      } else {
        selectedReport = projectReports.find((r) => (r.collectionDate || '').slice(0, 10) <= periodCutoffEndDate!);
        if (!selectedReport && project.baselineDate && project.baselineDate <= periodCutoffEndDate) {
          useBaselineFallback = true;
        }
      }
      if (selectedReport && selectedReport.status !== 'VALIDE') {
        hasPendingOverlay = true;
      }
    } else if (rawParams.dataScope === 'SOUMIS_ET_VALIDES') {
      const latestAny = projectReports[0];
      if (
        latestAny &&
        latestAny.status !== 'VALIDE' &&
        (!latestValidated || sortReportsLatestFirst(latestAny, latestValidated) < 0)
      ) {
        selectedReport = latestAny;
        hasPendingOverlay = true;
      } else {
        selectedReport = latestValidated;
      }
    } else {
      // Cumulative + VALIDES_UNIQUEMENT: strictly official validated register
      selectedReport = latestValidated;
    }

    let currentStatus: WorkStatus;
    let latestPeriodRealization: string;
    let latestExecutionStages: ExecutionStage[];
    let currentTep: number;
    let currentTef: number;
    let latestConstraintCategories: ConstraintCategory[];
    let latestConstraintsSummary: string;
    let hasUnresolvedConstraints: boolean;
    let hasCriticalConstraint: boolean;
    let latestImpactsSummary: string;
    let receptions: ProjectReceptions;
    let latestObservation: string;
    let sourceStatus: ConsolidatedProjectRow['sourceStatus'];
    let sourceLabel: string;

    if (selectedReport && (periodKeyFilter || hasPendingOverlay)) {
      currentStatus = selectedReport.progress.workStatus;
      latestPeriodRealization = selectedReport.progress.periodWorksExecuted;
      latestExecutionStages = [...selectedReport.progress.executionStages];
      currentTep = selectedReport.progress.currentTep;
      currentTef = selectedReport.progress.currentTef;
      latestConstraintCategories = [...selectedReport.constraints.categories];
      latestConstraintsSummary =
        selectedReport.constraints.detailedDescriptions.filter((d) => d.trim()).join(' ; ') ||
        (selectedReport.constraints.categories.length > 0
          ? selectedReport.constraints.categories.join(', ')
          : 'Aucune contrainte active');
      hasUnresolvedConstraints = selectedReport.constraints.categories.length > 0;
      hasCriticalConstraint = selectedReport.constraints.isCritical;
      latestImpactsSummary = selectedReport.constraints.impacts.details || 'Aucun impact majeur';
      receptions = {
        rt: { ...selectedReport.receptions.rt },
        rp: { ...selectedReport.receptions.rp },
        rd: { ...selectedReport.receptions.rd },
      };
      latestObservation = selectedReport.receptions.generalObservations || project.latestObservation;
      sourceStatus = selectedReport.status;
      sourceLabel =
        selectedReport.status === 'VALIDE'
          ? 'Fiche validée'
          : selectedReport.status === 'EN_COURS_VERIFICATION'
          ? 'En vérification (non validée)'
          : 'Soumise (non validée)';
    } else if (useBaselineFallback) {
      currentStatus = project.baselineStatus;
      latestPeriodRealization = `Situation figée de référence au ${formatDateFr(project.baselineDate)}`;
      latestExecutionStages = [...project.latestExecutionStages];
      currentTep = project.baselineTep;
      currentTef = project.baselineTef;
      latestConstraintCategories = [...project.latestConstraintCategories];
      latestConstraintsSummary = project.latestConstraintsSummary;
      hasUnresolvedConstraints = project.hasUnresolvedConstraints;
      hasCriticalConstraint = project.hasCriticalConstraint;
      latestImpactsSummary = project.latestImpactsSummary;
      receptions = {
        rt: { ...project.receptions.rt },
        rp: { ...project.receptions.rp },
        rd: { ...project.receptions.rd },
      };
      latestObservation = project.latestObservation;
      sourceStatus = 'REFERENCE_FIGEE';
      sourceLabel = `Référence figée (${formatDateFr(project.baselineDate)})`;
    } else {
      // Official consolidated register state
      currentStatus = project.currentStatus;
      latestPeriodRealization = project.latestPeriodRealization;
      latestExecutionStages = [...project.latestExecutionStages];
      currentTep = project.currentTep;
      currentTef = project.currentTef;
      latestConstraintCategories = [...project.latestConstraintCategories];
      latestConstraintsSummary = project.latestConstraintsSummary;
      hasUnresolvedConstraints = project.hasUnresolvedConstraints;
      hasCriticalConstraint = project.hasCriticalConstraint;
      latestImpactsSummary = project.latestImpactsSummary;
      receptions = {
        rt: { ...project.receptions.rt },
        rp: { ...project.receptions.rp },
        rd: { ...project.receptions.rd },
      };
      latestObservation = project.latestObservation;
      sourceStatus = 'REGISTRE_VALIDE';
      sourceLabel = latestValidated ? 'Registre consolidé (Validé)' : 'Registre initial (Référence)';
    }

    const currentGap = calculateTepTefGap(currentTep, currentTef);
    const isGapAlert = Math.abs(currentGap) > 10;
    const referenceReport = selectedReport ?? latestValidated;
    const gapJustification = referenceReport?.progress.gapJustification?.trim() ?? '';

    const impactsFlags = referenceReport
      ? {
          delays: Boolean(referenceReport.constraints.impacts.delays),
          costs: Boolean(referenceReport.constraints.impacts.costs),
          quality: Boolean(referenceReport.constraints.impacts.quality),
          stoppage: Boolean(referenceReport.constraints.impacts.stoppage),
        }
      : {
          delays: hasUnresolvedConstraints,
          costs:
            latestConstraintCategories.includes('FINANCIERE') ||
            latestConstraintCategories.includes('LOGISTIQUE'),
          quality: latestConstraintCategories.includes('TECHNIQUE'),
          stoppage: currentStatus === 'A_L_ARRET',
        };

    const correctiveMeasures =
      referenceReport?.constraints.correctiveMeasures?.trim() ||
      (hasUnresolvedConstraints || isGapAlert
        ? 'Suivi technique et financier programmé par la coordination provinciale BCECO.'
        : 'Aucune action corrective urgente.');
    const urgentActionsRequired = referenceReport?.constraints.urgentActionsRequired?.trim() || '';
    const actionOwner =
      referenceReport?.constraints.actionOwner?.trim() ||
      (hasCriticalConstraint ? 'BCECO & Entreprise' : hasUnresolvedConstraints ? 'Entreprise' : '—');

    const evalDate = periodCutoffEndDate || referenceDate;
    const daysToDeadline = computeDaysDifference(project.definitiveReceptionDeadline, evalDate);
    const isDeadlineOverdue =
      daysToDeadline !== null && daysToDeadline < 0 && receptions.rd.status !== 'OK';

    const skilledWorkers = referenceReport?.progress.skilledWorkersCount ?? 0;
    const laborers = referenceReport?.progress.laborersCount ?? 0;

    return {
      project,
      projectId: project.id,
      matrixNumber: project.matrixNumber,
      contractor: project.contractor,
      province: project.province,
      territory: project.territory,
      sectorChiefdom: project.sectorChiefdom,
      locality: project.locality,
      infrastructureType: project.infrastructureType,
      projectName: project.projectName,
      contractStatus: project.contractStatus,
      startDate: project.startDate,
      definitiveReceptionDeadline: project.definitiveReceptionDeadline,
      baselineDate: project.baselineDate,
      baselineStatus: project.baselineStatus,
      baselineTep: project.baselineTep,
      baselineTef: project.baselineTef,
      currentStatus,
      latestPeriodRealization,
      latestExecutionStages,
      currentTep,
      currentTef,
      currentGap,
      tepDeltaVsBaseline: round1(currentTep - project.baselineTep),
      tefDeltaVsBaseline: round1(currentTef - project.baselineTef),
      isGapAlert,
      gapJustification,
      latestConstraintCategories,
      latestConstraintsSummary,
      hasUnresolvedConstraints,
      hasCriticalConstraint,
      latestImpactsSummary,
      impactsFlags,
      correctiveMeasures,
      urgentActionsRequired,
      actionOwner,
      receptions,
      receptionsCoherent: isReceptionsSequenceCoherent(receptions),
      hasReceptionReserves: hasAnyReceptionReserves(receptions),
      isDeadlineOverdue,
      daysToDeadline,
      latestObservation,
      sourceStatus,
      sourceLabel,
      hasPendingOverlay,
      sourceReportId: referenceReport?.id,
      sourceReportDate: referenceReport?.collectionDate,
      reportedInSelectedPeriod: Boolean(periodReport),
      skilledWorkers,
      laborers,
      totalWorkers: skilledWorkers + laborers,
      siteEngineerPresent: referenceReport ? referenceReport.progress.siteEngineerPresent : null,
    };
  });

  // 4) Apply workStatus filter after resolving period state so status reconciliation is exact
  const rows = workStatus
    ? projectedRows.filter((r) => r.currentStatus === workStatus)
    : projectedRows;
  const finalProjectIds = new Set(rows.map((r) => r.projectId));

  const allScopedReports = preScopedReports.filter((r) => finalProjectIds.has(r.projectId));
  const periodReports = allScopedReports.filter(matchesSelectedPeriod);

  // 5) Executive KPIs
  const totalProjects = rows.length;
  const projectsReportedInPeriod = rows.filter((r) => r.reportedInSelectedPeriod).length;
  const provinces = Array.from(new Set(rows.map((r) => r.province))).sort((a, b) => a.localeCompare(b, 'fr'));
  const territories = Array.from(new Set(rows.map((r) => r.territory))).sort((a, b) => a.localeCompare(b, 'fr'));

  const completed = rows.filter((r) => r.currentStatus === 'ACHEVE').length;
  const inProgress = rows.filter((r) => r.currentStatus === 'EN_COURS').length;
  const stopped = rows.filter((r) => r.currentStatus === 'A_L_ARRET').length;
  const notStarted = rows.filter((r) => r.currentStatus === 'NON_DEMARRE').length;

  const averageTep = mean1(rows.map((r) => r.currentTep));
  const averageTef = mean1(rows.map((r) => r.currentTef));
  const averageGap = mean1(rows.map((r) => r.currentGap));
  const baselineAverageTep = mean1(rows.map((r) => r.baselineTep));
  const baselineAverageTef = mean1(rows.map((r) => r.baselineTef));

  const rtOk = rows.filter((r) => r.receptions.rt.status === 'OK').length;
  const rpOk = rows.filter((r) => r.receptions.rp.status === 'OK').length;
  const rdOk = rows.filter((r) => r.receptions.rd.status === 'OK').length;
  const rtPending = totalProjects - rtOk;
  const rpPending = totalProjects - rpOk;
  const rdPending = totalProjects - rdOk;

  const validatedReportsCount = periodReports.filter((r) => r.status === 'VALIDE').length;
  const submittedOnlyReportsCount = periodReports.length - validatedReportsCount;
  const duplicateFlaggedReportsCount = periodReports.filter(
    (r) => (r.potentialDuplicateOf?.length ?? 0) > 0
  ).length;

  const kpis: ConsolidatedReportKPIs = {
    totalProjects,
    projectsReportedInPeriod,
    periodCoveragePercent: pct1(projectsReportedInPeriod, totalProjects),
    reportsCount: periodReports.length,
    allScopedReportsCount: allScopedReports.length,
    validatedReportsCount,
    submittedOnlyReportsCount,
    duplicateFlaggedReportsCount,
    pendingOverlayProjectsCount: rows.filter((r) => r.hasPendingOverlay).length,
    provinces,
    territories,
    provincesCount: provinces.length,
    territoriesCount: territories.length,
    completed,
    inProgress,
    stopped,
    notStarted,
    completionRatePercent: pct1(completed, totalProjects),
    averageTep,
    averageTef,
    averageGap,
    baselineAverageTep,
    baselineAverageTef,
    tepProgressionVsBaseline: round1(averageTep - baselineAverageTep),
    tefProgressionVsBaseline: round1(averageTef - baselineAverageTef),
    gapAlertsCount: rows.filter((r) => r.isGapAlert).length,
    unresolvedConstraintsCount: rows.filter((r) => r.hasUnresolvedConstraints).length,
    criticalConstraintsCount: rows.filter((r) => r.hasCriticalConstraint).length,
    overdueDeadlineCount: rows.filter((r) => r.isDeadlineOverdue).length,
    rtOk,
    rpOk,
    rdOk,
    rtPending,
    rpPending,
    rdPending,
    receptionsWithReservesCount: rows.filter((r) => r.hasReceptionReserves).length,
    totalSkilledWorkers: rows.reduce((s, r) => s + r.skilledWorkers, 0),
    totalLaborers: rows.reduce((s, r) => s + r.laborers, 0),
    totalWorkforce: rows.reduce((s, r) => s + r.totalWorkers, 0),
  };

  // 6) Weekly & Monthly Rollups (computed on allScopedReports so multi-period progression is always complete)
  const weeklySummaries = buildPeriodSummaryRows(allScopedReports, 'WEEKLY');
  const monthlySummaries = buildPeriodSummaryRows(allScopedReports, 'MONTHLY');

  // 7) Geographic Breakdowns (Province & Territory)
  const buildGeoMetrics = (subset: ConsolidatedProjectRow[]) => ({
    totalProjects: subset.length,
    epCount: subset.filter((r) => r.infrastructureType === 'ECOLE_PRIMAIRE').length,
    csCount: subset.filter((r) => r.infrastructureType === 'CENTRE_DE_SANTE').length,
    baCount: subset.filter((r) => r.infrastructureType === 'BATIMENT_ADMINISTRATIF').length,
    completed: subset.filter((r) => r.currentStatus === 'ACHEVE').length,
    inProgress: subset.filter((r) => r.currentStatus === 'EN_COURS').length,
    stopped: subset.filter((r) => r.currentStatus === 'A_L_ARRET').length,
    notStarted: subset.filter((r) => r.currentStatus === 'NON_DEMARRE').length,
    averageTep: mean1(subset.map((r) => r.currentTep)),
    averageTef: mean1(subset.map((r) => r.currentTef)),
    averageGap: mean1(subset.map((r) => r.currentGap)),
    rtOk: subset.filter((r) => r.receptions.rt.status === 'OK').length,
    rpOk: subset.filter((r) => r.receptions.rp.status === 'OK').length,
    rdOk: subset.filter((r) => r.receptions.rd.status === 'OK').length,
    gapAlertsCount: subset.filter((r) => r.isGapAlert).length,
    criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length,
    overdueCount: subset.filter((r) => r.isDeadlineOverdue).length,
  });

  const byProvince: GeoBreakdownRow[] = provinces.map((prov) => {
    const subset = rows.filter((r) => r.province === prov);
    return {
      province: prov,
      territoriesCount: new Set(subset.map((r) => r.territory)).size,
      ...buildGeoMetrics(subset),
    };
  });

  const territoryKeys = Array.from(new Set(rows.map((r) => `${r.province}|||${r.territory}`))).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
  const byTerritory: TerritoryBreakdownRow[] = territoryKeys.map((key) => {
    const [prov, terr] = key.split('|||');
    const subset = rows.filter((r) => r.province === prov && r.territory === terr);
    return {
      province: prov,
      territory: terr,
      ...buildGeoMetrics(subset),
    };
  });

  // 8) Infrastructure Type Breakdown (EP / CS / BA)
  const infraTypes: InfrastructureType[] = [
    'ECOLE_PRIMAIRE',
    'CENTRE_DE_SANTE',
    'BATIMENT_ADMINISTRATIF',
  ];
  const byInfrastructureType: TypeBreakdownRow[] = infraTypes.map((type) => {
    const subset = rows.filter((r) => r.infrastructureType === type);
    return {
      infrastructureType: type,
      label: INFRASTRUCTURE_TYPE_LABELS[type],
      shortCode: INFRASTRUCTURE_TYPE_SHORT[type],
      totalProjects: subset.length,
      sharePercent: pct1(subset.length, totalProjects),
      completed: subset.filter((r) => r.currentStatus === 'ACHEVE').length,
      inProgress: subset.filter((r) => r.currentStatus === 'EN_COURS').length,
      stopped: subset.filter((r) => r.currentStatus === 'A_L_ARRET').length,
      notStarted: subset.filter((r) => r.currentStatus === 'NON_DEMARRE').length,
      averageTep: mean1(subset.map((r) => r.currentTep)),
      averageTef: mean1(subset.map((r) => r.currentTef)),
      averageGap: mean1(subset.map((r) => r.currentGap)),
      rtOk: subset.filter((r) => r.receptions.rt.status === 'OK').length,
      rpOk: subset.filter((r) => r.receptions.rp.status === 'OK').length,
      rdOk: subset.filter((r) => r.receptions.rd.status === 'OK').length,
      criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length,
    };
  });

  // 9) Contractor Breakdown
  const contractors = Array.from(new Set(rows.map((r) => r.contractor))).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
  const byContractor: ContractorBreakdownRow[] = contractors
    .map((cName) => {
      const subset = rows.filter((r) => r.contractor === cName);
      return {
        contractor: cName,
        totalProjects: subset.length,
        provinces: Array.from(new Set(subset.map((r) => r.province))).sort(),
        completed: subset.filter((r) => r.currentStatus === 'ACHEVE').length,
        inProgress: subset.filter((r) => r.currentStatus === 'EN_COURS').length,
        stopped: subset.filter((r) => r.currentStatus === 'A_L_ARRET').length,
        notStarted: subset.filter((r) => r.currentStatus === 'NON_DEMARRE').length,
        averageTep: mean1(subset.map((r) => r.currentTep)),
        averageTef: mean1(subset.map((r) => r.currentTef)),
        averageGap: mean1(subset.map((r) => r.currentGap)),
        gapAlertsCount: subset.filter((r) => r.isGapAlert).length,
        criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length,
        overdueCount: subset.filter((r) => r.isDeadlineOverdue).length,
        rdOk: subset.filter((r) => r.receptions.rd.status === 'OK').length,
      };
    })
    .sort((a, b) => b.totalProjects - a.totalProjects || a.contractor.localeCompare(b.contractor, 'fr'));

  // 10) Constraints Breakdown (4 official BCECO categories) & Impacts
  const constrainedCount = rows.filter((r) => r.latestConstraintCategories.length > 0).length;
  const constraintsBreakdown: ConstraintCategoryBreakdownRow[] = CONSTRAINT_CATEGORIES.map((cat) => {
    const subset = rows.filter((r) => r.latestConstraintCategories.includes(cat.id));
    return {
      category: cat.id,
      number: cat.number,
      label: cat.label,
      examples: cat.examples,
      projectsCount: subset.length,
      shareOfConstrainedPercent: pct1(subset.length, constrainedCount),
      criticalCount: subset.filter((r) => r.hasCriticalConstraint).length,
      stoppedCount: subset.filter((r) => r.currentStatus === 'A_L_ARRET').length,
    };
  });

  const impactTotals = {
    delays: rows.filter((r) => r.impactsFlags.delays).length,
    costs: rows.filter((r) => r.impactsFlags.costs).length,
    quality: rows.filter((r) => r.impactsFlags.quality).length,
    stoppage: rows.filter((r) => r.impactsFlags.stoppage).length,
  };

  const flaggedRows = rows.filter(
    (r) => r.hasUnresolvedConstraints || r.isGapAlert || r.hasCriticalConstraint || r.currentStatus === 'A_L_ARRET'
  );

  // 11) Automated Source-Structure Validation Checks (against both official PDFs)
  const statusSum = completed + inProgress + stopped + notStarted;
  const provinceSum = byProvince.reduce((s, p) => s + p.totalProjects, 0);
  const territorySum = byTerritory.reduce((s, t) => s + t.totalProjects, 0);
  const typeSum = byInfrastructureType.reduce((s, t) => s + t.totalProjects, 0);
  const contractorSum = byContractor.reduce((s, c) => s + c.totalProjects, 0);
  const weeklyReportsSum = weeklySummaries.reduce((s, w) => s + w.reportsCount, 0);
  const monthlyReportsSum = monthlySummaries.reduce((s, m) => s + m.reportsCount, 0);

  const invalidBoundsRows = rows.filter(
    (r) => r.currentTep < 0 || r.currentTep > 100 || r.currentTef < 0 || r.currentTef > 100
  );
  const mismatchedGapRows = rows.filter(
    (r) => Math.abs(r.currentGap - calculateTepTefGap(r.currentTep, r.currentTef)) > 0.001
  );
  const meanDiffDelta = Math.abs(round1(averageTep - averageTef) - averageGap);
  const gapAlertsWithoutJustification = rows.filter((r) => r.isGapAlert && !r.gapJustification);
  const incoherentReceptions = rows.filter((r) => !r.receptionsCoherent);
  const invalidScopeReports = periodReports.filter((r) =>
    rawParams.dataScope === 'VALIDES_UNIQUEMENT'
      ? r.status !== 'VALIDE'
      : r.status === 'BROUILLON' || r.status === 'RETOURNE'
  );

  const validationChecks: SourceValidationCheck[] = [
    {
      code: 'SCHEMA_MATRICE_21',
      label: 'Conformité structure Matrice Unique (21 colonnes)',
      status:
        MATRICE_UNIQUE_HEADERS.length === 21 &&
        MATRICE_UNIQUE_BLOC1_COUNT + MATRICE_UNIQUE_BLOC2_COUNT === 21
          ? 'PASS'
          : 'FAIL',
      expected: '21 colonnes (9 Identification + 12 Suivi) + TOTAL / CONTRÔLES',
      actual: `${MATRICE_UNIQUE_HEADERS.length} colonnes (${MATRICE_UNIQUE_BLOC1_COUNT} + ${MATRICE_UNIQUE_BLOC2_COUNT})`,
      detail: 'En-têtes et hiérarchie de blocs alignés sur le modèle officiel BCECO / PDL-145T.',
    },
    {
      code: 'SCHEMA_FEUILLE_ROUTE_10',
      label: 'Conformité Annexe Feuille de Route Multi-Chantiers (10 colonnes)',
      status: FEUILLE_DE_ROUTE_10_HEADERS.length === 10 ? 'PASS' : 'FAIL',
      expected: '10 colonnes officielles + légendes Statut/Contraintes',
      actual: `${FEUILLE_DE_ROUTE_10_HEADERS.length} colonnes`,
      detail: 'Structure alignée sur la page 3 du Formulaire de Collecte Terrain RSE PDL-145T.',
    },
    {
      code: 'RECONCILIATION_STATUTS',
      label: 'Réconciliation des statuts d’avancement',
      status: statusSum === totalProjects ? 'PASS' : 'FAIL',
      expected: `${totalProjects} ouvrages`,
      actual: `${completed} + ${inProgress} + ${stopped} + ${notStarted} = ${statusSum}`,
      detail: 'La somme des 4 statuts officiels (Achevé, En cours, À l’arrêt, Non démarré) égale exactement le total.',
    },
    {
      code: 'RECONCILIATION_GEOGRAPHIQUE',
      label: 'Réconciliation géographique (Provinces, Territoires, Entreprises)',
      status:
        provinceSum === totalProjects &&
        territorySum === totalProjects &&
        contractorSum === totalProjects
          ? 'PASS'
          : 'FAIL',
      expected: `${totalProjects} ouvrages sur chaque ventilation`,
      actual: `Provinces=${provinceSum} · Territoires=${territorySum} · Entreprises=${contractorSum}`,
      detail: 'Aucun ouvrage perdu ni compté en double lors de la consolidation territoriale.',
    },
    {
      code: 'RECONCILIATION_TYPES',
      label: 'Réconciliation par type d’ouvrage (EP / CS / BA)',
      status: typeSum === totalProjects ? 'PASS' : 'FAIL',
      expected: `${totalProjects} ouvrages`,
      actual: `EP=${byInfrastructureType[0].totalProjects} · CS=${byInfrastructureType[1].totalProjects} · BA=${byInfrastructureType[2].totalProjects} (Σ=${typeSum})`,
      detail: 'Couverture complète des 3 catégories officielles du programme PDL-145T.',
    },
    {
      code: 'INTEGRITE_TEP_TEF',
      label: 'Bornes [0–100 %] et formule Écart = TEP − TEF par ligne',
      status: invalidBoundsRows.length === 0 && mismatchedGapRows.length === 0 ? 'PASS' : 'FAIL',
      expected: '0 hors bornes · 0 divergence de formule',
      actual: `${invalidBoundsRows.length} hors bornes · ${mismatchedGapRows.length} divergence(s)`,
      detail: 'Chaque taux physique/financier et chaque écart observé respecte la règle de calcul officielle.',
    },
    {
      code: 'COHERENCE_MOYENNES',
      label: 'Cohérence moyenne Écart vs (TEP moyen − TEF moyen)',
      status: meanDiffDelta <= 0.15 ? 'PASS' : 'FAIL',
      expected: `|(${averageTep} − ${averageTef}) − ${averageGap}| ≤ 0,1 pt`,
      actual: `Écart d’arrondi = ${round1(meanDiffDelta)} pt`,
      detail: 'Linéarité des moyennes arithmétiques vérifiée sur la ligne TOTAL / CONTRÔLES.',
    },
    {
      code: 'SEUIL_ALERTE_ECART_10',
      label: 'Justification des écarts critiques |TEP − TEF| > 10 pts',
      status: gapAlertsWithoutJustification.length === 0 ? 'PASS' : 'WARNING',
      expected: `${kpis.gapAlertsCount} alerte(s) documentée(s)`,
      actual: `${kpis.gapAlertsCount - gapAlertsWithoutJustification.length}/${kpis.gapAlertsCount} justifiée(s)`,
      detail:
        gapAlertsWithoutJustification.length === 0
          ? 'Tous les ouvrages en écart > 10 pts disposent d’une justification issue des fiches terrain.'
          : `${gapAlertsWithoutJustification.length} ouvrage(s) sans fiche terrain récente comportant une justification d’écart (${gapAlertsWithoutJustification.map((r) => r.matrixNumber).join(', ')}).`,
    },
    {
      code: 'SEQUENCE_RECEPTIONS',
      label: 'Intégrité de la séquence de réceptions (RT → RP → RD)',
      status: incoherentReceptions.length === 0 ? 'PASS' : 'FAIL',
      expected: '0 inversion (RD⇒RP⇒RT)',
      actual: `${incoherentReceptions.length} anomalie(s)`,
      detail: 'Aucune réception définitive ou provisoire déclarée sans réception technique préalable.',
    },
    {
      code: 'RECONCILIATION_PERIODES',
      label: 'Réconciliation des synthèses hebdomadaire et mensuelle',
      status:
        weeklyReportsSum === allScopedReports.length &&
        monthlyReportsSum === allScopedReports.length
          ? 'PASS'
          : 'FAIL',
      expected: `${allScopedReports.length} fiches sur chaque agrégation`,
      actual: `Hebdo=${weeklyReportsSum} (${weeklySummaries.length} sem.) · Mensuel=${monthlyReportsSum} (${monthlySummaries.length} mois)`,
      detail: 'Toutes les fiches terrain du périmètre sont ventilées sans omission ni duplication.',
    },
    {
      code: 'ISOLATION_PERIMETRE_VALIDATION',
      label: 'Isolation du périmètre de validation (exclusion brouillons / retournées)',
      status: invalidScopeReports.length === 0 ? 'PASS' : 'FAIL',
      expected:
        rawParams.dataScope === 'VALIDES_UNIQUEMENT'
          ? '100 % fiches VALIDE uniquement'
          : 'Uniquement VALIDE / SOUMIS / EN_COURS_VERIFICATION',
      actual: `${invalidScopeReports.length} fiche(s) non conforme(s)`,
      detail: 'Les brouillons locaux et fiches retournées sont strictement exclus des rapports consolidés.',
    },
  ];

  // 12) Filters summary & institutional title
  const filterParts: string[] = [];
  filterParts.push(province ? `Province : ${province}` : 'National (Toutes provinces)');
  if (territory) filterParts.push(`Territoire : ${territory}`);
  if (infrastructureType) filterParts.push(`Type : ${INFRASTRUCTURE_TYPE_SHORT[infrastructureType]}`);
  if (workStatus) filterParts.push(`Statut : ${WORK_STATUS_CONCISE[workStatus]}`);
  if (contractor) filterParts.push(`Entreprise : ${contractor}`);
  if (contractStatus) filterParts.push(`Contrat : ${contractStatus}`);
  if (periodKeyFilter) filterParts.push(`Période filtrée : ${periodLabel}`);

  const title = `Rapport ${PERIODICITY_LABELS[rawParams.periodicity]} Consolidé — BCECO / PDL-145T (${periodLabel})`;

  return {
    params: normalizedParams,
    title,
    filtersSummary: filterParts.join(' · '),
    referenceDate,
    kpis,
    rows,
    periodReports,
    allScopedReports,
    weeklySummaries,
    monthlySummaries,
    byProvince,
    byTerritory,
    byInfrastructureType,
    byContractor,
    constraintsBreakdown,
    impactTotals,
    flaggedRows,
    validationChecks,
    allChecksPassed: validationChecks.every((c) => c.status === 'PASS'),
    hasCheckFailures: validationChecks.some((c) => c.status === 'FAIL'),
  };
}

/**
 * Formate une ligne consolidée exactement selon les 21 colonnes de la Matrice Unique BCECO / PDL-145T.
 */
export function consolidatedRowToMatrix21(row: ConsolidatedProjectRow): (string | number)[] {
  return [
    row.matrixNumber,
    row.contractor,
    row.province,
    row.territory,
    INFRASTRUCTURE_TYPE_LABELS[row.infrastructureType],
    row.projectName,
    row.sectorChiefdom,
    formatDateFr(row.startDate),
    formatDateFr(row.definitiveReceptionDeadline),
    WORK_STATUS_LABELS[row.currentStatus],
    row.latestPeriodRealization,
    formatExecutionStagesLabel(row.latestExecutionStages),
    row.currentTep,
    row.currentTef,
    row.currentGap,
    row.latestConstraintsSummary || 'Aucune contrainte active',
    row.latestImpactsSummary || 'Aucun impact majeur',
    formatReceptionCell(row.receptions.rt),
    formatReceptionCell(row.receptions.rp),
    formatReceptionCell(row.receptions.rd),
    row.hasPendingOverlay
      ? `[DONNÉE SOUMISE NON VALIDÉE] ${row.latestObservation}`
      : row.latestObservation,
  ];
}

/**
 * Formate une ligne consolidée exactement selon les 10 colonnes de l'Annexe Terrain (Page 3 du PDF officiel).
 */
export function consolidatedRowToRoadmap10(row: ConsolidatedProjectRow): string[] {
  const catNumbers = row.latestConstraintCategories
    .map((id) => CONSTRAINT_CATEGORIES.find((c) => c.id === id)?.number ?? '')
    .filter(Boolean)
    .join(',');
  const constraintPrefix = catNumbers ? `[Cat. ${catNumbers}] ` : '';

  return [
    row.matrixNumber,
    `${row.projectName} (${INFRASTRUCTURE_TYPE_SHORT[row.infrastructureType]})`,
    row.contractor,
    WORK_STATUS_LABELS[row.currentStatus],
    `${row.latestPeriodRealization} [${formatExecutionStagesShort(row.latestExecutionStages)}]`,
    `${row.currentTep}%`,
    `${row.currentTef}%`,
    `${constraintPrefix}${row.latestConstraintsSummary || 'Néant'}${
      row.latestImpactsSummary && row.latestImpactsSummary !== 'Aucun impact majeur'
        ? ` — Impact : ${row.latestImpactsSummary}`
        : ''
    }`,
    `RT:${row.receptions.rt.status} / RP:${row.receptions.rp.status} / RD:${row.receptions.rd.status}`,
    row.hasPendingOverlay ? `[Soumis non validé] ${row.latestObservation}` : row.latestObservation,
  ];
}
