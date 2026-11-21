import React, { useMemo, useState } from 'react';
import { Eye, FileDown, FileEdit, RotateCcw, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PERIODICITY_LABELS, REPORT_STATUS_LABELS, WORK_STATUS_LABELS } from '../../domain/constants';
import { formatDateFr, formatDateTimeFr, formatPercentFr, formatSignedGapFr } from '../../domain/formatters';
import { exportSingleReportPdf } from '../../services/export/reportExporter';
import type { FieldReport } from '../../types/domain';
import { ReportStatusText, SyncStatusText } from '../common/StatusBadge';

interface Props {
  onEditReport: (report: FieldReport) => void;
}

export const AgentReportsHistoryView: React.FC<Props> = ({ onEditReport }) => {
  const {
    reports,
    localDrafts,
    syncQueue,
    projects,
    currentUser,
    pushToast,
    deleteLocalDraft,
    reopenQueuedReportAsDraft,
  } = useApp();
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  const handleGeneratePdf = (report: FieldReport) => {
    try {
      setGeneratingPdfId(report.id);
      const relatedProject = projects.find((p) => p.id === report.projectId);
      const artifact = exportSingleReportPdf(report, relatedProject, {
        generatedByName: currentUser?.fullName || report.signature.agentFullName,
        isDemoData: report.isDemoData || (relatedProject ? relatedProject.isDemoData : true),
      });
      pushToast(
        'success',
        'Rapport PDF généré',
        `La fiche de synthèse pour ${report.identification.projectName} a été téléchargée (${artifact.fileName}).`
      );
    } catch {
      pushToast('error', 'Échec génération PDF', 'Impossible de générer la fiche PDF de synthèse.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const combinedList = useMemo(() => {
    const queueReports = syncQueue.map((item) => item.report);
    const merged: (FieldReport & { storageOrigin: 'LOCAL_DRAFT' | 'OFFLINE_QUEUE' | 'SERVER' })[] = [
      ...localDrafts.map((d) => ({ ...d, storageOrigin: 'LOCAL_DRAFT' as const })),
      ...queueReports.map((q) => ({ ...q, storageOrigin: 'OFFLINE_QUEUE' as const })),
      ...reports.map((r) => ({ ...r, storageOrigin: 'SERVER' as const })),
    ];
    return merged
      .filter((item) => (filter === 'ALL' ? true : item.status === filter))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [reports, localDrafts, syncQueue, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mes fiches et soumissions</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Distinction explicite entre brouillons locaux, fiches en attente de synchronisation et fiches confirmées serveur.
        </p>
      </div>

      {/* Filter Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto w-fit max-w-full">
        {(
          [
            ['ALL', 'Toutes'],
            ['BROUILLON', 'Brouillons'],
            ['EN_ATTENTE_SYNC', 'En attente synchro'],
            ['SOUMIS', 'Soumises'],
            ['RETOURNE', 'Retournées'],
            ['VALIDE', 'Validées'],
          ] as [string, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
              filter === val ? 'bg-white text-[#0F2544] shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {combinedList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-1.5">
          <p className="text-base font-semibold text-slate-900">Aucune fiche dans cette catégorie</p>
          <p className="text-sm text-slate-600">
            Sélectionnez un chantier affecté pour rédiger ou sauvegarder une nouvelle fiche terrain.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {combinedList.map((item) => {
            const isLocalOnly = item.storageOrigin !== 'SERVER';
            const lastReview = item.reviews.length > 0 ? item.reviews[item.reviews.length - 1] : null;
            return (
              <div key={`${item.storageOrigin}-${item.id}`} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#0F2544]">{item.id}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-slate-600">{item.matrixNumber}</span>
                    <span className="text-slate-300">·</span>
                    <ReportStatusText status={item.status} />
                    <span className="text-slate-300">·</span>
                    <span className={`font-medium ${isLocalOnly ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {item.storageOrigin === 'LOCAL_DRAFT'
                        ? 'Stockage local (IndexedDB)'
                        : item.storageOrigin === 'OFFLINE_QUEUE'
                        ? 'File hors ligne (non confirmé serveur)'
                        : 'Confirmé serveur'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {item.identification.projectName}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>{PERIODICITY_LABELS[item.periodicity]}</span>
                    <span>Collecte : {formatDateFr(item.collectionDate)}</span>
                    <span className="font-mono">
                      TEP {formatPercentFr(item.currentTep, 0)} / TEF {formatPercentFr(item.currentTef, 0)} ({formatSignedGapFr(item.progress.tepTefGap)})
                    </span>
                    <span className="font-mono">v{item.version}</span>
                  </div>

                  {item.status === 'RETOURNE' && lastReview && (
                    <div className="mt-1.5 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                      <span className="font-semibold">Motif de retour ({lastReview.reviewerName}) :</span>{' '}
                      {lastReview.comment}
                    </div>
                  )}

                  {item.syncConflictReason && (
                    <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                      {item.syncConflictReason}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.storageOrigin === 'LOCAL_DRAFT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditReport(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-700 text-white rounded-md hover:bg-blue-800 min-h-[40px]"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Continuer
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLocalDraft(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50 min-h-[40px]"
                        aria-label="Supprimer le brouillon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {item.storageOrigin === 'OFFLINE_QUEUE' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const draft = await reopenQueuedReportAsDraft(item.id);
                        if (draft) onEditReport(draft);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 min-h-[40px]"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Modifier la fiche en file
                    </button>
                  )}

                  {item.storageOrigin === 'SERVER' && item.status === 'RETOURNE' && (
                    <button
                      type="button"
                      onClick={() => onEditReport(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 min-h-[40px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Corriger & resoumettre
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleGeneratePdf(item)}
                    disabled={generatingPdfId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[40px] transition-colors"
                    title="Générer et télécharger la fiche de synthèse instantanée PDF pour ce projet"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-700" />
                    <span>{generatingPdfId === item.id ? 'Génération…' : 'Générer rapport PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 min-h-[40px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Consulter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Read-only Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[88vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  {selectedReport.id} · {selectedReport.matrixNumber} · v{selectedReport.version}
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedReport.identification.projectName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGeneratePdf(selectedReport)}
                  disabled={generatingPdfId === selectedReport.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 min-h-[36px]"
                  title="Télécharger la fiche de synthèse PDF instantanée"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{generatingPdfId === selectedReport.id ? 'Génération…' : 'Générer rapport PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <ReportStatusText status={selectedReport.status} />
                <span className="text-slate-300">·</span>
                <SyncStatusText syncStatus={selectedReport.syncStatus} />
                <span className="text-slate-300">·</span>
                <span className="text-slate-600">Mis à jour le {formatDateTimeFr(selectedReport.updatedAt)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
                <div>
                  <span className="text-slate-500 block">Statut ouvrage</span>
                  <span className="font-semibold text-slate-900">{WORK_STATUS_LABELS[selectedReport.progress.workStatus]}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TEP Actuel</span>
                  <span className="font-mono font-bold text-slate-900">{formatPercentFr(selectedReport.currentTep)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TEF Actuel</span>
                  <span className="font-mono font-bold text-slate-900">{formatPercentFr(selectedReport.currentTef)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Écart</span>
                  <span className="font-mono font-bold text-slate-900">{formatSignedGapFr(selectedReport.progress.tepTefGap)}</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-1">Travaux exécutés durant la période</p>
                <p className="text-slate-700 leading-relaxed">{selectedReport.progress.periodWorksExecuted || '—'}</p>
              </div>

              {selectedReport.progress.gapJustification && (
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Justification de l’écart TEP / TEF</p>
                  <p className="text-slate-700">{selectedReport.progress.gapJustification}</p>
                </div>
              )}

              {selectedReport.receptions.photos.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Photographies ({selectedReport.receptions.photos.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedReport.receptions.photos.map((ph) => (
                      <img
                        key={ph.id}
                        src={ph.remoteUrl || ph.dataUrl}
                        alt={ph.caption || ph.fileName}
                        referrerPolicy="no-referrer"
                        className="w-full h-24 object-cover rounded border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.reviews.length > 0 && (
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <p className="font-semibold text-slate-800">Historique des décisions Coordonnateur</p>
                  {selectedReport.reviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded p-2.5">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-semibold text-slate-900">
                          {rev.reviewerName} · {REPORT_STATUS_LABELS[rev.decision]}
                        </span>
                        <span className="font-mono">{formatDateTimeFr(rev.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport.versionHistory.length > 0 && (
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <p className="font-semibold text-slate-800">Versions précédentes archivées</p>
                  {selectedReport.versionHistory.map((vh) => (
                    <div key={vh.version} className="text-slate-600 font-mono">
                      v{vh.version} ({formatDateTimeFr(vh.savedAt)}) · TEP {vh.currentTep}% · TEF {vh.currentTef}% ·{' '}
                      {REPORT_STATUS_LABELS[vh.statusAtSnapshot]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
