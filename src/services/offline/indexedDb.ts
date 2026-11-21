import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { generateUniqueId } from '../../domain/formatters';
import type {
  AgentAssignment,
  FieldReport,
  Project,
  ReportPhoto,
  SyncLog,
  UserProfile,
} from '../../types/domain';

export type QueuedPhotoStatus = 'QUEUED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

export interface QueuedPhotoItem {
  id: string; // matches ReportPhoto.id
  reportId: string;
  projectId: string;
  agentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  capturedAt: string;
  dataUrl: string;
  checksum: string;
  status: QueuedPhotoStatus;
  retryCount: number;
  lastError?: string;
  lastAttemptAt?: string;
  remoteUrl?: string;
  queuedAt: string;
  uploadedAt?: string;
}

export type SyncQueueItemStatus = 'QUEUED' | 'SYNCING' | 'FAILED' | 'CONFLICT';

export interface OfflineSyncQueueItem {
  id: string; // matches FieldReport.id
  agentId: string;
  clientSubmissionId: string; // stable idempotency key per submission attempt
  report: FieldReport;
  status: SyncQueueItemStatus;
  queuedAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
  conflictDetected?: boolean;
  conflictReason?: string;
  duplicateOf?: string[];
}

export interface OfflineMetaRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface OfflineSnapshot {
  projects: (Project & { cachedAt?: string })[];
  assignments: AgentAssignment[];
  reports: FieldReport[];
  lastCachedAt: string | null;
}

export interface LocalBackupExport {
  exportedAt: string;
  schemaVersion: number;
  userId: string;
  localDrafts: FieldReport[];
  syncQueue: OfflineSyncQueueItem[];
  photoQueue: QueuedPhotoItem[];
  syncLogs: SyncLog[];
}

interface BcecoOfflineDB extends DBSchema {
  assignedProjects: {
    key: string; // `${userId}::${project.id}`
    value: Project & { cacheKey: string; cachedForUserId: string; cachedAt: string };
    indexes: { 'by-user': string };
  };
  cachedAssignments: {
    key: string; // `${userId}::${assignment.id}`
    value: AgentAssignment & { cacheKey: string; cachedForUserId: string; cachedAt: string };
    indexes: { 'by-user': string };
  };
  cachedReports: {
    key: string; // `${userId}::${report.id}`
    value: FieldReport & { cacheKey: string; cachedForUserId: string; cachedAt: string };
    indexes: { 'by-user': string };
  };
  localDrafts: {
    key: string; // report.id
    value: FieldReport;
    indexes: { 'by-agent': string; 'by-project': string };
  };
  photoQueue: {
    key: string; // photo.id
    value: QueuedPhotoItem;
    indexes: { 'by-report': string; 'by-agent': string; 'by-status': string };
  };
  syncQueue: {
    key: string; // report.id
    value: OfflineSyncQueueItem;
    indexes: { 'by-agent': string };
  };
  syncLogs: {
    key: string;
    value: SyncLog;
    indexes: { 'by-user': string };
  };
  meta: {
    key: string;
    value: OfflineMetaRecord;
  };
}

export const OFFLINE_DB_NAME = 'bceco_pdl145t_terrain_offline_v1';
export const OFFLINE_DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<BcecoOfflineDB>> | null = null;

function getOfflineDb(): Promise<IDBPDatabase<BcecoOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BcecoOfflineDB>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // Recreate ONLY read-through server snapshot caches on < v3 so each userId has isolated keys.
        // NEVER delete localDrafts, photoQueue, syncQueue, syncLogs, or meta!
        if (oldVersion < 3) {
          for (const cacheStore of ['assignedProjects', 'cachedAssignments', 'cachedReports'] as const) {
            if (db.objectStoreNames.contains(cacheStore)) {
              db.deleteObjectStore(cacheStore);
            }
          }
        }
        if (!db.objectStoreNames.contains('assignedProjects')) {
          const store = db.createObjectStore('assignedProjects', { keyPath: 'cacheKey' });
          store.createIndex('by-user', 'cachedForUserId');
        }
        if (!db.objectStoreNames.contains('cachedAssignments')) {
          const store = db.createObjectStore('cachedAssignments', { keyPath: 'cacheKey' });
          store.createIndex('by-user', 'cachedForUserId');
        }
        if (!db.objectStoreNames.contains('cachedReports')) {
          const store = db.createObjectStore('cachedReports', { keyPath: 'cacheKey' });
          store.createIndex('by-user', 'cachedForUserId');
        }
        if (!db.objectStoreNames.contains('localDrafts')) {
          const store = db.createObjectStore('localDrafts', { keyPath: 'id' });
          store.createIndex('by-agent', 'agentId');
          store.createIndex('by-project', 'projectId');
        } else {
          const store = tx.objectStore('localDrafts');
          if (!store.indexNames.contains('by-project')) {
            store.createIndex('by-project', 'projectId');
          }
        }
        if (!db.objectStoreNames.contains('photoQueue')) {
          const store = db.createObjectStore('photoQueue', { keyPath: 'id' });
          store.createIndex('by-report', 'reportId');
          store.createIndex('by-agent', 'agentId');
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('by-agent', 'agentId');
        } else {
          const store = tx.objectStore('syncQueue');
          if (!store.indexNames.contains('by-agent')) {
            store.createIndex('by-agent', 'agentId');
          }
        }
        if (!db.objectStoreNames.contains('syncLogs')) {
          const store = db.createObjectStore('syncLogs', { keyPath: 'id' });
          store.createIndex('by-user', 'userId');
        } else {
          const store = tx.objectStore('syncLogs');
          if (!store.indexNames.contains('by-user')) {
            store.createIndex('by-user', 'userId');
          }
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Ferme proprement la connexion IndexedDB (utilisé pour les tests de redémarrage complet).
 */
export async function closeOfflineDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

/**
 * Empreinte déterministe légère (FNV-1a) permettant de détecter les doublons photo
 * et de vérifier l'intégrité des images hors ligne.
 */
export function computePhotoChecksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}-${content.length}`;
}

export const offlineStorage = {
  // ---------------------------------------------------------------------------
  // Offline Snapshot Cache (Assigned Projects, Assignments, Historical Reports)
  // NEVER touches localDrafts, photoQueue, or syncQueue!
  // ---------------------------------------------------------------------------
  async cacheAssignedProjects(userId: string, projects: Project[]): Promise<void> {
    const db = await getOfflineDb();
    const tx = db.transaction('assignedProjects', 'readwrite');
    const index = tx.store.index('by-user');
    let cursor = await index.openCursor(userId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    const now = new Date().toISOString();
    for (const p of projects) {
      await tx.store.put({
        ...p,
        cacheKey: `${userId}::${p.id}`,
        cachedForUserId: userId,
        cachedAt: now,
      });
    }
    await tx.done;
  },

  async cacheOfflineSnapshot(
    userId: string,
    payload: { projects: Project[]; assignments: AgentAssignment[]; reports: FieldReport[] }
  ): Promise<string> {
    const db = await getOfflineDb();
    const now = new Date().toISOString();

    const tx = db.transaction(['assignedProjects', 'cachedAssignments', 'cachedReports', 'meta'], 'readwrite');

    // Replace only cached server snapshots for this userId — never touch local drafts or queues
    for (const storeName of ['assignedProjects', 'cachedAssignments', 'cachedReports'] as const) {
      const store = tx.objectStore(storeName);
      const index = store.index('by-user');
      let cursor = await index.openCursor(userId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }

    const projStore = tx.objectStore('assignedProjects');
    for (const p of payload.projects) {
      await projStore.put({
        ...p,
        cacheKey: `${userId}::${p.id}`,
        cachedForUserId: userId,
        cachedAt: now,
      });
    }

    const assignStore = tx.objectStore('cachedAssignments');
    for (const a of payload.assignments) {
      await assignStore.put({
        ...a,
        cacheKey: `${userId}::${a.id}`,
        cachedForUserId: userId,
        cachedAt: now,
      });
    }

    const repStore = tx.objectStore('cachedReports');
    for (const r of payload.reports) {
      await repStore.put({
        ...r,
        cacheKey: `${userId}::${r.id}`,
        cachedForUserId: userId,
        cachedAt: now,
      });
    }

    await tx.objectStore('meta').put({
      key: `lastCachedAt:${userId}`,
      value: now,
      updatedAt: now,
    });

    await tx.done;
    return now;
  },

  async getCachedAssignedProjects(userId: string): Promise<(Project & { cachedAt?: string })[]> {
    const db = await getOfflineDb();
    const rows = await db.getAllFromIndex('assignedProjects', 'by-user', userId);
    return rows.map(({ cacheKey: _k, cachedForUserId: _u, ...rest }) => rest);
  },

  async getOfflineSnapshot(userId: string): Promise<OfflineSnapshot> {
    const db = await getOfflineDb();
    const [projects, assignments, reports, metaRec] = await Promise.all([
      db.getAllFromIndex('assignedProjects', 'by-user', userId),
      db.getAllFromIndex('cachedAssignments', 'by-user', userId),
      db.getAllFromIndex('cachedReports', 'by-user', userId),
      db.get('meta', `lastCachedAt:${userId}`),
    ]);
    const lastCachedAt =
      typeof metaRec?.value === 'string'
        ? metaRec.value
        : projects[0]?.cachedAt ?? null;
    return {
      projects: projects.map(({ cacheKey: _k, cachedForUserId: _u, ...rest }) => rest),
      assignments: assignments.map(({ cacheKey: _k, cachedForUserId: _u, cachedAt: _c, ...rest }) => rest),
      reports: reports.map(({ cacheKey: _k, cachedForUserId: _u, cachedAt: _c, ...rest }) => rest),
      lastCachedAt,
    };
  },

  // ---------------------------------------------------------------------------
  // Offline Session & Active Draft Recovery Pointer
  // ---------------------------------------------------------------------------
  async saveCachedUserProfile(profile: UserProfile): Promise<void> {
    const db = await getOfflineDb();
    const now = new Date().toISOString();
    await db.put('meta', {
      key: `userProfile:${profile.id}`,
      value: profile,
      updatedAt: now,
    });
  },

  async getCachedUserProfile(userId: string): Promise<UserProfile | null> {
    const db = await getOfflineDb();
    const rec = await db.get('meta', `userProfile:${userId}`);
    return (rec?.value as UserProfile) ?? null;
  },

  async setActiveDraftId(userId: string, reportId: string | null): Promise<void> {
    const db = await getOfflineDb();
    const key = `activeDraft:${userId}`;
    if (!reportId) {
      await db.delete('meta', key);
      return;
    }
    await db.put('meta', {
      key,
      value: reportId,
      updatedAt: new Date().toISOString(),
    });
  },

  async getActiveDraftId(userId: string): Promise<string | null> {
    const db = await getOfflineDb();
    const rec = await db.get('meta', `activeDraft:${userId}`);
    return typeof rec?.value === 'string' ? rec.value : null;
  },

  // ---------------------------------------------------------------------------
  // Local Draft Persistence (Auto-saved & Manual Drafts)
  // ---------------------------------------------------------------------------
  async saveLocalDraft(report: FieldReport): Promise<void> {
    const db = await getOfflineDb();
    await db.put('localDrafts', report);
  },

  async getLocalDraft(reportId: string): Promise<FieldReport | undefined> {
    const db = await getOfflineDb();
    return db.get('localDrafts', reportId);
  },

  async getLocalDrafts(agentId?: string): Promise<FieldReport[]> {
    const db = await getOfflineDb();
    if (agentId) {
      return db.getAllFromIndex('localDrafts', 'by-agent', agentId);
    }
    return db.getAll('localDrafts');
  },

  async deleteLocalDraft(reportId: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete('localDrafts', reportId);
  },

  // ---------------------------------------------------------------------------
  // Dedicated Photograph Upload Queue (IndexedDB photoQueue store)
  // ---------------------------------------------------------------------------
  async enqueuePhoto(input: {
    photo: ReportPhoto;
    reportId: string;
    projectId: string;
    agentId: string;
  }): Promise<QueuedPhotoItem> {
    const db = await getOfflineDb();
    const existing = await db.get('photoQueue', input.photo.id);
    const now = new Date().toISOString();
    const checksum = input.photo.checksum || computePhotoChecksum(input.photo.dataUrl);

    const item: QueuedPhotoItem = {
      id: input.photo.id,
      reportId: input.reportId,
      projectId: input.projectId,
      agentId: input.agentId,
      fileName: input.photo.fileName,
      mimeType: input.photo.mimeType,
      sizeBytes: input.photo.sizeBytes,
      caption: input.photo.caption,
      capturedAt: input.photo.capturedAt,
      dataUrl: input.photo.dataUrl,
      checksum,
      status:
        existing?.status === 'UPLOADED' || input.photo.syncState === 'UPLOADED'
          ? 'UPLOADED'
          : 'QUEUED',
      retryCount: existing?.retryCount ?? 0,
      lastError: existing?.status === 'UPLOADED' ? undefined : existing?.lastError,
      lastAttemptAt: existing?.lastAttemptAt,
      remoteUrl: existing?.remoteUrl ?? input.photo.remoteUrl,
      queuedAt: existing?.queuedAt ?? now,
      uploadedAt: existing?.uploadedAt,
    };

    await db.put('photoQueue', item);
    return item;
  },

  async syncReportPhotosToQueue(report: FieldReport): Promise<QueuedPhotoItem[]> {
    const results: QueuedPhotoItem[] = [];
    for (const photo of report.receptions.photos || []) {
      const queued = await this.enqueuePhoto({
        photo,
        reportId: report.id,
        projectId: report.projectId,
        agentId: report.agentId,
      });
      results.push(queued);
    }
    return results;
  },

  async getPhotoQueue(agentId?: string): Promise<QueuedPhotoItem[]> {
    const db = await getOfflineDb();
    const list = agentId
      ? await db.getAllFromIndex('photoQueue', 'by-agent', agentId)
      : await db.getAll('photoQueue');
    return list.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  },

  async getQueuedPhotosForReport(reportId: string): Promise<QueuedPhotoItem[]> {
    const db = await getOfflineDb();
    return db.getAllFromIndex('photoQueue', 'by-report', reportId);
  },

  async getQueuedPhoto(photoId: string): Promise<QueuedPhotoItem | undefined> {
    const db = await getOfflineDb();
    return db.get('photoQueue', photoId);
  },

  async updateQueuedPhoto(item: QueuedPhotoItem): Promise<void> {
    const db = await getOfflineDb();
    await db.put('photoQueue', item);
  },

  async removeQueuedPhoto(photoId: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete('photoQueue', photoId);
  },

  // ---------------------------------------------------------------------------
  // Report Sync Queue (Idempotent clientSubmissionId + Never-Discard Protection)
  // ---------------------------------------------------------------------------
  async enqueueReportForSync(
    report: FieldReport,
    opts?: { clientSubmissionId?: string; forceNewSubmissionKey?: boolean }
  ): Promise<OfflineSyncQueueItem> {
    const db = await getOfflineDb();
    const existing = await db.get('syncQueue', report.id);

    // Ensure every photo attached to the report is durably stored in photoQueue first!
    await this.syncReportPhotosToQueue(report);

    const clientSubmissionId =
      opts?.clientSubmissionId ??
      (!opts?.forceNewSubmissionKey ? existing?.clientSubmissionId : undefined) ??
      (!opts?.forceNewSubmissionKey ? report.clientSubmissionId : undefined) ??
      generateUniqueId('SUB');

    const now = new Date().toISOString();
    const item: OfflineSyncQueueItem = {
      id: report.id,
      agentId: report.agentId,
      clientSubmissionId,
      report: {
        ...report,
        clientSubmissionId,
        status: 'EN_ATTENTE_SYNC',
        syncStatus: 'EN_ATTENTE_SYNC',
        updatedAt: report.updatedAt || now,
      },
      status: 'QUEUED',
      queuedAt: existing?.queuedAt ?? now,
      retryCount: existing?.retryCount ?? 0,
      lastAttemptAt: existing?.lastAttemptAt,
      nextRetryAt: undefined,
      lastError: undefined,
      conflictDetected: false,
      conflictReason: undefined,
      duplicateOf: existing?.duplicateOf,
    };

    const tx = db.transaction(['syncQueue', 'localDrafts'], 'readwrite');
    await tx.objectStore('syncQueue').put(item);
    // Move atomically from pure localDrafts -> syncQueue so no ambiguous split state occurs
    await tx.objectStore('localDrafts').delete(report.id);
    await tx.done;
    return item;
  },

  async getSyncQueue(agentId?: string): Promise<OfflineSyncQueueItem[]> {
    const db = await getOfflineDb();
    const all = await db.getAll('syncQueue');
    const normalized = all.map((item) => ({
      ...item,
      agentId: item.agentId || item.report.agentId,
      clientSubmissionId: item.clientSubmissionId || item.report.clientSubmissionId || generateUniqueId('SUB'),
      status:
        item.status ??
        (item.conflictDetected
          ? 'CONFLICT'
          : item.lastError
          ? 'FAILED'
          : 'QUEUED'),
    }));
    const filtered = agentId
      ? normalized.filter((item) => item.agentId === agentId || item.report.agentId === agentId)
      : normalized;
    return filtered.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  },

  async getSyncQueueItem(reportId: string): Promise<OfflineSyncQueueItem | undefined> {
    const db = await getOfflineDb();
    return db.get('syncQueue', reportId);
  },

  async updateSyncQueueItem(item: OfflineSyncQueueItem): Promise<void> {
    const db = await getOfflineDb();
    await db.put('syncQueue', item);
  },

  async removeSyncQueueItem(reportId: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete('syncQueue', reportId);
  },

  /**
   * Re-ouvre une fiche en échec ou en conflit dans localDrafts SANS JAMAIS la supprimer
   * de manière destructive (les photos associées dans photoQueue sont également préservées).
   */
  async moveQueuedItemToDraftForEditing(reportId: string): Promise<FieldReport | null> {
    const db = await getOfflineDb();
    const queued = await db.get('syncQueue', reportId);
    if (!queued) return null;

    const draft: FieldReport = {
      ...queued.report,
      status: queued.report.reviews.some((r) => r.decision === 'RETOURNE') ? 'RETOURNE' : 'BROUILLON',
      syncStatus: 'LOCAL_BROUILLON',
      updatedAt: new Date().toISOString(),
    };

    const tx = db.transaction(['localDrafts', 'syncQueue'], 'readwrite');
    await tx.objectStore('localDrafts').put(draft);
    await tx.objectStore('syncQueue').delete(reportId);
    await tx.done;
    return draft;
  },

  // ---------------------------------------------------------------------------
  // Crash / App Restart Recovery (resets interrupted UPLOADING / SYNCING items)
  // ---------------------------------------------------------------------------
  async recoverInterruptedUploads(userId?: string): Promise<{ recoveredPhotos: number; recoveredReports: number }> {
    const db = await getOfflineDb();
    let recoveredPhotos = 0;
    let recoveredReports = 0;

    const photos = userId
      ? await db.getAllFromIndex('photoQueue', 'by-agent', userId)
      : await db.getAll('photoQueue');
    for (const p of photos) {
      if (p.status === 'UPLOADING') {
        await db.put('photoQueue', {
          ...p,
          status: 'QUEUED',
          lastError: 'Téléversement interrompu par redémarrage — remis en file automatiquement.',
        });
        recoveredPhotos += 1;
      }
    }

    const queue = await this.getSyncQueue(userId);
    for (const q of queue) {
      if (q.status === 'SYNCING') {
        await db.put('syncQueue', {
          ...q,
          status: 'QUEUED',
          lastError: 'Synchronisation interrompue par redémarrage — prête pour reprise idempotente.',
        });
        recoveredReports += 1;
      }
    }

    return { recoveredPhotos, recoveredReports };
  },

  // ---------------------------------------------------------------------------
  // Local Sync Logs & Zero-Data-Loss JSON Backup Export
  // ---------------------------------------------------------------------------
  async addLocalSyncLog(log: SyncLog): Promise<void> {
    const db = await getOfflineDb();
    await db.put('syncLogs', log);
  },

  async getLocalSyncLogs(userId?: string): Promise<SyncLog[]> {
    const db = await getOfflineDb();
    const all = await db.getAll('syncLogs');
    const filtered = userId ? all.filter((l) => l.userId === userId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async exportLocalBackup(userId: string): Promise<LocalBackupExport> {
    const [localDrafts, syncQueue, photoQueue, syncLogs] = await Promise.all([
      this.getLocalDrafts(userId),
      this.getSyncQueue(userId),
      this.getPhotoQueue(userId),
      this.getLocalSyncLogs(userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: OFFLINE_DB_VERSION,
      userId,
      localDrafts,
      syncQueue,
      photoQueue,
      syncLogs,
    };
  },
};

/**
 * Compresse une photographie prise sur le terrain côté client (max 960px, JPEG 0.72)
 * afin de garantir la persistance hors ligne IndexedDB et le respect des limites de taille.
 */
export function compressFieldPhoto(file: File): Promise<{ dataUrl: string; sizeBytes: number; checksum: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image sélectionné.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format image non pris en charge.'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackUrl = String(reader.result);
          resolve({
            dataUrl: fallbackUrl,
            sizeBytes: file.size,
            checksum: computePhotoChecksum(fallbackUrl),
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        const approxBytes = Math.round((compressed.length * 3) / 4);
        resolve({
          dataUrl: compressed,
          sizeBytes: approxBytes,
          checksum: computePhotoChecksum(compressed),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
