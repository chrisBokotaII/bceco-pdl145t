import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileEdit,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTimeFr, formatPercentFr } from '../../domain/formatters';
import {
  applyServiceWorkerUpdate,
  subscribeServiceWorkerState,
  type ServiceWorkerState,
} from '../../services/offline/swManager';
import type { FieldReport } from '../../types/domain';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { SyncStatusText } from '../common/StatusBadge';

interface Props {
  onEditReport?: (report: FieldReport) => void;
}

export const AgentSyncView: React.FC<Props> = ({ onEditReport }) => {
  const {
    isOnline,
    browserOnline,
    simulatedOffline,
    setSimulatedOffline,
    isSyncing,
    projects,
    assignments,
    localDrafts,
    photoQueue,
    syncQueue,
    localSyncLogs,
    syncLogs,
    lastCachedAt,
    synchronizeNow,
    retrySingleReport,
    retrySinglePhoto,
    reopenQueuedReportAsDraft,
    exportOfflineBackupJson,
    refreshData,
  } = useApp();

  const [swState, setSwState] = useState<ServiceWorkerState | null>(null);

  useEffect(() => {
    return subscribeServiceWorkerState(setSwState);
  }, []);

  const allSyncLogs = [...localSyncLogs, ...syncLogs]
    .filter((log, idx, arr) => arr.findIndex((item) => item.id === log.id) === idx)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendingPhotos = photoQueue.filter((p) => p.status !== 'UPLOADED');
  const failedPhotos = photoQueue.filter((p) => p.status === 'FAILED');
  const hasAnythingToSync = syncQueue.length > 0 || pendingPhotos.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Synchronisation &amp; Mode Hors Ligne (PWA)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Stockage IndexedDB persistant, file dédiée des photographies, reprise idempotente et protection zéro perte de données.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => synchronizeNow({ includeConflicts: true })}
            disabled={!isOnline || isSyncing || !hasAnythingToSync}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#0F2544] text-white rounded-md hover:bg-[#16325B] disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing
              ? 'Synchronisation…'
              : `Synchroniser (${syncQueue.length} fiche(s) · ${pendingPhotos.length} photo(s))`}
          </button>
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={!isOnline}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 min-h-[44px]"
          >
            <Database className="w-4 h-4" />
            Actualiser le cache
          </button>
          <button
            type="button"
            onClick={() => exportOfflineBackupJson()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Sauvegarde locale (JSON)
          </button>
          <PWAInstallButton />
        </div>
      </div>

      {/* Connectivity, Service Worker & Field Outage Simulation */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-700" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-700" />
            )}
            <h2 className="text-base font-semibold text-slate-900">
              {isOnline ? 'Connectivité active — Serveur joignable' : 'Mode hors ligne actif'}
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Réseau navigateur : <strong>{browserOnline ? 'Connecté' : 'Déconnecté'}</strong>.
            {lastCachedAt
              ? ` Cache local IndexedDB (chantiers, affectations, historiques) mis à jour le ${formatDateTimeFr(lastCachedAt)}.`
              : ' Aucune synchronisation de cache effectuée.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <ShieldCheck
                className={`w-4 h-4 ${
                  swState?.offlineReady || swState?.status === 'ACTIVE'
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              />
              Service Worker PWA :{' '}
              <strong>
                {swState?.status === 'OFFLINE_READY'
                  ? 'Prêt pour redémarrage hors ligne'
                  : swState?.status === 'ACTIVE'
                  ? 'Actif (cache applicatif en place)'
                  : swState?.status === 'UPDATE_AVAILABLE'
                  ? 'Mise à jour prête'
                  : swState?.status === 'UNSUPPORTED'
                  ? 'Non pris en charge'
                  : 'Initialisation…'}
              </strong>
            </span>
            {swState?.needRefresh && (
              <button
                type="button"
                onClick={() => applyServiceWorkerUpdate()}
                className="px-2.5 py-1 text-[11px] font-semibold bg-blue-700 text-white rounded hover:bg-blue-800"
              >
                Appliquer la mise à jour
              </button>
            )}
          </div>
        </div>

        <div className="border border-slate-200 bg-slate-50 rounded-md p-3.5 flex items-center justify-between gap-4">
          <div className="text-xs">
            <p className="font-semibold text-slate-900">Simulation de coupure terrain (test hors ligne)</p>
            <p className="text-slate-600 mt-0.5">
              Simulez une perte totale de réseau pour vérifier la saisie, la mise en file photo/fiche, le redémarrage de l’onglet et la reprise automatique.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simulatedOffline}
            onClick={() => setSimulatedOffline(!simulatedOffline)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md border whitespace-nowrap shrink-0 min-h-[40px] ${
              simulatedOffline
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {simulatedOffline ? 'Désactiver simulation' : 'Passer hors ligne'}
          </button>
        </div>
      </section>

      {/* Local IndexedDB Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Chantiers en cache IndexedDB</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{projects.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{assignments.length} affectation(s) en cache</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Brouillons locaux persistés</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{localDrafts.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sauvegarde automatique active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">File fiches terrain</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${syncQueue.length > 0 ? 'text-amber-700' : 'text-emerald-800'}`}>
            {syncQueue.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {syncQueue.filter((q) => q.status === 'FAILED').length} en échec · {syncQueue.filter((q) => q.conflictDetected).length} conflit(s)
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">File photographies</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${failedPhotos.length > 0 ? 'text-red-700' : pendingPhotos.length > 0 ? 'text-amber-700' : 'text-emerald-800'}`}>
            {pendingPhotos.length}
            <span className="text-sm font-normal text-slate-400"> / {photoQueue.length}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {failedPhotos.length > 0 ? `${failedPhotos.length} échec(s) à relancer` : 'En attente / total en file'}
          </p>
        </div>
      </section>

      {/* Pending Report Sync Queue */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            File d’attente des fiches terrain ({syncQueue.length})
          </h2>
          {syncQueue.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Toutes les fiches sont synchronisées
            </span>
          )}
        </div>

        {syncQueue.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Aucune fiche en attente de transmission. Vos fiches saisies hors ligne sont conservées dans IndexedDB jusqu’à confirmation serveur.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {syncQueue.map((item) => {
              const linkedPhotos = photoQueue.filter((p) => p.reportId === item.id);
              const uploadedLinkedCount = linkedPhotos.filter((p) => p.status === 'UPLOADED').length;

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#0F2544]">{item.id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-slate-600">{item.report.matrixNumber}</span>
                      <span className="text-slate-300">·</span>
                      <SyncStatusText syncStatus={item.report.syncStatus} />
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-[11px] text-slate-500">Clé : {item.clientSubmissionId}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.report.identification.projectName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Mis en file le {formatDateTimeFr(item.queuedAt)} · TEP {formatPercentFr(item.report.currentTep, 0)} / TEF{' '}
                      {formatPercentFr(item.report.currentTef, 0)} · Photos :{' '}
                      <span className="font-mono font-medium">
                        {uploadedLinkedCount}/{Math.max(linkedPhotos.length, item.report.receptions.photos.length)} téléversée(s)
                      </span>{' '}
                      · Tentatives : <span className="font-mono">{item.retryCount}</span>
                    </p>
                    {item.conflictDetected && (
                      <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>{item.conflictReason}</span>
                      </div>
                    )}
                    {item.lastError && !item.conflictDetected && (
                      <div className="mt-1.5 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                        <strong>Dernière erreur conservée :</strong> {item.lastError}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onEditReport && (
                      <button
                        type="button"
                        onClick={async () => {
                          const draft = await reopenQueuedReportAsDraft(item.id);
                          if (draft) onEditReport(draft);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[40px]"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isOnline || isSyncing}
                      onClick={() => retrySingleReport(item.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 min-h-[40px]"
                    >
                      {isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                      Réessayer cette fiche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dedicated Photograph Upload Queue */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#0F2544]" />
            <span>File d’attente des photographies ({photoQueue.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            {pendingPhotos.length} en attente / échec · {photoQueue.length - pendingPhotos.length} téléversée(s)
          </span>
        </div>

        {photoQueue.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Aucune photographie en file locale. Les photos prises dans la Section 4 sont immédiatement stockées dans IndexedDB avant téléversement.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {photoQueue.map((photo) => (
              <div key={photo.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={photo.remoteUrl || photo.dataUrl}
                    alt={photo.caption || photo.fileName}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 space-y-0.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate max-w-[200px]">{photo.fileName}</span>
                      <span className="font-mono text-slate-500">{Math.round(photo.sizeBytes / 1024)} Ko</span>
                      <span
                        className={`font-semibold ${
                          photo.status === 'UPLOADED'
                            ? 'text-emerald-800'
                            : photo.status === 'FAILED'
                            ? 'text-red-700'
                            : photo.status === 'UPLOADING'
                            ? 'text-blue-700'
                            : 'text-amber-800'
                        }`}
                      >
                        {photo.status === 'UPLOADED'
                          ? 'Téléversée serveur'
                          : photo.status === 'FAILED'
                          ? 'Échec téléversement (conservée)'
                          : photo.status === 'UPLOADING'
                          ? 'Téléversement en cours…'
                          : 'En file IndexedDB'}
                      </span>
                    </div>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Fiche : {photo.reportId} · Tentatives : {photo.retryCount} · Empreinte : {photo.checksum.slice(0, 14)}
                    </p>
                    {photo.lastError && (
                      <p className="text-red-700 text-[11px]">Erreur : {photo.lastError}</p>
                    )}
                  </div>
                </div>

                {photo.status !== 'UPLOADED' && (
                  <button
                    type="button"
                    disabled={!isOnline || isSyncing}
                    onClick={() => retrySinglePhoto(photo.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 min-h-[38px] shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Réessayer photo
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sync Logs */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Journal de synchronisation</h2>
        </div>
        {allSyncLogs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Aucun événement de synchronisation enregistré.</div>
        ) : (
          <div className="divide-y divide-slate-200 text-xs">
            {allSyncLogs.slice(0, 15).map((log) => (
              <div key={log.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">{log.summary}</p>
                  <p className="text-slate-500 font-mono">
                    Confirmées : {log.syncedCount} · Conflits : {log.conflictCount} · Échecs : {log.failedCount}
                  </p>
                </div>
                <span className="font-mono text-slate-500">{formatDateTimeFr(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
