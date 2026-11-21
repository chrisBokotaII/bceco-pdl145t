import { generateUniqueId } from '../../domain/formatters';
import type { FieldReport, ReportPhoto, SyncLog, UserProfile } from '../../types/domain';
import type { DataRepository } from '../repository/types';
import {
  offlineStorage,
  type OfflineSyncQueueItem,
  type QueuedPhotoItem,
} from './indexedDb';

export interface SyncRunSummary {
  synced: number;
  failed: number;
  conflicts: number;
  photosUploaded: number;
  photosFailed: number;
  idempotentReplays: number;
  duplicatesDetected: number;
}

function computeNextRetryIso(retryCount: number): string {
  const delaySec = Math.min(300, Math.pow(2, Math.min(retryCount, 6)) * 5);
  return new Date(Date.now() + delaySec * 1000).toISOString();
}

function isAssignmentPermissionConflict(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('permission') ||
    lower.includes('affecté') ||
    lower.includes('affectation') ||
    lower.includes('403')
  );
}

/**
 * Téléverse une photographie individuelle de la file IndexedDB vers le backend.
 * Ne supprime jamais la photo en cas d'échec : incrémente retryCount et enregistre l'erreur exacte.
 */
export async function uploadSingleQueuedPhoto(
  user: UserProfile,
  repository: DataRepository,
  photo: QueuedPhotoItem
): Promise<{ ok: boolean; updated: QueuedPhotoItem }> {
  if (photo.status === 'UPLOADED') {
    return { ok: true, updated: photo };
  }

  const attemptAt = new Date().toISOString();
  const uploadingState: QueuedPhotoItem = {
    ...photo,
    status: 'UPLOADING',
    lastAttemptAt: attemptAt,
    lastError: undefined,
  };
  await offlineStorage.updateQueuedPhoto(uploadingState);

  try {
    const res = await repository.uploadPhoto(user, uploadingState);
    const completed: QueuedPhotoItem = {
      ...uploadingState,
      status: 'UPLOADED',
      remoteUrl: res.remoteUrl,
      uploadedAt: res.uploadedAt,
      lastError: undefined,
    };
    await offlineStorage.updateQueuedPhoto(completed);

    // Reflect uploaded state inside any local draft or queued report referencing this photo
    await syncPhotoStateIntoParentRecords(completed);
    return { ok: true, updated: completed };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Échec réseau lors du téléversement photo.';
    const failed: QueuedPhotoItem = {
      ...uploadingState,
      status: 'FAILED',
      retryCount: photo.retryCount + 1,
      lastAttemptAt: attemptAt,
      lastError: message,
    };
    await offlineStorage.updateQueuedPhoto(failed);
    await syncPhotoStateIntoParentRecords(failed);
    return { ok: false, updated: failed };
  }
}

async function syncPhotoStateIntoParentRecords(photoItem: QueuedPhotoItem): Promise<void> {
  const applyToPhotos = (photos: ReportPhoto[]): ReportPhoto[] =>
    photos.map((p) =>
      p.id === photoItem.id
        ? {
            ...p,
            remoteUrl: photoItem.remoteUrl ?? p.remoteUrl,
            checksum: photoItem.checksum,
            retryCount: photoItem.retryCount,
            lastError: photoItem.lastError,
            syncState:
              photoItem.status === 'UPLOADED'
                ? 'UPLOADED'
                : photoItem.status === 'FAILED'
                ? 'FAILED'
                : photoItem.status === 'UPLOADING'
                ? 'UPLOADING'
                : 'LOCAL',
          }
        : p
    );

  const queuedReport = await offlineStorage.getSyncQueueItem(photoItem.reportId);
  if (queuedReport) {
    await offlineStorage.updateSyncQueueItem({
      ...queuedReport,
      report: {
        ...queuedReport.report,
        receptions: {
          ...queuedReport.report.receptions,
          photos: applyToPhotos(queuedReport.report.receptions.photos),
        },
      },
    });
  }

  const localDraft = await offlineStorage.getLocalDraft(photoItem.reportId);
  if (localDraft) {
    await offlineStorage.saveLocalDraft({
      ...localDraft,
      receptions: {
        ...localDraft.receptions,
        photos: applyToPhotos(localDraft.receptions.photos),
      },
    });
  }
}

/**
 * Synchronise une fiche individuelle de la file hors ligne en 2 phases :
 * Phase 1 : téléversement individuel de chaque photo en file (jamais silencieusement ignorée).
 * Phase 2 : soumission idempotente (clientSubmissionId) de la fiche vers le backend.
 * La fiche n'est retirée de syncQueue qu'après confirmation explicite du serveur.
 */
export async function synchronizeSingleQueuedItem(
  user: UserProfile,
  repository: DataRepository,
  item: OfflineSyncQueueItem
): Promise<{
  outcome: 'SYNCED' | 'CONFLICT_SERVER' | 'CONFLICT_LOCAL' | 'FAILED';
  photosUploaded: number;
  photosFailed: number;
  idempotentReplay: boolean;
  duplicates: string[];
}> {
  let photosUploaded = 0;
  let photosFailed = 0;

  // Ensure every photo on the report exists in photoQueue before attempting upload
  await offlineStorage.syncReportPhotosToQueue(item.report);
  const reportPhotos = await offlineStorage.getQueuedPhotosForReport(item.id);

  // Phase 1: Upload pending / failed photos individually
  const updatedPhotoMap = new Map<string, QueuedPhotoItem>();
  for (const photo of reportPhotos) {
    if (photo.status === 'UPLOADED') {
      updatedPhotoMap.set(photo.id, photo);
      continue;
    }
    const res = await uploadSingleQueuedPhoto(user, repository, photo);
    updatedPhotoMap.set(photo.id, res.updated);
    if (res.ok) {
      photosUploaded += 1;
    } else {
      photosFailed += 1;
    }
  }

  // If ANY photo failed to upload, preserve the report safely in syncQueue without losing data!
  if (photosFailed > 0) {
    const attemptAt = new Date().toISOString();
    const refreshedPhotos: ReportPhoto[] = item.report.receptions.photos.map((p) => {
      const q = updatedPhotoMap.get(p.id);
      if (!q) return p;
      return {
        ...p,
        remoteUrl: q.remoteUrl ?? p.remoteUrl,
        checksum: q.checksum,
        retryCount: q.retryCount,
        lastError: q.lastError,
        syncState: q.status === 'UPLOADED' ? 'UPLOADED' : 'FAILED',
      };
    });

    await offlineStorage.updateSyncQueueItem({
      ...item,
      status: 'FAILED',
      retryCount: item.retryCount + 1,
      lastAttemptAt: attemptAt,
      nextRetryAt: computeNextRetryIso(item.retryCount + 1),
      lastError: `Échec du téléversement de ${photosFailed} photo(s). Les images et la fiche restent conservées dans IndexedDB.`,
      report: {
        ...item.report,
        syncStatus: 'ERREUR_SYNC',
        receptions: {
          ...item.report.receptions,
          photos: refreshedPhotos,
        },
      },
    });
    return {
      outcome: 'FAILED',
      photosUploaded,
      photosFailed,
      idempotentReplay: false,
      duplicates: [],
    };
  }

  // Phase 2: All photos uploaded -> submit report with stable idempotent clientSubmissionId
  const attemptAt = new Date().toISOString();
  const enrichedPhotos: ReportPhoto[] = item.report.receptions.photos.map((p) => {
    const q = updatedPhotoMap.get(p.id);
    return {
      ...p,
      remoteUrl: q?.remoteUrl ?? p.remoteUrl,
      checksum: q?.checksum ?? p.checksum,
      retryCount: q?.retryCount ?? p.retryCount,
      lastError: undefined,
      syncState: 'UPLOADED',
    };
  });

  const enrichedReport: FieldReport = {
    ...item.report,
    clientSubmissionId: item.clientSubmissionId,
    receptions: {
      ...item.report.receptions,
      photos: enrichedPhotos,
    },
  };

  await offlineStorage.updateSyncQueueItem({
    ...item,
    status: 'SYNCING',
    lastAttemptAt: attemptAt,
    report: enrichedReport,
  });

  try {
    const res = await repository.submitReport(user, enrichedReport, {
      syncFromOffline: true,
      clientSubmissionId: item.clientSubmissionId,
    });

    // ONLY remove from syncQueue after explicit backend acknowledgement!
    await offlineStorage.removeSyncQueueItem(item.id);
    await offlineStorage.deleteLocalDraft(item.id).catch(() => undefined);

    return {
      outcome: res.conflictDetected ? 'CONFLICT_SERVER' : 'SYNCED',
      photosUploaded,
      photosFailed: 0,
      idempotentReplay: Boolean(res.idempotentReplay),
      duplicates: res.duplicates || [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau lors de la synchronisation.';
    if (isAssignmentPermissionConflict(message)) {
      await offlineStorage.updateSyncQueueItem({
        ...item,
        status: 'CONFLICT',
        retryCount: item.retryCount + 1,
        lastAttemptAt: attemptAt,
        conflictDetected: true,
        conflictReason:
          "Affectation modifiée pendant le mode hors ligne. Travail et photos conservés intégralement dans IndexedDB sans perte pour arbitrage Coordonnateur.",
        lastError: message,
        report: { ...enrichedReport, syncStatus: 'CONFLIT_AFFECTATION' },
      });
      return {
        outcome: 'CONFLICT_LOCAL',
        photosUploaded,
        photosFailed: 0,
        idempotentReplay: false,
        duplicates: [],
      };
    }

    await offlineStorage.updateSyncQueueItem({
      ...item,
      status: 'FAILED',
      retryCount: item.retryCount + 1,
      lastAttemptAt: attemptAt,
      nextRetryAt: computeNextRetryIso(item.retryCount + 1),
      lastError: message,
      report: { ...enrichedReport, syncStatus: 'ERREUR_SYNC' },
    });
    return {
      outcome: 'FAILED',
      photosUploaded,
      photosFailed: 0,
      idempotentReplay: false,
      duplicates: [],
    };
  }
}

/**
 * Exécute la synchronisation complète pour un utilisateur connecté :
 * 1) Récupère tout téléversement interrompu par un redémarrage précédent.
 * 2) Synchronise chaque fiche en file (photos d'abord, puis fiche idempotente).
 * 3) Retente aussi les photos en file associées à des brouillons ou en attente isolée.
 * 4) Journalise l'opération localement et côté serveur sans jamais supprimer de donnée non confirmée.
 */
export async function runFullOfflineSynchronization(
  user: UserProfile,
  repository: DataRepository,
  options?: { includeConflicts?: boolean; targetReportId?: string }
): Promise<SyncRunSummary> {
  await offlineStorage.recoverInterruptedUploads(user.id);

  const allQueued = await offlineStorage.getSyncQueue(user.id);
  const targets = options?.targetReportId
    ? allQueued.filter((q) => q.id === options.targetReportId)
    : allQueued.filter((q) => (options?.includeConflicts ? true : !q.conflictDetected));

  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  let photosUploaded = 0;
  let photosFailed = 0;
  let idempotentReplays = 0;
  let duplicatesDetected = 0;

  for (const item of targets) {
    const result = await synchronizeSingleQueuedItem(user, repository, item);
    photosUploaded += result.photosUploaded;
    photosFailed += result.photosFailed;
    if (result.idempotentReplay) idempotentReplays += 1;
    if (result.duplicates.length > 0) duplicatesDetected += 1;

    if (result.outcome === 'SYNCED') {
      synced += 1;
    } else if (result.outcome === 'CONFLICT_SERVER') {
      synced += 1;
      conflicts += 1;
    } else if (result.outcome === 'CONFLICT_LOCAL') {
      conflicts += 1;
    } else {
      failed += 1;
    }
  }

  // Also upload any standalone queued photos belonging to non-queued reports (e.g. local drafts when online)
  if (!options?.targetReportId) {
    const queuedReportIds = new Set(allQueued.map((q) => q.id));
    const standalonePhotos = (await offlineStorage.getPhotoQueue(user.id)).filter(
      (p) => !queuedReportIds.has(p.reportId) && (p.status === 'QUEUED' || p.status === 'FAILED')
    );
    for (const photo of standalonePhotos) {
      const res = await uploadSingleQueuedPhoto(user, repository, photo);
      if (res.ok) photosUploaded += 1;
      else photosFailed += 1;
    }
  }

  if (targets.length > 0 || photosUploaded > 0 || photosFailed > 0) {
    const parts = [
      `${synced} fiche(s) confirmée(s)`,
      `${photosUploaded} photo(s) téléversée(s)`,
    ];
    if (conflicts > 0) parts.push(`${conflicts} conflit(s) d’affectation`);
    if (duplicatesDetected > 0) parts.push(`${duplicatesDetected} doublon(s) potentiel(s) signalé(s)`);
    if (idempotentReplays > 0) parts.push(`${idempotentReplays} reprise(s) idempotente(s)`);
    if (failed > 0 || photosFailed > 0) parts.push(`${failed} fiche(s) / ${photosFailed} photo(s) en échec conservée(s)`);

    const summary = `Synchronisation : ${parts.join(' · ')}.`;
    const localLog: SyncLog = {
      id: generateUniqueId('SYNC-LOC'),
      userId: user.id,
      syncedCount: synced,
      failedCount: failed + photosFailed,
      conflictCount: conflicts,
      summary: summary.slice(0, 480),
      createdAt: new Date().toISOString(),
    };
    await offlineStorage.addLocalSyncLog(localLog);
    await repository
      .recordSyncLog(user, {
        syncedCount: synced,
        failedCount: failed + photosFailed,
        conflictCount: conflicts,
        summary: summary.slice(0, 480),
      })
      .catch(() => undefined);
  }

  return {
    synced,
    failed,
    conflicts,
    photosUploaded,
    photosFailed,
    idempotentReplays,
    duplicatesDetected,
  };
}
