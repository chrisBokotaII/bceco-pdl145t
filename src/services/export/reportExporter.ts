import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import JSZip from 'jszip';
import {
  CONSTRAINT_CATEGORIES,
  CONTRACT_STATUS_LABELS,
  DEMO_BANNER_TEXT,
  EXECUTION_STAGES,
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  INSTITUTION_REF,
  MATRICE_UNIQUE_HEADERS,
  PERIODICITY_LABELS,
  REPORT_STATUS_LABELS,
  WORK_STATUS_CONCISE,
  WORK_STATUS_LABELS,
} from '../../domain/constants';
import {
  formatDateFr,
  formatDateTimeFr,
  formatExecutionStagesShort,
  formatPercentFr,
  formatReceptionCell,
  formatSignedGapFr,
} from '../../domain/formatters';
import {
  consolidatedRowToMatrix21,
  consolidatedRowToRoadmap10,
  FEUILLE_DE_ROUTE_10_HEADERS,
  FEUILLE_DE_ROUTE_FOOTNOTES,
  MATRICE_UNIQUE_BLOC1_LABEL,
  MATRICE_UNIQUE_BLOC2_LABEL,
  normalizeReportMonthKey,
  normalizeReportWeekCode,
  type ConsolidatedReportModel,
} from '../../domain/reportingEngine';
import type { FieldReport, Project } from '../../types/domain';

export type CsvExportVariant = 'MATRICE_21' | 'SYNTHESES_GEO' | 'CONTRAINTES_RECEPTIONS';

export interface ExportBuildContext {
  model: ConsolidatedReportModel;
  generatedByName: string;
  generatedAt: string;
  isDemoData: boolean;
  reports?: FieldReport[];
  projects?: Project[];
}

export interface BuiltExportArtifact {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  sheetNames?: string[];
  pageCount?: number;
}

function safeFileSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 64) || 'export'
  );
}

/**
 * Normalise les caractères Unicode spéciaux (espace fine insécable U+202F issue d'Intl fr-FR,
 * apostrophes typographiques, tirets cadratins, symboles mathématiques) pour garantir un rendu
 * Helvetica WinAnsi impeccable dans jsPDF sans glyphes corrompus.
 */
function pdfSafeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–−]/g, '-')
    .replace(/·/g, '|')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/⇒/g, '=>')
    .replace(/Σ/g, 'Somme');
}

export type AutoTableCellInput =
  | string
  | number
  | null
  | undefined
  | { content: string; colSpan?: number; rowSpan?: number; styles?: Record<string, unknown> };

function pdfSafeRow(
  cells: AutoTableCellInput[]
): (string | { content: string; colSpan?: number; rowSpan?: number; styles?: Record<string, unknown> })[] {
  return cells.map((c) => {
    if (c !== null && typeof c === 'object' && 'content' in c) {
      return {
        ...c,
        content: pdfSafeText(c.content),
      };
    }
    return pdfSafeText(c as string | number | null | undefined);
  });
}

function formatDeltaShort(delta: number | null): string {
  if (delta === null) return '—';
  if (delta > 0) return `+${delta.toFixed(1).replace('.', ',')} pts`;
  if (delta < 0) return `${delta.toFixed(1).replace('.', ',')} pts`;
  return '0,0 pt';
}

function getLastTableY(doc: jsPDF, fallback: number): number {
  const withTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return withTable.lastAutoTable?.finalY ?? fallback;
}

function buildMatrixTotalRow(model: ConsolidatedReportModel): (string | number)[] {
  const { kpis } = model;
  return [
    'TOTAL / CONTRÔLES',
    `${kpis.totalProjects} ouvrages`,
    `${kpis.provincesCount} provinces`,
    `${kpis.territoriesCount} territoires`,
    `EP:${model.byInfrastructureType[0].totalProjects} | CS:${model.byInfrastructureType[1].totalProjects} | BA:${model.byInfrastructureType[2].totalProjects}`,
    `Couverture période : ${kpis.projectsReportedInPeriod}/${kpis.totalProjects}`,
    '',
    '',
    `${kpis.overdueDeadlineCount} échéance(s) dépassée(s)`,
    `Achevés: ${kpis.completed} | En cours: ${kpis.inProgress} | Arrêt: ${kpis.stopped} | Non dém.: ${kpis.notStarted}`,
    '',
    '',
    kpis.averageTep,
    kpis.averageTef,
    kpis.averageGap,
    `${kpis.criticalConstraintsCount} critiques | ${kpis.gapAlertsCount} écarts > 10 pts`,
    `Retards: ${model.impactTotals.delays} | Arrêts: ${model.impactTotals.stoppage}`,
    `RT OK: ${kpis.rtOk}/${kpis.totalProjects}`,
    `RP OK: ${kpis.rpOk}/${kpis.totalProjects}`,
    `RD OK: ${kpis.rdOk}/${kpis.totalProjects}`,
    `Contrôles source : ${model.validationChecks.filter((c) => c.status === 'PASS').length}/${model.validationChecks.length} conformes`,
  ];
}

// ============================================================================
// 1. EXCEL BUILDER (.xlsx — 7 onglets structurés BCECO / PDL-145T)
// ============================================================================
export function buildConsolidatedExcelBuffer(ctx: ExportBuildContext): BuiltExportArtifact {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const { kpis } = model;
  const wb = XLSX.utils.book_new();
  const sheetNames: string[] = [];

  const appendSheet = (name: string, ws: XLSX.WorkSheet) => {
    XLSX.utils.book_append_sheet(wb, ws, name);
    sheetNames.push(name);
  };

  // --- Onglet 1 : 1_Synthese_Executive ---
  const synthRows: (string | number)[][] = [
    [`RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — ${INSTITUTION_REF}`],
    [model.title],
    [isDemoData ? DEMO_BANNER_TEXT : 'RAPPORT CONSOLIDÉ OFFICIEL — DIFFUSION COORDONNATEUR'],
    [],
    ['MÉTADONNÉES DU RAPPORT', 'VALEUR'],
    ['Périodicité', PERIODICITY_LABELS[model.params.periodicity]],
    ['Période couverte', model.params.periodLabel],
    [
      'Périmètre de validation',
      model.params.dataScope === 'VALIDES_UNIQUEMENT'
        ? 'Fiches validées par le Coordonnateur uniquement (Officiel)'
        : 'Fiches soumises et validées (avec distinction explicite)',
    ],
    ['Filtres appliqués', model.filtersSummary],
    ['Date de référence échéances', formatDateFr(model.referenceDate)],
    ['Généré par (Coordonnateur)', generatedByName],
    ['Date et heure de génération', formatDateTimeFr(generatedAt)],
    ['Provinces couvertes', `${kpis.provincesCount} : ${kpis.provinces.join(', ') || 'Aucune'}`],
    ['Territoires couverts', `${kpis.territoriesCount} : ${kpis.territories.join(', ') || 'Aucun'}`],
    [],
    ['INDICATEURS EXÉCUTIFS CONSOLIDÉS', 'VALEUR', 'OBSERVATION / RÉFÉRENCE'],
    ["Nombre total d'ouvrages dans le périmètre", kpis.totalProjects, 'Registre consolidé'],
    ['Ouvrages avec fiche sur la période', kpis.projectsReportedInPeriod, `${kpis.periodCoveragePercent} % de couverture`],
    ['Fiches terrain reçues (période active)', kpis.reportsCount, `${kpis.validatedReportsCount} validées · ${kpis.submittedOnlyReportsCount} soumises`],
    ['Fiches terrain cumulées (toutes périodes)', kpis.allScopedReportsCount, `${kpis.duplicateFlaggedReportsCount} doublon(s) potentiel(s) sur période`],
    ['Ouvrages achevés', kpis.completed, `${kpis.completionRatePercent} % du parc`],
    ["Ouvrages en cours d'exécution", kpis.inProgress, ''],
    ["Ouvrages à l'arrêt", kpis.stopped, 'Suivi critique requis'],
    ['Ouvrages non démarrés / ajournés', kpis.notStarted, ''],
    ['TEP moyen (%)', kpis.averageTep, `Référence figée : ${kpis.baselineAverageTep} % (${formatDeltaShort(kpis.tepProgressionVsBaseline)})`],
    ['TEF moyen (%)', kpis.averageTef, `Référence figée : ${kpis.baselineAverageTef} % (${formatDeltaShort(kpis.tefProgressionVsBaseline)})`],
    ['Écart moyen TEP − TEF (pts)', kpis.averageGap, `${kpis.gapAlertsCount} ouvrage(s) avec |écart| > 10 pts`],
    ['Ouvrages avec contraintes actives', kpis.unresolvedConstraintsCount, `${kpis.criticalConstraintsCount} contrainte(s) critique(s)`],
    ['Échéances RD contractuelles dépassées', kpis.overdueDeadlineCount, `Évaluées au ${formatDateFr(model.referenceDate)}`],
    ['Réceptions Techniques (RT) OK', kpis.rtOk, `${kpis.rtPending} en attente`],
    ['Réceptions Provisoires (RP) OK', kpis.rpOk, `${kpis.rpPending} en attente`],
    ['Réceptions Définitives (RD) OK', kpis.rdOk, `${kpis.rdPending} en attente · ${kpis.receptionsWithReservesCount} avec réserves`],
    ['Effectifs mobilisés sur chantiers', kpis.totalWorkforce, `${kpis.totalSkilledWorkers} ouvriers qualifiés · ${kpis.totalLaborers} manœuvres`],
    [],
    ['VENTILATION PAR TYPE D’OUVRAGE (EP / CS / BA)', 'Ouvrages', 'Part (%)', 'Achevés', 'En cours', 'Arrêt', 'Non dém.', 'TEP (%)', 'TEF (%)', 'Écart', 'RT OK', 'RP OK', 'RD OK'],
    ...model.byInfrastructureType.map((t) => [
      t.label,
      t.totalProjects,
      t.sharePercent,
      t.completed,
      t.inProgress,
      t.stopped,
      t.notStarted,
      t.averageTep,
      t.averageTef,
      t.averageGap,
      t.rtOk,
      t.rpOk,
      t.rdOk,
    ]),
    [
      'TOTAL TYPES',
      kpis.totalProjects,
      100,
      kpis.completed,
      kpis.inProgress,
      kpis.stopped,
      kpis.notStarted,
      kpis.averageTep,
      kpis.averageTef,
      kpis.averageGap,
      kpis.rtOk,
      kpis.rpOk,
      kpis.rdOk,
    ],
    [],
    ['TYPOLOGIE DES CONTRAINTES (4 CATÉGORIES BCECO)', 'Ouvrages touchés', 'Part (%)', 'Critiques', 'À l’arrêt', 'Exemples officiels'],
    ...model.constraintsBreakdown.map((c) => [
      `${c.number}) ${c.label}`,
      c.projectsCount,
      c.shareOfConstrainedPercent,
      c.criticalCount,
      c.stoppedCount,
      c.examples,
    ]),
    [],
    ['CONTRÔLES DE VALIDATION CONTRE LA STRUCTURE SOURCE', 'STATUT', 'ATTENDU', 'OBSERVÉ', 'DÉTAIL'],
    ...model.validationChecks.map((chk) => [
      `${chk.code} — ${chk.label}`,
      chk.status,
      chk.expected,
      chk.actual,
      chk.detail,
    ]),
  ];
  const wsSynth = XLSX.utils.aoa_to_sheet(synthRows);
  wsSynth['!cols'] = [
    { wch: 46 }, { wch: 24 }, { wch: 36 }, { wch: 24 }, { wch: 24 }, { wch: 40 },
    { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];
  appendSheet('1_Synthese_Executive', wsSynth);

  // --- Onglet 2 : 2_Hebdo_Mensuel ---
  const periodAoA: (string | number)[][] = [
    [`SYNTHÈSES HEBDOMADAIRE ET MENSUELLE — ${INSTITUTION_REF}${isDemoData ? ' [MODE DÉMONSTRATION]' : ''}`],
    [`Filtres : ${model.filtersSummary} | Périmètre : ${model.params.dataScope}`],
    [],
    ['A. SYNTHÈSE HEBDOMADAIRE (PAR SEMAINE ISO)'],
    [
      'Code Semaine',
      'Libellé',
      'Plage de dates',
      'Fiches reçues',
      'Validées',
      'Soumises',
      'Ouvrages couverts',
      'Achevés',
      'En cours',
      'Arrêt',
      'TEP moy. (%)',
      'TEF moy. (%)',
      'Écart moy.',
      'ΔTEP vs S-1',
      'ΔTEF vs S-1',
      'Écarts >10 pts',
      'Critiques',
      'RT / RP / RD OK',
      'Effectifs',
    ],
    ...model.weeklySummaries.map((w) => [
      w.periodKey,
      w.label,
      w.dateRange,
      w.reportsCount,
      w.validatedCount,
      w.submittedCount,
      w.uniqueProjectsCount,
      w.completedCount,
      w.inProgressCount,
      w.stoppedCount,
      w.averageTep,
      w.averageTef,
      w.averageGap,
      formatDeltaShort(w.tepDeltaVsPrev),
      formatDeltaShort(w.tefDeltaVsPrev),
      w.gapAlertsCount,
      w.criticalConstraintsCount,
      `${w.rtOkCount} / ${w.rpOkCount} / ${w.rdOkCount}`,
      w.totalWorkforce,
    ]),
    [],
    ['B. SYNTHÈSE MENSUELLE (PAR MOIS CALENDAIRE)'],
    [
      'Code Mois',
      'Mois',
      'Plage de dates',
      'Fiches reçues',
      'Validées',
      'Soumises',
      'Ouvrages couverts',
      'Achevés',
      'En cours',
      'Arrêt',
      'TEP moy. (%)',
      'TEF moy. (%)',
      'Écart moy.',
      'ΔTEP vs M-1',
      'ΔTEF vs M-1',
      'Écarts >10 pts',
      'Critiques',
      'RT / RP / RD OK',
      'Effectifs',
    ],
    ...model.monthlySummaries.map((m) => [
      m.periodKey,
      m.label,
      m.dateRange,
      m.reportsCount,
      m.validatedCount,
      m.submittedCount,
      m.uniqueProjectsCount,
      m.completedCount,
      m.inProgressCount,
      m.stoppedCount,
      m.averageTep,
      m.averageTef,
      m.averageGap,
      formatDeltaShort(m.tepDeltaVsPrev),
      formatDeltaShort(m.tefDeltaVsPrev),
      m.gapAlertsCount,
      m.criticalConstraintsCount,
      `${m.rtOkCount} / ${m.rpOkCount} / ${m.rdOkCount}`,
      m.totalWorkforce,
    ]),
  ];
  const wsPeriod = XLSX.utils.aoa_to_sheet(periodAoA);
  wsPeriod['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 11 },
  ];
  appendSheet('2_Hebdo_Mensuel', wsPeriod);

  // --- Onglet 3 : 3_Geographie ---
  const geoAoA: (string | number)[][] = [
    [`VENTILATION GÉOGRAPHIQUE & ENTREPRISES — ${model.params.periodLabel.toUpperCase()}`],
    [],
    ['A. SYNTHÈSE PAR PROVINCE'],
    [
      'Province',
      'Territoires',
      'Total Ouvrages',
      'EP',
      'CS',
      'BA',
      'Achevés',
      'En cours',
      'À l’arrêt',
      'Non dém.',
      'TEP moy. (%)',
      'TEF moy. (%)',
      'Écart moy.',
      'RT OK',
      'RP OK',
      'RD OK',
      'Écarts >10',
      'Critiques',
      'Éch. dépassées',
    ],
    ...model.byProvince.map((p) => [
      p.province,
      p.territoriesCount,
      p.totalProjects,
      p.epCount,
      p.csCount,
      p.baCount,
      p.completed,
      p.inProgress,
      p.stopped,
      p.notStarted,
      p.averageTep,
      p.averageTef,
      p.averageGap,
      p.rtOk,
      p.rpOk,
      p.rdOk,
      p.gapAlertsCount,
      p.criticalConstraintsCount,
      p.overdueCount,
    ]),
    [
      'TOTAL / CONTRÔLES',
      kpis.territoriesCount,
      kpis.totalProjects,
      model.byInfrastructureType[0].totalProjects,
      model.byInfrastructureType[1].totalProjects,
      model.byInfrastructureType[2].totalProjects,
      kpis.completed,
      kpis.inProgress,
      kpis.stopped,
      kpis.notStarted,
      kpis.averageTep,
      kpis.averageTef,
      kpis.averageGap,
      kpis.rtOk,
      kpis.rpOk,
      kpis.rdOk,
      kpis.gapAlertsCount,
      kpis.criticalConstraintsCount,
      kpis.overdueDeadlineCount,
    ],
    [],
    ['B. SYNTHÈSE PAR TERRITOIRE'],
    [
      'Province',
      'Territoire',
      'Total Ouvrages',
      'EP',
      'CS',
      'BA',
      'Achevés',
      'En cours',
      'À l’arrêt',
      'Non dém.',
      'TEP moy. (%)',
      'TEF moy. (%)',
      'Écart moy.',
      'RT OK',
      'RP OK',
      'RD OK',
      'Écarts >10',
      'Critiques',
      'Éch. dépassées',
    ],
    ...model.byTerritory.map((t) => [
      t.province,
      t.territory,
      t.totalProjects,
      t.epCount,
      t.csCount,
      t.baCount,
      t.completed,
      t.inProgress,
      t.stopped,
      t.notStarted,
      t.averageTep,
      t.averageTef,
      t.averageGap,
      t.rtOk,
      t.rpOk,
      t.rdOk,
      t.gapAlertsCount,
      t.criticalConstraintsCount,
      t.overdueCount,
    ]),
    [],
    ['C. PERFORMANCE PAR ENTREPRISE ATTRIBUTAIRE (PME)'],
    [
      'Entreprise',
      'Provinces',
      'Total Ouvrages',
      'Achevés',
      'En cours',
      'À l’arrêt',
      'Non dém.',
      'TEP moy. (%)',
      'TEF moy. (%)',
      'Écart moy.',
      'RD OK',
      'Écarts >10',
      'Critiques',
      'Éch. dépassées',
    ],
    ...model.byContractor.map((c) => [
      c.contractor,
      c.provinces.join(', '),
      c.totalProjects,
      c.completed,
      c.inProgress,
      c.stopped,
      c.notStarted,
      c.averageTep,
      c.averageTef,
      c.averageGap,
      c.rdOk,
      c.gapAlertsCount,
      c.criticalConstraintsCount,
      c.overdueCount,
    ]),
  ];
  const wsGeo = XLSX.utils.aoa_to_sheet(geoAoA);
  wsGeo['!cols'] = [
    { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 11 }, { wch: 10 }, { wch: 14 },
  ];
  appendSheet('3_Geographie', wsGeo);

  // --- Onglet 4 : 4_Matrice_Unique_21col (Exact 2-tier header + 21 official columns + Photos Miniatures + TOTAL / CONTRÔLES) ---
  const blocHeaderRow: string[] = [
    MATRICE_UNIQUE_BLOC1_LABEL,
    '', '', '', '', '', '', '', '',
    MATRICE_UNIQUE_BLOC2_LABEL,
    '', '', '', '', '', '', '', '', '', '', '', '',
  ];
  const matrixHeaders = [...MATRICE_UNIQUE_HEADERS, 'Photos Miniatures (URLs)'];
  const matrixRows = model.rows.map((row) => {
    const base = consolidatedRowToMatrix21(row);
    const projReports = ctx.reports?.filter((r) => r.projectId === row.projectId) ?? [];
    const photos = projReports.flatMap((r) => r.receptions?.photos || []);
    const photoSummary =
      photos.length > 0
        ? photos.map((p, i) => `[Photo ${i + 1}: ${p.fileName}] (${p.dataUrl ? 'Miniature base64 dispo' : 'Lien absent'})`).join(' ; ')
        : 'Aucune photo jointe';
    return [...base, photoSummary];
  });
  const totalRow = buildMatrixTotalRow(model);
  const matrixAoA: (string | number)[][] = [
    [`MATRICE UNIQUE DES OUVRAGES ${INSTITUTION_REF} — ${model.params.periodLabel.toUpperCase()}${isDemoData ? ' [DONNÉES DÉMO]' : ''}`],
    blocHeaderRow,
    matrixHeaders,
    ...matrixRows,
    [...totalRow, ''],
  ];
  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoA);
  wsMatrix['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 21 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 1, c: 9 }, e: { r: 1, c: 21 } },
  ];
  wsMatrix['!cols'] = [
    { wch: 13 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 36 },
    { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 38 }, { wch: 30 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 32 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 38 }, { wch: 45 },
  ];
  appendSheet('4_Matrice_Unique_21col', wsMatrix);

  // --- Onglet 5 : 5_Contraintes_Alertes ---
  const constraintRows: (string | number)[][] = [
    [`REGISTRE DES CONTRAINTES, ALERTES ÉCART |TEP − TEF| > 10 PTS ET MESURES CORRECTIVES — ${model.params.periodLabel}`],
    [
      'N° Matrice',
      'Ouvrage',
      'Province / Territoire',
      'Entreprise',
      'Statut',
      'TEP (%)',
      'TEF (%)',
      'Écart (pts)',
      'Alerte >10 pts',
      'Catégories (1-4)',
      'Critique',
      'Contraintes détaillées',
      'Impacts (D/C/Q/A)',
      'Justification écart',
      'Mesures correctives',
      'Actions urgentes',
      'Responsable',
    ],
    ...model.flaggedRows.map((r) => {
      const catLabels = r.latestConstraintCategories
        .map((id) => {
          const def = CONSTRAINT_CATEGORIES.find((c) => c.id === id);
          return def ? `${def.number}) ${def.label}` : id;
        })
        .join(' ; ');
      const impactCodes = [
        r.impactsFlags.delays ? 'Délais' : '',
        r.impactsFlags.costs ? 'Coûts' : '',
        r.impactsFlags.quality ? 'Qualité' : '',
        r.impactsFlags.stoppage ? 'Arrêt' : '',
      ]
        .filter(Boolean)
        .join(', ');
      return [
        r.matrixNumber,
        r.projectName,
        `${r.province} / ${r.territory}`,
        r.contractor,
        WORK_STATUS_CONCISE[r.currentStatus],
        r.currentTep,
        r.currentTef,
        r.currentGap,
        r.isGapAlert ? 'OUI' : 'Non',
        catLabels || 'Aucune catégorie',
        r.hasCriticalConstraint ? 'CRITIQUE' : 'Standard',
        r.latestConstraintsSummary || 'Écart TEP/TEF > 10 pts',
        impactCodes ? `${impactCodes} — ${r.latestImpactsSummary}` : r.latestImpactsSummary,
        r.gapJustification || (r.isGapAlert ? 'Non renseignée dans les fiches' : '—'),
        r.correctiveMeasures,
        r.urgentActionsRequired || '—',
        r.actionOwner,
      ];
    }),
  ];
  const wsConstraints = XLSX.utils.aoa_to_sheet(constraintRows);
  wsConstraints['!cols'] = [
    { wch: 13 }, { wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 13 }, { wch: 10 },
    { wch: 10 }, { wch: 11 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 36 },
    { wch: 32 }, { wch: 34 }, { wch: 36 }, { wch: 32 }, { wch: 20 },
  ];
  appendSheet('5_Contraintes_Alertes', wsConstraints);

  // --- Onglet 6 : 6_Receptions_RT_RP_RD ---
  const receptionRows: (string | number)[][] = [
    [`SUIVI DES RÉCEPTIONS (RT / RP / RD), PROCÈS-VERBAUX ET ÉCHÉANCES CONTRACTUELLES — ${model.params.periodLabel}`],
    [
      'N° Matrice',
      'Ouvrage',
      'Province / Territoire',
      'Entreprise',
      'Contrat',
      'Statut',
      'TEP (%)',
      'Date démarrage',
      'Échéance RD contractuelle',
      'Conformité délai',
      'RT (Statut / Date / PV)',
      'RP (Statut / Date / PV)',
      'RD (Statut / Date / PV)',
      'Réserves signalées',
      'Séquence RT→RP→RD',
    ],
    ...model.rows.map((r) => {
      const reservesList = [
        r.receptions.rt.reserves ? `RT: ${r.receptions.rt.reserves}` : '',
        r.receptions.rp.reserves ? `RP: ${r.receptions.rp.reserves}` : '',
        r.receptions.rd.reserves ? `RD: ${r.receptions.rd.reserves}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
      const delayLabel =
        r.receptions.rd.status === 'OK'
          ? 'Réceptionné (RD OK)'
          : r.isDeadlineOverdue
          ? `DÉPASSÉE (${Math.abs(r.daysToDeadline ?? 0)} j)`
          : r.daysToDeadline !== null
          ? `Dans ${r.daysToDeadline} j`
          : '—';
      return [
        r.matrixNumber,
        r.projectName,
        `${r.province} / ${r.territory}`,
        r.contractor,
        CONTRACT_STATUS_LABELS[r.contractStatus],
        WORK_STATUS_CONCISE[r.currentStatus],
        r.currentTep,
        formatDateFr(r.startDate),
        formatDateFr(r.definitiveReceptionDeadline),
        delayLabel,
        formatReceptionCell(r.receptions.rt),
        formatReceptionCell(r.receptions.rp),
        formatReceptionCell(r.receptions.rd),
        reservesList || 'Aucune réserve',
        r.receptionsCoherent ? 'Cohérente' : 'ANOMALIE',
      ];
    }),
  ];
  const wsReceptions = XLSX.utils.aoa_to_sheet(receptionRows);
  wsReceptions['!cols'] = [
    { wch: 13 }, { wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 13 },
    { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 28 }, { wch: 28 },
    { wch: 28 }, { wch: 34 }, { wch: 16 },
  ];
  appendSheet('6_Receptions_RT_RP_RD', wsReceptions);

  // --- Onglet 7 : 7_Annexe_Fiches_Terrain ---
  const reportRows: (string | number)[][] = [
    [`ANNEXE — FICHES DE COLLECTE TERRAIN INCLUSES (${model.periodReports.length} FICHES)`],
    [
      'ID Fiche',
      'Version',
      'N° Matrice',
      'Ouvrage',
      'Province / Territoire',
      'Agent Terrain',
      'Périodicité',
      'Semaine ISO',
      'Mois',
      'Date collecte',
      'Statut validation',
      'Statut travaux',
      'TEP (%)',
      'TEF (%)',
      'Écart (pts)',
      'Effectifs (Q+M)',
      'Coordonnées GPS',
      'Doublon potentiel',
    ],
    ...model.periodReports.map((r) => [
      r.id,
      `v${r.version}`,
      r.matrixNumber,
      r.identification.projectName,
      `${r.identification.province} / ${r.identification.territory}`,
      r.agentName,
      PERIODICITY_LABELS[r.periodicity],
      normalizeReportWeekCode(r),
      normalizeReportMonthKey(r),
      formatDateFr(r.collectionDate),
      r.status === 'VALIDE' ? 'VALIDÉ COORDONNATEUR' : `NON VALIDÉ (${r.status})`,
      WORK_STATUS_CONCISE[r.progress.workStatus],
      r.progress.currentTep,
      r.progress.currentTef,
      r.progress.tepTefGap,
      (r.progress.skilledWorkersCount || 0) + (r.progress.laborersCount || 0),
      r.identification.gpsLat && r.identification.gpsLng
        ? `${r.identification.gpsLat}, ${r.identification.gpsLng}`
        : '—',
      r.potentialDuplicateOf.length > 0 ? `Oui (${r.potentialDuplicateOf.join(', ')})` : 'Non',
    ]),
  ];
  const wsReports = XLSX.utils.aoa_to_sheet(reportRows);
  wsReports['!cols'] = [
    { wch: 20 }, { wch: 9 }, { wch: 13 }, { wch: 32 }, { wch: 24 }, { wch: 24 },
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 24 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 20 }, { wch: 22 },
  ];
  appendSheet('7_Annexe_Fiches_Terrain', wsReports);

  const arrayBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const fileName = `BCECO_PDL145T_${safeFileSlug(model.params.periodicity)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.xlsx`;

  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sheetNames,
  };
}

// ============================================================================
// 2. CSV BUILDER (UTF-8 BOM, séparateur ';', conforme Excel français)
// ============================================================================
function escapeCsvCell(val: string | number | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildConsolidatedCsvBuffer(
  ctx: ExportBuildContext,
  variant: CsvExportVariant = 'MATRICE_21'
): BuiltExportArtifact {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const lines: string[] = [
    `# ${INSTITUTION_REF} — ${model.title}`,
    `# Période: ${model.params.periodLabel} | Périmètre: ${model.params.dataScope} | Filtres: ${model.filtersSummary} | Généré par: ${generatedByName} le ${formatDateTimeFr(generatedAt)}${isDemoData ? ' | MODE DÉMONSTRATION' : ''}`,
  ];

  let suffix = 'Matrice21';
  if (variant === 'MATRICE_21') {
    lines.push(MATRICE_UNIQUE_HEADERS.map(escapeCsvCell).join(';'));
    for (const row of model.rows) {
      lines.push(consolidatedRowToMatrix21(row).map(escapeCsvCell).join(';'));
    }
    lines.push(buildMatrixTotalRow(model).map(escapeCsvCell).join(';'));
  } else if (variant === 'SYNTHESES_GEO') {
    suffix = 'Syntheses_Geo';
    lines.push('# SECTION 1 — SYNTHÈSE HEBDOMADAIRE');
    lines.push(
      [
        'Semaine', 'Libellé', 'Plage', 'Fiches', 'Validées', 'Soumises',
        'Ouvrages', 'TEP%', 'TEF%', 'Écart', 'ΔTEP', 'ΔTEF', 'Critiques',
      ]
        .map(escapeCsvCell)
        .join(';')
    );
    for (const w of model.weeklySummaries) {
      lines.push(
        [
          w.periodKey, w.label, w.dateRange, w.reportsCount, w.validatedCount, w.submittedCount,
          w.uniqueProjectsCount, w.averageTep, w.averageTef, w.averageGap,
          formatDeltaShort(w.tepDeltaVsPrev), formatDeltaShort(w.tefDeltaVsPrev), w.criticalConstraintsCount,
        ]
          .map(escapeCsvCell)
          .join(';')
      );
    }
    lines.push('');
    lines.push('# SECTION 2 — SYNTHÈSE MENSUELLE');
    lines.push(
      [
        'Mois', 'Libellé', 'Plage', 'Fiches', 'Validées', 'Soumises',
        'Ouvrages', 'TEP%', 'TEF%', 'Écart', 'ΔTEP', 'ΔTEF', 'Critiques',
      ]
        .map(escapeCsvCell)
        .join(';')
    );
    for (const m of model.monthlySummaries) {
      lines.push(
        [
          m.periodKey, m.label, m.dateRange, m.reportsCount, m.validatedCount, m.submittedCount,
          m.uniqueProjectsCount, m.averageTep, m.averageTef, m.averageGap,
          formatDeltaShort(m.tepDeltaVsPrev), formatDeltaShort(m.tefDeltaVsPrev), m.criticalConstraintsCount,
        ]
          .map(escapeCsvCell)
          .join(';')
      );
    }
    lines.push('');
    lines.push('# SECTION 3 — SYNTHÈSE PAR PROVINCE');
    lines.push(
      [
        'Province', 'Territoires', 'Ouvrages', 'EP', 'CS', 'BA',
        'Achevés', 'En cours', 'Arrêt', 'Non dém.', 'TEP%', 'TEF%', 'Écart', 'RT OK', 'RP OK', 'RD OK', 'Critiques',
      ]
        .map(escapeCsvCell)
        .join(';')
    );
    for (const p of model.byProvince) {
      lines.push(
        [
          p.province, p.territoriesCount, p.totalProjects, p.epCount, p.csCount, p.baCount,
          p.completed, p.inProgress, p.stopped, p.notStarted, p.averageTep, p.averageTef, p.averageGap,
          p.rtOk, p.rpOk, p.rdOk, p.criticalConstraintsCount,
        ]
          .map(escapeCsvCell)
          .join(';')
      );
    }
  } else {
    suffix = 'Contraintes_Receptions';
    lines.push(
      [
        'N° Matrice', 'Ouvrage', 'Province', 'Territoire', 'Entreprise', 'Statut',
        'TEP%', 'TEF%', 'Écart', 'Alerte >10', 'Critique', 'Contraintes',
        'Impacts', 'Mesures correctives', 'Échéance RD', 'Délai', 'RT', 'RP', 'RD',
      ]
        .map(escapeCsvCell)
        .join(';')
    );
    for (const r of model.rows) {
      lines.push(
        [
          r.matrixNumber, r.projectName, r.province, r.territory, r.contractor,
          WORK_STATUS_CONCISE[r.currentStatus], r.currentTep, r.currentTef, r.currentGap,
          r.isGapAlert ? 'OUI' : 'Non', r.hasCriticalConstraint ? 'OUI' : 'Non',
          r.latestConstraintsSummary, r.latestImpactsSummary, r.correctiveMeasures,
          formatDateFr(r.definitiveReceptionDeadline),
          r.isDeadlineOverdue ? 'DÉPASSÉE' : r.receptions.rd.status === 'OK' ? 'RD OK' : 'En délai',
          formatReceptionCell(r.receptions.rt),
          formatReceptionCell(r.receptions.rp),
          formatReceptionCell(r.receptions.rd),
        ]
          .map(escapeCsvCell)
          .join(';')
      );
    }
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const bytes = new TextEncoder().encode(csvContent);
  const fileName = `BCECO_PDL145T_${suffix}_${safeFileSlug(model.params.periodLabel)}_${generatedAt.slice(0, 10)}.csv`;

  return {
    bytes,
    fileName,
    mimeType: 'text/csv;charset=utf-8',
  };
}

// ============================================================================
// 3. PDF CONSOLIDÉ COMPLET (Paysage A4 — Synthèses, Géographie, Contraintes, Réceptions & Annexes)
// ============================================================================
export function buildConsolidatedPdfBuffer(ctx: ExportBuildContext): BuiltExportArtifact {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const { kpis } = model;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const drawSectionHeading = (title: string, y: number): number => {
    doc.setTextColor(15, 37, 68);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(pdfSafeText(title), 14, y);
    return y + 3;
  };

  // --- Page 1 : Bandeau institutionnel + Synthèse Exécutive + Synthèses Hebdo & Mensuelle ---
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(pdfSafeText('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — PROGRAMME PDL-145T (BCECO)'), 14, 9.5);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafeText(model.title), 14, 16);
  doc.setFontSize(8);
  doc.text(
    pdfSafeText(
      `Périodicité : ${PERIODICITY_LABELS[model.params.periodicity]}  |  Périmètre : ${
        model.params.dataScope === 'VALIDES_UNIQUEMENT' ? 'Validées uniquement' : 'Soumises + Validées'
      }  |  Généré le ${formatDateTimeFr(generatedAt)} par ${generatedByName}`
    ),
    14,
    22
  );

  let yPos = 30.5;
  if (isDemoData) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(14, yPos, 269, 6.5, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafeText(DEMO_BANNER_TEXT), 17, yPos + 4.4);
    yPos += 10.5;
  }

  yPos = drawSectionHeading('1. SYNTHÈSE EXÉCUTIVE, INDICATEURS CLÉS & CONTRÔLES DE VALIDATION SOURCE', yPos);

  autoTable(doc, {
    startY: yPos,
    head: [
      pdfSafeRow([
        'Ouvrages',
        'Fiches période (Val. / Soum.)',
        'Achevés / En cours',
        'Arrêt / Non dém.',
        'TEP Moyen (vs Réf.)',
        'TEF Moyen (vs Réf.)',
        'Écart Moyen',
        'RT / RP / RD OK',
        'Écarts >10 / Critiques',
        'Contrôles source',
      ]),
    ],
    body: [
      pdfSafeRow([
        String(kpis.totalProjects),
        `${kpis.reportsCount} (${kpis.validatedReportsCount} / ${kpis.submittedOnlyReportsCount})`,
        `${kpis.completed} (${formatPercentFr(kpis.completionRatePercent, 0)}) / ${kpis.inProgress}`,
        `${kpis.stopped} / ${kpis.notStarted}`,
        `${formatPercentFr(kpis.averageTep, 1)} (${formatDeltaShort(kpis.tepProgressionVsBaseline)})`,
        `${formatPercentFr(kpis.averageTef, 1)} (${formatDeltaShort(kpis.tefProgressionVsBaseline)})`,
        formatSignedGapFr(kpis.averageGap),
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk}`,
        `${kpis.gapAlertsCount} / ${kpis.criticalConstraintsCount}`,
        `${model.validationChecks.filter((c) => c.status === 'PASS').length}/${model.validationChecks.length} OK`,
      ]),
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7.2, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  yPos = getLastTableY(doc, yPos + 16) + 4.5;
  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    pdfSafeText(
      `Filtres actifs : ${model.filtersSummary}  |  Couverture : ${kpis.provincesCount} province(s), ${kpis.territoriesCount} territoire(s)  |  Effectifs mobilisés : ${kpis.totalWorkforce} (${kpis.totalSkilledWorkers} qualifiés, ${kpis.totalLaborers} manœuvres).`
    ),
    14,
    yPos
  );
  yPos += 6;

  // Section 2 : Synthèses Hebdomadaire & Mensuelle
  yPos = drawSectionHeading('2. SYNTHÈSES HEBDOMADAIRE ET MENSUELLE (ÉVOLUTION DES FICHES & TAUX TEP / TEF)', yPos);

  if (model.weeklySummaries.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [
        pdfSafeRow([
          'Semaine ISO',
          'Plage de dates',
          'Fiches (Val./Soum.)',
          'Ouvrages',
          'Achev./Cours/Arrêt',
          'TEP moy.',
          'TEF moy.',
          'Écart',
          'ΔTEP S-1',
          'ΔTEF S-1',
          'Critiques',
          'Effectifs',
        ]),
      ],
      body: model.weeklySummaries.map((w) =>
        pdfSafeRow([
          w.periodKey,
          w.dateRange,
          `${w.reportsCount} (${w.validatedCount}/${w.submittedCount})`,
          String(w.uniqueProjectsCount),
          `${w.completedCount} / ${w.inProgressCount} / ${w.stoppedCount}`,
          formatPercentFr(w.averageTep, 1),
          formatPercentFr(w.averageTef, 1),
          formatSignedGapFr(w.averageGap),
          formatDeltaShort(w.tepDeltaVsPrev),
          formatDeltaShort(w.tefDeltaVsPrev),
          String(w.criticalConstraintsCount),
          String(w.totalWorkforce),
        ])
      ),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7, cellPadding: 1.6 },
      margin: { left: 14, right: 14 },
    });
    yPos = getLastTableY(doc, yPos + 16) + 5;
  }

  if (model.monthlySummaries.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [
        pdfSafeRow([
          'Mois',
          'Plage de dates',
          'Fiches (Val./Soum.)',
          'Ouvrages',
          'Achev./Cours/Arrêt',
          'TEP moy.',
          'TEF moy.',
          'Écart',
          'ΔTEP M-1',
          'ΔTEF M-1',
          'RT/RP/RD OK',
          'Critiques',
        ]),
      ],
      body: model.monthlySummaries.map((m) =>
        pdfSafeRow([
          m.label,
          m.dateRange,
          `${m.reportsCount} (${m.validatedCount}/${m.submittedCount})`,
          String(m.uniqueProjectsCount),
          `${m.completedCount} / ${m.inProgressCount} / ${m.stoppedCount}`,
          formatPercentFr(m.averageTep, 1),
          formatPercentFr(m.averageTef, 1),
          formatSignedGapFr(m.averageGap),
          formatDeltaShort(m.tepDeltaVsPrev),
          formatDeltaShort(m.tefDeltaVsPrev),
          `${m.rtOkCount}/${m.rpOkCount}/${m.rdOkCount}`,
          String(m.criticalConstraintsCount),
        ])
      ),
      theme: 'striped',
      headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7, cellPadding: 1.6 },
      margin: { left: 14, right: 14 },
    });
  }

  // --- Page 2 : Ventilation Géographique & Types d'Ouvrages ---
  doc.addPage();
  let yGeo = drawSectionHeading('3. VENTILATION GÉOGRAPHIQUE (PROVINCES & TERRITOIRES) ET PAR TYPE D’OUVRAGE', 16);

  autoTable(doc, {
    startY: yGeo,
    head: [
      pdfSafeRow([
        'Province',
        'Terr.',
        'Total',
        'EP / CS / BA',
        'Achevés',
        'En cours',
        'Arrêt',
        'Non dém.',
        'TEP moy.',
        'TEF moy.',
        'Écart',
        'RT / RP / RD',
        'Écarts >10',
        'Critiques',
      ]),
    ],
    body: [
      ...model.byProvince.map((p) =>
        pdfSafeRow([
          p.province,
          String(p.territoriesCount),
          String(p.totalProjects),
          `${p.epCount} / ${p.csCount} / ${p.baCount}`,
          String(p.completed),
          String(p.inProgress),
          String(p.stopped),
          String(p.notStarted),
          formatPercentFr(p.averageTep, 1),
          formatPercentFr(p.averageTef, 1),
          formatSignedGapFr(p.averageGap),
          `${p.rtOk} / ${p.rpOk} / ${p.rdOk}`,
          String(p.gapAlertsCount),
          String(p.criticalConstraintsCount),
        ])
      ),
      pdfSafeRow([
        'TOTAL / CONTRÔLES',
        String(kpis.territoriesCount),
        String(kpis.totalProjects),
        `${model.byInfrastructureType[0].totalProjects} / ${model.byInfrastructureType[1].totalProjects} / ${model.byInfrastructureType[2].totalProjects}`,
        String(kpis.completed),
        String(kpis.inProgress),
        String(kpis.stopped),
        String(kpis.notStarted),
        formatPercentFr(kpis.averageTep, 1),
        formatPercentFr(kpis.averageTef, 1),
        formatSignedGapFr(kpis.averageGap),
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk}`,
        String(kpis.gapAlertsCount),
        String(kpis.criticalConstraintsCount),
      ]),
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.7 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === model.byProvince.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    margin: { left: 14, right: 14 },
  });

  yGeo = getLastTableY(doc, yGeo + 40) + 7;
  yGeo = drawSectionHeading('3.B RÉPARTITION PAR TYPE D’OUVRAGE (ÉCOLES PRIMAIRES, CENTRES DE SANTÉ, BÂTIMENTS ADMINISTRATIFS)', yGeo);

  autoTable(doc, {
    startY: yGeo,
    head: [
      pdfSafeRow([
        'Type d’ouvrage',
        'Nombre',
        'Part (%)',
        'Achevés',
        'En cours',
        'À l’arrêt',
        'Non dém.',
        'TEP moy.',
        'TEF moy.',
        'Écart moy.',
        'RT / RP / RD OK',
        'Critiques',
      ]),
    ],
    body: model.byInfrastructureType.map((t) =>
      pdfSafeRow([
        t.label,
        String(t.totalProjects),
        formatPercentFr(t.sharePercent, 1),
        String(t.completed),
        String(t.inProgress),
        String(t.stopped),
        String(t.notStarted),
        formatPercentFr(t.averageTep, 1),
        formatPercentFr(t.averageTef, 1),
        formatSignedGapFr(t.averageGap),
        `${t.rtOk} / ${t.rpOk} / ${t.rdOk}`,
        String(t.criticalConstraintsCount),
      ])
    ),
    theme: 'grid',
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.7 },
    margin: { left: 14, right: 14 },
  });

  // --- Page 3 : Contraintes (4 typologies) + Alertes & Mesures correctives ---
  doc.addPage();
  let yConst = drawSectionHeading('4. ANALYSE DES CONTRAINTES (4 TYPOLOGIES BCECO), ÉCARTS |TEP − TEF| > 10 PTS & MESURES CORRECTIVES', 16);

  autoTable(doc, {
    startY: yConst,
    head: [pdfSafeRow(['Typologie officielle', 'Ouvrages touchés', 'Part (%)', 'Critiques', 'À l’arrêt', 'Nature des contraintes'])],
    body: model.constraintsBreakdown.map((c) =>
      pdfSafeRow([
        `${c.number}) ${c.label}`,
        String(c.projectsCount),
        formatPercentFr(c.shareOfConstrainedPercent, 1),
        String(c.criticalCount),
        String(c.stoppedCount),
        c.examples,
      ])
    ),
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.6 },
    margin: { left: 14, right: 14 },
  });

  yConst = getLastTableY(doc, yConst + 30) + 6;
  if (model.flaggedRows.length > 0) {
    autoTable(doc, {
      startY: yConst,
      head: [
        pdfSafeRow([
          'N°',
          'Ouvrage & Localisation',
          'TEP / TEF (Écart)',
          'Critique',
          'Contraintes & Impacts',
          'Mesures correctives & Responsable',
        ]),
      ],
      body: model.flaggedRows.map((r) =>
        pdfSafeRow([
          r.matrixNumber,
          `${r.projectName}\n${r.province} - ${r.territory} (${r.contractor})`,
          `${r.currentTep}% / ${r.currentTef}%\n(${formatSignedGapFr(r.currentGap)})`,
          r.hasCriticalConstraint ? 'OUI' : 'Non',
          `${r.latestConstraintsSummary || 'Écart > 10 pts'}\nImpact : ${r.latestImpactsSummary}`,
          `${r.correctiveMeasures}\n[Resp. : ${r.actionOwner}]`,
        ])
      ),
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27], textColor: 255, fontSize: 7.1 },
      bodyStyles: { fontSize: 6.9, cellPadding: 1.6 },
      margin: { left: 14, right: 14 },
    });
  }

  // --- Page 4 : Suivi des Réceptions RT / RP / RD & Échéances Contractuelles ---
  doc.addPage();
  const yRec = drawSectionHeading('5. SUIVI DES RÉCEPTIONS (RT / RP / RD), RÉFÉRENCES PV ET ÉCHÉANCES CONTRACTUELLES', 16);

  autoTable(doc, {
    startY: yRec,
    head: [
      pdfSafeRow([
        'N°',
        'Ouvrage & Province',
        'Entreprise',
        'Statut / TEP',
        'Échéance RD',
        'Situation délai',
        'RT',
        'RP',
        'RD',
        'Réserves / PV',
      ]),
    ],
    body: model.rows.map((r) => {
      const delayText =
        r.receptions.rd.status === 'OK'
          ? 'RD OK'
          : r.isDeadlineOverdue
          ? `Dépassée (${Math.abs(r.daysToDeadline ?? 0)} j)`
          : r.daysToDeadline !== null
          ? `J-${r.daysToDeadline}`
          : '-';
      const reserves =
        [r.receptions.rt.reserves, r.receptions.rp.reserves, r.receptions.rd.reserves]
          .filter(Boolean)
          .join(' | ') || 'Aucune réserve';
      return pdfSafeRow([
        r.matrixNumber,
        `${r.projectName}\n${r.province} - ${r.territory}`,
        r.contractor,
        `${WORK_STATUS_CONCISE[r.currentStatus]} (${r.currentTep}%)`,
        formatDateFr(r.definitiveReceptionDeadline),
        delayText,
        formatReceptionCell(r.receptions.rt),
        formatReceptionCell(r.receptions.rp),
        formatReceptionCell(r.receptions.rd),
        reserves,
      ]);
    }),
    theme: 'striped',
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.7, cellPadding: 1.5 },
    margin: { left: 14, right: 14 },
  });

  // --- Annexe 1 : Matrice Détaillée des Ouvrages ---
  doc.addPage();
  const yMat = drawSectionHeading('ANNEXE 1. MATRICE DÉTAILLÉE DES OUVRAGES (HARMONISÉE MATRICE UNIQUE BCECO / PDL-145T)', 16);

  autoTable(doc, {
    startY: yMat,
    head: [
      pdfSafeRow([
        'N°',
        'Province / Territoire',
        'Type & Nom de l’ouvrage',
        'Entreprise',
        'Statut',
        'Niveau',
        'TEP%',
        'TEF%',
        'Écart',
        'Contraintes & Impacts',
        'RT / RP / RD',
      ]),
    ],
    body: [
      ...model.rows.map((r) =>
        pdfSafeRow([
          r.matrixNumber,
          `${r.province}\n${r.territory}`,
          `[${INFRASTRUCTURE_TYPE_SHORT[r.infrastructureType]}] ${r.projectName}`,
          r.contractor,
          WORK_STATUS_CONCISE[r.currentStatus],
          formatExecutionStagesShort(r.latestExecutionStages),
          formatPercentFr(r.currentTep, 0),
          formatPercentFr(r.currentTef, 0),
          formatSignedGapFr(r.currentGap),
          r.latestConstraintsSummary || 'Aucune',
          `RT:${r.receptions.rt.status} | RP:${r.receptions.rp.status} | RD:${r.receptions.rd.status}`,
        ])
      ),
      pdfSafeRow([
        'TOTAL',
        `${kpis.provincesCount} prov. / ${kpis.territoriesCount} terr.`,
        `${kpis.totalProjects} ouvrages consolidés`,
        `${model.byContractor.length} PME`,
        `${kpis.completed} ach. / ${kpis.inProgress} cours`,
        '',
        formatPercentFr(kpis.averageTep, 1),
        formatPercentFr(kpis.averageTef, 1),
        formatSignedGapFr(kpis.averageGap),
        `${kpis.criticalConstraintsCount} critiques | ${kpis.gapAlertsCount} écarts >10`,
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk} OK`,
      ]),
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.7, textColor: [15, 23, 42], cellPadding: 1.5 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === model.rows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 28 },
      2: { cellWidth: 44 },
      3: { cellWidth: 32 },
      4: { cellWidth: 18 },
      5: { cellWidth: 21 },
      6: { cellWidth: 13, halign: 'right' },
      7: { cellWidth: 13, halign: 'right' },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 42 },
      10: { cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  });

  // --- Annexe 2 : Feuille de Route Multi-Chantiers (10 colonnes officielles Page 3) ---
  doc.addPage();
  const yRoad = drawSectionHeading('ANNEXE 2. FEUILLE DE ROUTE & SYNTHÈSE MULTI-CHANTIERS (MODÈLE OFFICIEL PAGE 3)', 16);

  autoTable(doc, {
    startY: yRoad,
    head: [pdfSafeRow(FEUILLE_DE_ROUTE_10_HEADERS)],
    body: model.rows.map((r) => pdfSafeRow(consolidatedRowToRoadmap10(r))),
    theme: 'grid',
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 6.9 },
    bodyStyles: { fontSize: 6.6, cellPadding: 1.5 },
    margin: { left: 12, right: 12 },
  });

  const roadEndY = getLastTableY(doc, 180) + 5;
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[0]), 12, Math.min(roadEndY, 193));
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[1]), 12, Math.min(roadEndY + 3.8, 197));

  // Page numbering footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText(
        `Assistant de Fiche Terrain — ${INSTITUTION_REF}${isDemoData ? ' (MODE DÉMONSTRATION)' : ''} — Généré le ${formatDateTimeFr(generatedAt)}`
      ),
      14,
      204
    );
    doc.text(`Page ${i} / ${totalPages}`, 270, 204);
  }

  const arrayBuf = doc.output('arraybuffer');
  const fileName = `BCECO_PDL145T_${safeFileSlug(model.params.periodicity)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.pdf`;

  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: 'application/pdf',
    pageCount: totalPages,
  };
}

// ============================================================================
// 4. ANNEXE TERRAIN — FEUILLE DE ROUTE MULTI-CHANTIERS (PDF Autonome)
// ============================================================================
export function buildMultiSiteRoadmapPdfBuffer(ctx: ExportBuildContext): BuiltExportArtifact {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const provinceLabel = model.params.province || 'National (Toutes Provinces)';

  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 23, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    pdfSafeText('ANNEXE TERRAIN — FEUILLE DE ROUTE & SYNTHÈSE MULTI-CHANTIERS (BCECO / PDL-145T)'),
    14,
    9.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    pdfSafeText(
      `Zone : ${provinceLabel}${model.params.territory ? ` / ${model.params.territory}` : ''}  |  Période : ${model.params.periodLabel}  |  Coordonnateur : ${generatedByName}${
        isDemoData ? '  |  MODE DÉMONSTRATION' : ''
      }`
    ),
    14,
    17
  );

  autoTable(doc, {
    startY: 27,
    head: [pdfSafeRow(FEUILLE_DE_ROUTE_10_HEADERS)],
    body: model.rows.map((r) => pdfSafeRow(consolidatedRowToRoadmap10(r))),
    theme: 'grid',
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.6 },
    margin: { left: 12, right: 12 },
  });

  const finalY = getLastTableY(doc, 175) + 5.5;
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[0]), 12, Math.min(finalY, 193));
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[1]), 12, Math.min(finalY + 3.8, 197));

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText(
        `Annexe Terrain Feuille de Route — ${INSTITUTION_REF}${isDemoData ? ' (MODE DÉMONSTRATION)' : ''} — ${formatDateTimeFr(generatedAt)}`
      ),
      12,
      204
    );
    doc.text(`Page ${i} / ${totalPages}`, 272, 204);
  }

  const arrayBuf = doc.output('arraybuffer');
  const fileName = `Feuille_de_Route_Multi_Chantiers_${safeFileSlug(provinceLabel)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.pdf`;

  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: 'application/pdf',
    pageCount: totalPages,
  };
}

// ============================================================================
// 5. BROWSER DOWNLOAD HELPERS
// ============================================================================
export function triggerArtifactDownload(artifact: BuiltExportArtifact): void {
  const safeArray = new Uint8Array(artifact.bytes.byteLength);
  safeArray.set(artifact.bytes);
  const blob = new Blob([safeArray.buffer], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = artifact.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportConsolidatedExcel(ctx: ExportBuildContext): BuiltExportArtifact {
  const artifact = buildConsolidatedExcelBuffer(ctx);
  triggerArtifactDownload(artifact);
  return artifact;
}

export function exportConsolidatedCsv(
  ctx: ExportBuildContext,
  variant: CsvExportVariant = 'MATRICE_21'
): BuiltExportArtifact {
  const artifact = buildConsolidatedCsvBuffer(ctx, variant);
  triggerArtifactDownload(artifact);
  return artifact;
}

export function exportConsolidatedPdf(ctx: ExportBuildContext): BuiltExportArtifact {
  const artifact = buildConsolidatedPdfBuffer(ctx);
  triggerArtifactDownload(artifact);
  return artifact;
}

export interface AgentRoadmapPdfInput {
  province: string;
  territory: string;
  periodLabel: string;
  agentName: string;
  generatedAt: string;
  isDemoData: boolean;
  /** 10 cells per row, matching FEUILLE_DE_ROUTE_10_HEADERS */
  rows: string[][];
}

/** PDF Annexe Terrain généré depuis la saisie agent (mission itinérante). */
export function buildAgentMissionRoadmapPdfBuffer(input: AgentRoadmapPdfInput): BuiltExportArtifact {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const zone = input.territory
    ? `${input.province || '—'} / ${input.territory}`
    : input.province || 'Zone non précisée';

  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 23, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    pdfSafeText('ANNEXE TERRAIN — FEUILLE DE ROUTE & SYNTHÈSE MULTI-CHANTIERS (BCECO / PDL-145T)'),
    14,
    9.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    pdfSafeText(
      `Zone : ${zone}  |  Période : ${input.periodLabel}  |  Agent : ${input.agentName}${
        input.isDemoData ? '  |  MODE DÉMONSTRATION' : ''
      }`
    ),
    14,
    17
  );

  autoTable(doc, {
    startY: 27,
    head: [pdfSafeRow(FEUILLE_DE_ROUTE_10_HEADERS)],
    body: input.rows.map((r) => pdfSafeRow(r)),
    theme: 'grid',
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.6 },
    margin: { left: 12, right: 12 },
  });

  const finalY = getLastTableY(doc, 175) + 5.5;
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[0]), 12, Math.min(finalY, 193));
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[1]), 12, Math.min(finalY + 3.8, 197));

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText(
        `Annexe Terrain Feuille de Route — ${INSTITUTION_REF}${input.isDemoData ? ' (MODE DÉMONSTRATION)' : ''} — ${formatDateTimeFr(input.generatedAt)}`
      ),
      12,
      204
    );
    doc.text(`Page ${i} / ${totalPages}`, 272, 204);
  }

  const arrayBuf = doc.output('arraybuffer');
  return {
    bytes: new Uint8Array(arrayBuf),
    fileName: `Feuille_de_Route_Mission_${safeFileSlug(zone)}_${safeFileSlug(input.periodLabel)}_${input.generatedAt.slice(0, 10)}.pdf`,
    mimeType: 'application/pdf',
    pageCount: totalPages,
  };
}

export function exportAgentMissionRoadmapPdf(input: AgentRoadmapPdfInput): BuiltExportArtifact {
  const artifact = buildAgentMissionRoadmapPdfBuffer(input);
  triggerArtifactDownload(artifact);
  return artifact;
}

export function exportMultiSiteRoadmapPdf(ctx: ExportBuildContext): BuiltExportArtifact {
  const artifact = buildMultiSiteRoadmapPdfBuffer(ctx);
  triggerArtifactDownload(artifact);
  return artifact;
}

export function buildSingleReportPdfBuffer(
  report: FieldReport,
  project?: Project,
  options?: { generatedByName?: string; isDemoData?: boolean }
): BuiltExportArtifact {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  const generatedAt = new Date().toISOString();
  const generatedByName = options?.generatedByName || report.signature?.agentFullName || 'Agent de Suivi Terrain';
  const isDemo = options?.isDemoData ?? (report.isDemoData || (project ? project.isDemoData : true));

  const drawHeading = (title: string, y: number): number => {
    doc.setFillColor(15, 37, 68);
    doc.rect(marginX, y, contentWidth, 5.8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafeText(title), marginX + 3, y + 4.1);
    return y + 7.5;
  };

  // Header Banner
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(pdfSafeText('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — BCECO / PDL-145T'), marginX, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(pdfSafeText("FICHE DE SYNTHÈSE INSTANTANÉE D'OUVRAGE TERRAIN"), marginX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const statusLabel = REPORT_STATUS_LABELS[report.status] || report.status;
  doc.text(
    pdfSafeText(
      `Fiche N° : ${report.id}  |  Version : v${report.version}  |  Statut : ${statusLabel}  |  Édité le ${formatDateTimeFr(
        generatedAt
      )} par ${generatedByName}`
    ),
    marginX,
    20
  );

  let yPos = 29;

  if (isDemo) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(marginX, yPos, contentWidth, 5.5, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(pdfSafeText(DEMO_BANNER_TEXT), marginX + 3, yPos + 3.8);
    yPos += 8;
  }

  // 1. IDENTIFICATION ET DONNÉES CONTRACTUELLES
  yPos = drawHeading('1. IDENTIFICATION & LOCALISATION GÉOGRAPHIQUE DE L’OUVRAGE', yPos);

  const infraLabel =
    INFRASTRUCTURE_TYPE_LABELS[report.identification.infrastructureType] ||
    report.identification.infrastructureType;
  const contractStatusLabel =
    CONTRACT_STATUS_LABELS[report.identification.contractStatus] ||
    report.identification.contractStatus;

  const gpsString =
    report.identification.gpsLat && report.identification.gpsLng
      ? `${report.identification.gpsLat}, ${report.identification.gpsLng}${
          report.identification.gpsAccuracy ? ` (±${report.identification.gpsAccuracy} m)` : ''
        }`
      : 'Non renseignées';

  autoTable(doc, {
    startY: yPos,
    body: [
      pdfSafeRow(['Nom de l’ouvrage', report.identification.projectName, 'Type d’infrastructure', infraLabel]),
      pdfSafeRow(['N° Matrice Unique', report.identification.matrixNumber, 'Statut contractuel', contractStatusLabel]),
      pdfSafeRow([
        'Province / Territoire',
        `${report.identification.province} / ${report.identification.territory}`,
        'Secteur / Localité',
        `${report.identification.sectorChiefdom} — ${report.identification.locality || '—'}`,
      ]),
      pdfSafeRow([
        'Entreprise titulaire',
        report.identification.contractor || 'Non attribué',
        'Dates de contrat',
        `Démarrage: ${formatDateFr(report.identification.startDate)} | Échéance RD: ${formatDateFr(
          report.identification.definitiveReceptionDeadline
        )}`,
      ]),
      pdfSafeRow([
        'Coordonnées GPS',
        gpsString,
        'Période & Collecte',
        `${PERIODICITY_LABELS[report.periodicity] || report.periodicity} | Date: ${formatDateFr(
          report.identification.collectionDate
        )}${report.identification.weekNumber ? ` (${report.identification.weekNumber})` : ''}`,
      ]),
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 55 },
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 25) + 4;

  // 2. AVANCEMENT PHYSIQUE ET FINANCIER
  yPos = drawHeading('2. ÉTAT D’AVANCEMENT PHYSIQUE (TEP), FINANCIER (TEF) & EFFECTIFS', yPos);

  const workStatusLabel = WORK_STATUS_LABELS[report.progress.workStatus] || report.progress.workStatus;
  const gap = report.progress.tepTefGap;
  const isGapAlert = Math.abs(gap) > 10;
  const stagesFormatted = formatExecutionStagesShort(report.progress.executionStages);

  autoTable(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        'Statut actuel ouvrage',
        workStatusLabel,
        'Effectifs mobilisés',
        `${report.progress.skilledWorkersCount} qualifiés, ${report.progress.laborersCount} manœuvres | Ingénieur: ${
          report.progress.siteEngineerPresent ? 'Présent' : 'Absent'
        }`,
      ]),
      pdfSafeRow([
        'Taux Exécution Physique (TEP)',
        `${formatPercentFr(report.progress.currentTep)} (Précédent: ${formatPercentFr(report.progress.previousTep)})`,
        'Taux Exécution Financière (TEF)',
        `${formatPercentFr(report.progress.currentTef)} (Précédent: ${formatPercentFr(report.progress.previousTef)})`,
      ]),
      pdfSafeRow([
        'Écart TEP - TEF',
        `${formatSignedGapFr(gap)}${isGapAlert ? ' [ÉCART SIGNIFICATIF > 10%]' : ' [Conforme]'}`,
        'Étapes du chantier actives',
        stagesFormatted || 'Aucune étape déclarée',
      ]),
      pdfSafeRow([
        'Travaux exécutés période',
        { content: pdfSafeText(report.progress.periodWorksExecuted || 'Aucun travail majeur renseigné pour la période.'), colSpan: 3 },
      ]),
      ...(report.progress.gapJustification
        ? [
            pdfSafeRow([
              'Justification écart TEP-TEF',
              { content: pdfSafeText(report.progress.gapJustification), colSpan: 3 },
            ]),
          ]
        : []),
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 2 && data.column.index === 1 && isGapAlert) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 25) + 4;

  // 3. CONTRAINTES, ALERTES ET IMPACTS
  yPos = drawHeading('3. CONTRAINTES DU SITE, CRITICITÉ & IMPACTS OPÉRATIONNELS', yPos);

  const constraintCategoryLabels =
    report.constraints.categories
      .map((c) => CONSTRAINT_CATEGORIES.find((cat) => cat.id === c)?.label || c)
      .join(', ') || 'Aucune catégorie signalée';

  const impactFlags: string[] = [];
  if (report.constraints.impacts.delays) impactFlags.push('Retard de calendrier');
  if (report.constraints.impacts.costs) impactFlags.push('Surcoûts financiers');
  if (report.constraints.impacts.quality) impactFlags.push('Impact qualité / malfaçons');
  if (report.constraints.impacts.stoppage) impactFlags.push('Arrêt total de chantier');
  const impactsText = impactFlags.length > 0 ? impactFlags.join(' | ') : 'Aucun impact négatif majeur';

  const descriptionsText =
    report.constraints.detailedDescriptions.filter(Boolean).join(' ; ') ||
    'Aucune contrainte détaillée renseignée.';

  autoTable(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        'Niveau de criticité',
        report.constraints.isCritical ? 'CRITIQUE (Alerte rouge)' : 'Non critique (Mineure)',
        'Catégories de contraintes',
        constraintCategoryLabels,
      ]),
      pdfSafeRow([
        'Impacts opérationnels',
        impactsText,
        'Responsable d’action',
        report.constraints.actionOwner || 'Non assigné',
      ]),
      pdfSafeRow([
        'Descriptions détaillées',
        { content: pdfSafeText(descriptionsText), colSpan: 3 },
      ]),
      ...(report.constraints.correctiveMeasures || report.constraints.urgentActionsRequired
        ? [
            pdfSafeRow([
              'Mesures correctives & Actions',
              {
                content: pdfSafeText(
                  `Mesures: ${report.constraints.correctiveMeasures || '—'}\nActions requises: ${
                    report.constraints.urgentActionsRequired || '—'
                  }`
                ),
                colSpan: 3,
              },
            ]),
          ]
        : []),
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0 && data.column.index === 1 && report.constraints.isCritical) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 25) + 4;

  // 4. RÉCEPTIONS RT / RP / RD & OBSERVATIONS DU SITE
  if (yPos > 215) {
    doc.addPage();
    yPos = 14;
  }

  yPos = drawHeading('4. ÉTAT DES RÉCEPTIONS (RT / RP / RD) & OBSERVATIONS GÉNÉRALES DU SITE', yPos);

  autoTable(doc, {
    startY: yPos,
    head: [pdfSafeRow(['Type Réception', 'Statut', 'Date effective', 'N° Réf. PV', 'Réserves formulées'])],
    body: [
      pdfSafeRow([
        'Réception Technique (RT)',
        report.receptions.rt.status,
        formatDateFr(report.receptions.rt.date),
        report.receptions.rt.pvReference || '—',
        report.receptions.rt.reserves || 'Aucune réserve',
      ]),
      pdfSafeRow([
        'Réception Provisoire (RP)',
        report.receptions.rp.status,
        formatDateFr(report.receptions.rp.date),
        report.receptions.rp.pvReference || '—',
        report.receptions.rp.reserves || 'Aucune réserve',
      ]),
      pdfSafeRow([
        'Réception Définitive (RD)',
        report.receptions.rd.status,
        formatDateFr(report.receptions.rd.date),
        report.receptions.rd.pvReference || '—',
        report.receptions.rd.reserves || 'Aucune réserve',
      ]),
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 32 },
      4: { cellWidth: 66 },
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 22) + 2.5;

  autoTable(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        'Observations générales',
        { content: pdfSafeText(report.receptions.generalObservations || 'Aucune observation particulière.'), colSpan: 3 },
      ]),
      pdfSafeRow([
        'Gardiennage & État du site',
        `Gardiennage : ${report.receptions.guardingStatus || '—'}  |  État : ${report.receptions.siteCondition || '—'}`,
        'Contentieux & Fréquentation',
        `Contentieux : ${report.receptions.disputes || 'Aucun'}  |  Niveau : ${report.receptions.attendanceLevel || '—'}`,
      ]),
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 },
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 18) + 4;

  // 5. PHOTOGRAPHIES DU CHANTIER
  if (report.receptions.photos && report.receptions.photos.length > 0) {
    if (yPos > 210) {
      doc.addPage();
      yPos = 14;
    }

    yPos = drawHeading(`5. PHOTOGRAPHIES DU CHANTIER (${report.receptions.photos.length} VUES JOINTES)`, yPos);

    autoTable(doc, {
      startY: yPos,
      head: [pdfSafeRow(['N°', 'Fichier', 'Légende / Descriptif', 'Prise le', 'Statut'])],
      body: report.receptions.photos.map((ph, idx) =>
        pdfSafeRow([
          String(idx + 1),
          ph.fileName || `Photo_${idx + 1}`,
          ph.caption || 'Vue générale chantier',
          formatDateTimeFr(ph.capturedAt),
          ph.syncState === 'UPLOADED' ? 'Téléversée serveur' : 'Locale',
        ])
      ),
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, cellPadding: 1.4 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 38 },
        2: { cellWidth: 80 },
        3: { cellWidth: 32 },
        4: { cellWidth: 26 },
      },
      margin: { left: marginX, right: marginX },
    });

    yPos = getLastTableY(doc, yPos + 18) + 3;

    // Embed photo thumbnails if base64 dataUrl is valid
    const validPhotos = report.receptions.photos.filter((p) => p.dataUrl && p.dataUrl.startsWith('data:image/'));
    if (validPhotos.length > 0) {
      const thumbWidth = 42;
      const thumbHeight = 28;
      const spacingX = 4;
      const maxPerRow = 4;

      if (yPos + thumbHeight + 10 > pageHeight - 25) {
        doc.addPage();
        yPos = 14;
      }

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(pdfSafeText('Miniatures visuelles certifiées :'), marginX, yPos + 3);
      yPos += 5;

      validPhotos.slice(0, 4).forEach((ph, idx) => {
        const x = marginX + (idx % maxPerRow) * (thumbWidth + spacingX);
        try {
          const format = ph.dataUrl.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(ph.dataUrl, format, x, yPos, thumbWidth, thumbHeight);
          doc.setDrawColor(203, 213, 225);
          doc.rect(x, yPos, thumbWidth, thumbHeight, 'S');
        } catch {
          // Ignore invalid image payload in PDF renderer
        }
      });
      yPos += thumbHeight + 4;
    }
  }

  // 6. VALIDATION, SIGNATURE & CONTRÔLE COORDONNATEUR
  if (yPos > 215) {
    doc.addPage();
    yPos = 14;
  }

  yPos = drawHeading('6. SIGNATURE DE L’AGENT ENQUÊTEUR & DÉCISIONS DU COORDONNATEUR', yPos);

  const lastReview =
    report.reviews && report.reviews.length > 0 ? report.reviews[report.reviews.length - 1] : null;

  autoTable(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        'Agent enquêteur',
        `${report.signature.agentFullName || 'Non signé'} (${report.signature.agentFunction || 'Agent terrain'})`,
        'Contact & Horodatage',
        `Tél: ${report.signature.agentPhone || '—'}  |  Signé le: ${formatDateTimeFr(report.signature.signedAt)}`,
      ]),
      pdfSafeRow([
        'Dernière décision Coordonnateur',
        lastReview
          ? `${REPORT_STATUS_LABELS[lastReview.decision] || lastReview.decision} par ${
              lastReview.reviewerName
            } le ${formatDateTimeFr(lastReview.createdAt)}`
          : 'En attente de revue par le coordonnateur provincial',
        'Commentaire coordonnateur',
        lastReview?.comment ? lastReview.comment : 'Aucun commentaire enregistré.',
      ]),
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 },
    },
    margin: { left: marginX, right: marginX },
  });

  yPos = getLastTableY(doc, yPos + 18) + 3;

  if (report.signature.signatureDataUrl && report.signature.signatureDataUrl.startsWith('data:image/')) {
    if (yPos + 22 > pageHeight - 20) {
      doc.addPage();
      yPos = 14;
    }
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(pdfSafeText('Empreinte de signature électronique manuscrite :'), marginX, yPos + 3);
    try {
      doc.addImage(report.signature.signatureDataUrl, 'PNG', marginX, yPos + 4, 38, 14);
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, yPos + 4, 38, 14, 'S');
    } catch {
      // Ignore signature render failure
    }
  }

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText('BCECO / PDL-145T — Direction du Suivi-Évaluation — Fiche officielle certifiée'),
      marginX,
      pageHeight - 7
    );

    doc.text(
      pdfSafeText(`Page ${page} sur ${totalPages}`),
      pageWidth - marginX,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  const arrayBuf = doc.output('arraybuffer');
  const fileName = `Fiche_Synthese_${safeFileSlug(report.identification.matrixNumber || report.id)}_${safeFileSlug(
    report.identification.projectName
  )}_${safeFileSlug(report.identification.collectionDate || 'enquete')}.pdf`;

  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: 'application/pdf',
    pageCount: totalPages,
  };
}

export function exportSingleReportPdf(
  report: FieldReport,
  project?: Project,
  options?: { generatedByName?: string; isDemoData?: boolean }
): BuiltExportArtifact {
  const artifact = buildSingleReportPdfBuffer(report, project, options);
  triggerArtifactDownload(artifact);
  return artifact;
}

export async function buildPhotosZipArtifact(
  ctx: ExportBuildContext,
  reports: FieldReport[],
  projects: Project[]
): Promise<BuiltExportArtifact> {
  const zip = new JSZip();
  const folderName = `bceco_pdl145t_photos_hd_${safeFileSlug(ctx.model.params.periodLabel || 'national')}`;
  const rootFolder = zip.folder(folderName);

  const projectMap = new Map<string, Project>();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }

  let photoCount = 0;

  for (const r of reports) {
    if (r.status === 'BROUILLON') continue;
    const proj = projectMap.get(r.projectId);
    const province = safeFileSlug(proj?.province || 'province_inconnue');
    const matrixNo = safeFileSlug(proj?.matrixNumber || r.matrixNumber || r.projectId);
    const projectName = safeFileSlug(proj?.projectName || 'ouvrage');
    const projectFolder = rootFolder?.folder(province)?.folder(`${matrixNo}_${projectName}`);

    if (r.receptions?.photos && r.receptions.photos.length > 0) {
      for (let idx = 0; idx < r.receptions.photos.length; idx++) {
        const photo = r.receptions.photos[idx];
        if (!photo.dataUrl) continue;

        const matches = photo.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const mime = matches[1];
          const b64Data = matches[2];
          const ext = mime.includes('png') ? 'png' : 'jpg';
          const fileName = safeFileSlug(photo.fileName || `photo_${idx + 1}`);
          const photoFileName = `${String(idx + 1).padStart(2, '0')}_${fileName}.${ext}`;

          const binaryString = atob(b64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          projectFolder?.file(photoFileName, bytes);
          photoCount += 1;
        }
      }
    }
  }

  if (photoCount === 0) {
    rootFolder?.file('LISEZMOI.txt', 'Aucune photographie haute résolution n’est jointe aux fiches du périmètre sélectionné.');
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  const fileName = `BCECO_PDL145T_Photos_HD_${safeFileSlug(ctx.model.params.periodLabel || 'National')}.zip`;

  return {
    bytes: zipBytes,
    fileName,
    mimeType: 'application/zip',
  };
}

export async function exportPhotosZipArchive(
  ctx: ExportBuildContext,
  reports: FieldReport[],
  projects: Project[]
): Promise<BuiltExportArtifact> {
  const artifact = await buildPhotosZipArtifact(ctx, reports, projects);
  triggerArtifactDownload(artifact);
  return artifact;
}
