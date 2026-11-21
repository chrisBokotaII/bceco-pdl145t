import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { generateUniqueId } from '../domain/formatters';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { auth, googleProvider, testFirestoreConnection } from '../services/firebase/firebaseClient';
import {
  offlineStorage,
  type OfflineSyncQueueItem,
  type QueuedPhotoItem,
} from '../services/offline/indexedDb';
import {
  runFullOfflineSynchronization,
  uploadSingleQueuedPhoto,
  type SyncRunSummary,
} from '../services/offline/syncEngine';
import {
  DemoApiRepository,
  loginWithDemoAdapter,
  verifyDemoSessionDetailed,
} from '../services/repository/demoApiRepository';
import { FirebaseRepository, resolveOrCreateFirebaseUserProfile } from '../services/repository/firebaseRepository';
import type {
  CreateAgentInput,
  CreateAssignmentsInput,
  DataRepository,
  UpdateAgentInput,
} from '../services/repository/types';
import {
  buildConsolidatedReportModel,
  type ReportingFilterParams,
} from '../domain/reportingEngine';
import type { CsvExportVariant } from '../services/export/reportExporter';
import type {
  AgentAssignment,
  AuditLog,
  AuthProviderMode,
  ExportFormat,
  FieldReport,
  GeneratedReportRecord,
  Project,
  ReportPhoto,
  SyncLog,
  UserProfile,
} from '../types/domain';

const DEMO_SESSION_STORAGE_KEY = 'bceco_pdl145t_demo_session_v1';
const SIM_OFFLINE_KEY = 'bceco_pdl145t_simulated_offline';

export interface ToastNotice {
  id: string;
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  detail?: string;
}

interface StoredDemoSession {
  token: string;
  user: UserProfile;
}

interface AppContextValue {
  // Auth & Session
  currentUser: UserProfile | null;
  authMode: AuthProviderMode | null;
  authLoading: boolean;
  dataLoading: boolean;
  firestoreReachable: boolean;
  loginDemo: (email: string, password: string) => Promise<void>;
  loginFirebaseGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Connectivity & Offline Sync
  isOnline: boolean;
  browserOnline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  isSyncing: boolean;
  localDrafts: FieldReport[];
  photoQueue: QueuedPhotoItem[];
  syncQueue: OfflineSyncQueueItem[];
  localSyncLogs: SyncLog[];
  lastCachedAt: string | null;
  activeDraftId: string | null;
  setActiveDraftPointer: (reportId: string | null) => Promise<void>;
  synchronizeNow: (options?: { includeConflicts?: boolean }) => Promise<SyncRunSummary>;
  retrySingleReport: (reportId: string) => Promise<SyncRunSummary>;
  retrySinglePhoto: (photoId: string) => Promise<boolean>;
  queueFieldPhoto: (input: {
    photo: ReportPhoto;
    reportId: string;
    projectId: string;
  }) => Promise<QueuedPhotoItem | null>;
  removeQueuedPhoto: (photoId: string) => Promise<void>;
  reopenQueuedReportAsDraft: (reportId: string) => Promise<FieldReport | null>;
  exportOfflineBackupJson: () => Promise<void>;

  // Domain Datasets
  users: UserProfile[];
  projects: Project[];
  assignments: AgentAssignment[];
  reports: FieldReport[];
  generatedReports: GeneratedReportRecord[];
  syncLogs: SyncLog[];
  auditLogs: AuditLog[];
  refreshData: () => Promise<void>;
  seedFirestoreWithDemo: () => Promise<void>;

  // Mutations
  saveDraftLocally: (draft: FieldReport, options?: { silent?: boolean }) => Promise<void>;
  deleteLocalDraft: (reportId: string) => Promise<void>;
  submitFieldReport: (
    report: FieldReport
  ) => Promise<{ queuedOffline: boolean; conflictDetected: boolean; duplicates: string[] }>;
  reviewFieldReport: (
    reportId: string,
    decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE',
    comment: string
  ) => Promise<void>;
  createAgent: (input: CreateAgentInput) => Promise<UserProfile>;
  updateAgent: (agentId: string, input: UpdateAgentInput) => Promise<UserProfile>;
  importAuditedProjects: (projects: Project[]) => Promise<number>;
  createAssignments: (input: CreateAssignmentsInput) => Promise<number>;
  reassignAssignment: (assignmentId: string, targetAgentId: string, notes: string) => Promise<void>;
  endAssignment: (assignmentId: string, notes: string) => Promise<void>;
  recordGeneratedReport: (
    record: Omit<GeneratedReportRecord, 'id' | 'generatedBy' | 'generatedByName' | 'createdAt'>
  ) => Promise<void>;
  exportOfficialReport: (input: {
    format: ExportFormat;
    csvVariant?: CsvExportVariant;
    isRoadmap?: boolean;
    params: ReportingFilterParams;
  }) => Promise<{ fileName: string; generatedByServer: boolean }>;
  exportPhotosZip: (params: ReportingFilterParams) => Promise<{ fileName: string }>;
  redownloadGeneratedReport: (record: GeneratedReportRecord) => Promise<{ fileName: string }>;

  // Toasts
  toasts: ToastNotice[];
  pushToast: (tone: ToastNotice['tone'], title: string, detail?: string) => void;
  dismissToast: (id: string) => void;
}

const EMPTY_SYNC_SUMMARY: SyncRunSummary = {
  synced: 0,
  failed: 0,
  conflicts: 0,
  photosUploaded: 0,
  photosFailed: 0,
  idempotentReplays: 0,
  duplicatesDetected: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, browserOnline, simulatedOffline, setSimulatedOffline } = useOnlineStatus();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<AuthProviderMode | null>(null);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [firestoreReachable, setFirestoreReachable] = useState(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReportRecord[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [localDrafts, setLocalDrafts] = useState<FieldReport[]>([]);
  const [photoQueue, setPhotoQueue] = useState<QueuedPhotoItem[]>([]);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [localSyncLogs, setLocalSyncLogs] = useState<SyncLog[]>([]);
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const syncingRef = useRef(false);
  const recoveredUsersRef = useRef<Set<string>>(new Set());
  const wasOnlineRef = useRef<boolean>(isOnline);
  const initialAutoSyncDoneRef = useRef<string | null>(null);

  const pushToast = useCallback((tone: ToastNotice['tone'], title: string, detail?: string) => {
    const id = generateUniqueId('MSG');
    setToasts((prev) => [{ id, tone, title, detail }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const repository: DataRepository | null = useMemo(() => {
    if (authMode === 'FIREBASE_AUTH') {
      return new FirebaseRepository();
    }
    if (authMode === 'DEMO_ADAPTER' && demoToken) {
      return new DemoApiRepository(demoToken);
    }
    return null;
  }, [authMode, demoToken]);

  // Startup Firestore connectivity probe (mandatory per Firebase guidelines)
  useEffect(() => {
    testFirestoreConnection().then(setFirestoreReachable);
  }, []);

  // Load IndexedDB local state + crash recovery for current user
  const loadLocalOfflineData = useCallback(
    async (userId: string) => {
      try {
        if (!recoveredUsersRef.current.has(userId)) {
          recoveredUsersRef.current.add(userId);
          const recovered = await offlineStorage.recoverInterruptedUploads(userId);
          if (recovered.recoveredPhotos > 0 || recovered.recoveredReports > 0) {
            pushToast(
              'info',
              'Reprise après redémarrage',
              `${recovered.recoveredReports} fiche(s) et ${recovered.recoveredPhotos} photo(s) interrompue(s) restaurée(s) en file.`
            );
          }
        }

        const [drafts, photos, queue, logs, snapshot, activeDraft] = await Promise.all([
          offlineStorage.getLocalDrafts(userId),
          offlineStorage.getPhotoQueue(userId),
          offlineStorage.getSyncQueue(userId),
          offlineStorage.getLocalSyncLogs(userId),
          offlineStorage.getOfflineSnapshot(userId),
          offlineStorage.getActiveDraftId(userId),
        ]);

        setLocalDrafts(drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        setPhotoQueue(photos);
        setSyncQueue(queue);
        setLocalSyncLogs(logs);
        if (snapshot.lastCachedAt) {
          setLastCachedAt(snapshot.lastCachedAt);
        }
        const validActiveDraft = activeDraft && drafts.some((d) => d.id === activeDraft) ? activeDraft : null;
        setActiveDraftId(validActiveDraft);
        return snapshot;
      } catch (err) {
        console.error('IndexedDB load error:', err);
        return { projects: [], assignments: [], reports: [], lastCachedAt: null };
      }
    },
    [pushToast]
  );

  // Restore Demo session or Firebase Auth state on boot (supports full offline app restart!)
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const simOfflineActive = (() => {
        try {
          return localStorage.getItem(SIM_OFFLINE_KEY) === 'true';
        } catch {
          return false;
        }
      })();

      // 1) Check stored Demo session first (offline-first resilient!)
      try {
        const raw = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredDemoSession;
          if (parsed?.token && parsed?.user) {
            if (navigator.onLine && !simOfflineActive) {
              const verification = await verifyDemoSessionDetailed(parsed.token);
              if (!active) return;
              if (verification.status === 'VALID') {
                await offlineStorage.saveCachedUserProfile(verification.user).catch(() => undefined);
                setDemoToken(parsed.token);
                setCurrentUser(verification.user);
                setAuthMode('DEMO_ADAPTER');
                setAuthLoading(false);
                return;
              }
              if (verification.status === 'UNREACHABLE') {
                // Server temporarily unreachable — restore persisted session offline without losing local access!
                const cachedUser =
                  (await offlineStorage.getCachedUserProfile(parsed.user.id).catch(() => null)) ?? parsed.user;
                setDemoToken(parsed.token);
                setCurrentUser(cachedUser);
                setAuthMode('DEMO_ADAPTER');
                setAuthLoading(false);
                return;
              }
              // Explicit 401/403 token rejection: clear invalid token
              localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
            } else if (active) {
              // Offline startup (real or simulated) with persisted demo session
              const cachedUser =
                (await offlineStorage.getCachedUserProfile(parsed.user.id).catch(() => null)) ?? parsed.user;
              setDemoToken(parsed.token);
              setCurrentUser(cachedUser);
              setAuthMode('DEMO_ADAPTER');
              setAuthLoading(false);
              return;
            }
          }
        }
      } catch {
        // ignore corrupted storage
      }

      // 2) Subscribe to Firebase Auth state (with IndexedDB profile fallback for offline restart)
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (!active) return;
        if (fbUser) {
          try {
            const profile = await resolveOrCreateFirebaseUserProfile({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
            });
            if (!profile.isActive) {
              await signOut(auth).catch(() => undefined);
              if (active) {
                setCurrentUser(null);
                setAuthMode(null);
                pushToast(
                  'error',
                  'Compte désactivé',
                  'Ce compte agent a été désactivé par le Coordonnateur.'
                );
              }
              setAuthLoading(false);
              return;
            }
            await offlineStorage.saveCachedUserProfile(profile).catch(() => undefined);
            if (!active) return;
            setCurrentUser(profile);
            setAuthMode('FIREBASE_AUTH');
          } catch (err) {
            // Offline restart fallback using cached profile in IndexedDB
            const cachedProfile = await offlineStorage.getCachedUserProfile(fbUser.uid).catch(() => null);
            if (cachedProfile && cachedProfile.isActive && active) {
              setCurrentUser(cachedProfile);
              setAuthMode('FIREBASE_AUTH');
            } else {
              console.error('Firebase profile resolution error:', err);
            }
          }
        }
        setAuthLoading(false);
      });

      return unsub;
    };

    let unsubFn: (() => void) | undefined;
    restore().then((fn) => {
      if (typeof fn === 'function') unsubFn = fn;
    });

    return () => {
      active = false;
      if (unsubFn) unsubFn();
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser || !repository) return;
    setDataLoading(true);
    try {
      const snapshot = await loadLocalOfflineData(currentUser.id);

      // Hydrate immediately from IndexedDB cache so UI is instant even before network responds
      if (snapshot.projects.length > 0) {
        setProjects(snapshot.projects);
        setAssignments(snapshot.assignments);
        setReports(snapshot.reports);
      }

      if (!isOnline) {
        return;
      }

      const data = await repository.bootstrap(currentUser);
      setUsers(data.users);
      setProjects(data.projects);
      setAssignments(data.assignments);
      setReports(data.reports);
      setGeneratedReports(data.generatedReports);
      setSyncLogs(data.syncLogs);
      setAuditLogs(data.auditLogs);

      // Persist full offline snapshot (projects + assignments + reports) without ever touching local drafts or queues
      const cachedAt = await offlineStorage.cacheOfflineSnapshot(currentUser.id, {
        projects: data.projects,
        assignments: data.assignments,
        reports: data.reports,
      });
      setLastCachedAt(cachedAt);
    } catch (err) {
      // Fallback gracefully to IndexedDB snapshot if network dropped mid-request
      const snapshot = await offlineStorage.getOfflineSnapshot(currentUser.id).catch(() => null);
      if (snapshot && snapshot.projects.length > 0) {
        setProjects(snapshot.projects);
        setAssignments(snapshot.assignments);
        setReports(snapshot.reports);
        if (snapshot.lastCachedAt) setLastCachedAt(snapshot.lastCachedAt);
        pushToast(
          'warning',
          'Mode hors ligne actif',
          'Les ouvrages, affectations et historiques mis en cache localement (IndexedDB) sont chargés.'
        );
      } else {
        pushToast(
          'error',
          'Chargement des données impossible',
          err instanceof Error ? err.message : 'Erreur inconnue'
        );
      }
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, repository, isOnline, loadLocalOfflineData, pushToast]);

  useEffect(() => {
    if (currentUser && repository) {
      refreshData();
    }
  }, [currentUser, repository, refreshData]);

  // Login & Logout handlers
  const loginDemo = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await loginWithDemoAdapter(email, password);
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({ token, user }));
      await offlineStorage.saveCachedUserProfile(user).catch(() => undefined);
      setDemoToken(token);
      setCurrentUser(user);
      setAuthMode('DEMO_ADAPTER');
      pushToast('success', 'Connexion réussie (Mode Démonstration)', `Bienvenue, ${user.fullName}.`);
    },
    [pushToast]
  );

  const loginFirebaseGoogle = useCallback(async () => {
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setDemoToken(null);
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await resolveOrCreateFirebaseUserProfile({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
    });
    if (!profile.isActive) {
      await signOut(auth).catch(() => undefined);
      throw new Error('Ce compte agent a été désactivé par le Coordonnateur.');
    }
    await offlineStorage.saveCachedUserProfile(profile).catch(() => undefined);
    setCurrentUser(profile);
    setAuthMode('FIREBASE_AUTH');
    pushToast('success', 'Connexion Firebase réussie', `Session authentifiée (${profile.role}).`);
  }, [pushToast]);

  const logout = useCallback(async () => {
    const unsyncedCount = localDrafts.length + syncQueue.length + photoQueue.filter((p) => p.status !== 'UPLOADED').length;
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setDemoToken(null);
    if (authMode === 'FIREBASE_AUTH') {
      await signOut(auth).catch(() => undefined);
    }
    setCurrentUser(null);
    setAuthMode(null);
    setUsers([]);
    setProjects([]);
    setAssignments([]);
    setReports([]);
    setGeneratedReports([]);
    setSyncLogs([]);
    setAuditLogs([]);
    setLocalDrafts([]);
    setPhotoQueue([]);
    setSyncQueue([]);
    setActiveDraftId(null);
    initialAutoSyncDoneRef.current = null;
    if (unsyncedCount > 0) {
      pushToast(
        'info',
        'Données locales préservées dans IndexedDB',
        `${unsyncedCount} élément(s) non synchronisé(s) reste(nt) conservé(s) sur cet appareil pour votre prochaine connexion.`
      );
    }
  }, [authMode, localDrafts.length, syncQueue.length, photoQueue, pushToast]);

  // Active Draft Recovery Pointer
  const setActiveDraftPointer = useCallback(
    async (reportId: string | null) => {
      if (!currentUser) return;
      await offlineStorage.setActiveDraftId(currentUser.id, reportId);
      setActiveDraftId(reportId);
    },
    [currentUser]
  );

  // Offline Draft & Photograph Queue Operations
  const saveDraftLocally = useCallback(
    async (draft: FieldReport, options?: { silent?: boolean }) => {
      if (!currentUser) return;
      const toSave: FieldReport = {
        ...draft,
        agentId: currentUser.id,
        agentName: currentUser.fullName,
        status: draft.status === 'RETOURNE' ? 'RETOURNE' : 'BROUILLON',
        syncStatus: 'LOCAL_BROUILLON',
        updatedAt: new Date().toISOString(),
      };
      await offlineStorage.saveLocalDraft(toSave);
      await offlineStorage.syncReportPhotosToQueue(toSave);
      await offlineStorage.setActiveDraftId(currentUser.id, toSave.id);
      await loadLocalOfflineData(currentUser.id);
      if (!options?.silent) {
        pushToast('info', 'Brouillon sauvegardé localement', `Fiche ${toSave.id} conservée dans IndexedDB.`);
      }
    },
    [currentUser, loadLocalOfflineData, pushToast]
  );

  const deleteLocalDraft = useCallback(
    async (reportId: string) => {
      if (!currentUser) return;
      await offlineStorage.deleteLocalDraft(reportId);
      if (activeDraftId === reportId) {
        await offlineStorage.setActiveDraftId(currentUser.id, null);
      }
      await loadLocalOfflineData(currentUser.id);
      pushToast('info', 'Brouillon supprimé', `Le brouillon local ${reportId} a été retiré.`);
    },
    [currentUser, activeDraftId, loadLocalOfflineData, pushToast]
  );

  const queueFieldPhoto = useCallback(
    async (input: { photo: ReportPhoto; reportId: string; projectId: string }) => {
      if (!currentUser) return null;
      const queued = await offlineStorage.enqueuePhoto({
        photo: input.photo,
        reportId: input.reportId,
        projectId: input.projectId,
        agentId: currentUser.id,
      });
      await loadLocalOfflineData(currentUser.id);
      return queued;
    },
    [currentUser, loadLocalOfflineData]
  );

  const removeQueuedPhoto = useCallback(
    async (photoId: string) => {
      if (!currentUser) return;
      await offlineStorage.removeQueuedPhoto(photoId);
      await loadLocalOfflineData(currentUser.id);
    },
    [currentUser, loadLocalOfflineData]
  );

  const submitFieldReport = useCallback(
    async (report: FieldReport) => {
      if (!currentUser || !repository) {
        throw new Error('Session utilisateur non initialisée.');
      }

      const submissionKey = report.clientSubmissionId || generateUniqueId('SUB');
      const normalizedReport: FieldReport = {
        ...report,
        agentId: currentUser.id,
        agentName: currentUser.fullName,
        clientSubmissionId: submissionKey,
        updatedAt: new Date().toISOString(),
      };

      // Always persist photos into IndexedDB photoQueue first so they can NEVER be lost
      await offlineStorage.syncReportPhotosToQueue(normalizedReport);

      // If offline, enqueue cleanly in IndexedDB — never lose field work!
      if (!isOnline) {
        await offlineStorage.enqueueReportForSync(normalizedReport, { clientSubmissionId: submissionKey });
        await offlineStorage.setActiveDraftId(currentUser.id, null);
        await loadLocalOfflineData(currentUser.id);
        pushToast(
          'warning',
          'Fiche enregistrée en file hors ligne',
          `Fiche ${normalizedReport.id} et ${normalizedReport.receptions.photos.length} photo(s) conservées dans IndexedDB pour transmission automatique.`
        );
        return { queuedOffline: true, conflictDetected: false, duplicates: [] };
      }

      // Online two-phase submission: Phase 1 upload photos -> Phase 2 idempotent report submit
      const reportPhotos = await offlineStorage.getQueuedPhotosForReport(normalizedReport.id);
      let photoFailureCount = 0;
      const uploadedUrlMap = new Map<string, string>();

      for (const qPhoto of reportPhotos) {
        if (qPhoto.status === 'UPLOADED') {
          if (qPhoto.remoteUrl) uploadedUrlMap.set(qPhoto.id, qPhoto.remoteUrl);
          continue;
        }
        const uploadRes = await uploadSingleQueuedPhoto(currentUser, repository, qPhoto);
        if (uploadRes.ok) {
          if (uploadRes.updated.remoteUrl) {
            uploadedUrlMap.set(qPhoto.id, uploadRes.updated.remoteUrl);
          }
        } else {
          photoFailureCount += 1;
        }
      }

      const enrichedReport: FieldReport = {
        ...normalizedReport,
        receptions: {
          ...normalizedReport.receptions,
          photos: normalizedReport.receptions.photos.map((ph) => {
            const url = uploadedUrlMap.get(ph.id);
            const failedPhoto = reportPhotos.find((q) => q.id === ph.id);
            return {
              ...ph,
              remoteUrl: url ?? ph.remoteUrl,
              syncState: url !== undefined || failedPhoto?.status === 'UPLOADED' ? 'UPLOADED' : 'FAILED',
            };
          }),
        },
      };

      // If any photo upload failed, preserve EVERYTHING safely in syncQueue (NEVER silently discard!)
      if (photoFailureCount > 0) {
        const queuedItem = await offlineStorage.enqueueReportForSync(enrichedReport, {
          clientSubmissionId: submissionKey,
        });
        await offlineStorage.updateSyncQueueItem({
          ...queuedItem,
          status: 'FAILED',
          retryCount: 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: `Échec du téléversement de ${photoFailureCount} photo(s). La fiche et les photos sont conservées en file locale.`,
          report: { ...queuedItem.report, syncStatus: 'ERREUR_SYNC' },
        });
        await offlineStorage.setActiveDraftId(currentUser.id, null);
        await loadLocalOfflineData(currentUser.id);
        pushToast(
          'warning',
          'Téléversement photo interrompu — Travail conservé',
          `${photoFailureCount} photo(s) en échec conservée(s) dans la file IndexedDB. Relancez la synchronisation dès que le signal est stable.`
        );
        return { queuedOffline: true, conflictDetected: false, duplicates: [] };
      }

      try {
        const result = await repository.submitReport(currentUser, enrichedReport, {
          syncFromOffline: false,
          clientSubmissionId: submissionKey,
        });
        await offlineStorage.deleteLocalDraft(normalizedReport.id).catch(() => undefined);
        await offlineStorage.removeSyncQueueItem(normalizedReport.id).catch(() => undefined);
        await offlineStorage.setActiveDraftId(currentUser.id, null);
        await loadLocalOfflineData(currentUser.id);
        await refreshData();

        if (result.duplicates.length > 0) {
          pushToast(
            'warning',
            'Fiche soumise — Doublon potentiel signalé',
            `Une fiche existe déjà sur la même période (${result.duplicates.join(', ')}). Transmise pour vérification Coordonnateur.`
          );
        } else {
          pushToast('success', 'Fiche soumise avec succès', `Référence serveur : ${result.report.id}`);
        }
        return {
          queuedOffline: false,
          conflictDetected: result.conflictDetected,
          duplicates: result.duplicates,
        };
      } catch (err) {
        // Network failure fallback: queue locally with the EXACT SAME clientSubmissionId so retry is idempotent!
        const msg = err instanceof Error ? err.message : '';
        const isNetworkError =
          msg.includes('Failed to fetch') ||
          msg.includes('NetworkError') ||
          msg.includes('Load failed') ||
          !navigator.onLine;
        if (isNetworkError) {
          await offlineStorage.enqueueReportForSync(enrichedReport, { clientSubmissionId: submissionKey });
          await offlineStorage.setActiveDraftId(currentUser.id, null);
          await loadLocalOfflineData(currentUser.id);
          pushToast(
            'warning',
            'Réseau indisponible — Mise en file locale',
            'Votre fiche et vos photos sont sauvegardées dans IndexedDB avec reprise idempotente automatique.'
          );
          return { queuedOffline: true, conflictDetected: false, duplicates: [] };
        }
        throw err;
      }
    },
    [currentUser, repository, isOnline, loadLocalOfflineData, refreshData, pushToast]
  );

  // Synchronization Engine (runs manually, per-item, or automatically on reconnect)
  const synchronizeNow = useCallback(
    async (options?: { includeConflicts?: boolean; targetReportId?: string }): Promise<SyncRunSummary> => {
      if (!currentUser || !repository || !isOnline || syncingRef.current) {
        return EMPTY_SYNC_SUMMARY;
      }

      syncingRef.current = true;
      setIsSyncing(true);
      try {
        const result = await runFullOfflineSynchronization(currentUser, repository, options);
        await loadLocalOfflineData(currentUser.id);
        if (result.synced > 0 || result.photosUploaded > 0) {
          await refreshData();
        }

        const totalProcessed =
          result.synced + result.failed + result.conflicts + result.photosUploaded + result.photosFailed;
        if (totalProcessed > 0) {
          const summaryMsg = `${result.synced} fiche(s) · ${result.photosUploaded} photo(s) confirmée(s)${
            result.conflicts > 0 ? ` · ${result.conflicts} conflit(s)` : ''
          }${result.failed + result.photosFailed > 0 ? ` · ${result.failed + result.photosFailed} échec(s) conservé(s)` : ''}`;

          if (result.conflicts > 0) {
            pushToast('warning', 'Synchronisation avec conflit d’affectation', summaryMsg);
          } else if (result.failed > 0 || result.photosFailed > 0) {
            pushToast('error', 'Synchronisation partielle — Données préservées', summaryMsg);
          } else if (result.duplicatesDetected > 0) {
            pushToast('warning', 'Synchronisation confirmée (doublon potentiel)', summaryMsg);
          } else {
            pushToast('success', 'Synchronisation confirmée', summaryMsg);
          }
        }
        return result;
      } finally {
        setIsSyncing(false);
        syncingRef.current = false;
      }
    },
    [currentUser, repository, isOnline, loadLocalOfflineData, refreshData, pushToast]
  );

  const retrySingleReport = useCallback(
    async (reportId: string): Promise<SyncRunSummary> => {
      return synchronizeNow({ includeConflicts: true, targetReportId: reportId });
    },
    [synchronizeNow]
  );

  const retrySinglePhoto = useCallback(
    async (photoId: string): Promise<boolean> => {
      if (!currentUser || !repository || !isOnline) return false;
      const photo = await offlineStorage.getQueuedPhoto(photoId);
      if (!photo) return false;

      setIsSyncing(true);
      try {
        const res = await uploadSingleQueuedPhoto(currentUser, repository, photo);
        await loadLocalOfflineData(currentUser.id);
        if (res.ok) {
          pushToast('success', 'Photographie téléversée', `${photo.fileName} synchronisée avec le serveur.`);
        } else {
          pushToast('error', 'Échec du téléversement photo', res.updated.lastError || 'Conservée dans IndexedDB.');
        }
        return res.ok;
      } finally {
        setIsSyncing(false);
      }
    },
    [currentUser, repository, isOnline, loadLocalOfflineData, pushToast]
  );

  const reopenQueuedReportAsDraft = useCallback(
    async (reportId: string): Promise<FieldReport | null> => {
      if (!currentUser) return null;
      const draft = await offlineStorage.moveQueuedItemToDraftForEditing(reportId);
      if (draft) {
        await offlineStorage.setActiveDraftId(currentUser.id, draft.id);
        await loadLocalOfflineData(currentUser.id);
        pushToast(
          'info',
          'Fiche rouverte en mode édition',
          `Toutes les données et photos de ${draft.id} ont été conservées intactes.`
        );
      }
      return draft;
    },
    [currentUser, loadLocalOfflineData, pushToast]
  );

  const exportOfflineBackupJson = useCallback(async () => {
    if (!currentUser) return;
    const backup = await offlineStorage.exportLocalBackup(currentUser.id);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bceco-pdl145t-sauvegarde-locale-${currentUser.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast(
      'success',
      'Sauvegarde locale exportée',
      `${backup.localDrafts.length} brouillon(s), ${backup.syncQueue.length} fiche(s) en file et ${backup.photoQueue.length} photo(s) archivés.`
    );
  }, [currentUser, pushToast]);

  // Auto-sync cleanly on reconnection (offline -> online) or first online boot with pending items
  useEffect(() => {
    const justReconnected = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current = isOnline;

    if (!isOnline || !currentUser || !repository) return;

    const hasPendingReports = syncQueue.some((q) => !q.conflictDetected && (justReconnected || q.status === 'QUEUED'));
    const hasPendingPhotos = photoQueue.some((p) => p.status === 'QUEUED' || (justReconnected && p.status === 'FAILED'));

    if (justReconnected && (hasPendingReports || hasPendingPhotos)) {
      pushToast('info', 'Connexion rétablie', 'Lancement automatique de la synchronisation hors ligne…');
      synchronizeNow();
      return;
    }

    if (initialAutoSyncDoneRef.current !== currentUser.id && (hasPendingReports || hasPendingPhotos)) {
      initialAutoSyncDoneRef.current = currentUser.id;
      synchronizeNow();
    }
  }, [isOnline, currentUser, repository, syncQueue, photoQueue, synchronizeNow, pushToast]);

  // Coordinator Operations
  const reviewFieldReport = useCallback(
    async (reportId: string, decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE', comment: string) => {
      if (!currentUser || !repository) return;
      await repository.reviewReport(currentUser, reportId, decision, comment);
      await refreshData();
      pushToast(
        decision === 'VALIDE' ? 'success' : decision === 'RETOURNE' ? 'warning' : 'info',
        decision === 'VALIDE'
          ? 'Fiche validée et registre actualisé'
          : decision === 'RETOURNE'
          ? 'Fiche retournée à l’agent'
          : 'Fiche placée en vérification',
        `Référence ${reportId}`
      );
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const createAgent = useCallback(
    async (input: CreateAgentInput) => {
      if (!currentUser || !repository) throw new Error('Non connecté.');
      const agent = await repository.createAgent(currentUser, input);
      await refreshData();
      pushToast('success', 'Compte agent créé', `${agent.fullName} (${agent.email})`);
      return agent;
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const updateAgent = useCallback(
    async (agentId: string, input: UpdateAgentInput) => {
      if (!currentUser || !repository) throw new Error('Non connecté.');
      const agent = await repository.updateAgent(currentUser, agentId, input);
      await refreshData();
      pushToast('success', 'Compte agent mis à jour', agent.fullName);
      return agent;
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const importAuditedProjects = useCallback(
    async (incoming: Project[]) => {
      if (!currentUser || !repository) throw new Error('Non connecté.');
      const added = await repository.importProjects(currentUser, incoming);
      await refreshData();
      pushToast('success', 'Import Matrice Unique terminé', `${added.length} ouvrage(s) intégré(s) après audit.`);
      return added.length;
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const createAssignments = useCallback(
    async (input: CreateAssignmentsInput) => {
      if (!currentUser || !repository) throw new Error('Non connecté.');
      const created = await repository.createAssignments(currentUser, input);
      await refreshData();
      pushToast('success', 'Affectations enregistrées', `${created.length} ouvrage(s) affecté(s).`);
      return created.length;
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const reassignAssignment = useCallback(
    async (assignmentId: string, targetAgentId: string, notes: string) => {
      if (!currentUser || !repository) return;
      await repository.reassignAssignment(currentUser, assignmentId, targetAgentId, notes);
      await refreshData();
      pushToast('success', 'Ouvrage réaffecté', 'L’historique des fiches antérieures a été préservé.');
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const endAssignment = useCallback(
    async (assignmentId: string, notes: string) => {
      if (!currentUser || !repository) return;
      await repository.endAssignment(currentUser, assignmentId, notes);
      await refreshData();
      pushToast('info', 'Affectation clôturée', 'Les fiches historiques demeurent archivées.');
    },
    [currentUser, repository, refreshData, pushToast]
  );

  const recordGeneratedReport = useCallback(
    async (record: Omit<GeneratedReportRecord, 'id' | 'generatedBy' | 'generatedByName' | 'createdAt'>) => {
      if (!currentUser || !repository) return;
      await repository.recordGeneratedReport(currentUser, record);
      await refreshData();
    },
    [currentUser, repository, refreshData]
  );

  const exportOfficialReport = useCallback(
    async (input: {
      format: ExportFormat;
      csvVariant?: CsvExportVariant;
      isRoadmap?: boolean;
      params: ReportingFilterParams;
    }): Promise<{ fileName: string; generatedByServer: boolean }> => {
      if (!currentUser || currentUser.role !== 'COORDINATEUR') {
        throw new Error('Accès refusé : la génération des rapports consolidés est réservée exclusivement au Coordonnateur.');
      }

      // In online Demo API mode, generate authoritatively via Coordinator-only backend route
      if (authMode === 'DEMO_ADAPTER' && isOnline && repository instanceof DemoApiRepository) {
        const { blob, fileName } = await repository.exportConsolidatedReport(input);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        await refreshData();
        return { fileName, generatedByServer: true };
      }

      // Firebase mode (or offline preview fallback): build identically using shared pure builders (lazy-loaded)
      const exporter = await import('../services/export/reportExporter');
      const model = buildConsolidatedReportModel(projects, reports, input.params);
      if (model.rows.length === 0) {
        throw new Error('Aucun ouvrage ne correspond aux filtres sélectionnés.');
      }
      const now = new Date().toISOString();
      const ctx = {
        model,
        generatedByName: currentUser.fullName,
        generatedAt: now,
        isDemoData: true,
        reports,
        projects,
      };

      const artifact =
        input.format === 'EXCEL'
          ? exporter.buildConsolidatedExcelBuffer(ctx)
          : input.format === 'CSV'
          ? exporter.buildConsolidatedCsvBuffer(ctx, input.csvVariant ?? 'MATRICE_21')
          : input.isRoadmap
          ? exporter.buildMultiSiteRoadmapPdfBuffer(ctx)
          : exporter.buildConsolidatedPdfBuffer(ctx);

      exporter.triggerArtifactDownload(artifact);

      if (repository && isOnline) {
        const title = input.isRoadmap
          ? `Annexe Terrain — Feuille de Route Multi-Chantiers (${input.params.province || 'National'})`
          : input.format === 'CSV' && input.csvVariant && input.csvVariant !== 'MATRICE_21'
          ? `${model.title} — Annexe CSV (${input.csvVariant})`
          : model.title;

        await repository.recordGeneratedReport(currentUser, {
          title: title.slice(0, 220),
          periodicity: model.params.periodicity,
          periodLabel: model.params.periodLabel.slice(0, 80),
          format: input.format,
          dataScope: model.params.dataScope,
          filtersSummary: model.filtersSummary,
          projectCount: model.kpis.totalProjects,
          reportCount: model.kpis.reportsCount,
          averageTep: model.kpis.averageTep,
          averageTef: model.kpis.averageTef,
          isDemoData: true,
        });
        await refreshData();
      }

      return { fileName: artifact.fileName, generatedByServer: false };
    },
    [currentUser, authMode, isOnline, repository, projects, reports, refreshData]
  );

  const exportPhotosZip = useCallback(
    async (params: ReportingFilterParams): Promise<{ fileName: string }> => {
      if (!currentUser || currentUser.role !== 'COORDINATEUR') {
        throw new Error('Accès refusé : l’export des photos HD est réservé exclusivement au Coordonnateur.');
      }
      const exporter = await import('../services/export/reportExporter');
      const model = buildConsolidatedReportModel(projects, reports, params);
      if (model.rows.length === 0) {
        throw new Error('Aucun ouvrage ne correspond aux filtres sélectionnés.');
      }
      const now = new Date().toISOString();
      const ctx = {
        model,
        generatedByName: currentUser.fullName,
        generatedAt: now,
        isDemoData: true,
        reports,
        projects,
      };
      const artifact = await exporter.exportPhotosZipArchive(ctx, reports, projects);
      pushToast('success', 'Archive ZIP des photos HD téléchargée', artifact.fileName);
      return { fileName: artifact.fileName };
    },
    [currentUser, projects, reports, pushToast]
  );

  const redownloadGeneratedReport = useCallback(
    async (record: GeneratedReportRecord): Promise<{ fileName: string }> => {
      if (!currentUser || currentUser.role !== 'COORDINATEUR') {
        throw new Error('Accès refusé : téléchargement réservé exclusivement au Coordonnateur.');
      }

      if (authMode === 'DEMO_ADAPTER' && isOnline && repository instanceof DemoApiRepository) {
        const { blob, fileName } = await repository.downloadArchivedReport(record.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        return { fileName };
      }

      const exporter = await import('../services/export/reportExporter');
      const isRoadmap = record.title.toLowerCase().includes('feuille de route');
      const model = buildConsolidatedReportModel(projects, reports, {
        periodicity: record.periodicity,
        periodLabel: record.periodLabel,
        dataScope: record.dataScope,
      });
      const ctx = {
        model,
        generatedByName: record.generatedByName || currentUser.fullName,
        generatedAt: record.createdAt,
        isDemoData: record.isDemoData,
        reports,
        projects,
      };
      const artifact =
        record.format === 'EXCEL'
          ? exporter.buildConsolidatedExcelBuffer(ctx)
          : record.format === 'CSV'
          ? exporter.buildConsolidatedCsvBuffer(ctx, 'MATRICE_21')
          : isRoadmap
          ? exporter.buildMultiSiteRoadmapPdfBuffer(ctx)
          : exporter.buildConsolidatedPdfBuffer(ctx);

      exporter.triggerArtifactDownload(artifact);
      return { fileName: artifact.fileName };
    },
    [currentUser, authMode, isOnline, repository, projects, reports]
  );

  const seedFirestoreWithDemo = useCallback(async () => {
    if (!currentUser || authMode !== 'FIREBASE_AUTH') return;
    const fbRepo = new FirebaseRepository();
    await fbRepo.seedDemoDataToFirestore(currentUser);
    await refreshData();
    pushToast('success', 'Jeu de démonstration initialisé dans Firestore', '24 ouvrages et 34 fiches fictives créés.');
  }, [currentUser, authMode, refreshData, pushToast]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authMode,
        authLoading,
        dataLoading,
        firestoreReachable,
        loginDemo,
        loginFirebaseGoogle,
        logout,
        isOnline,
        browserOnline,
        simulatedOffline,
        setSimulatedOffline,
        isSyncing,
        localDrafts,
        photoQueue,
        syncQueue,
        localSyncLogs,
        lastCachedAt,
        activeDraftId,
        setActiveDraftPointer,
        synchronizeNow,
        retrySingleReport,
        retrySinglePhoto,
        queueFieldPhoto,
        removeQueuedPhoto,
        reopenQueuedReportAsDraft,
        exportOfflineBackupJson,
        users,
        projects,
        assignments,
        reports,
        generatedReports,
        syncLogs,
        auditLogs,
        refreshData,
        seedFirestoreWithDemo,
        saveDraftLocally,
        deleteLocalDraft,
        submitFieldReport,
        reviewFieldReport,
        createAgent,
        updateAgent,
        importAuditedProjects,
        createAssignments,
        reassignAssignment,
        endAssignment,
        recordGeneratedReport,
        exportOfficialReport,
        exportPhotosZip,
        redownloadGeneratedReport,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp doit être utilisé à l’intérieur de AppProvider.');
  }
  return ctx;
}
