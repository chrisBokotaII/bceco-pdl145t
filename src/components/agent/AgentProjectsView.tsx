import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  FilePlus2,
  Lock,
  MapPin,
  RotateCcw,
  Search,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { fadeUp, staggerContainer, staggerFast } from '../../motion/presets';
import {
  CONTRACT_STATUS_LABELS,
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  WORK_STATUS_LABELS,
} from '../../domain/constants';
import {
  formatDateFr,
  formatDateTimeFr,
  formatExecutionStagesLabel,
  formatPercentFr,
  formatReceptionCell,
  formatSignedGapFr,
} from '../../domain/formatters';
import type { FieldReport, Project } from '../../types/domain';
import { ReportStatusText, WorkStatusText } from '../common/StatusBadge';
import type { AgentTab } from '../layout/AgentLayout';

interface Props {
  onStartNewReport: (project: Project) => void;
  onEditReport: (report: FieldReport) => void;
  onNavigateTab?: (tab: AgentTab) => void;
}

export const AgentProjectsView: React.FC<Props> = ({
  onStartNewReport,
  onEditReport,
  onNavigateTab,
}) => {
  const { projects, reports, localDrafts, syncQueue, lastCachedAt, activeDraftId, isOnline, dataLoading } = useApp();
  const reduced = usePrefersReducedMotion();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const recoverableDraft = useMemo(
    () => (activeDraftId ? localDrafts.find((d) => d.id === activeDraftId) ?? null : null),
    [activeDraftId, localDrafts]
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'ALL' && p.currentStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        p.matrixNumber.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.territory.toLowerCase().includes(q)
      );
    });
  }, [projects, search, statusFilter]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const returnedReports = useMemo(
    () => reports.filter((r) => r.status === 'RETOURNE'),
    [reports]
  );

  const validatedCount = useMemo(
    () => reports.filter((r) => r.status === 'VALIDE').length,
    [reports]
  );

  const avgTep = useMemo(
    () =>
      projects.length > 0
        ? Math.round((projects.reduce((s, p) => s + p.currentTep, 0) / projects.length) * 10) / 10
        : 0,
    [projects]
  );

  const distinctProvinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))),
    [projects]
  );

  if (selectedProject) {
    const projectReports = reports
      .filter((r) => r.projectId === selectedProject.id)
      .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
    const projectDrafts = localDrafts.filter((d) => d.projectId === selectedProject.id);
    const returnedForProject = projectReports.find((r) => r.status === 'RETOURNE');

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-950 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à mes chantiers affectés
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {returnedForProject && (
              <button
                type="button"
                onClick={() => onEditReport(returnedForProject)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700 min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                Corriger la fiche retournée
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartNewReport(selectedProject)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2544] text-white text-sm font-semibold rounded-md hover:bg-[#16325B] min-h-[44px]"
            >
              <FilePlus2 className="w-4 h-4" />
              Remplir une fiche terrain
            </button>
          </div>
        </div>

        {/* Project Header Card */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-[#0F2544]">{selectedProject.matrixNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{INFRASTRUCTURE_TYPE_LABELS[selectedProject.infrastructureType]}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedProject.province} / {selectedProject.territory}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedProject.projectName}</h2>
            </div>
            <WorkStatusText status={selectedProject.currentStatus} />
          </div>

          {/* Contractual Reference Info (Locked) */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Données contractuelles de référence (lecture seule — Registre Officiel)</span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Entreprise attributaire</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{selectedProject.contractor}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Statut contractuel</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{CONTRACT_STATUS_LABELS[selectedProject.contractStatus]}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Secteur / Chefferie · Localité</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {selectedProject.sectorChiefdom} · {selectedProject.locality}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Date de démarrage effectif</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{formatDateFr(selectedProject.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Échéance réception définitive</dt>
                <dd className="font-mono text-slate-900 mt-0.5">
                  {formatDateFr(selectedProject.definitiveReceptionDeadline)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Coordonnées de référence</dt>
                <dd className="font-mono text-slate-900 mt-0.5">
                  {selectedProject.referenceCoords.lat.toFixed(4)}, {selectedProject.referenceCoords.lng.toFixed(4)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Current Execution Snapshot */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5">
              <p className="text-xs text-slate-500">Avancement physique (TEP)</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatPercentFr(selectedProject.currentTep)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Réf. figée : <span className="font-mono">{formatPercentFr(selectedProject.baselineTep)}</span>
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5">
              <p className="text-xs text-slate-500">Avancement financier (TEF)</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatPercentFr(selectedProject.currentTef)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Réf. figée : <span className="font-mono">{formatPercentFr(selectedProject.baselineTef)}</span>
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5">
              <p className="text-xs text-slate-500">Écart observé (TEP − TEF)</p>
              <p
                className={`text-2xl font-bold font-mono mt-1 ${
                  Math.abs(selectedProject.currentGap) > 10 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {formatSignedGapFr(selectedProject.currentGap)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {Math.abs(selectedProject.currentGap) > 10 ? 'Seuil > 10 pts — Justification requise' : 'Écart dans la tolérance'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <p className="text-xs text-slate-500">Dernières réalisations enregistrées</p>
            <p className="text-slate-800">{selectedProject.latestPeriodRealization}</p>
            <p className="text-xs text-slate-500 pt-1">Étapes d’exécution validées</p>
            <p className="text-slate-800 text-xs">{formatExecutionStagesLabel(selectedProject.latestExecutionStages)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div>
                <span className="text-slate-500 block">Réception Technique (RT)</span>
                <span className="font-medium text-slate-900">{formatReceptionCell(selectedProject.receptions.rt)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Réception Provisoire (RP)</span>
                <span className="font-medium text-slate-900">{formatReceptionCell(selectedProject.receptions.rp)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Réception Définitive (RD)</span>
                <span className="font-medium text-slate-900">{formatReceptionCell(selectedProject.receptions.rd)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Local Drafts on this project */}
        {projectDrafts.length > 0 && (
          <section className="bg-white border border-amber-300 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Brouillons locaux sur cet ouvrage ({projectDrafts.length})
            </h3>
            <div className="divide-y divide-slate-200">
              {projectDrafts.map((draft) => (
                <div key={draft.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <p className="font-mono font-semibold text-slate-900">{draft.id}</p>
                    <p className="text-slate-600">
                      Modifié le {formatDateTimeFr(draft.updatedAt)} · TEP {formatPercentFr(draft.progress.currentTep, 0)} / TEF {formatPercentFr(draft.progress.currentTef, 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditReport(draft)}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 min-h-[40px]"
                  >
                    Reprendre le brouillon
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Historical Reports on this project */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Historique de mes fiches sur cet ouvrage ({projectReports.length})
          </h3>
          {projectReports.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune fiche soumise pour cet ouvrage à ce jour.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {projectReports.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">{r.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{formatDateFr(r.collectionDate)}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-slate-700">v{r.version}</span>
                      <span className="text-slate-400">·</span>
                      <ReportStatusText status={r.status} />
                    </div>
                    <p className="text-xs text-slate-600">
                      TEP <span className="font-mono font-medium">{formatPercentFr(r.currentTep, 0)}</span> · TEF{' '}
                      <span className="font-mono font-medium">{formatPercentFr(r.currentTef, 0)}</span> ·{' '}
                      {WORK_STATUS_LABELS[r.progress.workStatus]}
                    </p>
                    {r.status === 'RETOURNE' && r.reviews.length > 0 && (
                      <p className="text-xs text-red-700 font-medium">
                        Motif de retour : {r.reviews[r.reviews.length - 1].comment}
                      </p>
                    )}
                  </div>
                  {r.status === 'RETOURNE' && (
                    <button
                      type="button"
                      onClick={() => onEditReport(r)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 min-h-[40px]"
                    >
                      Corriger & resoumettre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Tableau de bord — Mes chantiers affectés
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {projects.length} ouvrage(s) activement affecté(s)
            {lastCachedAt ? ` · Cache hors ligne mis à jour le ${formatDateTimeFr(lastCachedAt)}` : ''}
          </p>
        </div>
        {!isOnline && (
          <p className="text-xs font-semibold text-amber-800">
            Consultation depuis la base locale IndexedDB
          </p>
        )}
      </div>

      {/* Agent Operational KPI Strip */}
      <motion.section
        aria-label="Synthèse d'activité de l'agent"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={staggerFast}
        initial={reduced ? false : 'hidden'}
        animate="show"
      >
        <motion.div variants={fadeUp} className="bg-white border border-slate-200 rounded-lg p-3.5 interactive-lift">
          <p className="text-xs text-slate-500">Chantiers affectés</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#0F2544] mt-1">
            {projects.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            TEP moyen : <span className="font-mono">{formatPercentFr(avgTep, 0)}</span> · {distinctProvinces.length} prov.
          </p>
        </motion.div>

        <motion.button
          type="button"
          variants={fadeUp}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigateTab?.('history')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3.5 hover:border-blue-300 transition-colors interactive-lift"
        >
          <p className="text-xs text-slate-500">Mes fiches soumises</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {reports.length}
          </p>
          <p className="text-[11px] text-emerald-800 mt-0.5">
            {validatedCount} validée(s) Coordonnateur
          </p>
        </motion.button>

        <motion.button
          type="button"
          variants={fadeUp}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigateTab?.('history')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3.5 hover:border-amber-300 transition-colors interactive-lift"
        >
          <p className="text-xs text-slate-500">Fiches à corriger</p>
          <p
            className={`text-xl font-bold font-mono tabular-nums mt-1 ${
              returnedReports.length > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {returnedReports.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {returnedReports.length > 0 ? 'Correction prioritaire requise' : 'Aucune fiche retournée'}
          </p>
        </motion.button>

        <motion.button
          type="button"
          variants={fadeUp}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigateTab?.('sync')}
          className="text-left bg-white border border-slate-200 rounded-lg p-3.5 hover:border-blue-300 transition-colors interactive-lift"
        >
          <p className="text-xs text-slate-500">Brouillons &amp; synchro</p>
          <p
            className={`text-xl font-bold font-mono tabular-nums mt-1 ${
              syncQueue.length > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {localDrafts.length + syncQueue.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {localDrafts.length} brouillon(s) · {syncQueue.length} en file
          </p>
        </motion.button>
      </motion.section>

      {/* Interrupted Auto-Saved Draft Recovery Banner (survives app restart!) */}
      {recoverableDraft && (
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs text-[#0F2544]">
            <p className="font-semibold text-sm">
              Brouillon local préservé dans IndexedDB ({recoverableDraft.id})
            </p>
            <p className="text-slate-700">
              {recoverableDraft.matrixNumber} — {recoverableDraft.identification.projectName} · Dernière sauvegarde :{' '}
              <span className="font-mono">{formatDateTimeFr(recoverableDraft.updatedAt)}</span> ·{' '}
              {recoverableDraft.receptions.photos.length} photo(s)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onEditReport(recoverableDraft)}
            className="px-4 py-2 text-xs font-semibold bg-[#0F2544] text-white rounded-md hover:bg-[#16325B] min-h-[40px] whitespace-nowrap"
          >
            Reprendre la saisie
          </button>
        </section>
      )}

      {/* Urgent Returned Reports Callout */}
      {returnedReports.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
            <span>
              {returnedReports.length} fiche(s) retournée(s) par le Coordonnateur pour correction
            </span>
          </div>
          <div className="divide-y divide-red-200/70">
            {returnedReports.map((r) => (
              <div key={r.id} className="pt-2.5 first:pt-0 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-red-900">
                  <span className="font-mono font-semibold">{r.matrixNumber}</span> — {r.identification.projectName}
                  {r.reviews.length > 0 && (
                    <p className="text-red-800 mt-0.5">« {r.reviews[r.reviews.length - 1].comment} »</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onEditReport(r)}
                  className="px-3 py-2 text-xs font-semibold bg-red-700 text-white rounded-md hover:bg-red-800 min-h-[40px] whitespace-nowrap"
                >
                  Corriger maintenant
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par N° Matrice, ouvrage, territoire, entreprise…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:border-blue-700"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              ['ALL', 'Tous'],
              ['EN_COURS', 'En cours'],
              ['ACHEVE', 'Achevés'],
              ['A_L_ARRET', "À l'arrêt"],
              ['NON_DEMARRE', 'Non démarrés'],
            ] as [string, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                statusFilter === val
                  ? 'bg-white text-[#0F2544] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Projects Grid */}
      {dataLoading && projects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-lg p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
          <p className="text-base font-semibold text-slate-900">Aucun chantier affecté trouvé</p>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {projects.length === 0
              ? 'Aucun ouvrage ne vous est actuellement affecté par le Coordonnateur. Seuls vos chantiers affectés sont accessibles.'
              : 'Aucun ouvrage ne correspond à vos critères de recherche actuels.'}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={staggerContainer}
          initial={reduced ? false : 'hidden'}
          animate="show"
        >
          {filteredProjects.map((project) => {
            const hasGapAlert = Math.abs(project.currentGap) > 10;
            const hasDraft = localDrafts.some((d) => d.projectId === project.id);
            const hasReturned = reports.some((r) => r.projectId === project.id && r.status === 'RETOURNE');

            return (
              <motion.article
                key={project.id}
                variants={fadeUp}
                whileHover={reduced ? undefined : { y: -3 }}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors interactive-lift"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-semibold text-[#0F2544]">{project.matrixNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{INFRASTRUCTURE_TYPE_SHORT[project.infrastructureType]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.province}</span>
                    </div>
                    <WorkStatusText status={project.currentStatus} />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-900 leading-snug">
                      {project.projectName}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {project.territory} · {project.sectorChiefdom}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{project.contractor}</p>
                  </div>

                  {/* Clean Progress Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block">TEP</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatPercentFr(project.currentTep, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">TEF</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatPercentFr(project.currentTef, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Écart</span>
                      <span
                        className={`font-mono font-semibold ${
                          hasGapAlert ? 'text-red-700' : 'text-slate-900'
                        }`}
                      >
                        {formatSignedGapFr(project.currentGap)}
                      </span>
                    </div>
                  </div>

                  {(hasDraft || hasReturned || project.hasCriticalConstraint) && (
                    <div className="text-xs space-y-0.5 pt-1">
                      {hasReturned && (
                        <p className="text-red-700 font-medium">Action requise : fiche retournée pour correction</p>
                      )}
                      {hasDraft && (
                        <p className="text-amber-800 font-medium">Brouillon local en cours sur cet appareil</p>
                      )}
                      {project.hasCriticalConstraint && (
                        <p className="text-red-700">Contrainte critique active signalée</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#0F2544] min-h-[40px] px-2 -ml-2"
                  >
                    <span>Détails & historique</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartNewReport(project)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0F2544] text-white rounded-md hover:bg-[#16325B] min-h-[40px] whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Nouvelle fiche</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
