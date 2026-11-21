import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FilterX,
  Lock,
  Map,
  MapPin,
  Printer,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CONTRACT_STATUS_LABELS,
  DEMO_BANNER_TEXT,
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  INSTITUTION_REF,
  MATRICE_UNIQUE_HEADERS,
  PERIODICITY_LABELS,
  WORK_STATUS_CONCISE,
} from '../../domain/constants';
import {
  formatDateFr,
  formatDateTimeFr,
  formatExecutionStagesShort,
  formatIntegerFr,
  formatPercentFr,
  formatReceptionCell,
  formatSignedGapFr,
} from '../../domain/formatters';
import {
  buildConsolidatedReportModel,
  consolidatedRowToMatrix21,
  consolidatedRowToRoadmap10,
  extractAvailablePeriods,
  FEUILLE_DE_ROUTE_10_HEADERS,
  FEUILLE_DE_ROUTE_FOOTNOTES,
  MATRICE_UNIQUE_BLOC1_LABEL,
  MATRICE_UNIQUE_BLOC2_LABEL,
  normalizeReportMonthKey,
  normalizeReportWeekCode,
  type PeriodSummaryRow,
  type ReportingFilterParams,
} from '../../domain/reportingEngine';
import type { CsvExportVariant } from '../../services/export/reportExporter';
import type {
  ContractStatus,
  ExportFormat,
  GeneratedReportRecord,
  InfrastructureType,
  ReportDataScope,
  ReportPeriodicity,
  WorkStatus,
} from '../../types/domain';
import { WorkStatusText } from '../common/StatusBadge';

type PreviewTabId = 'SYNTHESIS' | 'GEOGRAPHY' | 'CONSTRAINTS' | 'RECEPTIONS' | 'ANNEXES';
type AnnexSubTabId = 'MATRIX_21' | 'ROADMAP_10' | 'REPORTS_LIST';

function formatDeltaBadge(delta: number | null): { text: string; toneClass: string } {
  if (delta === null) return { text: '—', toneClass: 'text-slate-400' };
  const formatted = Math.abs(delta).toFixed(1).replace('.', ',');
  if (delta > 0) return { text: `+${formatted} pts`, toneClass: 'text-emerald-700 font-semibold' };
  if (delta < 0) return { text: `-${formatted} pts`, toneClass: 'text-red-700 font-semibold' };
  return { text: '0,0 pt', toneClass: 'text-slate-500' };
}

export const ReportingEngineView: React.FC = () => {
  const {
    currentUser,
    projects,
    reports,
    generatedReports,
    exportOfficialReport,
    exportPhotosZip,
    redownloadGeneratedReport,
    pushToast,
  } = useApp();

  // Filter & Period Configuration State
  const [periodicity, setPeriodicity] = useState<ReportPeriodicity>('MENSUEL');
  const [periodKeyFilter, setPeriodKeyFilter] = useState<string>('');
  const [customPeriodLabel, setCustomPeriodLabel] = useState<string>('');
  const [dataScope, setDataScope] = useState<ReportDataScope>('VALIDES_UNIQUEMENT');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [territoryFilter, setTerritoryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'' | InfrastructureType>('');
  const [statusFilter, setStatusFilter] = useState<'' | WorkStatus>('');
  const [contractorFilter, setContractorFilter] = useState<string>('');
  const [contractStatusFilter, setContractStatusFilter] = useState<'' | ContractStatus>('');

  // UI Interaction State
  const [activeTab, setActiveTab] = useState<PreviewTabId>('SYNTHESIS');
  const [annexSubTab, setAnnexSubTab] = useState<AnnexSubTabId>('MATRIX_21');
  const [showValidationDetails, setShowValidationDetails] = useState<boolean>(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [downloadingArchiveId, setDownloadingArchiveId] = useState<string | null>(null);

  // Geographic & facet options derived from live database
  const provinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).sort((a, b) => a.localeCompare(b, 'fr')),
    [projects]
  );

  const territories = useMemo(() => {
    const source = provinceFilter ? projects.filter((p) => p.province === provinceFilter) : projects;
    return Array.from(new Set(source.map((p) => p.territory))).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [projects, provinceFilter]);

  const contractors = useMemo(() => {
    const source = projects.filter((p) => {
      if (provinceFilter && p.province !== provinceFilter) return false;
      if (territoryFilter && p.territory !== territoryFilter) return false;
      return true;
    });
    return Array.from(new Set(source.map((p) => p.contractor))).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [projects, provinceFilter, territoryFilter]);

  // Available weeks, months & days from actual database reports
  const availablePeriods = useMemo(
    () => extractAvailablePeriods(reports, dataScope),
    [reports, dataScope]
  );

  const periodOptions = useMemo(() => {
    if (periodicity === 'HEBDOMADAIRE') return availablePeriods.weeks;
    if (periodicity === 'MENSUEL') return availablePeriods.months;
    return availablePeriods.days;
  }, [periodicity, availablePeriods]);

  const activeParams: ReportingFilterParams = useMemo(
    () => ({
      periodicity,
      periodKeyFilter,
      periodLabel: customPeriodLabel.trim() || undefined,
      dataScope,
      province: provinceFilter,
      territory: territoryFilter,
      infrastructureType: typeFilter,
      contractor: contractorFilter,
      workStatus: statusFilter,
      contractStatus: contractStatusFilter,
    }),
    [
      periodicity,
      periodKeyFilter,
      customPeriodLabel,
      dataScope,
      provinceFilter,
      territoryFilter,
      typeFilter,
      contractorFilter,
      statusFilter,
      contractStatusFilter,
    ]
  );

  // Build full consolidated & validated model from database
  const model = useMemo(
    () => buildConsolidatedReportModel(projects, reports, activeParams),
    [projects, reports, activeParams]
  );

  const hasActiveFilters = Boolean(
    periodKeyFilter ||
      provinceFilter ||
      territoryFilter ||
      typeFilter ||
      statusFilter ||
      contractorFilter ||
      contractStatusFilter
  );

  const handleProvinceChange = (nextProv: string) => {
    setProvinceFilter(nextProv);
    setTerritoryFilter('');
    setContractorFilter('');
  };

  const handlePeriodicityChange = (next: ReportPeriodicity) => {
    setPeriodicity(next);
    setPeriodKeyFilter('');
    setCustomPeriodLabel('');
  };

  const handleResetFilters = () => {
    setPeriodKeyFilter('');
    setCustomPeriodLabel('');
    setProvinceFilter('');
    setTerritoryFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setContractorFilter('');
    setContractStatusFilter('');
  };

  const triggerExport = async (
    key: string,
    options: { format: ExportFormat; csvVariant?: CsvExportVariant; isRoadmap?: boolean }
  ) => {
    setExportingKey(key);
    try {
      const res = await exportOfficialReport({
        ...options,
        params: activeParams,
      });
      pushToast(
        'success',
        `Fichier ${options.format} téléchargé et archivé`,
        `${res.fileName} (${model.kpis.totalProjects} ouvrages · ${model.kpis.reportsCount} fiches)`
      );
    } catch (err) {
      pushToast(
        'error',
        `Échec de l’export ${options.format}`,
        err instanceof Error ? err.message : 'Erreur lors de la génération du document.'
      );
    } finally {
      setExportingKey(null);
    }
  };

  const handleExportPhotosZip = async () => {
    setExportingKey('PHOTOS_ZIP');
    try {
      const res = await exportPhotosZip(activeParams);
      pushToast('success', 'Archive ZIP des photos HD téléchargée', res.fileName);
    } catch (err) {
      pushToast(
        'error',
        'Échec de l’export des photos HD',
        err instanceof Error ? err.message : 'Erreur lors de la génération de l’archive.'
      );
    } finally {
      setExportingKey(null);
    }
  };

  const handleRedownload = async (record: GeneratedReportRecord) => {
    setDownloadingArchiveId(record.id);
    try {
      const res = await redownloadGeneratedReport(record);
      pushToast('success', 'Archive téléchargée', res.fileName);
    } catch (err) {
      pushToast(
        'error',
        'Échec du re-téléchargement',
        err instanceof Error ? err.message : 'Erreur lors de la récupération du rapport.'
      );
    } finally {
      setDownloadingArchiveId(null);
    }
  };

  // Strict defensive RBAC guard (mirrors backend HTTP 403 & Firestore security rules)
  if (!currentUser || currentUser.role !== 'COORDINATEUR') {
    return (
      <section className="bg-white border border-red-200 rounded-lg p-8 max-w-2xl mx-auto my-8 text-center space-y-3">
        <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-red-700" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Accès réservé exclusivement au Coordonnateur
        </h2>
        <p className="text-sm text-slate-600">
          Le Centre de Rapports Consolidés et la génération des exports officiels (Excel, CSV, PDF) sont strictement
          interdits aux Agents de Terrain conformément aux règles de gouvernance BCECO / PDL-145T.
        </p>
      </section>
    );
  }

  const passedChecksCount = model.validationChecks.filter((c) => c.status === 'PASS').length;
  const warningChecksCount = model.validationChecks.filter((c) => c.status === 'WARNING').length;
  const failedChecksCount = model.validationChecks.filter((c) => c.status === 'FAIL').length;

  return (
    <div className="space-y-5">
      {/* Page Title & Coordinator Lock Indicator */}
      <div className="flex flex-wrap items-start justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Centre de Rapports Consolidés &amp; Exports Officiels
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Synthèses hebdomadaires et mensuelles, filtres géographiques, suivi TEP/TEF, contraintes, réceptions RT/RP/RD et annexes conformes à la Matrice Unique BCECO / PDL-145T.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Accès Coordonnateur exclusif (RBAC serveur)</span>
        </div>
      </div>

      {/* PANEL 1: REPORT CONFIGURATION, GEOGRAPHIC FILTERS & EXPORT BAR */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#0F2544]" />
            <span>1. Périmètre, Période &amp; Filtres Géographiques</span>
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>

        {/* Row 1: Periodicity, Database Period Selector, Custom Label, Validation Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label htmlFor="rep-periodicity" className="block font-semibold text-slate-700 mb-1">
              Type de synthèse
            </label>
            <select
              id="rep-periodicity"
              value={periodicity}
              onChange={(e) => handlePeriodicityChange(e.target.value as ReportPeriodicity)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              <option value="MENSUEL">Rapport Mensuel Consolidé</option>
              <option value="HEBDOMADAIRE">Rapport Hebdomadaire Consolidé</option>
              <option value="JOURNALIER">Point Journalier Terrain</option>
            </select>
          </div>

          <div>
            <label htmlFor="rep-period-key" className="block font-semibold text-slate-700 mb-1">
              Période en base ({periodOptions.length} disponible{periodOptions.length > 1 ? 's' : ''})
            </label>
            <select
              id="rep-period-key"
              value={periodKeyFilter}
              onChange={(e) => {
                setPeriodKeyFilter(e.target.value);
                setCustomPeriodLabel('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              <option value="">Toutes les périodes (Situation cumulée)</option>
              {periodOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} — {opt.reportCount} fiche{opt.reportCount > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-label" className="block font-semibold text-slate-700 mb-1">
              Intitulé affiché sur le rapport
            </label>
            <input
              id="rep-label"
              type="text"
              placeholder={model.params.periodLabel}
              value={customPeriodLabel}
              onChange={(e) => setCustomPeriodLabel(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <div>
            <label htmlFor="rep-scope" className="block font-semibold text-slate-700 mb-1">
              Périmètre de validation
            </label>
            <select
              id="rep-scope"
              value={dataScope}
              onChange={(e) => {
                setDataScope(e.target.value as ReportDataScope);
                setPeriodKeyFilter('');
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              <option value="VALIDES_UNIQUEMENT">Fiches validées uniquement (Officiel)</option>
              <option value="SOUMIS_ET_VALIDES">Soumises + Validées (avec distinction)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Cascading Geographic Filters & Project Facets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="rep-prov" className="block font-semibold text-slate-700 mb-1">
              Province
            </label>
            <select
              id="rep-prov"
              value={provinceFilter}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Toutes ({provinces.length})</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-terr" className="block font-semibold text-slate-700 mb-1">
              Territoire
            </label>
            <select
              id="rep-terr"
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous ({territories.length})</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-type" className="block font-semibold text-slate-700 mb-1">
              Type d’ouvrage
            </label>
            <select
              id="rep-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as '' | InfrastructureType)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous (EP / CS / BA)</option>
              <option value="ECOLE_PRIMAIRE">{INFRASTRUCTURE_TYPE_LABELS.ECOLE_PRIMAIRE}</option>
              <option value="CENTRE_DE_SANTE">{INFRASTRUCTURE_TYPE_LABELS.CENTRE_DE_SANTE}</option>
              <option value="BATIMENT_ADMINISTRATIF">{INFRASTRUCTURE_TYPE_LABELS.BATIMENT_ADMINISTRATIF}</option>
            </select>
          </div>

          <div>
            <label htmlFor="rep-status" className="block font-semibold text-slate-700 mb-1">
              Statut travaux
            </label>
            <select
              id="rep-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | WorkStatus)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous statuts</option>
              <option value="ACHEVE">1) Achevé</option>
              <option value="EN_COURS">2) En cours</option>
              <option value="A_L_ARRET">3) À l’arrêt</option>
              <option value="NON_DEMARRE">4) Non démarré</option>
            </select>
          </div>

          <div>
            <label htmlFor="rep-contractor" className="block font-semibold text-slate-700 mb-1">
              Entreprise (PME)
            </label>
            <select
              id="rep-contractor"
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Toutes ({contractors.length})</option>
              {contractors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-contract" className="block font-semibold text-slate-700 mb-1">
              Statut contrat
            </label>
            <select
              id="rep-contract"
              value={contractStatusFilter}
              onChange={(e) => setContractStatusFilter(e.target.value as '' | ContractStatus)}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous contrats</option>
              <option value="CONTRAT_ACTIF">{CONTRACT_STATUS_LABELS.CONTRAT_ACTIF}</option>
              <option value="REATTRIBUE_ALE_PME">{CONTRACT_STATUS_LABELS.REATTRIBUE_ALE_PME}</option>
              <option value="CONTRAT_RESILIE">{CONTRACT_STATUS_LABELS.CONTRAT_RESILIE}</option>
            </select>
          </div>
        </div>

        {/* Row 3: Official Downloadable Exports Bar */}
        <div className="pt-3.5 border-t border-slate-200 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() => triggerExport('EXCEL', { format: 'EXCEL' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              {exportingKey === 'EXCEL' ? 'Génération…' : 'Excel Consolidé (.xlsx — 7 onglets)'}
            </span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() => triggerExport('PDF', { format: 'PDF' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingKey === 'PDF' ? 'Génération…' : 'PDF Consolidé Complet'}</span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() => triggerExport('CSV_MATRIX', { format: 'CSV', csvVariant: 'MATRICE_21' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingKey === 'CSV_MATRIX' ? 'Génération…' : 'CSV Matrice (21 col.)'}</span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() => triggerExport('CSV_SYNTH', { format: 'CSV', csvVariant: 'SYNTHESES_GEO' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingKey === 'CSV_SYNTH' ? 'Génération…' : 'CSV Synthèses & Géo'}</span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() =>
              triggerExport('CSV_CONST', { format: 'CSV', csvVariant: 'CONTRAINTES_RECEPTIONS' })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingKey === 'CSV_CONST' ? 'Génération…' : 'CSV Contraintes & Récept.'}</span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={() => triggerExport('ROADMAP', { format: 'PDF', isRoadmap: true })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
          >
            <Map className="w-3.5 h-3.5" />
            <span>{exportingKey === 'ROADMAP' ? 'Génération…' : 'Annexe Feuille de Route (PDF)'}</span>
          </button>

          <button
            type="button"
            disabled={exportingKey !== null || model.rows.length === 0}
            onClick={handleExportPhotosZip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-md hover:bg-indigo-800 disabled:opacity-50 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>{exportingKey === 'PHOTOS_ZIP' ? 'Compression ZIP…' : 'ZIP Photos HD (.zip)'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 ml-auto cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </section>

      {/* PANEL 2: SOURCE-STRUCTURE VALIDATION AUDIT BAR */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden no-print">
        <button
          type="button"
          onClick={() => setShowValidationDetails((prev) => !prev)}
          className="w-full px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-xs">
            {failedChecksCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span className="font-bold text-slate-900">
              Validation mathématique et structurelle contre les modèles sources BCECO / PDL-145T
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-800">
              {passedChecksCount}/{model.validationChecks.length} conformes
            </span>
            {warningChecksCount > 0 && (
              <span className="font-mono text-[11px] font-semibold text-amber-700">
                · {warningChecksCount} avertissement{warningChecksCount > 1 ? 's' : ''}
              </span>
            )}
            {failedChecksCount > 0 && (
              <span className="font-mono text-[11px] font-semibold text-red-700">
                · {failedChecksCount} anomalie{failedChecksCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-800">
            <span>{showValidationDetails ? 'Masquer le détail' : 'Inspecter les 11 contrôles'}</span>
            {showValidationDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showValidationDetails && (
          <div className="border-t border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                  <th className="py-2 px-4 font-semibold">Statut</th>
                  <th className="py-2 px-3 font-semibold">Contrôle de conformité source</th>
                  <th className="py-2 px-3 font-semibold">Attendu</th>
                  <th className="py-2 px-3 font-semibold">Calculé</th>
                  <th className="py-2 px-4 font-semibold">Interprétation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {model.validationChecks.map((chk) => (
                  <tr key={chk.code} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 whitespace-nowrap font-mono font-bold text-[11px]">
                      {chk.status === 'PASS' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CONFORME
                        </span>
                      ) : chk.status === 'WARNING' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ATTENTION
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ANOMALIE
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {chk.label}
                      <span className="block font-mono text-[10px] text-slate-400">{chk.code}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{chk.expected}</td>
                    <td className="py-2 px-3 font-mono text-[11px] font-semibold text-slate-900">
                      {chk.actual}
                    </td>
                    <td className="py-2 px-4 text-slate-600">{chk.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PANEL 3: LIVE STRUCTURED INSTITUTIONAL PREVIEW */}
      <section
        aria-label="Aperçu consolidé du rapport"
        className="bg-white border border-slate-300 rounded-lg overflow-hidden"
      >
        {/* Institutional Navy Banner */}
        <div className="bg-[#0F2544] text-white px-6 py-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-blue-200 uppercase">
              RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — {INSTITUTION_REF}
            </p>
            <h3 className="text-base sm:text-lg font-bold mt-0.5">{model.title}</h3>
            <p className="text-xs text-blue-100 mt-1">
              Périmètre :{' '}
              {dataScope === 'VALIDES_UNIQUEMENT'
                ? 'Fiches validées Coordonnateur uniquement (Officiel)'
                : `Fiches soumises + validées (${model.kpis.pendingOverlayProjectsCount} ouvrage(s) avec projection soumise non validée)`}{' '}
              · {model.filtersSummary}
            </p>
          </div>
          <div className="text-right text-[11px] text-blue-100 font-mono">
            <div>Réf. échéances : {formatDateFr(model.referenceDate)}</div>
            <div>{model.kpis.provincesCount} prov. · {model.kpis.territoriesCount} terr.</div>
          </div>
        </div>

        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-semibold text-amber-950">
          {DEMO_BANNER_TEXT}
        </div>

        {/* Executive KPI Strip */}
        <div className="p-5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCell
            label="Ouvrages consolidés"
            value={formatIntegerFr(model.kpis.totalProjects)}
            sub={`${model.kpis.projectsReportedInPeriod} couverts (${formatPercentFr(model.kpis.periodCoveragePercent, 0)})`}
          />
          <KpiCell
            label="Fiches reçues (période)"
            value={formatIntegerFr(model.kpis.reportsCount)}
            sub={`${model.kpis.validatedReportsCount} val. · ${model.kpis.submittedOnlyReportsCount} soum.`}
          />
          <KpiCell
            label="Statut chantiers"
            value={`${model.kpis.completed} ach. · ${model.kpis.inProgress} cours`}
            sub={`${model.kpis.stopped} arrêt · ${model.kpis.notStarted} non dém.`}
          />
          <KpiCell
            label="TEP moyen"
            value={formatPercentFr(model.kpis.averageTep, 1)}
            sub={`vs Réf. ${formatPercentFr(model.kpis.baselineAverageTep, 1)} (${formatDeltaBadge(model.kpis.tepProgressionVsBaseline).text})`}
          />
          <KpiCell
            label="TEF moyen & Écart"
            value={formatPercentFr(model.kpis.averageTef, 1)}
            sub={`Écart ${formatSignedGapFr(model.kpis.averageGap)} · ${model.kpis.gapAlertsCount} >10 pts`}
          />
          <KpiCell
            label="Réceptions OK"
            value={`RT ${model.kpis.rtOk} · RP ${model.kpis.rpOk} · RD ${model.kpis.rdOk}`}
            sub={`${model.kpis.overdueDeadlineCount} éch. dépassée(s) · ${model.kpis.criticalConstraintsCount} crit.`}
          />
        </div>

        {/* Segmented Preview Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex flex-wrap gap-1 no-print bg-white">
          {(
            [
              { id: 'SYNTHESIS', label: 'Synthèses Hebdo & Mensuelle', count: model.weeklySummaries.length + model.monthlySummaries.length },
              { id: 'GEOGRAPHY', label: 'Ventilation Géographique', count: model.byProvince.length },
              { id: 'CONSTRAINTS', label: 'Contraintes & Écarts TEP/TEF', count: model.flaggedRows.length },
              { id: 'RECEPTIONS', label: 'Réceptions (RT / RP / RD)', count: model.kpis.rtOk },
              { id: 'ANNEXES', label: 'Annexes (Matrice 21 col. & Fiches)', count: model.rows.length },
            ] as { id: PreviewTabId; label: string; count: number }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#0F2544] text-[#0F2544]'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1.5 font-mono text-[11px] text-slate-400">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* TAB BODY */}
        <div className="p-5 space-y-6 text-xs">
          {model.rows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">Aucun ouvrage ne correspond aux filtres sélectionnés.</p>
              <p>Modifiez ou réinitialisez les filtres géographiques ou de statut pour afficher la synthèse.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: WEEKLY & MONTHLY SUMMARIES + INFRASTRUCTURE TYPES */}
              {activeTab === 'SYNTHESIS' && (
                <div className="space-y-6">
                  <PeriodSummaryTable
                    title="A. Synthèse Hebdomadaire (évolution par semaine ISO)"
                    emptyLabel="Aucune fiche terrain dans ce périmètre pour la ventilation hebdomadaire."
                    rows={model.weeklySummaries}
                    deltaHeader="Δ vs S-1"
                  />

                  <PeriodSummaryTable
                    title="B. Synthèse Mensuelle (évolution mensuelle consolidée)"
                    emptyLabel="Aucune fiche terrain dans ce périmètre pour la ventilation mensuelle."
                    rows={model.monthlySummaries}
                    deltaHeader="Δ vs M-1"
                  />

                  {/* Breakdown by Infrastructure Type */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5">
                      C. Ventilation par type d’ouvrage (EP / CS / BA)
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Type d’ouvrage</th>
                            <th className="py-2 px-3 font-semibold text-right">Ouvrages</th>
                            <th className="py-2 px-3 font-semibold text-right">Part</th>
                            <th className="py-2 px-3 font-semibold text-right">Achevés</th>
                            <th className="py-2 px-3 font-semibold text-right">En cours</th>
                            <th className="py-2 px-3 font-semibold text-right">À l’arrêt</th>
                            <th className="py-2 px-3 font-semibold text-right">Non dém.</th>
                            <th className="py-2 px-3 font-semibold text-right">TEP moy.</th>
                            <th className="py-2 px-3 font-semibold text-right">TEF moy.</th>
                            <th className="py-2 px-3 font-semibold text-right">Écart</th>
                            <th className="py-2 px-3 font-semibold text-right">RT / RP / RD OK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          {model.byInfrastructureType.map((t) => (
                            <tr key={t.infrastructureType} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                                {t.label}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                {t.totalProjects}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">
                                {formatPercentFr(t.sharePercent, 1)}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-700">{t.completed}</td>
                              <td className="py-2 px-3 text-right text-blue-700">{t.inProgress}</td>
                              <td className="py-2 px-3 text-right text-red-700">{t.stopped}</td>
                              <td className="py-2 px-3 text-right text-slate-500">{t.notStarted}</td>
                              <td className="py-2 px-3 text-right font-semibold">{formatPercentFr(t.averageTep, 1)}</td>
                              <td className="py-2 px-3 text-right">{formatPercentFr(t.averageTef, 1)}</td>
                              <td className="py-2 px-3 text-right">{formatSignedGapFr(t.averageGap)}</td>
                              <td className="py-2 px-3 text-right">
                                {t.rtOk} / {t.rpOk} / {t.rdOk}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td className="py-2 px-3 font-sans">TOTAL / CONTRÔLES</td>
                            <td className="py-2 px-3 text-right">{model.kpis.totalProjects}</td>
                            <td className="py-2 px-3 text-right">100,0 %</td>
                            <td className="py-2 px-3 text-right">{model.kpis.completed}</td>
                            <td className="py-2 px-3 text-right">{model.kpis.inProgress}</td>
                            <td className="py-2 px-3 text-right">{model.kpis.stopped}</td>
                            <td className="py-2 px-3 text-right">{model.kpis.notStarted}</td>
                            <td className="py-2 px-3 text-right">{formatPercentFr(model.kpis.averageTep, 1)}</td>
                            <td className="py-2 px-3 text-right">{formatPercentFr(model.kpis.averageTef, 1)}</td>
                            <td className="py-2 px-3 text-right">{formatSignedGapFr(model.kpis.averageGap)}</td>
                            <td className="py-2 px-3 text-right">
                              {model.kpis.rtOk} / {model.kpis.rpOk} / {model.kpis.rdOk}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GEOGRAPHY (PROVINCES, TERRITORIES & CONTRACTORS) */}
              {activeTab === 'GEOGRAPHY' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0F2544]" />
                      <span>A. Synthèse consolidée par Province ({model.byProvince.length})</span>
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Province</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Terr.</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Total</th>
                            <th className="py-2 px-2.5 font-semibold text-right">EP / CS / BA</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Achev.</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Cours</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Arrêt</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEP%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEF%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Écart</th>
                            <th className="py-2 px-2.5 font-semibold text-right">RT/RP/RD</th>
                            <th className="py-2 px-3 font-semibold text-right">Critiques</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          {model.byProvince.map((p) => (
                            <tr key={p.province} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                                {p.province}
                              </td>
                              <td className="py-2 px-2.5 text-right text-slate-600">{p.territoriesCount}</td>
                              <td className="py-2 px-2.5 text-right font-bold text-slate-900">{p.totalProjects}</td>
                              <td className="py-2 px-2.5 text-right text-slate-600">
                                {p.epCount} / {p.csCount} / {p.baCount}
                              </td>
                              <td className="py-2 px-2.5 text-right text-emerald-700">{p.completed}</td>
                              <td className="py-2 px-2.5 text-right text-blue-700">{p.inProgress}</td>
                              <td className="py-2 px-2.5 text-right text-red-700">{p.stopped}</td>
                              <td className="py-2 px-2.5 text-right font-semibold">{formatPercentFr(p.averageTep, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatPercentFr(p.averageTef, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatSignedGapFr(p.averageGap)}</td>
                              <td className="py-2 px-2.5 text-right">
                                {p.rtOk}/{p.rpOk}/{p.rdOk}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className={p.criticalConstraintsCount > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}>
                                  {p.criticalConstraintsCount}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td className="py-2 px-3 font-sans">TOTAL / CONTRÔLES</td>
                            <td className="py-2 px-2.5 text-right">{model.kpis.territoriesCount}</td>
                            <td className="py-2 px-2.5 text-right">{model.kpis.totalProjects}</td>
                            <td className="py-2 px-2.5 text-right">
                              {model.byInfrastructureType[0].totalProjects} / {model.byInfrastructureType[1].totalProjects} / {model.byInfrastructureType[2].totalProjects}
                            </td>
                            <td className="py-2 px-2.5 text-right">{model.kpis.completed}</td>
                            <td className="py-2 px-2.5 text-right">{model.kpis.inProgress}</td>
                            <td className="py-2 px-2.5 text-right">{model.kpis.stopped}</td>
                            <td className="py-2 px-2.5 text-right">{formatPercentFr(model.kpis.averageTep, 1)}</td>
                            <td className="py-2 px-2.5 text-right">{formatPercentFr(model.kpis.averageTef, 1)}</td>
                            <td className="py-2 px-2.5 text-right">{formatSignedGapFr(model.kpis.averageGap)}</td>
                            <td className="py-2 px-2.5 text-right">
                              {model.kpis.rtOk}/{model.kpis.rpOk}/{model.kpis.rdOk}
                            </td>
                            <td className="py-2 px-3 text-right">{model.kpis.criticalConstraintsCount}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Territory Table */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5">
                      B. Détail territorial par Territoire ({model.byTerritory.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Province / Territoire</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Ouvrages</th>
                            <th className="py-2 px-2.5 font-semibold text-right">EP / CS / BA</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Achev./Cours/Arrêt</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEP%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEF%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Écart</th>
                            <th className="py-2 px-2.5 font-semibold text-right">RT/RP/RD</th>
                            <th className="py-2 px-3 font-semibold text-right">Éch. dépassées</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          {model.byTerritory.map((t) => (
                            <tr key={`${t.province}-${t.territory}`} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans">
                                <span className="font-semibold text-slate-900">{t.territory}</span>
                                <span className="text-slate-500 ml-1.5 text-[11px]">({t.province})</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-semibold text-slate-900">
                                {t.totalProjects}
                              </td>
                              <td className="py-2 px-2.5 text-right text-slate-600">
                                {t.epCount} / {t.csCount} / {t.baCount}
                              </td>
                              <td className="py-2 px-2.5 text-right">
                                {t.completed} / {t.inProgress} / {t.stopped}
                              </td>
                              <td className="py-2 px-2.5 text-right font-semibold">{formatPercentFr(t.averageTep, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatPercentFr(t.averageTef, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatSignedGapFr(t.averageGap)}</td>
                              <td className="py-2 px-2.5 text-right">
                                {t.rtOk}/{t.rpOk}/{t.rdOk}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className={t.overdueCount > 0 ? 'text-red-700 font-semibold' : 'text-slate-400'}>
                                  {t.overdueCount}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Contractor Table */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5">
                      C. Performance par Entreprise attributaire ({model.byContractor.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Entreprise (PME)</th>
                            <th className="py-2 px-3 font-semibold">Provinces</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Lots</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Achev./Cours/Arrêt</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEP%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">TEF%</th>
                            <th className="py-2 px-2.5 font-semibold text-right">Écart</th>
                            <th className="py-2 px-2.5 font-semibold text-right">RD OK</th>
                            <th className="py-2 px-3 font-semibold text-right">Alertes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          {model.byContractor.map((c) => (
                            <tr key={c.contractor} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">{c.contractor}</td>
                              <td className="py-2 px-3 font-sans text-slate-600">{c.provinces.join(', ')}</td>
                              <td className="py-2 px-2.5 text-right font-bold">{c.totalProjects}</td>
                              <td className="py-2 px-2.5 text-right">
                                {c.completed} / {c.inProgress} / {c.stopped}
                              </td>
                              <td className="py-2 px-2.5 text-right font-semibold">{formatPercentFr(c.averageTep, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatPercentFr(c.averageTef, 1)}</td>
                              <td className="py-2 px-2.5 text-right">{formatSignedGapFr(c.averageGap)}</td>
                              <td className="py-2 px-2.5 text-right text-emerald-700">{c.rdOk}</td>
                              <td className="py-2 px-3 text-right text-red-700">
                                {c.criticalConstraintsCount} crit. · {c.gapAlertsCount} &gt;10
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONSTRAINTS (4 CATEGORIES) & TEP/TEF GAP ALERTS */}
              {activeTab === 'CONSTRAINTS' && (
                <div className="space-y-6">
                  {/* 4 Official Categories Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {model.constraintsBreakdown.map((cat) => (
                      <div
                        key={cat.category}
                        className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {cat.number}) {cat.label}
                          </span>
                          <span className="font-mono text-sm font-bold text-[#0F2544] tabular-nums">
                            {cat.projectsCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{cat.examples}</p>
                        <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-600">
                            Part : {formatPercentFr(cat.shareOfConstrainedPercent, 1)}
                          </span>
                          <span className={cat.criticalCount > 0 ? 'text-red-700 font-semibold' : 'text-slate-500'}>
                            {cat.criticalCount} crit. · {cat.stoppedCount} arrêt
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Impact Summary Row */}
                  <div className="flex flex-wrap items-center gap-6 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                    <span className="font-bold text-slate-800 uppercase text-[11px]">
                      Impacts opérationnels recensés :
                    </span>
                    <span className="font-mono">
                      Retards planning : <strong>{model.impactTotals.delays}</strong>
                    </span>
                    <span className="font-mono">
                      Surcoûts / Finances : <strong>{model.impactTotals.costs}</strong>
                    </span>
                    <span className="font-mono">
                      Qualité technique : <strong>{model.impactTotals.quality}</strong>
                    </span>
                    <span className="font-mono text-red-700">
                      Arrêt de chantier : <strong>{model.impactTotals.stoppage}</strong>
                    </span>
                  </div>

                  {/* Detailed Flagged Sites Table */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>
                        Registre détaillé des contraintes, écarts |TEP − TEF| &gt; 10 pts &amp; mesures correctives ({model.flaggedRows.length})
                      </span>
                    </h4>
                    {model.flaggedRows.length === 0 ? (
                      <p className="text-slate-500 py-4">
                        Aucune contrainte active ni écart TEP/TEF supérieur à 10 points sur ce périmètre.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-md">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                              <th className="py-2 px-3 font-semibold">N° &amp; Ouvrage</th>
                              <th className="py-2 px-3 font-semibold">TEP / TEF (Écart)</th>
                              <th className="py-2 px-3 font-semibold">Contraintes &amp; Impacts</th>
                              <th className="py-2 px-3 font-semibold">Mesures correctives &amp; Responsable</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {model.flaggedRows.map((r) => (
                              <tr key={r.projectId} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 align-top">
                                  <span className="font-mono font-bold text-[#0F2544] mr-1.5">
                                    {r.matrixNumber}
                                  </span>
                                  <span className="font-semibold text-slate-900">{r.projectName}</span>
                                  <span className="block text-[11px] text-slate-500 mt-0.5">
                                    {r.province} · {r.territory} · {r.contractor}
                                  </span>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                                    <WorkStatusText status={r.currentStatus} />
                                    {r.hasCriticalConstraint && (
                                      <span className="font-semibold text-red-700">· CRITIQUE</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap align-top">
                                  <div>
                                    {r.currentTep}% / {r.currentTef}%
                                  </div>
                                  <div
                                    className={`font-bold mt-0.5 ${
                                      r.isGapAlert ? 'text-red-700' : 'text-slate-600'
                                    }`}
                                  >
                                    {formatSignedGapFr(r.currentGap)}
                                  </div>
                                  {r.gapJustification && (
                                    <div className="font-sans text-[11px] text-slate-500 mt-1 max-w-[200px] whitespace-normal">
                                      {r.gapJustification}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 align-top max-w-[280px]">
                                  <div className="font-medium text-slate-900">
                                    {r.latestConstraintsSummary || 'Écart TEP/TEF > 10 pts'}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Impact : {r.latestImpactsSummary}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 align-top max-w-[280px]">
                                  <div>{r.correctiveMeasures}</div>
                                  {r.urgentActionsRequired && (
                                    <div className="text-[11px] text-red-800 font-medium mt-1">
                                      Urgence : {r.urgentActionsRequired}
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Responsable : <strong className="text-slate-700">{r.actionOwner}</strong>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: RECEPTIONS (RT / RP / RD) & CONTRACTUAL DEADLINES */}
              {activeTab === 'RECEPTIONS' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <KpiCell
                      label="Réception Technique (RT)"
                      value={`${model.kpis.rtOk} / ${model.kpis.totalProjects}`}
                      sub={`${formatPercentFr((model.kpis.rtOk / Math.max(1, model.kpis.totalProjects)) * 100, 1)}`}
                    />
                    <KpiCell
                      label="Réception Provisoire (RP)"
                      value={`${model.kpis.rpOk} / ${model.kpis.totalProjects}`}
                      sub={`${formatPercentFr((model.kpis.rpOk / Math.max(1, model.kpis.totalProjects)) * 100, 1)}`}
                    />
                    <KpiCell
                      label="Réception Définitive (RD)"
                      value={`${model.kpis.rdOk} / ${model.kpis.totalProjects}`}
                      sub={`${formatPercentFr((model.kpis.rdOk / Math.max(1, model.kpis.totalProjects)) * 100, 1)}`}
                    />
                    <KpiCell
                      label="Réceptions avec réserves"
                      value={String(model.kpis.receptionsWithReservesCount)}
                      sub="Levée de réserves à suivre"
                    />
                    <KpiCell
                      label="Échéances RD dépassées"
                      value={String(model.kpis.overdueDeadlineCount)}
                      sub={`Au ${formatDateFr(model.referenceDate)}`}
                    />
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                          <th className="py-2 px-3 font-semibold">N° &amp; Ouvrage</th>
                          <th className="py-2 px-3 font-semibold">Échéance RD</th>
                          <th className="py-2 px-3 font-semibold">Réception Technique (RT)</th>
                          <th className="py-2 px-3 font-semibold">Réception Provisoire (RP)</th>
                          <th className="py-2 px-3 font-semibold">Réception Définitive (RD)</th>
                          <th className="py-2 px-3 font-semibold">Séquence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {model.rows.map((r) => (
                          <tr key={r.projectId} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-[#0F2544] mr-1.5">
                                {r.matrixNumber}
                              </span>
                              <span className="font-semibold text-slate-900">{r.projectName}</span>
                              <span className="block text-[11px] text-slate-500">
                                {r.province} · {r.territory} · TEP {r.currentTep}%
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono whitespace-nowrap">
                              <div className="text-slate-900">{formatDateFr(r.definitiveReceptionDeadline)}</div>
                              {r.receptions.rd.status === 'OK' ? (
                                <span className="text-[11px] font-semibold text-emerald-700">Clôturé (RD OK)</span>
                              ) : r.isDeadlineOverdue ? (
                                <span className="text-[11px] font-semibold text-red-700">
                                  Dépassée ({Math.abs(r.daysToDeadline ?? 0)} j)
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  Dans {r.daysToDeadline ?? '—'} j
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{formatReceptionCell(r.receptions.rt)}</td>
                            <td className="py-2 px-3 text-slate-700">{formatReceptionCell(r.receptions.rp)}</td>
                            <td className="py-2 px-3 text-slate-700">{formatReceptionCell(r.receptions.rd)}</td>
                            <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                              {r.receptionsCoherent ? (
                                <span className="text-emerald-700 font-semibold">OK</span>
                              ) : (
                                <span className="text-red-700 font-bold">ANOMALIE</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: DETAILED ANNEXES (MATRICE 21 COL / FEUILLE DE ROUTE 10 COL / REPORTS) */}
              {activeTab === 'ANNEXES' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                      {(
                        [
                          { id: 'MATRIX_21', label: `Matrice Unique — 21 col. (${model.rows.length})` },
                          { id: 'ROADMAP_10', label: `Annexe Terrain — Feuille de Route & Synthèse Multi-Chantiers (10 col.)` },
                          { id: 'REPORTS_LIST', label: `Fiches Terrain Incluses (${model.periodReports.length})` },
                        ] as { id: AnnexSubTabId; label: string }[]
                      ).map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setAnnexSubTab(sub.id)}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            annexSubTab === sub.id
                              ? 'bg-[#0F2544] text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Structure officielle page 3 (BCECO / PDL-145T)</span>
                    </span>
                  </div>

                  {annexSubTab === 'MATRIX_21' && (
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-max min-w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#0F2544] text-white">
                            <th colSpan={9} className="py-1.5 px-3 font-semibold border-r border-blue-800">
                              {MATRICE_UNIQUE_BLOC1_LABEL}
                            </th>
                            <th colSpan={12} className="py-1.5 px-3 font-semibold bg-[#16325B]">
                              {MATRICE_UNIQUE_BLOC2_LABEL}
                            </th>
                          </tr>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                            {MATRICE_UNIQUE_HEADERS.map((hdr, idx) => (
                              <th key={idx} className="py-2 px-2.5 font-semibold whitespace-nowrap border-r border-slate-200 last:border-r-0">
                                {idx + 1}. {hdr}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {model.rows.map((row) => {
                            const cells = consolidatedRowToMatrix21(row);
                            return (
                              <tr key={row.projectId} className="hover:bg-slate-50">
                                {cells.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`py-2 px-2.5 border-r border-slate-100 last:border-r-0 max-w-[220px] truncate ${
                                      cIdx === 0
                                        ? 'font-mono font-bold text-[#0F2544]'
                                        : cIdx >= 12 && cIdx <= 14
                                        ? 'font-mono text-right tabular-nums'
                                        : 'text-slate-700'
                                    }`}
                                    title={String(cell)}
                                  >
                                    {cIdx === 12 || cIdx === 13
                                      ? `${cell} %`
                                      : cIdx === 14
                                      ? formatSignedGapFr(Number(cell))
                                      : String(cell)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td className="py-2 px-2.5 font-mono">TOTAL / CONTRÔLES</td>
                            <td className="py-2 px-2.5">{model.kpis.totalProjects} ouvrages</td>
                            <td className="py-2 px-2.5">{model.kpis.provincesCount} prov.</td>
                            <td className="py-2 px-2.5">{model.kpis.territoriesCount} terr.</td>
                            <td colSpan={5} className="py-2 px-2.5 text-slate-600">
                              EP {model.byInfrastructureType[0].totalProjects} · CS {model.byInfrastructureType[1].totalProjects} · BA {model.byInfrastructureType[2].totalProjects}
                            </td>
                            <td colSpan={3} className="py-2 px-2.5">
                              {model.kpis.completed} ach. · {model.kpis.inProgress} cours · {model.kpis.stopped} arrêt
                            </td>
                            <td className="py-2 px-2.5 font-mono text-right">{formatPercentFr(model.kpis.averageTep, 1)}</td>
                            <td className="py-2 px-2.5 font-mono text-right">{formatPercentFr(model.kpis.averageTef, 1)}</td>
                            <td className="py-2 px-2.5 font-mono text-right">{formatSignedGapFr(model.kpis.averageGap)}</td>
                            <td colSpan={2} className="py-2 px-2.5">{model.kpis.criticalConstraintsCount} critiques</td>
                            <td className="py-2 px-2.5 font-mono">RT {model.kpis.rtOk}</td>
                            <td className="py-2 px-2.5 font-mono">RP {model.kpis.rpOk}</td>
                            <td className="py-2 px-2.5 font-mono">RD {model.kpis.rdOk}</td>
                            <td className="py-2 px-2.5">{passedChecksCount}/{model.validationChecks.length} OK</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {annexSubTab === 'ROADMAP_10' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 border border-blue-200 rounded-md p-3">
                        <div>
                          <h4 className="font-bold text-[#0F2544] text-xs">
                            Annexe Terrain — Feuille de Route &amp; Synthèse Multi-Chantiers (10 colonnes)
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Vue consolidée des chantiers visités lors de la mission, préservant strictement les codes et intitulés officiels.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={exportingKey !== null || model.rows.length === 0}
                          onClick={() => triggerExport('ROADMAP', { format: 'PDF', isRoadmap: true })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] disabled:opacity-50 cursor-pointer shadow-xs min-h-[36px]"
                        >
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span>{exportingKey === 'ROADMAP' ? 'Génération…' : 'Télécharger la Feuille de Route PDF'}</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-md">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[#16325B] text-white">
                              {FEUILLE_DE_ROUTE_10_HEADERS.map((h, i) => (
                                <th key={i} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {model.rows.map((row) => {
                              const cells = consolidatedRowToRoadmap10(row);
                              return (
                                <tr key={row.projectId} className="hover:bg-slate-50">
                                  {cells.map((val, idx) => (
                                    <td
                                      key={idx}
                                      className={`py-2 px-2.5 align-top ${
                                        idx === 0
                                          ? 'font-mono font-bold text-[#0F2544] whitespace-nowrap'
                                          : idx === 5 || idx === 6
                                          ? 'font-mono text-right whitespace-nowrap'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {val}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>{FEUILLE_DE_ROUTE_FOOTNOTES[0]}</p>
                        <p>{FEUILLE_DE_ROUTE_FOOTNOTES[1]}</p>
                      </div>
                    </div>
                  )}

                  {annexSubTab === 'REPORTS_LIST' && (
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                            <th className="py-2 px-3 font-semibold">Fiche &amp; Version</th>
                            <th className="py-2 px-3 font-semibold">Ouvrage</th>
                            <th className="py-2 px-3 font-semibold">Agent &amp; Période</th>
                            <th className="py-2 px-3 font-semibold">Statut validation</th>
                            <th className="py-2 px-3 font-semibold text-right">TEP / TEF / Écart</th>
                            <th className="py-2 px-3 font-semibold">Niveau &amp; Effectifs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {model.periodReports.map((rep) => (
                            <tr key={rep.id} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-mono whitespace-nowrap">
                                <div className="font-semibold text-[#0F2544]">{rep.id}</div>
                                <div className="text-[11px] text-slate-500">
                                  v{rep.version} · {formatDateFr(rep.collectionDate)}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono text-blue-800 mr-1">{rep.matrixNumber}</span>
                                <span className="font-semibold text-slate-900">{rep.identification.projectName}</span>
                                <span className="block text-[11px] text-slate-500">
                                  [{INFRASTRUCTURE_TYPE_SHORT[rep.identification.infrastructureType]}] {rep.identification.province} · {rep.identification.territory}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="text-slate-900">{rep.agentName}</div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  {PERIODICITY_LABELS[rep.periodicity]} · {normalizeReportWeekCode(rep)} · {normalizeReportMonthKey(rep)}
                                </div>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {rep.status === 'VALIDE' ? (
                                  <span className="font-semibold text-emerald-700">Validé Coordonnateur</span>
                                ) : (
                                  <span className="font-semibold text-amber-700">
                                    Non validé ({rep.status})
                                  </span>
                                )}
                                {rep.potentialDuplicateOf.length > 0 && (
                                  <span className="block text-[11px] text-red-700">
                                    Doublon potentiel ({rep.potentialDuplicateOf.join(', ')})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums text-right whitespace-nowrap">
                                <div>
                                  {rep.progress.currentTep}% / {rep.progress.currentTef}%
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {formatSignedGapFr(rep.progress.tepTefGap)}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                <div>{formatExecutionStagesShort(rep.progress.executionStages)}</div>
                                <div>
                                  {(rep.progress.skilledWorkersCount || 0) + (rep.progress.laborersCount || 0)} pers.
                                </div>
                              </td>
                            </tr>
                          ))}
                          {model.periodReports.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500">
                                Aucune fiche terrain collectée sur cette période exacte (la matrice consolidée reflète le dernier état validé connu).
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* PANEL 4: ARCHIVE OF GENERATED OFFICIAL REPORTS WITH RE-DOWNLOAD */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden no-print">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-[#0F2544]" />
            <h3 className="text-sm font-bold text-slate-900">
              Historique &amp; Archives des Rapports Générés ({generatedReports.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Journalisés dans la piste d’audit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-semibold">Date &amp; Auteur</th>
                <th className="py-2.5 px-3 font-semibold">Intitulé &amp; Filtres</th>
                <th className="py-2.5 px-3 font-semibold">Format &amp; Périmètre</th>
                <th className="py-2.5 px-3 font-semibold text-right">Instantané KPI</th>
                <th className="py-2.5 px-4 font-semibold text-right">Fichier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {generatedReports.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-900">{formatDateTimeFr(rec.createdAt)}</div>
                    <div className="text-[11px] text-slate-500">{rec.generatedByName}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {PERIODICITY_LABELS[rec.periodicity]} · {rec.periodLabel} · {rec.filtersSummary}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-[#0F2544]">{rec.format}</span>
                    <span className="block text-[11px] text-slate-500">
                      {rec.dataScope === 'VALIDES_UNIQUEMENT' ? 'Validées uniquement' : 'Soumises + Validées'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="text-slate-900">
                      {rec.projectCount} ouv. · {rec.reportCount} fiches
                    </div>
                    <div className="text-[11px] text-slate-500">
                      TEP {formatPercentFr(rec.averageTep, 1)} · TEF {formatPercentFr(rec.averageTef, 1)}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={downloadingArchiveId !== null}
                      onClick={() => handleRedownload(rec)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {downloadingArchiveId === rec.id ? 'Téléchargement…' : 'Télécharger'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {generatedReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucun rapport consolidé archivé pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const KpiCell: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-md p-3">
    <div className="text-[11px] font-medium text-slate-500">{label}</div>
    <div className="text-sm font-bold font-mono text-slate-900 mt-1 tabular-nums">{value}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={sub}>{sub}</div>}
  </div>
);

const PeriodSummaryTable: React.FC<{
  title: string;
  emptyLabel: string;
  rows: PeriodSummaryRow[];
  deltaHeader: string;
}> = ({ title, emptyLabel, rows, deltaHeader }) => (
  <div>
    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2.5">{title}</h4>
    {rows.length === 0 ? (
      <p className="text-slate-500 py-3">{emptyLabel}</p>
    ) : (
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
              <th className="py-2 px-3 font-semibold">Période</th>
              <th className="py-2 px-2.5 font-semibold text-right">Fiches (Val./Soum.)</th>
              <th className="py-2 px-2.5 font-semibold text-right">Ouvrages</th>
              <th className="py-2 px-2.5 font-semibold text-right">Achev./Cours/Arrêt</th>
              <th className="py-2 px-2.5 font-semibold text-right">TEP moy.</th>
              <th className="py-2 px-2.5 font-semibold text-right">TEF moy.</th>
              <th className="py-2 px-2.5 font-semibold text-right">Écart</th>
              <th className="py-2 px-2.5 font-semibold text-right">{deltaHeader} (TEP / TEF)</th>
              <th className="py-2 px-2.5 font-semibold text-right">RT/RP/RD</th>
              <th className="py-2 px-3 font-semibold text-right">Critiques</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.map((row) => {
              const dTep = formatDeltaBadge(row.tepDeltaVsPrev);
              const dTef = formatDeltaBadge(row.tefDeltaVsPrev);
              return (
                <tr key={row.periodKey} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-sans">
                    <div className="font-semibold text-slate-900">{row.label}</div>
                    <div className="text-[11px] font-mono text-slate-500">{row.dateRange}</div>
                  </td>
                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{row.reportsCount}</span>
                    <span className="text-slate-500 ml-1 text-[11px]">
                      ({row.validatedCount}/{row.submittedCount})
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-right font-semibold">{row.uniqueProjectsCount}</td>
                  <td className="py-2 px-2.5 text-right">
                    {row.completedCount} / {row.inProgressCount} / {row.stoppedCount}
                  </td>
                  <td className="py-2 px-2.5 text-right font-semibold text-slate-900">
                    {formatPercentFr(row.averageTep, 1)}
                  </td>
                  <td className="py-2 px-2.5 text-right">{formatPercentFr(row.averageTef, 1)}</td>
                  <td className="py-2 px-2.5 text-right">{formatSignedGapFr(row.averageGap)}</td>
                  <td className="py-2 px-2.5 text-right whitespace-nowrap text-[11px]">
                    <span className={dTep.toneClass}>{dTep.text}</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className={dTef.toneClass}>{dTef.text}</span>
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    {row.rtOkCount}/{row.rpOkCount}/{row.rdOkCount}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={row.criticalConstraintsCount > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}>
                      {row.criticalConstraintsCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
