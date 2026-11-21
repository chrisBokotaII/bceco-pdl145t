import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  Eye,
  History,
  MapPin,
  RotateCcw,
  Search,
  SearchCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CONSTRAINT_CATEGORIES,
  CONTRACT_STATUS_LABELS,
  INFRASTRUCTURE_TYPE_LABELS,
  PERIODICITY_LABELS,
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
import type { FieldReport } from '../../types/domain';
import { ReportStatusText, SyncStatusText, WorkStatusText } from '../common/StatusBadge';

type ReviewFilter =
  | 'ALL'
  | 'SOUMIS'
  | 'EN_COURS_VERIFICATION'
  | 'VALIDE'
  | 'RETOURNE'
  | 'ALERTS';

export const SubmissionsReviewView: React.FC = () => {
  const { reports, reviewFieldReport, pushToast } = useApp();

  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nonDraftReports = useMemo(
    () =>
      reports
        .filter((r) => r.status !== 'BROUILLON')
        .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt)),
    [reports]
  );

  const counts = useMemo(
    () => ({
      ALL: nonDraftReports.length,
      SOUMIS: nonDraftReports.filter((r) => r.status === 'SOUMIS').length,
      EN_COURS_VERIFICATION: nonDraftReports.filter((r) => r.status === 'EN_COURS_VERIFICATION').length,
      VALIDE: nonDraftReports.filter((r) => r.status === 'VALIDE').length,
      RETOURNE: nonDraftReports.filter((r) => r.status === 'RETOURNE').length,
      ALERTS: nonDraftReports.filter(
        (r) =>
          r.potentialDuplicateOf.length > 0 ||
          r.syncStatus === 'CONFLIT_AFFECTATION' ||
          Math.abs(r.progress.tepTefGap) > 10 ||
          r.constraints.isCritical
      ).length,
    }),
    [nonDraftReports]
  );

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nonDraftReports.filter((r) => {
      if (filter === 'ALERTS') {
        const hasAlert =
          r.potentialDuplicateOf.length > 0 ||
          r.syncStatus === 'CONFLIT_AFFECTATION' ||
          Math.abs(r.progress.tepTefGap) > 10 ||
          r.constraints.isCritical;
        if (!hasAlert) return false;
      } else if (filter !== 'ALL' && r.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.matrixNumber.toLowerCase().includes(q) ||
        r.identification.projectName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q) ||
        r.identification.province.toLowerCase().includes(q) ||
        r.identification.territory.toLowerCase().includes(q)
      );
    });
  }, [nonDraftReports, filter, search]);

  const selectedReport: FieldReport | null = useMemo(
    () => nonDraftReports.find((r) => r.id === selectedReportId) ?? null,
    [nonDraftReports, selectedReportId]
  );

  const handleDecision = async (decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE') => {
    if (!selectedReport) return;
    const trimmed = comment.trim();
    if (decision === 'RETOURNE' && trimmed.length < 5) {
      pushToast(
        'warning',
        'Commentaire obligatoire',
        'Précisez les corrections attendues (au moins 5 caractères) avant de retourner une fiche.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await reviewFieldReport(selectedReport.id, decision, trimmed);
      setComment('');
      if (decision === 'VALIDE' || decision === 'RETOURNE') {
        setSelectedReportId(null);
      }
    } catch (err) {
      pushToast(
        'error',
        'Traitement impossible',
        err instanceof Error ? err.message : 'Erreur lors de la validation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Contrôle &amp; Validation des Fiches Terrain
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Vérifiez les fiches soumises par les agents, arbitrez les doublons ou conflits hors ligne, puis validez pour actualiser la situation consolidée du registre officiel (sans altérer les colonnes contractuelles).
        </p>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto max-w-full text-xs">
          {(
            [
              ['ALL', `Toutes (${counts.ALL})`],
              ['SOUMIS', `À valider (${counts.SOUMIS})`],
              ['EN_COURS_VERIFICATION', `En vérification (${counts.EN_COURS_VERIFICATION})`],
              ['VALIDE', `Validées (${counts.VALIDE})`],
              ['RETOURNE', `Retournées (${counts.RETOURNE})`],
              ['ALERTS', `Alertes & Doublons (${counts.ALERTS})`],
            ] as [ReviewFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded font-semibold whitespace-nowrap transition-colors ${
                filter === key
                  ? 'bg-[#0F2544] text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] flex-1 sm:flex-none sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par ID, N°, ouvrage ou agent…"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Fiche &amp; Période</th>
                <th className="py-3 px-3 font-semibold">Ouvrage</th>
                <th className="py-3 px-3 font-semibold">Agent</th>
                <th className="py-3 px-3 font-semibold text-right">TEP / TEF</th>
                <th className="py-3 px-3 font-semibold">Statut &amp; Signaux</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((r) => {
                const hasGapAlert = Math.abs(r.progress.tepTefGap) > 10;
                const hasDup = r.potentialDuplicateOf.length > 0;
                const hasConflict = r.syncStatus === 'CONFLIT_AFFECTATION';
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900">
                        {r.id}{' '}
                        <span className="text-[11px] font-normal text-slate-500">v{r.version}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateFr(r.collectionDate)} · {PERIODICITY_LABELS[r.periodicity]}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-semibold text-slate-900">
                        <span className="font-mono text-blue-800 mr-1.5">{r.matrixNumber}</span>
                        {r.identification.projectName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {r.identification.province} · {r.identification.territory}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top whitespace-nowrap text-slate-800">
                      {r.agentName}
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {formatPercentFr(r.currentTep, 0)} / {formatPercentFr(r.currentTef, 0)}
                      </div>
                      <div className={`text-[11px] font-semibold ${hasGapAlert ? 'text-red-700' : 'text-slate-500'}`}>
                        {formatSignedGapFr(r.progress.tepTefGap)}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top space-y-1">
                      <div>
                        <ReportStatusText status={r.status} />
                      </div>
                      {hasDup && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <Copy className="w-3 h-3 text-amber-600" />
                          Doublon potentiel ({r.potentialDuplicateOf.join(', ')})
                        </div>
                      )}
                      {hasConflict && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                          <AlertOctagon className="w-3 h-3 text-red-600" />
                          Conflit d’affectation hors ligne
                        </div>
                      )}
                      {r.constraints.isCritical && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Alerte critique terrain
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReportId(r.id);
                          setComment('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2544] rounded hover:bg-[#16325B]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Examiner
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Aucune fiche terrain dans cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full 5-Section Inspection & Validation Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`Inspection fiche ${selectedReport.id}`}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#0F2544] text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-blue-200">
                  <span>{selectedReport.id}</span>
                  <span>·</span>
                  <span>Version {selectedReport.version}</span>
                  <span>·</span>
                  <span>{PERIODICITY_LABELS[selectedReport.periodicity]} ({selectedReport.periodKey})</span>
                </div>
                <h3 className="text-base font-bold mt-0.5">
                  {selectedReport.matrixNumber} — {selectedReport.identification.projectName}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Enquêteur : {selectedReport.agentName} · Collecté le {formatDateFr(selectedReport.collectionDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportId(null)}
                className="p-1.5 text-slate-200 hover:text-white rounded"
                aria-label="Fermer l’inspection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: All 5 Sections + Alerts + Review History */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Top Status & Conflict Alerts */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-4">
                  <ReportStatusText status={selectedReport.status} />
                  <SyncStatusText syncStatus={selectedReport.syncStatus} />
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Soumis le {formatDateTimeFr(selectedReport.submittedAt ?? selectedReport.updatedAt)}
                </span>
              </div>

              {selectedReport.potentialDuplicateOf.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-amber-950 flex items-start gap-2.5">
                  <Copy className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Doublon potentiel détecté (aucune suppression automatique)</p>
                    <p className="mt-0.5">
                      Une ou plusieurs fiches existent déjà pour le même ouvrage, le même agent et la même période ({selectedReport.potentialDuplicateOf.join(', ')}). Vérifiez avant validation.
                    </p>
                  </div>
                </div>
              )}

              {selectedReport.syncConflictReason && (
                <div className="bg-red-50 border border-red-300 rounded-md p-3 text-red-950 flex items-start gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Conflit d’affectation hors ligne à arbitrer</p>
                    <p className="mt-0.5">{selectedReport.syncConflictReason}</p>
                  </div>
                </div>
              )}

              {/* SECTION 1 */}
              <section className="border border-slate-200 rounded-md p-4 space-y-2.5">
                <h4 className="font-bold text-[#0F2544] uppercase text-[11px] tracking-wider">
                  Section 1 — Identification de l’ouvrage &amp; Localisation GPS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Province / Territoire / Secteur</span>
                    <span className="font-medium text-slate-900">
                      {selectedReport.identification.province} / {selectedReport.identification.territory} /{' '}
                      {selectedReport.identification.sectorChiefdom}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Type d’ouvrage</span>
                    <span className="font-medium text-slate-900">
                      {INFRASTRUCTURE_TYPE_LABELS[selectedReport.identification.infrastructureType]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Entreprise &amp; Statut contrat</span>
                    <span className="font-medium text-slate-900">
                      {selectedReport.identification.contractor} (
                      {CONTRACT_STATUS_LABELS[selectedReport.identification.contractStatus]})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Localité / Village</span>
                    <span className="text-slate-900">{selectedReport.identification.locality}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dates contractuelles</span>
                    <span className="font-mono text-slate-900">
                      Début {formatDateFr(selectedReport.identification.startDate)} · Échéance{' '}
                      {formatDateFr(selectedReport.identification.definitiveReceptionDeadline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Coordonnées GPS collectées</span>
                    <span className="font-mono text-slate-900 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-700" />
                      {selectedReport.identification.gpsLat || '—'}, {selectedReport.identification.gpsLng || '—'}
                      {selectedReport.identification.gpsAccuracy
                        ? ` (±${Math.round(selectedReport.identification.gpsAccuracy)} m)`
                        : ''}
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTION 2 */}
              <section className="border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-[#0F2544] uppercase text-[11px] tracking-wider">
                    Section 2 — État d’avancement physique et financier
                  </h4>
                  <WorkStatusText status={selectedReport.progress.workStatus} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">TEP précédent → actuel</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedReport.progress.previousTep}% → {selectedReport.progress.currentTep}%
                    </span>
                    <span className="block font-mono text-[10px] text-emerald-800 mt-0.5">
                      Δ {selectedReport.progress.currentTep - selectedReport.progress.previousTep >= 0 ? '+' : ''}
                      {Math.round((selectedReport.progress.currentTep - selectedReport.progress.previousTep) * 10) / 10} pts
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">TEF précédent → actuel</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedReport.progress.previousTef}% → {selectedReport.progress.currentTef}%
                    </span>
                    <span className="block font-mono text-[10px] text-blue-800 mt-0.5">
                      Δ {selectedReport.progress.currentTef - selectedReport.progress.previousTef >= 0 ? '+' : ''}
                      {Math.round((selectedReport.progress.currentTef - selectedReport.progress.previousTef) * 10) / 10} pts
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Écart TEP − TEF</span>
                    <span
                      className={`font-mono font-bold ${
                        Math.abs(selectedReport.progress.tepTefGap) > 10 ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {formatSignedGapFr(selectedReport.progress.tepTefGap)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Effectifs mobilisés</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedReport.progress.skilledWorkersCount} qual. · {selectedReport.progress.laborersCount} man.
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Ingénieur chantier</span>
                    <span className="font-semibold text-slate-900">
                      {selectedReport.progress.siteEngineerPresent ? 'Présent' : 'Absent'}
                    </span>
                  </div>
                </div>

                {selectedReport.progress.workStatus === 'A_L_ARRET' && (
                  <p className="text-red-700 font-semibold">
                    Date d’arrêt constatée : {formatDateFr(selectedReport.progress.stoppageDate)}
                  </p>
                )}

                <div>
                  <span className="text-slate-500 block">Étapes d’exécution cochées</span>
                  <span className="font-medium text-slate-900">
                    {formatExecutionStagesLabel(selectedReport.progress.executionStages)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Travaux exécutés durant la période</span>
                  <p className="text-slate-900 bg-slate-50 border border-slate-200 rounded p-2.5 mt-0.5">
                    {selectedReport.progress.periodWorksExecuted}
                  </p>
                </div>

                {selectedReport.progress.gapJustification && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2.5">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      Justification de l’écart TEP / TEF (&gt; 10 pts)
                    </span>
                    <p className="text-amber-950 mt-0.5">{selectedReport.progress.gapJustification}</p>
                  </div>
                )}
              </section>

              {/* SECTION 3 */}
              <section className="border border-slate-200 rounded-md p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-[#0F2544] uppercase text-[11px] tracking-wider">
                    Section 3 — Contraintes, alertes et mesures correctives
                  </h4>
                  {selectedReport.constraints.isCritical && (
                    <span className="text-xs font-bold text-red-700 uppercase">Alerte critique</span>
                  )}
                </div>

                {selectedReport.constraints.categories.length === 0 ? (
                  <p className="text-slate-500">Aucune contrainte déclarée sur cette période.</p>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-500 block">Typologies cochées</span>
                      <span className="font-semibold text-slate-900">
                        {selectedReport.constraints.categories
                          .map((c) => CONSTRAINT_CATEGORIES.find((item) => item.id === c)?.label ?? c)
                          .join(' · ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Descriptions détaillées</span>
                      <ul className="list-disc pl-5 text-slate-800 space-y-0.5 mt-0.5">
                        {selectedReport.constraints.detailedDescriptions
                          .filter((d) => d.trim())
                          .map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block">Impacts identifiés</span>
                        <span className="text-slate-900">
                          {[
                            selectedReport.constraints.impacts.delays && 'Retard délais',
                            selectedReport.constraints.impacts.costs && 'Surcoût',
                            selectedReport.constraints.impacts.quality && 'Qualité',
                            selectedReport.constraints.impacts.stoppage && 'Arrêt chantier',
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Aucun impact coché'}
                          {selectedReport.constraints.impacts.details
                            ? ` — ${selectedReport.constraints.impacts.details}`
                            : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Mesures correctives / Actions urgentes</span>
                        <span className="text-slate-900">
                          {selectedReport.constraints.correctiveMeasures || '—'}
                          {selectedReport.constraints.urgentActionsRequired
                            ? ` · Urgent : ${selectedReport.constraints.urgentActionsRequired}`
                            : ''}
                          {selectedReport.constraints.actionOwner
                            ? ` (Responsable : ${selectedReport.constraints.actionOwner})`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 4 */}
              <section className="border border-slate-200 rounded-md p-4 space-y-3">
                <h4 className="font-bold text-[#0F2544] uppercase text-[11px] tracking-wider">
                  Section 4 — Réceptions (RT / RP / RD), Observations &amp; Photos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block font-sans">Réception Technique (RT)</span>
                    <span className="text-slate-900">{formatReceptionCell(selectedReport.receptions.rt)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block font-sans">Réception Provisoire (RP)</span>
                    <span className="text-slate-900">{formatReceptionCell(selectedReport.receptions.rp)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block font-sans">Réception Définitive (RD)</span>
                    <span className="text-slate-900">{formatReceptionCell(selectedReport.receptions.rd)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Observations générales</span>
                    <p className="text-slate-900">{selectedReport.receptions.generalObservations || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gardiennage / État / Litiges / Fréquentation</span>
                    <p className="text-slate-800">
                      Gardiennage : {selectedReport.receptions.guardingStatus || '—'} · État :{' '}
                      {selectedReport.receptions.siteCondition || '—'} · Litiges :{' '}
                      {selectedReport.receptions.disputes || 'Néant'}
                    </p>
                  </div>
                </div>

                {selectedReport.receptions.photos.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <Camera className="w-3.5 h-3.5 text-blue-700" />
                      <span>Photographies terrain ({selectedReport.receptions.photos.length})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {selectedReport.receptions.photos.map((photo) => (
                        <figure
                          key={photo.id}
                          className="border border-slate-200 rounded overflow-hidden bg-slate-50"
                        >
                          <img
                            src={photo.remoteUrl || photo.dataUrl}
                            alt={photo.caption || photo.fileName}
                            referrerPolicy="no-referrer"
                            className="w-full h-28 object-cover"
                          />
                          <figcaption className="p-1.5 text-[11px] text-slate-600 truncate">
                            {photo.caption || photo.fileName}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 5 */}
              <section className="border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-[#0F2544] uppercase text-[11px] tracking-wider">
                    Section 5 — Validation et signature de l’agent enquêteur
                  </h4>
                  <p className="text-slate-900 font-semibold">
                    {selectedReport.signature.agentFullName} — {selectedReport.signature.agentFunction}
                  </p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    Tél. {selectedReport.signature.agentPhone} · Signé le{' '}
                    {formatDateTimeFr(selectedReport.signature.signedAt)}
                  </p>
                </div>
                {selectedReport.signature.signatureDataUrl && (
                  <img
                    src={selectedReport.signature.signatureDataUrl}
                    alt="Signature agent enquêteur"
                    className="h-16 bg-slate-50 border border-slate-200 rounded px-2 object-contain"
                  />
                )}
              </section>

              {/* Review & Version History */}
              {(selectedReport.reviews.length > 0 || selectedReport.versionHistory.length > 0) && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-md p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                      Décisions Coordonnateur ({selectedReport.reviews.length})
                    </h4>
                    {selectedReport.reviews.length === 0 ? (
                      <p className="text-slate-500">Aucune décision précédente.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {selectedReport.reviews.map((rev) => (
                          <div key={rev.id} className="py-2">
                            <div className="flex items-center justify-between gap-2">
                              <ReportStatusText status={rev.decision} />
                              <span className="font-mono text-[10px] text-slate-500">
                                {formatDateTimeFr(rev.createdAt)} · v{rev.reportVersion}
                              </span>
                            </div>
                            <p className="text-slate-700 mt-1">{rev.comment || 'Aucun commentaire.'}</p>
                            <p className="text-[11px] text-slate-400">{rev.reviewerName}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-md p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Historique des versions ({selectedReport.versionHistory.length})
                    </h4>
                    <div className="divide-y divide-slate-100">
                      {selectedReport.versionHistory.map((v) => (
                        <div key={`${v.version}-${v.savedAt}`} className="py-1.5 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-slate-900">v{v.version}</span>{' '}
                            <span className="text-slate-600">
                              — TEP {v.currentTep}% / TEF {v.currentTef}% ({WORK_STATUS_LABELS[v.workStatus]})
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">
                            {formatDateTimeFr(v.savedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Coordinator Action Footer */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 space-y-3">
              {selectedReport.status === 'VALIDE' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-3.5 py-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Fiche validée et consolidée dans le registre officiel le{' '}
                      {formatDateTimeFr(selectedReport.validatedAt ?? selectedReport.updatedAt)} — archive définitive verrouillée.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(null)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B]"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="review-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                      Commentaire de contrôle Coordonnateur (obligatoire en cas de retour pour correction)
                    </label>
                    <textarea
                      id="review-comment"
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Observations de vérification, réserves ou précisions exigées à l’agent…"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReportId(null)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
                    >
                      Fermer
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecision('EN_COURS_VERIFICATION')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50"
                      >
                        <SearchCheck className="w-4 h-4" />
                        Mettre en vérification
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecision('RETOURNE')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retourner pour correction
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecision('VALIDE')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Valider la fiche
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
