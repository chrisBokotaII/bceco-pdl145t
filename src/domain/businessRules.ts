import * as XLSX from 'xlsx';
import type {
  ConstraintCategory,
  DashboardFilters,
  ExcelAuditIssue,
  ExcelAuditResult,
  FieldReport,
  InfrastructureType,
  Project,
  UserProfile,
  WorkStatus,
} from '../types/domain';
import { computePeriodKey, generateUniqueId } from './formatters';

export interface ValidationError {
  section: 1 | 2 | 3 | 4 | 5;
  field: string;
  message: string;
}

export const TEP_TEF_GAP_THRESHOLD = 10;
export const MIN_GAP_JUSTIFICATION_LENGTH = 10;

export function calculateTepTefGap(tep: number, tef: number): number {
  return Math.round((tep - tef) * 10) / 10;
}

export function requiresGapJustification(tep: number, tef: number): boolean {
  return Math.abs(calculateTepTefGap(tep, tef)) > TEP_TEF_GAP_THRESHOLD;
}

export type DataQualityLevel = 'CONFORME' | 'ATTENTION' | 'CRITIQUE';

export interface DataQualityCheckItem {
  id: string;
  label: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  detail: string;
}

export interface Section2DataQuality {
  level: DataQualityLevel;
  score: number;
  headline: string;
  summary: string;
  gap: number;
  absGap: number;
  threshold: number;
  thresholdExceeded: boolean;
  justificationRequired: boolean;
  justificationProvided: boolean;
  justificationLength: number;
  minJustificationLength: number;
  missingJustificationWarning: boolean;
  checks: DataQualityCheckItem[];
}

export function evaluateSection2DataQuality(progress: FieldReport['progress']): Section2DataQuality {
  const { previousTep, currentTep, previousTef, currentTef, workStatus, gapJustification } = progress;

  const isValidPercent = (v: number) => typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= 100;
  const boundsValid =
    isValidPercent(previousTep) &&
    isValidPercent(currentTep) &&
    isValidPercent(previousTef) &&
    isValidPercent(currentTef);

  const safeCurrentTep = isValidPercent(currentTep) ? currentTep : 0;
  const safeCurrentTef = isValidPercent(currentTef) ? currentTef : 0;
  const gap = calculateTepTefGap(safeCurrentTep, safeCurrentTef);
  const absGap = Math.round(Math.abs(gap) * 10) / 10;
  const thresholdExceeded = absGap > TEP_TEF_GAP_THRESHOLD;

  const trimmedJustification = (gapJustification ?? '').trim();
  const justificationLength = trimmedJustification.length;
  const justificationProvided = !thresholdExceeded || justificationLength >= MIN_GAP_JUSTIFICATION_LENGTH;
  const missingJustificationWarning = thresholdExceeded && !justificationProvided;

  const signedGapText = `${gap > 0 ? '+' : ''}${gap.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} %`;
  const absGapText = `${absGap.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} %`;
  const directionLabel =
    gap > 0 ? 'avance physique / décompte en attente' : 'avance financière / retard physique';

  const checks: DataQualityCheckItem[] = [];
  let score = 100;

  // 1. Bornes TEP / TEF
  if (!boundsValid) {
    score -= 45;
    checks.push({
      id: 'bounds',
      label: 'Bornes TEP / TEF [0 – 100 %]',
      status: 'ERROR',
      detail: 'Au moins un pourcentage TEP ou TEF est manquant ou hors de l’intervalle [0 % – 100 %].',
    });
  } else {
    checks.push({
      id: 'bounds',
      label: 'Bornes TEP / TEF [0 – 100 %]',
      status: 'OK',
      detail: `TEP ${safeCurrentTep} % et TEF ${safeCurrentTef} % conformes aux bornes réglementaires.`,
    });
  }

  // 2. Analyse de l'écart absolu TEP - TEF
  if (thresholdExceeded) {
    if (missingJustificationWarning) {
      checks.push({
        id: 'gap',
        label: 'Écart absolu |TEP − TEF|',
        status: 'ERROR',
        detail: `Écart de ${signedGapText} (${directionLabel}) supérieur au seuil de ${TEP_TEF_GAP_THRESHOLD} %.`,
      });
    } else {
      score -= 10;
      checks.push({
        id: 'gap',
        label: 'Écart absolu |TEP − TEF|',
        status: 'WARNING',
        detail: `Écart significatif de ${signedGapText} (${directionLabel}) au-delà de ${TEP_TEF_GAP_THRESHOLD} %, dûment documenté.`,
      });
    }
  } else if (absGap > 5) {
    score -= 5;
    checks.push({
      id: 'gap',
      label: 'Écart absolu |TEP − TEF|',
      status: 'WARNING',
      detail: `Écart modéré de ${signedGapText} — proche du seuil de vigilance de ${TEP_TEF_GAP_THRESHOLD} %.`,
    });
  } else {
    checks.push({
      id: 'gap',
      label: 'Écart absolu |TEP − TEF|',
      status: 'OK',
      detail: `Exécution équilibrée (${signedGapText}, dans la marge ≤ 5 %).`,
    });
  }

  // 3. Justification d'écart > 10 %
  if (!thresholdExceeded) {
    checks.push({
      id: 'justification',
      label: 'Justification d’écart (> 10 %)',
      status: 'OK',
      detail: `Non requise tant que l’écart absolu reste ≤ ${TEP_TEF_GAP_THRESHOLD} %.`,
    });
  } else if (justificationLength === 0) {
    score -= 40;
    checks.push({
      id: 'justification',
      label: 'Justification d’écart (> 10 %)',
      status: 'ERROR',
      detail: `Justification manquante : obligatoire au-delà de ${TEP_TEF_GAP_THRESHOLD} % (min. ${MIN_GAP_JUSTIFICATION_LENGTH} caractères).`,
    });
  } else if (justificationLength < MIN_GAP_JUSTIFICATION_LENGTH) {
    score -= 35;
    checks.push({
      id: 'justification',
      label: 'Justification d’écart (> 10 %)',
      status: 'ERROR',
      detail: `Justification incomplète (${justificationLength}/${MIN_GAP_JUSTIFICATION_LENGTH} caractères min.) : précisez la cause de l’écart.`,
    });
  } else {
    checks.push({
      id: 'justification',
      label: 'Justification d’écart (> 10 %)',
      status: 'OK',
      detail: `Justification conforme renseignée (${justificationLength} caractères).`,
    });
  }

  // 4. Cohérence progression & statut
  const coherenceNotes: string[] = [];
  if (boundsValid && currentTep < previousTep) {
    coherenceNotes.push(`régression du TEP (${previousTep} % → ${currentTep} %)`);
  }
  if (boundsValid && currentTef < previousTef) {
    coherenceNotes.push(`régression du TEF (${previousTef} % → ${currentTef} %)`);
  }
  if (boundsValid && workStatus === 'ACHEVE' && currentTep < 100) {
    coherenceNotes.push(`statut « Achevé » avec TEP à ${currentTep} %`);
  }
  if (boundsValid && workStatus === 'NON_DEMARRE' && currentTep > 0) {
    coherenceNotes.push(`statut « Non démarré » avec TEP à ${currentTep} %`);
  }

  if (coherenceNotes.length > 0) {
    score -= 15;
    checks.push({
      id: 'coherence',
      label: 'Cohérence progression / statut',
      status: 'WARNING',
      detail: `Point à vérifier : ${coherenceNotes.join(' ; ')}.`,
    });
  } else {
    checks.push({
      id: 'coherence',
      label: 'Cohérence progression / statut',
      status: 'OK',
      detail: 'Évolution TEP/TEF cohérente avec la période précédente et le statut déclaré.',
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const hasError = checks.some((c) => c.status === 'ERROR');
  const hasWarning = checks.some((c) => c.status === 'WARNING');
  const level: DataQualityLevel = hasError ? 'CRITIQUE' : hasWarning ? 'ATTENTION' : 'CONFORME';

  let headline = 'Données conformes et équilibrées';
  let summary = `L’écart TEP − TEF (${signedGapText}) respecte le seuil BCECO de ${TEP_TEF_GAP_THRESHOLD} %.`;

  if (!boundsValid) {
    headline = 'Valeurs TEP / TEF hors bornes';
    summary = 'Corrigez les pourcentages TEP/TEF pour qu’ils soient compris entre 0 % et 100 %.';
  } else if (missingJustificationWarning) {
    headline =
      justificationLength === 0
        ? 'Justification manquante (écart > 10 %)'
        : `Justification insuffisante (${justificationLength}/${MIN_GAP_JUSTIFICATION_LENGTH} car.)`;
    summary = `L’écart absolu atteint ${absGapText} (> ${TEP_TEF_GAP_THRESHOLD} %) : saisissez une justification détaillée d’au moins ${MIN_GAP_JUSTIFICATION_LENGTH} caractères pour autoriser la soumission.`;
  } else if (thresholdExceeded) {
    headline = 'Écart > 10 % documenté — sous vigilance';
    summary = `L’écart de ${signedGapText} (${directionLabel}) est accompagné d’une justification conforme (${justificationLength} caractères).`;
  } else if (level === 'ATTENTION') {
    headline = 'Vigilance modérée sur la cohérence';
    summary = `Écart TEP − TEF de ${signedGapText} (≤ ${TEP_TEF_GAP_THRESHOLD} %) avec point(s) de vigilance signalé(s) ci-dessous.`;
  }

  return {
    level,
    score: finalScore,
    headline,
    summary,
    gap,
    absGap,
    threshold: TEP_TEF_GAP_THRESHOLD,
    thresholdExceeded,
    justificationRequired: thresholdExceeded,
    justificationProvided,
    justificationLength,
    minJustificationLength: MIN_GAP_JUSTIFICATION_LENGTH,
    missingJustificationWarning,
    checks,
  };
}

export interface MonthlyProvinceTrendPoint {
  month: string; // YYYY-MM
  province: string;
  avgTep: number;
  avgTef: number;
  reportsCount: number;
}

export function computeMonthlyProvinceTrends(
  reports: FieldReport[],
  projects: Project[]
): MonthlyProvinceTrendPoint[] {
  const projectProvinceMap = new Map<string, string>();
  for (const p of projects) {
    projectProvinceMap.set(p.id, p.province || 'Province Inconnue');
  }

  const aggMap = new Map<string, { tepSum: number; tefSum: number; count: number }>();

  for (const r of reports) {
    if (r.status === 'BROUILLON') continue;
    const month = (r.collectionDate || r.createdAt || '').slice(0, 7);
    if (!month) continue;
    const province = projectProvinceMap.get(r.projectId) || 'Province Inconnue';
    const key = `${month}::${province}`;

    const entry = aggMap.get(key) ?? { tepSum: 0, tefSum: 0, count: 0 };
    entry.tepSum += Number(r.progress.currentTep) || 0;
    entry.tefSum += Number(r.progress.currentTef) || 0;
    entry.count += 1;
    aggMap.set(key, entry);
  }

  const results: MonthlyProvinceTrendPoint[] = [];
  for (const [key, val] of aggMap.entries()) {
    const [month, province] = key.split('::');
    results.push({
      month,
      province,
      avgTep: Math.round((val.tepSum / val.count) * 10) / 10,
      avgTef: Math.round((val.tefSum / val.count) * 10) / 10,
      reportsCount: val.count,
    });
  }

  return results.sort((a, b) => a.month.localeCompare(b.month) || a.province.localeCompare(b.province));
}

export function validateFieldReportForSubmission(report: FieldReport): ValidationError[] {
  const errors: ValidationError[] = [];

  // Section 1
  if (!report.identification.collectionDate) {
    errors.push({ section: 1, field: 'collectionDate', message: 'La date de collecte est obligatoire.' });
  }
  if (report.identification.periodicity === 'HEBDOMADAIRE' && !report.identification.weekNumber.trim()) {
    errors.push({ section: 1, field: 'weekNumber', message: 'Le numéro de semaine est requis pour un rapport hebdomadaire.' });
  }
  if (report.identification.periodicity === 'MENSUEL' && !report.identification.month.trim()) {
    errors.push({ section: 1, field: 'month', message: 'Le mois concerné est requis pour un rapport mensuel.' });
  }
  if (!report.identification.locality.trim()) {
    errors.push({ section: 1, field: 'locality', message: 'La localité / village doit être précisée.' });
  }
  if (report.identification.gpsLat.trim()) {
    const lat = Number(report.identification.gpsLat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({ section: 1, field: 'gpsLat', message: 'Latitude GPS invalide (doit être comprise entre -90 et 90).' });
    }
  }
  if (report.identification.gpsLng.trim()) {
    const lng = Number(report.identification.gpsLng);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({ section: 1, field: 'gpsLng', message: 'Longitude GPS invalide (doit être comprise entre -180 et 180).' });
    }
  }

  // Section 2
  const p = report.progress;
  if (p.workStatus === 'A_L_ARRET' && !p.stoppageDate.trim()) {
    errors.push({ section: 2, field: 'stoppageDate', message: "La date d'arrêt des travaux est obligatoire lorsque l'ouvrage est à l'arrêt." });
  }
  if (!p.periodWorksExecuted.trim()) {
    errors.push({ section: 2, field: 'periodWorksExecuted', message: 'Veuillez décrire les travaux exécutés durant la période (ou indiquer « Néant »).' });
  }
  for (const [key, label, val] of [
    ['previousTep', 'TEP précédent', p.previousTep],
    ['currentTep', 'TEP actuel', p.currentTep],
    ['previousTef', 'TEF précédent', p.previousTef],
    ['currentTef', 'TEF actuel', p.currentTef],
  ] as const) {
    if (typeof val !== 'number' || Number.isNaN(val) || val < 0 || val > 100) {
      errors.push({ section: 2, field: key, message: `${label} doit être compris entre 0 % et 100 %.` });
    }
  }
  if (
    typeof p.skilledWorkersCount !== 'number' ||
    Number.isNaN(p.skilledWorkersCount) ||
    p.skilledWorkersCount < 0 ||
    typeof p.laborersCount !== 'number' ||
    Number.isNaN(p.laborersCount) ||
    p.laborersCount < 0
  ) {
    errors.push({ section: 2, field: 'workers', message: 'Les effectifs mobilisés doivent être des nombres positifs ou nuls.' });
  }
  if (requiresGapJustification(p.currentTep, p.currentTef) && p.gapJustification.trim().length < MIN_GAP_JUSTIFICATION_LENGTH) {
    errors.push({
      section: 2,
      field: 'gapJustification',
      message: "L'écart absolu TEP − TEF dépasse 10 points de pourcentage : une justification détaillée (min. 10 caractères) est obligatoire.",
    });
  }

  // Section 3
  const c = report.constraints;
  if (c.categories.length > 0 && c.detailedDescriptions.filter((d) => d.trim().length > 0).length === 0) {
    errors.push({
      section: 3,
      field: 'detailedDescriptions',
      message: 'Veuillez décrire au moins une contrainte correspondant aux typologies cochées.',
    });
  }
  if (c.isCritical && !c.urgentActionsRequired.trim()) {
    errors.push({
      section: 3,
      field: 'urgentActionsRequired',
      message: 'Pour une alerte critique, les actions urgentes requises doivent être renseignées.',
    });
  }

  // Section 4
  const r = report.receptions;
  if (r.rt.status === 'OK' && !r.rt.date) {
    errors.push({ section: 4, field: 'rtDate', message: 'Date de Réception Technique requise lorsque le statut est OK.' });
  }
  if (r.rp.status === 'OK' && !r.rp.date) {
    errors.push({ section: 4, field: 'rpDate', message: 'Date de Réception Provisoire requise lorsque le statut est OK.' });
  }
  if (r.rd.status === 'OK' && !r.rd.date) {
    errors.push({ section: 4, field: 'rdDate', message: 'Date de Réception Définitive requise lorsque le statut est OK.' });
  }
  if (r.rp.status === 'OK' && r.rt.status !== 'OK') {
    errors.push({
      section: 4,
      field: 'rpStatus',
      message: 'La Réception Provisoire (RP) ne peut pas être déclarée OK avant la Réception Technique (RT).',
    });
  }
  if (r.rd.status === 'OK' && (r.rt.status !== 'OK' || r.rp.status !== 'OK')) {
    errors.push({
      section: 4,
      field: 'rdStatus',
      message: 'La Réception Définitive (RD) exige que les Réceptions Technique (RT) et Provisoire (RP) soient préalablement OK.',
    });
  }
  if (r.rt.status === 'OK' && r.rp.status === 'OK' && r.rt.date && r.rp.date && r.rp.date < r.rt.date) {
    errors.push({
      section: 4,
      field: 'rpDate',
      message: 'La date de Réception Provisoire (RP) ne peut pas être antérieure à la date de Réception Technique (RT).',
    });
  }
  if (r.rp.status === 'OK' && r.rd.status === 'OK' && r.rp.date && r.rd.date && r.rd.date < r.rp.date) {
    errors.push({
      section: 4,
      field: 'rdDate',
      message: 'La date de Réception Définitive (RD) ne peut pas être antérieure à la date de Réception Provisoire (RP).',
    });
  }



  // Section 5
  const s = report.signature;
  if (!s.agentFullName.trim()) {
    errors.push({ section: 5, field: 'agentFullName', message: "Le nom de l'agent enquêteur est obligatoire." });
  }
  if (!s.agentFunction.trim()) {
    errors.push({ section: 5, field: 'agentFunction', message: "La fonction de l'agent enquêteur est obligatoire." });
  }
  if (!s.agentPhone.trim()) {
    errors.push({ section: 5, field: 'agentPhone', message: "Le numéro de téléphone de l'agent est obligatoire." });
  }
  if (!s.signatureDataUrl.trim()) {
    errors.push({ section: 5, field: 'signatureDataUrl', message: 'La signature (manuscrite ou certifiée) est requise avant soumission.' });
  }

  return errors;
}

/**
 * Détecte les doublons potentiels pour un même ouvrage, un même agent et une même période.
 * Ne supprime jamais automatiquement : retourne les IDs des fiches existantes en conflit.
 */
export function detectPotentialDuplicates(
  candidate: Pick<FieldReport, 'id' | 'projectId' | 'agentId' | 'periodicity' | 'identification'>,
  existingReports: FieldReport[]
): string[] {
  const candidateKey = computePeriodKey(
    candidate.periodicity,
    candidate.identification.collectionDate,
    candidate.identification.weekNumber,
    candidate.identification.month
  );
  return existingReports
    .filter(
      (r) =>
        r.id !== candidate.id &&
        r.projectId === candidate.projectId &&
        r.agentId === candidate.agentId &&
        r.periodicity === candidate.periodicity &&
        r.periodKey === candidateKey &&
        r.status !== 'BROUILLON'
    )
    .map((r) => r.id);
}

export interface DashboardMetrics {
  totalProjects: number;
  activeAgents: number;
  assignedProjects: number;
  submittedReports: number;
  pendingValidationReports: number;
  validatedReports: number;
  returnedReports: number;
  completedProjects: number;
  inProgressProjects: number;
  stoppedProjects: number;
  notStartedProjects: number;
  averageTep: number;
  averageTef: number;
  criticalConstraintsCount: number;
  gapAlertProjects: Project[];
  unresolvedConstraintProjects: Project[];
  byProvince: { province: string; total: number; acheves: number; enCours: number; arret: number; avgTep: number; avgTef: number }[];
  byTerritory: { territory: string; province: string; total: number; avgTep: number; avgTef: number }[];
  statusDistribution: { status: WorkStatus; label: string; count: number; color: string }[];
  reportsByAgent: { agentId: string; agentName: string; total: number; valides: number; enAttente: number; retournes: number }[];
  reportsByPeriod: { period: string; total: number; valides: number; soumis: number }[];
}

export function computeDashboardMetrics(
  projects: Project[],
  reports: FieldReport[],
  users: UserProfile[],
  filters: DashboardFilters
): DashboardMetrics {
  const filteredProjects = projects.filter((p) => {
    if (filters.province && p.province !== filters.province) return false;
    if (filters.territory && p.territory !== filters.territory) return false;
    if (filters.contractor && p.contractor !== filters.contractor) return false;
    if (filters.infrastructureType && p.infrastructureType !== filters.infrastructureType) return false;
    if (filters.status && p.currentStatus !== filters.status) return false;
    if (filters.agentId && !p.assignedAgentIds.includes(filters.agentId)) return false;
    return true;
  });

  const filteredProjectIds = new Set(filteredProjects.map((p) => p.id));

  const filteredReports = reports.filter((r) => {
    if (!filteredProjectIds.has(r.projectId)) return false;
    if (filters.agentId && r.agentId !== filters.agentId) return false;
    if (filters.periodicity && r.periodicity !== filters.periodicity) return false;
    return r.status !== 'BROUILLON';
  });

  const activeAgents = users.filter((u) => u.role === 'AGENT_TERRAIN' && u.isActive).length;
  const assignedProjects = filteredProjects.filter((p) => p.assignedAgentIds.length > 0).length;

  const submittedReports = filteredReports.length;
  const pendingValidationReports = filteredReports.filter(
    (r) => r.status === 'SOUMIS' || r.status === 'EN_COURS_VERIFICATION'
  ).length;
  const validatedReports = filteredReports.filter((r) => r.status === 'VALIDE').length;
  const returnedReports = filteredReports.filter((r) => r.status === 'RETOURNE').length;

  const completedProjects = filteredProjects.filter((p) => p.currentStatus === 'ACHEVE').length;
  const inProgressProjects = filteredProjects.filter((p) => p.currentStatus === 'EN_COURS').length;
  const stoppedProjects = filteredProjects.filter((p) => p.currentStatus === 'A_L_ARRET').length;
  const notStartedProjects = filteredProjects.filter((p) => p.currentStatus === 'NON_DEMARRE').length;

  const averageTep =
    filteredProjects.length > 0
      ? Math.round((filteredProjects.reduce((acc, p) => acc + p.currentTep, 0) / filteredProjects.length) * 10) / 10
      : 0;
  const averageTef =
    filteredProjects.length > 0
      ? Math.round((filteredProjects.reduce((acc, p) => acc + p.currentTef, 0) / filteredProjects.length) * 10) / 10
      : 0;

  const criticalConstraintsCount = filteredProjects.filter((p) => p.hasCriticalConstraint).length;
  const gapAlertProjects = filteredProjects.filter((p) => Math.abs(p.currentTep - p.currentTef) > 10);
  const unresolvedConstraintProjects = filteredProjects.filter((p) => p.hasUnresolvedConstraints);

  // Province aggregation
  const provMap = new Map<string, Project[]>();
  for (const p of filteredProjects) {
    const arr = provMap.get(p.province) ?? [];
    arr.push(p);
    provMap.set(p.province, arr);
  }
  const byProvince = Array.from(provMap.entries())
    .map(([province, list]) => ({
      province,
      total: list.length,
      acheves: list.filter((p) => p.currentStatus === 'ACHEVE').length,
      enCours: list.filter((p) => p.currentStatus === 'EN_COURS').length,
      arret: list.filter((p) => p.currentStatus === 'A_L_ARRET').length,
      avgTep: Math.round((list.reduce((s, p) => s + p.currentTep, 0) / list.length) * 10) / 10,
      avgTef: Math.round((list.reduce((s, p) => s + p.currentTef, 0) / list.length) * 10) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  // Territory aggregation
  const terrMap = new Map<string, { province: string; list: Project[] }>();
  for (const p of filteredProjects) {
    const key = `${p.province}::${p.territory}`;
    const entry = terrMap.get(key) ?? { province: p.province, list: [] };
    entry.list.push(p);
    terrMap.set(key, entry);
  }
  const byTerritory = Array.from(terrMap.entries())
    .map(([key, val]) => ({
      territory: key.split('::')[1],
      province: val.province,
      total: val.list.length,
      avgTep: Math.round((val.list.reduce((s, p) => s + p.currentTep, 0) / val.list.length) * 10) / 10,
      avgTef: Math.round((val.list.reduce((s, p) => s + p.currentTef, 0) / val.list.length) * 10) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  const statusDistribution = [
    { status: 'ACHEVE' as WorkStatus, label: 'Achevé', count: completedProjects, color: '#15803D' },
    { status: 'EN_COURS' as WorkStatus, label: 'En cours', count: inProgressProjects, color: '#1D4ED8' },
    { status: 'A_L_ARRET' as WorkStatus, label: "À l'arrêt", count: stoppedProjects, color: '#B91C1C' },
    { status: 'NON_DEMARRE' as WorkStatus, label: 'Non démarré', count: notStartedProjects, color: '#64748B' },
  ];

  // Reports by agent
  const agentMap = new Map<string, { agentName: string; total: number; valides: number; enAttente: number; retournes: number }>();
  for (const r of filteredReports) {
    const entry = agentMap.get(r.agentId) ?? {
      agentName: r.agentName,
      total: 0,
      valides: 0,
      enAttente: 0,
      retournes: 0,
    };
    entry.total += 1;
    if (r.status === 'VALIDE') entry.valides += 1;
    else if (r.status === 'RETOURNE') entry.retournes += 1;
    else entry.enAttente += 1;
    agentMap.set(r.agentId, entry);
  }
  const reportsByAgent = Array.from(agentMap.entries()).map(([agentId, data]) => ({
    agentId,
    ...data,
  }));

  // Reports by period (YYYY-MM)
  const periodMap = new Map<string, { total: number; valides: number; soumis: number }>();
  for (const r of filteredReports) {
    const period = r.collectionDate.slice(0, 7) || 'Inconnu';
    const entry = periodMap.get(period) ?? { total: 0, valides: 0, soumis: 0 };
    entry.total += 1;
    if (r.status === 'VALIDE') entry.valides += 1;
    else entry.soumis += 1;
    periodMap.set(period, entry);
  }
  const reportsByPeriod = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({ period, ...data }));

  return {
    totalProjects: filteredProjects.length,
    activeAgents,
    assignedProjects,
    submittedReports,
    pendingValidationReports,
    validatedReports,
    returnedReports,
    completedProjects,
    inProgressProjects,
    stoppedProjects,
    notStartedProjects,
    averageTep,
    averageTef,
    criticalConstraintsCount,
    gapAlertProjects,
    unresolvedConstraintProjects,
    byProvince,
    byTerritory,
    statusDistribution,
    reportsByAgent,
    reportsByPeriod,
  };
}

/**
 * Moteur d'audit préalable à l'importation d'un classeur Excel/CSV Matrice Unique (21 colonnes).
 * Détecte : identifiants manquants, doublons, fiches incomplètes, valeurs incohérentes.
 */
function normalizeInfraType(raw: string): InfrastructureType | null {
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('ecole') || s.startsWith('1')) return 'ECOLE_PRIMAIRE';
  if (s.includes('sante') || s.includes('centre') || s.startsWith('2')) return 'CENTRE_DE_SANTE';
  if (s.includes('batiment') || s.includes('admin') || s.startsWith('3')) return 'BATIMENT_ADMINISTRATIF';
  return null;
}

function normalizeWorkStatus(raw: string): WorkStatus | null {
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('acheve') || s.startsWith('1')) return 'ACHEVE';
  if (s.includes('cours') || s.startsWith('2')) return 'EN_COURS';
  if (s.includes('arret') || s.startsWith('3')) return 'A_L_ARRET';
  if (s.includes('non demarre') || s.includes('ajourne') || s.startsWith('4')) return 'NON_DEMARRE';
  return null;
}

export function auditMatrixRows(
  rows: Record<string, unknown>[],
  fileName: string,
  existingMatrixNumbers: Set<string>
): ExcelAuditResult {
  const issues: ExcelAuditIssue[] = [];
  const validProjectsPreview: Project[] = [];
  const seenInFile = new Set<string>();
  let rejectedRowsCount = 0;
  let warningRowsCount = 0;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // Header on row 1
    const getCell = (candidates: string[]): string => {
      for (const key of Object.keys(row)) {
        const normKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        for (const c of candidates) {
          if (normKey.includes(c)) {
            const val = row[key];
            return val === undefined || val === null ? '' : String(val).trim();
          }
        }
      }
      return '';
    };

    const matrixNo = getCell(['n°', 'numero', 'matrice', 'no']);
    const contractor = getCell(['entreprise', 'pme', 'ale']);
    const province = getCell(['province']);
    const territory = getCell(['territoire']);
    const typeRaw = getCell(['type d\'ouvrage', 'type ouvrage', 'type']);
    const projectName = getCell(['nom de l\'ouvrage', 'nom ouvrage', 'ouvrage']);
    const sector = getCell(['secteur', 'chefferie', 'commune']);
    const startDate = getCell(['demarrage', 'date de demarrage']);
    const deadline = getCell(['echeance', 'reception definitive']);
    const statusRaw = getCell(['statut']);
    const tepRaw = getCell(['tep']);
    const tefRaw = getCell(['tef']);

    let hasError = false;
    let hasWarning = false;

    if (!matrixNo) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: '(vide)',
        severity: 'ERREUR',
        category: 'IDENTIFIANT_MANQUANT',
        message: 'Identifiant N° Matrice Unique absent — ligne non importable (identique aux lignes vides détectées dans le modèle).',
      });
      hasError = true;
    } else if (seenInFile.has(matrixNo) || existingMatrixNumbers.has(matrixNo)) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo,
        severity: 'ERREUR',
        category: 'DOUBLON_IDENTIFIANT',
        message: existingMatrixNumbers.has(matrixNo)
          ? `Le N° Matrice « ${matrixNo} » existe déjà dans le registre officiel.`
          : `Doublon détecté dans le fichier pour le N° Matrice « ${matrixNo} ».`,
      });
      hasError = true;
    } else {
      seenInFile.add(matrixNo);
    }

    const missingFields: string[] = [];
    if (!contractor) missingFields.push('Entreprise');
    if (!province) missingFields.push('Province');
    if (!territory) missingFields.push('Territoire');
    if (!projectName) missingFields.push("Nom de l'ouvrage");
    if (missingFields.length > 0) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'ERREUR',
        category: 'FICHE_INCOMPLETE',
        message: `Champs contractuels obligatoires manquants : ${missingFields.join(', ')}.`,
      });
      hasError = true;
    }

    const infraType = normalizeInfraType(typeRaw);
    if (!infraType) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'ERREUR',
        category: 'VALEUR_INCOHERENTE',
        message: `Type d'ouvrage non conforme (« ${typeRaw || 'vide'} »). Valeurs attendues : École primaire, Centre de santé ou Bâtiment administratif.`,
      });
      hasError = true;
    }

    const parsedTep = tepRaw === '' ? 0 : Number(tepRaw.replace('%', '').replace(',', '.'));
    const parsedTef = tefRaw === '' ? 0 : Number(tefRaw.replace('%', '').replace(',', '.'));
    if (Number.isNaN(parsedTep) || parsedTep < 0 || parsedTep > 100) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'ERREUR',
        category: 'VALEUR_INCOHERENTE',
        message: `TEP% invalide (« ${tepRaw} ») : doit être une valeur numérique entre 0 et 100.`,
      });
      hasError = true;
    }
    if (Number.isNaN(parsedTef) || parsedTef < 0 || parsedTef > 100) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'ERREUR',
        category: 'VALEUR_INCOHERENTE',
        message: `TEF% invalide (« ${tefRaw} ») : doit être une valeur numérique entre 0 et 100.`,
      });
      hasError = true;
    }

    if (startDate && deadline && startDate > deadline) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'AVERTISSEMENT',
        category: 'VALEUR_INCOHERENTE',
        message: `L'échéance de réception définitive (${deadline}) précède la date de démarrage (${startDate}).`,
      });
      hasWarning = true;
    }

    const workStatus = normalizeWorkStatus(statusRaw) ?? 'EN_COURS';
    if (statusRaw && !normalizeWorkStatus(statusRaw)) {
      issues.push({
        rowIndex: rowNumber,
        matrixNumber: matrixNo || '(vide)',
        severity: 'AVERTISSEMENT',
        category: 'VALEUR_INCOHERENTE',
        message: `Statut non normalisé (« ${statusRaw} »), reclassé par défaut sur « En cours ».`,
      });
      hasWarning = true;
    }

    if (hasError) {
      rejectedRowsCount += 1;
      return;
    }
    if (hasWarning) {
      warningRowsCount += 1;
    }

    const nowIso = new Date().toISOString();
    const tep = Number.isNaN(parsedTep) ? 0 : parsedTep;
    const tef = Number.isNaN(parsedTef) ? 0 : parsedTef;

    validProjectsPreview.push({
      id: generateUniqueId('PRJ-IMP'),
      matrixNumber: matrixNo,
      contractor,
      province,
      territory,
      infrastructureType: infraType ?? 'ECOLE_PRIMAIRE',
      projectName,
      sectorChiefdom: sector || 'Non renseigné',
      locality: sector || territory,
      contractStatus: 'CONTRAT_ACTIF',
      startDate: startDate || '2026-01-15',
      definitiveReceptionDeadline: deadline || '2027-06-30',
      referenceCoords: { lat: -10.7, lng: 26.5 },
      baselineDate: '2026-08-31',
      baselineStatus: workStatus,
      baselineTep: tep,
      baselineTef: tef,
      currentStatus: workStatus,
      latestPeriodRealization: 'Importé depuis classeur Matrice Unique (audit validé)',
      latestExecutionStages: tep >= 100 ? ['FINITION', 'EQUIPEMENT_MOBILIER'] : ['FONDATION'],
      currentTep: tep,
      currentTef: tef,
      currentGap: calculateTepTefGap(tep, tef),
      latestConstraintsSummary: '',
      latestConstraintCategories: [] as ConstraintCategory[],
      hasUnresolvedConstraints: false,
      hasCriticalConstraint: false,
      latestImpactsSummary: '',
      receptions: {
        rt: { status: 'NON', date: '', reserves: '', pvReference: '' },
        rp: { status: 'NON', date: '', reserves: '', pvReference: '' },
        rd: { status: 'NON', date: '', reserves: '', pvReference: '' },
      },
      latestObservation: 'Fiche importée après audit préalable (MODE DÉMONSTRATION).',
      assignedAgentIds: [],
      isDemoData: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  return {
    fileName,
    totalRows: rows.length,
    validRowsCount: validProjectsPreview.length,
    rejectedRowsCount,
    warningRowsCount,
    issues,
    validProjectsPreview,
  };
}

/**
 * Detects the official Matrice Unique header row.
 * Official BCECO template uses 3 preamble rows:
 *  0) Title (ex. « MATRICE UNIQUE DES OUVRAGES… »)
 *  1) Bloc labels (IDENTIFICATION / SITUATION …)
 *  2) Column headers (N°, Entreprise, Province, …)
 * Older flat exports may put headers on row 0.
 */
export function findMatriceUniqueHeaderRowIndex(aoa: unknown[][]): number {
  const scoreRow = (row: unknown[]): number => {
    const cells = row.map((c) =>
      String(c ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    );
    let score = 0;
    if (cells.some((c) => c === 'n°' || c === 'n' || c === 'no' || c.startsWith('n°'))) score += 3;
    if (cells.some((c) => c.includes('entreprise'))) score += 3;
    if (cells.some((c) => c.includes('province'))) score += 2;
    if (cells.some((c) => c.includes('territoire'))) score += 2;
    if (cells.some((c) => c.includes("type d'ouvrage") || c.includes('type ouvrage'))) score += 2;
    if (cells.some((c) => c.includes('tep'))) score += 1;
    if (cells.some((c) => c.includes('tef'))) score += 1;
    return score;
  };

  let bestIdx = 0;
  let bestScore = -1;
  const scanLimit = Math.min(aoa.length, 12);
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreRow(Array.isArray(aoa[i]) ? (aoa[i] as unknown[]) : []);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 6 ? bestIdx : 0;
}

export function sheetToMatriceUniqueObjects(
  sheet: XLSX.WorkSheet
): Record<string, unknown>[] {
  const aoa = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  if (!aoa.length) return [];

  const headerIdx = findMatriceUniqueHeaderRowIndex(aoa);
  const headerRow = (aoa[headerIdx] ?? []).map((c, idx) => {
    const label = String(c ?? '').trim();
    return label || `__EMPTY_${idx}`;
  });

  const objects: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const obj: Record<string, unknown> = {};
    let nonEmpty = false;
    headerRow.forEach((key, col) => {
      const value = row[col] ?? '';
      obj[key] = value;
      if (String(value).trim() !== '') nonEmpty = true;
    });
    // Skip fully blank rows and the official legend/instruction row under headers
    if (!nonEmpty) continue;
    const firstCell = String(row[0] ?? '').trim().toLowerCase();
    const joined = row.map((c) => String(c ?? '')).join(' ').toLowerCase();
    if (
      joined.includes('ecole primaire') &&
      joined.includes('centre de sante') &&
      !firstCell
    ) {
      continue;
    }
    objects.push(obj);
  }
  return objects;
}

export async function auditUploadedExcelFile(
  file: File,
  existingMatrixNumbers: Set<string>
): Promise<ExcelAuditResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = sheetToMatriceUniqueObjects(sheet);
  return auditMatrixRows(rows, file.name, existingMatrixNumbers);
}

export function buildDemoAuditSampleRows(): Record<string, unknown>[] {
  return [
    {
      'N°': 'DEMO-025',
      Entreprise: 'Bâtisseurs Katanga Démo SARL',
      Province: 'Haut-Katanga',
      Territoire: 'Kambove',
      "Type d'ouvrage": '1) École primaire',
      "Nom de l'ouvrage": 'EP Démo Kilela Balanda (Audit Import)',
      'Secteur / Chefferie': 'Secteur Lufira',
      'Date de démarrage': '2026-02-10',
      'Échéance réception définitive': '2027-02-10',
      'Statut à ce jour': '2) En cours',
      'TEP%': '48',
      'TEF%': '45',
    },
    {
      'N°': '',
      Entreprise: 'Constructeurs Lualaba Démo',
      Province: 'Lualaba',
      Territoire: 'Lubudi',
      "Type d'ouvrage": '2) Centre de santé',
      "Nom de l'ouvrage": 'CS Démo Sans Identifiant (Ligne anormale)',
      'Secteur / Chefferie': 'Chefferie Bayeke',
      'Date de démarrage': '2026-03-01',
      'Échéance réception définitive': '2027-03-01',
      'Statut à ce jour': '2) En cours',
      'TEP%': '30',
      'TEF%': '30',
    },
    {
      'N°': 'DEMO-001',
      Entreprise: 'Doublon Identifiant SARL',
      Province: 'Haut-Katanga',
      Territoire: 'Kipushi',
      "Type d'ouvrage": '1) École primaire',
      "Nom de l'ouvrage": 'EP Démo Doublon DEMO-001',
      'Secteur / Chefferie': 'Secteur Bukanda',
      'Date de démarrage': '2026-01-15',
      'Échéance réception définitive': '2027-01-15',
      'Statut à ce jour': '2) En cours',
      'TEP%': '50',
      'TEF%': '50',
    },
    {
      'N°': 'DEMO-026',
      Entreprise: '',
      Province: 'Haut-Lomami',
      Territoire: 'Kamina',
      "Type d'ouvrage": 'Type inconnu XYZ',
      "Nom de l'ouvrage": 'Ouvrage Incomplet & TEP 140%',
      'Secteur / Chefferie': 'Secteur Kinda',
      'Date de démarrage': '2026-06-01',
      'Échéance réception définitive': '2025-12-01',
      'Statut à ce jour': '2) En cours',
      'TEP%': '140',
      'TEF%': '45',
    },
    {
      'N°': 'DEMO-027',
      Entreprise: 'Génie Civil Tanganyika Démo',
      Province: 'Tanganyika',
      Territoire: 'Kalemie',
      "Type d'ouvrage": '3) Bâtiment administratif',
      "Nom de l'ouvrage": 'Bâtiment Administratif Démo Bendera (Audit Import)',
      'Secteur / Chefferie': 'Chefferie Tumbwe',
      'Date de démarrage': '2026-04-01',
      'Échéance réception définitive': '2027-08-30',
      'Statut à ce jour': '2) En cours',
      'TEP%': '62',
      'TEF%': '58',
    },
  ];
}
