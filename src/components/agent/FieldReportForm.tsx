import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Crosshair,
  Lock,
  Paperclip,
  Plus,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CONSTRAINT_CATEGORIES,
  CONTRACT_STATUS_LABELS,
  EXECUTION_STAGES,
  INFRASTRUCTURE_TYPE_LABELS,
  PERIODICITY_LABELS,
  RECEPTION_STATUS_LABELS,
  WORK_STATUS_LABELS,
} from '../../domain/constants';
import {
  calculateTepTefGap,
  evaluateSection2DataQuality,
  requiresGapJustification,
  validateFieldReportForSubmission,
  type ValidationError,
} from '../../domain/businessRules';
import {
  computePeriodKey,
  currentIsoWeekLabel,
  currentMonthIso,
  formatDateFr,
  formatDateTimeFr,
  formatSignedGapFr,
  generateUniqueId,
  todayIsoDate,
} from '../../domain/formatters';
import { compressFieldPhoto } from '../../services/offline/indexedDb';
import type {
  ConstraintCategory,
  ExecutionStage,
  FieldReport,
  Project,
  ReceptionStatus,
  ReportPeriodicity,
  UserProfile,
  WorkStatus,
} from '../../types/domain';
import { SignaturePad } from '../common/SignaturePad';
import { InteractiveLocationPicker } from './InteractiveLocationPicker';

interface Props {
  initialProject?: Project | null;
  initialReport?: FieldReport | null;
  onFinished: (targetTab: 'projects' | 'history' | 'sync') => void;
}

function createEmptyReport(project: Project, agent: UserProfile, activeAssignmentId?: string): FieldReport {
  const now = new Date().toISOString();
  const today = todayIsoDate();
  const week = currentIsoWeekLabel();
  const month = currentMonthIso();
  return {
    id: generateUniqueId('FIC'),
    projectId: project.id,
    matrixNumber: project.matrixNumber,
    agentId: agent.id,
    agentName: agent.fullName,
    assignmentId: activeAssignmentId || 'AFF-ACTIVE',
    status: 'BROUILLON',
    syncStatus: 'LOCAL_BROUILLON',
    potentialDuplicateOf: [],
    version: 1,
    periodKey: computePeriodKey('HEBDOMADAIRE', today, week, month),
    periodicity: 'HEBDOMADAIRE',
    collectionDate: today,
    currentTep: project.currentTep,
    currentTef: project.currentTef,
    identification: {
      periodicity: 'HEBDOMADAIRE',
      weekNumber: week,
      month,
      collectionDate: today,
      matrixNumber: project.matrixNumber,
      province: project.province,
      territory: project.territory,
      sectorChiefdom: project.sectorChiefdom,
      infrastructureType: project.infrastructureType,
      projectName: project.projectName,
      contractor: project.contractor,
      contractStatus: project.contractStatus,
      startDate: project.startDate,
      definitiveReceptionDeadline: project.definitiveReceptionDeadline,
      locality: project.locality,
      gpsLat: project.referenceCoords.lat.toFixed(4),
      gpsLng: project.referenceCoords.lng.toFixed(4),
    },
    progress: {
      workStatus: project.currentStatus,
      stoppageDate: '',
      executionStages: [...project.latestExecutionStages],
      periodWorksExecuted: '',
      skilledWorkersCount: 0,
      laborersCount: 0,
      siteEngineerPresent: true,
      previousTep: project.currentTep,
      currentTep: project.currentTep,
      previousTef: project.currentTef,
      currentTef: project.currentTef,
      tepTefGap: calculateTepTefGap(project.currentTep, project.currentTef),
      gapJustification: '',
    },
    constraints: {
      categories: [],
      detailedDescriptions: [''],
      impacts: {
        delays: false,
        costs: false,
        quality: false,
        stoppage: false,
        details: '',
      },
      isCritical: false,
      correctiveMeasures: '',
      urgentActionsRequired: '',
      actionOwner: 'Entreprise',
    },
    receptions: {
      rt: { ...project.receptions.rt },
      rp: { ...project.receptions.rp },
      rd: { ...project.receptions.rd },
      generalObservations: '',
      guardingStatus: '',
      siteCondition: '',
      disputes: '',
      attendanceLevel: '',
      photos: [],
      attachments: [],
    },
    signature: {
      agentFullName: agent.fullName,
      agentFunction: agent.functionTitle,
      agentPhone: agent.phone,
      signatureDataUrl: '',
      signedAt: now,
    },
    reviews: [],
    versionHistory: [],
    createdAt: now,
    updatedAt: now,
    isDemoData: true,
  };
}

const AUTO_SAVE_INTERVAL_MS = 30_000;

type AutoSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function normalizeDraftPayload(raw: FieldReport): FieldReport {
  const gap = calculateTepTefGap(raw.progress.currentTep, raw.progress.currentTef);
  const periodKey = computePeriodKey(
    raw.identification.periodicity,
    raw.identification.collectionDate,
    raw.identification.weekNumber,
    raw.identification.month
  );
  return {
    ...raw,
    periodKey,
    periodicity: raw.identification.periodicity,
    collectionDate: raw.identification.collectionDate,
    currentTep: raw.progress.currentTep,
    currentTef: raw.progress.currentTef,
    progress: { ...raw.progress, tepTefGap: gap },
    constraints: {
      ...raw.constraints,
      detailedDescriptions: raw.constraints.detailedDescriptions.filter((d) => d.trim().length > 0),
    },
    signature: {
      ...raw.signature,
      signedAt: raw.signature.signedAt || new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

const SECTION_TITLES: { num: 1 | 2 | 3 | 4 | 5; short: string; full: string }[] = [
  { num: 1, short: '1. Identification', full: "SECTION 1 — IDENTIFICATION ET LOCALISATION DE L'OUVRAGE" },
  { num: 2, short: '2. Avancement', full: "SECTION 2 — ÉTAT D'AVANCEMENT PHYSIQUE ET FINANCIER" },
  { num: 3, short: '3. Contraintes', full: 'SECTION 3 — CONTRAINTES, ALERTES ET IMPACTS' },
  { num: 4, short: '4. Réceptions', full: 'SECTION 4 — ÉTAT DES RÉCEPTIONS (RT / RP / RD) ET OBSERVATIONS' },
  { num: 5, short: '5. Signatures', full: 'SECTION 5 — VALIDATION ET SIGNATURES' },
];

export const FieldReportForm: React.FC<Props> = ({
  initialProject,
  initialReport,
  onFinished,
}) => {
  const {
    currentUser,
    projects,
    assignments,
    isOnline,
    saveDraftLocally,
    queueFieldPhoto,
    removeQueuedPhoto,
    submitFieldReport,
    pushToast,
  } = useApp();

  const resolveActiveAssignmentId = (projectId: string, agentId: string): string | undefined =>
    assignments.find((a) => a.projectId === projectId && a.agentId === agentId && a.status === 'ACTIVE')?.id;

  const defaultProject = useMemo(
    () => initialProject ?? projects.find((p) => p.id === initialReport?.projectId) ?? projects[0] ?? null,
    [initialProject, initialReport, projects]
  );

  const [form, setForm] = useState<FieldReport | null>(() => {
    if (!currentUser) return null;
    if (initialReport) {
      return {
        ...initialReport,
        constraints: {
          ...initialReport.constraints,
          detailedDescriptions:
            initialReport.constraints.detailedDescriptions.length > 0
              ? initialReport.constraints.detailedDescriptions
              : [''],
        },
      };
    }
    if (defaultProject) {
      return createEmptyReport(
        defaultProject,
        currentUser,
        resolveActiveAssignmentId(defaultProject.id, currentUser.id)
      );
    }
    return null;
  });

  const currentProject = useMemo(
    () => projects.find((p) => p.id === form?.projectId) ?? defaultProject,
    [projects, form?.projectId, defaultProject]
  );

  const [activeSection, setActiveSection] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(initialReport?.updatedAt ?? null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(initialReport ? 'saved' : 'idle');

  const isMountedRef = useRef(true);
  const skipNextDirtyTrackRef = useRef(true);
  const editRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const isAutoSavingRef = useRef(false);
  const inFlightAutoSaveRef = useRef<Promise<void> | null>(null);
  const submittedRef = useRef(false);
  const latestFormRef = useRef<FieldReport | null>(form);
  const gapJustificationRef = useRef<HTMLTextAreaElement | null>(null);
  const dataQualityPanelRef = useRef<HTMLDivElement | null>(null);
  latestFormRef.current = form;

  const persistDraftNow = useCallback(
    async (options?: { skipStateUpdate?: boolean }) => {
      if (
        submittedRef.current ||
        isAutoSavingRef.current ||
        !currentUser ||
        !latestFormRef.current ||
        editRevisionRef.current <= savedRevisionRef.current
      ) {
        return;
      }

      const targetRevision = editRevisionRef.current;
      const normalized = normalizeDraftPayload(latestFormRef.current);
      const canUpdateUi = () => !options?.skipStateUpdate && isMountedRef.current && !submittedRef.current;

      isAutoSavingRef.current = true;
      if (canUpdateUi()) {
        setAutoSaveStatus('saving');
      }

      const writePromise = (async () => {
        try {
          await saveDraftLocally(normalized, { silent: true });
          if (submittedRef.current) return;
          savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
          if (canUpdateUi()) {
            setLastAutoSavedAt(normalized.updatedAt);
            setAutoSaveStatus(editRevisionRef.current > savedRevisionRef.current ? 'dirty' : 'saved');
          }
        } catch {
          if (canUpdateUi()) {
            setAutoSaveStatus('error');
          }
        } finally {
          isAutoSavingRef.current = false;
          inFlightAutoSaveRef.current = null;
        }
      })();

      inFlightAutoSaveRef.current = writePromise;
      await writePromise;
    },
    [currentUser, saveDraftLocally]
  );

  const persistDraftNowRef = useRef(persistDraftNow);
  persistDraftNowRef.current = persistDraftNow;

  // Track user edits so periodic auto-save writes to IndexedDB only when input has changed
  useEffect(() => {
    if (!form || submittedRef.current) return;
    if (skipNextDirtyTrackRef.current) {
      skipNextDirtyTrackRef.current = false;
      return;
    }
    editRevisionRef.current += 1;
    setAutoSaveStatus((prev) => (prev === 'saving' ? prev : 'dirty'));
  }, [form]);

  // Automatic periodic IndexedDB persistence every 30 seconds (prevents data loss on unexpected tab close)
  useEffect(() => {
    if (!currentUser) return;
    const intervalId = window.setInterval(() => {
      void persistDraftNowRef.current();
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id]);

  // Flush unsaved edits immediately when backgrounding/closing the browser tab
  useEffect(() => {
    if (!currentUser) return;

    const hasPendingChanges = () =>
      !submittedRef.current &&
      Boolean(latestFormRef.current) &&
      editRevisionRef.current > savedRevisionRef.current;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingChanges()) return;
      void persistDraftNowRef.current({ skipStateUpdate: true });
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePageHide = () => {
      if (!hasPendingChanges()) return;
      void persistDraftNowRef.current({ skipStateUpdate: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasPendingChanges()) {
        void persistDraftNowRef.current({ skipStateUpdate: true });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id]);

  // Flush any pending unsaved edits to IndexedDB if the user navigates away from the form
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      void persistDraftNowRef.current({ skipStateUpdate: true });
    };
  }, []);

  const liveValidationErrors = useMemo(() => {
    if (!form) return [] as ValidationError[];
    return validateFieldReportForSubmission({
      ...form,
      constraints: {
        ...form.constraints,
        detailedDescriptions: form.constraints.detailedDescriptions.filter((d) => d.trim().length > 0),
      },
    });
  }, [form]);

  if (!currentUser || !form) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
        <p className="text-base font-semibold text-slate-900">Aucun chantier affecté disponible</p>
        <p className="text-sm text-slate-600">
          Vous devez disposer d’au moins un chantier activement affecté pour saisir une fiche terrain.
        </p>
      </div>
    );
  }

  const isEditingReturned = form.status === 'RETOURNE';
  const lastCoordinatorReturn =
    isEditingReturned && form.reviews.length > 0 ? form.reviews[form.reviews.length - 1] : null;
  const computedGap = calculateTepTefGap(form.progress.currentTep, form.progress.currentTef);
  const deltaTep = Math.round((form.progress.currentTep - form.progress.previousTep) * 10) / 10;
  const deltaTef = Math.round((form.progress.currentTef - form.progress.previousTef) * 10) / 10;
  const needsGapReason = requiresGapJustification(form.progress.currentTep, form.progress.currentTef);
  const section2Quality = evaluateSection2DataQuality(form.progress);

  const focusGapJustification = () => {
    gapJustificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    gapJustificationRef.current?.focus();
  };

  const scrollToDataQuality = () => {
    dataQualityPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleProjectChange = (projectId: string) => {
    const selected = projects.find((p) => p.id === projectId);
    if (!selected || !currentUser) return;
    skipNextDirtyTrackRef.current = true;
    editRevisionRef.current = 0;
    savedRevisionRef.current = 0;
    setAutoSaveStatus('idle');
    setLastAutoSavedAt(null);
    setForm(createEmptyReport(selected, currentUser, resolveActiveAssignmentId(selected.id, currentUser.id)));
    setErrors([]);
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      pushToast('error', 'Géolocalisation indisponible', 'Saisissez les coordonnées GPS manuellement.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) =>
          prev
            ? {
                ...prev,
                identification: {
                  ...prev.identification,
                  gpsLat: pos.coords.latitude.toFixed(6),
                  gpsLng: pos.coords.longitude.toFixed(6),
                  gpsAccuracy: Math.round(pos.coords.accuracy),
                  gpsCapturedAt: new Date().toISOString(),
                },
              }
            : prev
        );
        setGpsLoading(false);
        pushToast(
          'success',
          'Position GPS capturée',
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)} m)`
        );
      },
      () => {
        setGpsLoading(false);
        pushToast(
          'warning',
          'Capture GPS impossible',
          'Vérifiez les autorisations de localisation ou saisissez les coordonnées manuellement.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleStage = (stage: ExecutionStage) => {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.progress.executionStages.includes(stage);
      const next = exists
        ? prev.progress.executionStages.filter((s) => s !== stage)
        : [...prev.progress.executionStages, stage];
      return { ...prev, progress: { ...prev.progress, executionStages: next } };
    });
  };

  const toggleConstraintCategory = (cat: ConstraintCategory) => {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.constraints.categories.includes(cat);
      const next = exists
        ? prev.constraints.categories.filter((c) => c !== cat)
        : [...prev.constraints.categories, cat];
      return { ...prev, constraints: { ...prev.constraints, categories: next } };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !form) return;

    for (const file of files.slice(0, 4)) {
      try {
        const { dataUrl, sizeBytes, checksum } = await compressFieldPhoto(file);
        const photo = {
          id: generateUniqueId('PHO'),
          fileName: file.name,
          mimeType: 'image/jpeg',
          sizeBytes,
          caption: '',
          capturedAt: new Date().toISOString(),
          dataUrl,
          checksum,
          retryCount: 0,
          syncState: 'LOCAL' as const,
        };
        // Persist immediately in IndexedDB photoQueue so images are never lost on crash or restart
        await queueFieldPhoto({
          photo,
          reportId: form.id,
          projectId: form.projectId,
        });
        setForm((prev) =>
          prev
            ? {
                ...prev,
                receptions: {
                  ...prev.receptions,
                  photos: [...prev.receptions.photos, photo].slice(0, 6),
                },
              }
            : prev
        );
      } catch (err) {
        pushToast('error', 'Erreur photo', err instanceof Error ? err.message : 'Fichier ignoré.');
      }
    }
    e.target.value = '';
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newItems = files.slice(0, 4).map((f) => ({
      id: generateUniqueId('PJ'),
      fileName: f.name,
      mimeType: f.type || 'application/octet-stream',
      sizeBytes: f.size,
      uploadedAt: new Date().toISOString(),
      syncState: 'LOCAL' as const,
    }));
    setForm((prev) =>
      prev
        ? {
            ...prev,
            receptions: {
              ...prev.receptions,
              attachments: [...prev.receptions.attachments, ...newItems].slice(0, 8),
            },
          }
        : prev
    );
    e.target.value = '';
  };

  const buildNormalizedForm = (): FieldReport => {
    const gap = calculateTepTefGap(form.progress.currentTep, form.progress.currentTef);
    const periodKey = computePeriodKey(
      form.identification.periodicity,
      form.identification.collectionDate,
      form.identification.weekNumber,
      form.identification.month
    );
    return {
      ...form,
      periodKey,
      periodicity: form.identification.periodicity,
      collectionDate: form.identification.collectionDate,
      currentTep: form.progress.currentTep,
      currentTef: form.progress.currentTef,
      progress: { ...form.progress, tepTefGap: gap },
      constraints: {
        ...form.constraints,
        detailedDescriptions: form.constraints.detailedDescriptions.filter((d) => d.trim().length > 0),
      },
      signature: {
        ...form.signature,
        signedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (inFlightAutoSaveRef.current) {
        await inFlightAutoSaveRef.current.catch(() => undefined);
      }
      const targetRevision = editRevisionRef.current;
      const latest = latestFormRef.current ?? form;
      const normalized: FieldReport = {
        ...normalizeDraftPayload(latest),
        signature: {
          ...latest.signature,
          signedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
      await saveDraftLocally(normalized);
      savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
      setLastAutoSavedAt(normalized.updatedAt);
      setAutoSaveStatus(editRevisionRef.current > savedRevisionRef.current ? 'dirty' : 'saved');
    } catch {
      setAutoSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const normalized = buildNormalizedForm();
    const validationErrors = validateFieldReportForSubmission(normalized);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setActiveSection(validationErrors[0].section);
      pushToast(
        'error',
        `Fiche incomplète (${validationErrors.length} point(s) à corriger)`,
        validationErrors[0].message
      );
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      submittedRef.current = true;
      if (inFlightAutoSaveRef.current) {
        await inFlightAutoSaveRef.current.catch(() => undefined);
      }
      const result = await submitFieldReport(normalized);
      onFinished(result.queuedOffline ? 'sync' : 'history');
    } catch (err) {
      submittedRef.current = false;
      pushToast(
        'error',
        'Soumission impossible',
        err instanceof Error ? err.message : 'Erreur lors de la soumission.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sectionErrors = (sec: 1 | 2 | 3 | 4 | 5) => errors.filter((e) => e.section === sec);

  return (
    <div className="space-y-5">
      {/* Form Title Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Fiche de Collecte de Données Terrain — Suivi-Évaluation des Ouvrages (BCECO / PDL-145T)
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {isEditingReturned
                ? `Correction de fiche retournée (${form.id} · v${form.version} → v${form.version + 1})`
                : `${form.identification.matrixNumber} — ${form.identification.projectName}`}
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-600 text-right space-y-0.5">
            <div>ID : {form.id}</div>
            <div>{isOnline ? 'En ligne' : 'Hors ligne (file locale)'}</div>
            <div
              className={`text-[11px] font-sans ${
                autoSaveStatus === 'error'
                  ? 'text-red-700 font-medium'
                  : autoSaveStatus === 'dirty'
                  ? 'text-amber-700 font-medium'
                  : autoSaveStatus === 'saving'
                  ? 'text-blue-700 font-medium'
                  : 'text-emerald-800'
              }`}
            >
              {autoSaveStatus === 'saving' && 'Sauvegarde automatique IndexedDB…'}
              {autoSaveStatus === 'dirty' &&
                `Modifications en attente · Auto-sauvegarde (30 s)${
                  lastAutoSavedAt ? ` · Dernière : ${new Date(lastAutoSavedAt).toLocaleTimeString('fr-FR')}` : ''
                }`}
              {autoSaveStatus === 'saved' &&
                (lastAutoSavedAt
                  ? `Auto-sauvegarde locale : ${new Date(lastAutoSavedAt).toLocaleTimeString('fr-FR')} (toutes les 30 s)`
                  : 'Auto-sauvegarde locale active (toutes les 30 s)')}
              {autoSaveStatus === 'error' && 'Échec sauvegarde locale · Nouvel essai dans 30 s'}
              {autoSaveStatus === 'idle' && 'Auto-sauvegarde locale active (toutes les 30 s)'}
            </div>
          </div>
        </div>

        {/* Returned Report Reason Alert */}
        {lastCoordinatorReturn && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3.5 text-xs text-red-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              Commentaire de retour du Coordonnateur ({lastCoordinatorReturn.reviewerName}) :
            </p>
            <p className="leading-relaxed">« {lastCoordinatorReturn.comment} »</p>
          </div>
        )}

        {/* Section Stepper Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SECTION_TITLES.map((sec) => {
            const countErr = sectionErrors(sec.num).length;
            const liveReady = liveValidationErrors.filter((e) => e.section === sec.num).length === 0;
            const active = activeSection === sec.num;
            return (
              <button
                key={sec.num}
                type="button"
                onClick={() => setActiveSection(sec.num)}
                className={`px-3 py-2 text-xs font-semibold rounded-md border whitespace-nowrap shrink-0 min-h-[40px] transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#0F2544] text-white border-[#0F2544]'
                    : countErr > 0
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : liveReady
                    ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {liveReady && countErr === 0 && (
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-300' : 'text-emerald-700'}`} />
                )}
                <span>{sec.short}</span>
                {countErr > 0 && <span className="font-mono">({countErr})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Error Summary */}
      {errors.length > 0 && (
        <div role="alert" className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            Veuillez corriger les points suivants avant soumission :
          </p>
          <ul className="list-disc pl-5 text-xs text-red-800 space-y-1">
            {errors.map((err, i) => (
              <li key={`${err.field}-${i}`}>
                <button
                  type="button"
                  onClick={() => setActiveSection(err.section)}
                  className="underline hover:text-red-950 text-left"
                >
                  Section {err.section} : {err.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Section Card */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#0F2544] text-white px-5 py-3">
          <h2 className="text-xs sm:text-sm font-bold tracking-wide">
            {SECTION_TITLES.find((s) => s.num === activeSection)?.full}
          </h2>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* ================================================================= */}
          {/* SECTION 1 : IDENTIFICATION ET LOCALISATION                         */}
          {/* ================================================================= */}
          {activeSection === 1 && (
            <div className="space-y-6">
              {/* Project Selector (restricted to agent's assigned projects) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="select-project" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ouvrage affecté concerné *
                  </label>
                  <select
                    id="select-project"
                    value={form.projectId}
                    disabled={isEditingReturned}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-900 disabled:bg-slate-100"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.matrixNumber} — {p.projectName} ({p.province} / {p.territory})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Périodicité du rapport *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['JOURNALIER', 'HEBDOMADAIRE', 'MENSUEL'] as ReportPeriodicity[]).map((per) => (
                      <button
                        key={per}
                        type="button"
                        onClick={() =>
                          setForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  periodicity: per,
                                  identification: { ...prev.identification, periodicity: per },
                                }
                              : prev
                          )
                        }
                        className={`py-2.5 px-2 text-xs font-semibold rounded-md border min-h-[44px] transition-colors ${
                          form.identification.periodicity === per
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {PERIODICITY_LABELS[per]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="collection-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date de collecte *
                  </label>
                  <input
                    id="collection-date"
                    type="date"
                    value={form.identification.collectionDate}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              collectionDate: e.target.value,
                              identification: { ...prev.identification, collectionDate: e.target.value },
                            }
                          : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md bg-white"
                  />
                </div>

                {form.identification.periodicity === 'HEBDOMADAIRE' && (
                  <div>
                    <label htmlFor="week-number" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Numéro de semaine (ex. S47-2026) *
                    </label>
                    <input
                      id="week-number"
                      type="text"
                      value={form.identification.weekNumber}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, identification: { ...prev.identification, weekNumber: e.target.value } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                )}

                {form.identification.periodicity === 'MENSUEL' && (
                  <div>
                    <label htmlFor="month-field" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mois concerné *
                    </label>
                    <input
                      id="month-field"
                      type="month"
                      value={form.identification.month}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, identification: { ...prev.identification, month: e.target.value } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                )}
              </div>

              {/* Auto-populated Locked Contractual Fields */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Données contractuelles de référence (pré-remplies et verrouillées)
                  </span>
                  <span className="text-[11px] text-slate-500">Matrice Unique</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">N° Matrice Unique</span>
                    <span className="font-mono font-semibold text-slate-900">{form.identification.matrixNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Province / Territoire</span>
                    <span className="font-medium text-slate-900">
                      {form.identification.province} · {form.identification.territory}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Secteur / Chefferie / Commune</span>
                    <span className="font-medium text-slate-900">{form.identification.sectorChiefdom}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Type d’ouvrage</span>
                    <span className="font-medium text-slate-900">
                      {INFRASTRUCTURE_TYPE_LABELS[form.identification.infrastructureType]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nom exact de l’ouvrage</span>
                    <span className="font-medium text-slate-900">{form.identification.projectName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Entreprise / (PME ou ALE) attributaire</span>
                    <span className="font-medium text-slate-900">{form.identification.contractor}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Statut contractuel actuel</span>
                    <span className="font-medium text-slate-900">
                      {CONTRACT_STATUS_LABELS[form.identification.contractStatus]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date de démarrage effectif</span>
                    <span className="font-mono text-slate-900">{formatDateFr(form.identification.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Échéance contractuelle RD</span>
                    <span className="font-mono text-slate-900">
                      {formatDateFr(form.identification.definitiveReceptionDeadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Locality & GPS Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="locality" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Localité / Village *
                  </label>
                  <input
                    id="locality"
                    type="text"
                    value={form.identification.locality}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, identification: { ...prev.identification, locality: e.target.value } }
                          : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="gps-lat" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    GPS — Latitude
                  </label>
                  <input
                    id="gps-lat"
                    type="text"
                    inputMode="decimal"
                    value={form.identification.gpsLat}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, identification: { ...prev.identification, gpsLat: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="-10.8742"
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="gps-lng" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    GPS — Longitude
                  </label>
                  <input
                    id="gps-lng"
                    type="text"
                    inputMode="decimal"
                    value={form.identification.gpsLng}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, identification: { ...prev.identification, gpsLng: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="26.5974"
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[44px]"
                >
                  <Crosshair className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                  {gpsLoading ? 'Acquisition GPS en cours…' : 'Capturer les coordonnées GPS actuelles'}
                </button>
                {form.identification.gpsAccuracy && (
                  <span className="text-xs text-slate-500 font-mono">
                    Précision ±{form.identification.gpsAccuracy} m
                  </span>
                )}
              </div>

              {/* Interactive Leaflet Map for Confirming Collection Point */}
              <InteractiveLocationPicker
                lat={form.identification.gpsLat}
                lng={form.identification.gpsLng}
                accuracy={form.identification.gpsAccuracy}
                capturedAt={form.identification.gpsCapturedAt}
                referenceCoords={currentProject?.referenceCoords}
                projectName={form.identification.projectName}
                matrixNumber={form.identification.matrixNumber}
                locality={form.identification.locality}
                province={form.identification.province}
                territory={form.identification.territory}
                onChange={({ lat, lng, confirmed }) => {
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          identification: {
                            ...prev.identification,
                            gpsLat: lat,
                            gpsLng: lng,
                            ...(confirmed && !prev.identification.gpsCapturedAt
                              ? { gpsCapturedAt: new Date().toISOString() }
                              : {}),
                          },
                        }
                      : prev
                  );
                  if (confirmed) {
                    pushToast(
                      'success',
                      'Point de collecte confirmé',
                      `Position confirmée sur la carte : ${lat}, ${lng}`
                    );
                  }
                }}
                onCaptureGps={handleCaptureGps}
                gpsLoading={gpsLoading}
                disabled={false}
              />
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 2 : AVANCEMENT PHYSIQUE ET FINANCIER                       */}
          {/* ================================================================= */}
          {activeSection === 2 && (
            <div className="space-y-6">
              {/* Real-Time Section 2 Data Quality Summary Strip */}
              <div
                role="status"
                aria-live="polite"
                className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-md border border-l-4 text-xs ${
                  section2Quality.level === 'CRITIQUE'
                    ? 'bg-red-50/80 border-red-200 border-l-red-600 text-red-900'
                    : section2Quality.level === 'ATTENTION'
                    ? 'bg-amber-50/80 border-amber-200 border-l-amber-600 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-200 border-l-emerald-600 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {section2Quality.level === 'CRITIQUE' ? (
                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                  ) : section2Quality.level === 'ATTENTION' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                  <span className="font-semibold">Qualité des données :</span>
                  <span className="truncate">{section2Quality.headline}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-semibold">
                    Écart {formatSignedGapFr(computedGap)} · {section2Quality.score}/100
                  </span>
                  {section2Quality.missingJustificationWarning ? (
                    <button
                      type="button"
                      onClick={focusGapJustification}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
                    >
                      Justifier l’écart
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={scrollToDataQuality}
                      className="underline font-medium hover:opacity-80"
                    >
                      Voir l’analyse TEP/TEF
                    </button>
                  )}
                </div>
              </div>

              {/* Statut de l'ouvrage */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Statut de l’ouvrage à ce jour *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {(['ACHEVE', 'EN_COURS', 'A_L_ARRET', 'NON_DEMARRE'] as WorkStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setForm((prev) =>
                          prev ? { ...prev, progress: { ...prev.progress, workStatus: st } } : prev
                        )
                      }
                      className={`px-3 py-3 text-left text-xs font-semibold rounded-md border min-h-[48px] transition-colors ${
                        form.progress.workStatus === st
                          ? 'bg-[#0F2544] text-white border-[#0F2544]'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {WORK_STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>

                {form.progress.workStatus === 'A_L_ARRET' && (
                  <div className="max-w-xs pt-2">
                    <label htmlFor="stoppage-date" className="block text-xs font-semibold text-red-800 mb-1.5">
                      Date d’arrêt des travaux (obligatoire) *
                    </label>
                    <input
                      id="stoppage-date"
                      type="date"
                      value={form.progress.stoppageDate}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, stoppageDate: e.target.value } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm font-mono border border-red-300 rounded-md bg-red-50/40"
                    />
                  </div>
                )}
              </div>

              {/* 8 Official Execution Stages */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Niveau d’exécution physique à ce jour (cocher les étapes achevées / en cours)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXECUTION_STAGES.map((stage) => {
                    const checked = form.progress.executionStages.includes(stage.id);
                    return (
                      <label
                        key={stage.id}
                        className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors min-h-[52px] ${
                          checked ? 'border-blue-700 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStage(stage.id)}
                          className="mt-0.5 w-4 h-4 accent-[#0F2544] shrink-0"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900 block">{stage.label}</span>
                          <span className="text-slate-500">{stage.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Period Works & Workforce */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="period-works" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Travaux exécutés durant la période (jour, semaine ou mois) *
                  </label>
                  <textarea
                    id="period-works"
                    rows={3}
                    value={form.progress.periodWorksExecuted}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, progress: { ...prev.progress, periodWorksExecuted: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="Décrivez précisément les activités physiques constatées sur chantier durant la période…"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="skilled-workers" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ouvriers qualifiés mobilisés
                    </label>
                    <input
                      id="skilled-workers"
                      type="number"
                      min={0}
                      max={500}
                      value={form.progress.skilledWorkersCount}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                progress: { ...prev.progress, skilledWorkersCount: Number(e.target.value) || 0 },
                              }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="laborers" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Manœuvres mobilisés
                    </label>
                    <input
                      id="laborers"
                      type="number"
                      min={0}
                      max={500}
                      value={form.progress.laborersCount}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                progress: { ...prev.progress, laborersCount: Number(e.target.value) || 0 },
                              }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Présence Ingénieur / Chef chantier
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[true, false].map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() =>
                            setForm((prev) =>
                              prev
                                ? { ...prev, progress: { ...prev.progress, siteEngineerPresent: val } }
                                : prev
                            )
                          }
                          className={`py-2.5 text-xs font-semibold rounded-md border min-h-[44px] ${
                            form.progress.siteEngineerPresent === val
                              ? 'bg-[#0F2544] text-white border-[#0F2544]'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {val ? 'Oui' : 'Non'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* TEP / TEF Table & Automatic Gap Rule */}
              <div className="border border-slate-200 rounded-md p-4 bg-slate-50 space-y-4">
                <h3 className="text-xs font-bold text-slate-800">
                  Taux d’exécution physique (TEP %) et financière (TEF %) — Bornes strictes [0 – 100 %]
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label htmlFor="prev-tep" className="block text-xs text-slate-600 mb-1">
                      TEP Précédent (%)
                    </label>
                    <input
                      id="prev-tep"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={form.progress.previousTep}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, previousTep: Number(e.target.value) } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="curr-tep" className="block text-xs font-semibold text-slate-900 mb-1">
                      TEP Actuel (%) *
                    </label>
                    <input
                      id="curr-tep"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={form.progress.currentTep}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, currentTep: Number(e.target.value) } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm font-mono font-semibold border border-blue-400 rounded-md bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="prev-tef" className="block text-xs text-slate-600 mb-1">
                      TEF Précédent (%)
                    </label>
                    <input
                      id="prev-tef"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={form.progress.previousTef}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, previousTef: Number(e.target.value) } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="curr-tef" className="block text-xs font-semibold text-slate-900 mb-1">
                      TEF Actuel (%) *
                    </label>
                    <input
                      id="curr-tef"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={form.progress.currentTef}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, currentTef: Number(e.target.value) } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm font-mono font-semibold border border-blue-400 rounded-md bg-white"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-1 bg-white border border-slate-200 rounded-md p-2.5 flex flex-col justify-center">
                    <span className="text-[11px] text-slate-500">Écart (TEP − TEF)</span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        section2Quality.missingJustificationWarning
                          ? 'text-red-700'
                          : needsGapReason
                          ? 'text-amber-700'
                          : 'text-emerald-800'
                      }`}
                    >
                      {formatSignedGapFr(computedGap)}
                    </span>
                  </div>
                </div>

                {/* Real-Time Visual 'Qualité des données' Indicator (TEP - TEF Analysis) */}
                <div
                  ref={dataQualityPanelRef}
                  role="region"
                  aria-label="Indicateur de qualité des données TEP et TEF"
                  className={`rounded-md border border-l-4 p-4 space-y-3.5 transition-colors ${
                    section2Quality.level === 'CRITIQUE'
                      ? 'bg-red-50/60 border-red-300 border-l-red-600'
                      : section2Quality.level === 'ATTENTION'
                      ? 'bg-amber-50/50 border-amber-300 border-l-amber-600'
                      : 'bg-emerald-50/40 border-emerald-200 border-l-emerald-600'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {section2Quality.level === 'CRITIQUE' ? (
                        <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                      ) : section2Quality.level === 'ATTENTION' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                          Qualité des données — Contrôle temps réel TEP / TEF
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            section2Quality.level === 'CRITIQUE'
                              ? 'text-red-900'
                              : section2Quality.level === 'ATTENTION'
                              ? 'text-amber-950'
                              : 'text-emerald-950'
                          }`}
                        >
                          {section2Quality.headline}
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">{section2Quality.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 bg-white border border-slate-200 rounded px-3 py-2">
                      <div className="text-right">
                        <span className="block text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                          Indice qualité
                        </span>
                        <span
                          className={`text-base font-bold font-mono ${
                            section2Quality.level === 'CRITIQUE'
                              ? 'text-red-700'
                              : section2Quality.level === 'ATTENTION'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {section2Quality.score}/100
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-1 rounded-sm border ${
                          section2Quality.level === 'CRITIQUE'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : section2Quality.level === 'ATTENTION'
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {section2Quality.level === 'CRITIQUE'
                          ? 'Alerte'
                          : section2Quality.level === 'ATTENTION'
                          ? 'Vigilance'
                          : 'Conforme'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Threshold Gauge (0% to 25%+ with 10% regulatory threshold marker) */}
                  <div className="bg-white border border-slate-200 rounded p-3 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        Jauge d’écart absolu |TEP − TEF| :{' '}
                        <span
                          className={`font-mono font-bold ${
                            section2Quality.missingJustificationWarning
                              ? 'text-red-700'
                              : section2Quality.thresholdExceeded
                              ? 'text-amber-700'
                              : 'text-emerald-800'
                          }`}
                        >
                          {section2Quality.absGap.toLocaleString('fr-FR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })}{' '}
                          %
                        </span>
                      </span>
                      <span className="text-slate-600 font-mono">
                        Seuil justificatif : &gt; {section2Quality.threshold} %
                      </span>
                    </div>

                    <svg
                      viewBox="0 0 200 14"
                      preserveAspectRatio="none"
                      className="w-full h-3.5 rounded overflow-hidden"
                      role="img"
                      aria-label={`Écart absolu TEP moins TEF de ${section2Quality.absGap} pour cent par rapport au seuil de 10 pour cent`}
                    >
                      <title>
                        Écart absolu TEP − TEF : {section2Quality.absGap} % (seuil de justification : 10 %)
                      </title>
                      {/* Safe zone (0% to 10%) */}
                      <rect x="0" y="2" width="100" height="10" fill="#E2E8F0" />
                      {/* Alert zone (>10% to 20%+) */}
                      <rect x="100" y="2" width="100" height="10" fill="#FEE2E2" />
                      {/* Active filled gap bar */}
                      <rect
                        x="0"
                        y="2"
                        width={Math.min(200, Math.max(0, section2Quality.absGap * 10))}
                        height="10"
                        fill={
                          section2Quality.missingJustificationWarning || section2Quality.level === 'CRITIQUE'
                            ? '#DC2626'
                            : section2Quality.thresholdExceeded || section2Quality.absGap > 5
                            ? '#D97706'
                            : '#059669'
                        }
                      />
                      {/* 10% Regulatory Threshold Marker (exact 50% midpoint) */}
                      <rect x="99" y="0" width="2" height="14" fill="#0F2544" />
                    </svg>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>0 %</span>
                      <span>5 %</span>
                      <span className="font-bold text-[#0F2544]">Seuil 10 %</span>
                      <span>15 %</span>
                      <span>20 %+</span>
                    </div>
                  </div>

                  {/* Prominent Missing Justification Alert when |TEP - TEF| > 10% */}
                  {section2Quality.missingJustificationWarning && (
                    <div
                      role="alert"
                      className="bg-red-100/90 border border-red-400 rounded-md p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-red-950"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-red-900">
                            {section2Quality.justificationLength === 0
                              ? 'Avertissement : justification obligatoire manquante (écart > 10 %)'
                              : `Avertissement : justification incomplète (${section2Quality.justificationLength}/${section2Quality.minJustificationLength} caractères minimum)`}
                          </p>
                          <p className="text-red-900/90 leading-relaxed">
                            L’écart TEP − TEF est de{' '}
                            <span className="font-mono font-semibold">{formatSignedGapFr(computedGap)}</span>. Tant
                            qu’une justification d’au moins {section2Quality.minJustificationLength} caractères n’est
                            pas saisie ci-dessous, la soumission de la fiche reste bloquée.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={focusGapJustification}
                        className="px-3 py-2 text-xs font-semibold bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors shrink-0 min-h-[36px]"
                      >
                        Rédiger la justification
                      </button>
                    </div>
                  )}

                  {/* 4 Real-Time Verification Criteria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section2Quality.checks.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 p-2.5 rounded border bg-white text-xs ${
                          item.status === 'ERROR'
                            ? 'border-red-300'
                            : item.status === 'WARNING'
                            ? 'border-amber-300'
                            : 'border-slate-200'
                        }`}
                      >
                        {item.status === 'ERROR' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        ) : item.status === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block">{item.label}</span>
                          <span className="text-[11px] text-slate-600 leading-snug block mt-0.5">{item.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live TEP/TEF Progression & Signed Gap Interpretation */}
                <div className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 block">Variation physique (Δ TEP)</span>
                      <span className={`font-mono font-bold ${deltaTep >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                        {deltaTep > 0 ? `+${deltaTep}` : deltaTep} pts
                      </span>
                      <span className="text-slate-500 ml-1">
                        ({form.progress.previousTep}% → {form.progress.currentTep}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Variation financière (Δ TEF)</span>
                      <span className={`font-mono font-bold ${deltaTef >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
                        {deltaTef > 0 ? `+${deltaTef}` : deltaTef} pts
                      </span>
                      <span className="text-slate-500 ml-1">
                        ({form.progress.previousTef}% → {form.progress.currentTef}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Diagnostic automatique BCECO</span>
                      <span
                        className={`font-semibold ${
                          section2Quality.missingJustificationWarning
                            ? 'text-red-700'
                            : needsGapReason
                            ? 'text-amber-800'
                            : 'text-emerald-800'
                        }`}
                      >
                        {!needsGapReason
                          ? 'Exécution équilibrée (|écart| ≤ 10 pts)'
                          : computedGap > 10
                          ? 'Avance physique / décompte en attente'
                          : 'Avance financière / retard physique'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-10 font-mono text-[11px] font-semibold text-slate-700">TEP</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-[#0F2544] transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, Number(form.progress.currentTep) || 0))}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] text-slate-800">
                        {Number.isNaN(form.progress.currentTep) ? 0 : form.progress.currentTep}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-10 font-mono text-[11px] font-semibold text-slate-700">TEF</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, Number(form.progress.currentTef) || 0))}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] text-slate-800">
                        {Number.isNaN(form.progress.currentTef) ? 0 : form.progress.currentTef}%
                      </span>
                    </div>
                  </div>
                </div>

                {needsGapReason && (
                  <div
                    className={`border rounded-md p-3.5 space-y-2 transition-colors ${
                      section2Quality.missingJustificationWarning
                        ? 'bg-red-50 border-red-300'
                        : 'bg-emerald-50/50 border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="gap-justification"
                        className={`block text-xs font-semibold ${
                          section2Quality.missingJustificationWarning ? 'text-red-900' : 'text-emerald-950'
                        }`}
                      >
                        Justification obligatoire — L’écart absolu TEP − TEF dépasse 10 points (
                        {formatSignedGapFr(computedGap)}) *
                      </label>
                      <span
                        className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${
                          section2Quality.missingJustificationWarning ? 'text-red-700' : 'text-emerald-800'
                        }`}
                      >
                        {section2Quality.missingJustificationWarning ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {section2Quality.justificationLength === 0
                              ? `Manquante (0/${section2Quality.minJustificationLength} car. min.)`
                              : `${section2Quality.justificationLength}/${section2Quality.minJustificationLength} car. min.`}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Justification conforme ({section2Quality.justificationLength} car.)
                          </>
                        )}
                      </span>
                    </div>
                    <textarea
                      ref={gapJustificationRef}
                      id="gap-justification"
                      rows={3}
                      value={form.progress.gapJustification}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, progress: { ...prev.progress, gapJustification: e.target.value } }
                            : prev
                        )
                      }
                      aria-invalid={section2Quality.missingJustificationWarning}
                      placeholder="Expliquez la cause de cet écart (ex. préfinancement entreprise / retard paiement décompte, ou avance de démarrage non encore consommée physiquement)…"
                      className={`w-full px-3 py-2 text-sm border rounded-md bg-white ${
                        section2Quality.missingJustificationWarning
                          ? 'border-red-400 focus:border-red-600'
                          : 'border-emerald-300 focus:border-emerald-600'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 3 : CONTRAINTES, ALERTES ET IMPACTS                        */}
          {/* ================================================================= */}
          {activeSection === 3 && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Typologie des contraintes et alertes identifiées (cocher tout ce qui s’applique)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONSTRAINT_CATEGORIES.map((cat) => {
                    const checked = form.constraints.categories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-start gap-3 p-3.5 border rounded-md cursor-pointer ${
                          checked ? 'border-amber-600 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleConstraintCategory(cat.id)}
                          className="mt-0.5 w-4 h-4 accent-amber-700 shrink-0"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900 block">
                            {cat.number}) {cat.label}
                          </span>
                          <span className="text-slate-600">{cat.examples}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Numbered descriptions */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Description détaillée des contraintes et alertes
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              constraints: {
                                ...prev.constraints,
                                detailedDescriptions: [...prev.constraints.detailedDescriptions, ''],
                              },
                            }
                          : prev
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {form.constraints.detailedDescriptions.map((desc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={desc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => {
                            if (!prev) return prev;
                            const next = [...prev.constraints.detailedDescriptions];
                            next[idx] = val;
                            return { ...prev, constraints: { ...prev.constraints, detailedDescriptions: next } };
                          });
                        }}
                        placeholder="Précisez la contrainte constatée sur chantier…"
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
                      />
                      {form.constraints.detailedDescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    constraints: {
                                      ...prev.constraints,
                                      detailedDescriptions: prev.constraints.detailedDescriptions.filter((_, i) => i !== idx),
                                    },
                                  }
                                : prev
                            )
                          }
                          className="p-2 text-slate-400 hover:text-red-600"
                          aria-label="Supprimer cette contrainte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Impacts */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <label className="block text-xs font-semibold text-slate-700">
                  Impacts liés aux contraintes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      ['delays', 'Délais'],
                      ['costs', 'Coûts'],
                      ['quality', 'Qualité'],
                      ['stoppage', 'Arrêt des travaux'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-md text-xs font-medium text-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.constraints.impacts[key]}
                        onChange={(e) =>
                          setForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  constraints: {
                                    ...prev.constraints,
                                    impacts: { ...prev.constraints.impacts, [key]: e.target.checked },
                                  },
                                }
                              : prev
                          )
                        }
                        className="w-4 h-4 accent-[#0F2544]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={form.constraints.impacts.details}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            constraints: {
                              ...prev.constraints,
                              impacts: { ...prev.constraints.impacts, details: e.target.value },
                            },
                          }
                        : prev
                    )
                  }
                  placeholder="Précisez l’impact quantifié (nombre de jours de retard, surcoût estimé, reprise technique…)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              {/* Critical Alert & Corrective Actions */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-red-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.constraints.isCritical}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, constraints: { ...prev.constraints, isCritical: e.target.checked } }
                          : prev
                      )
                    }
                    className="w-4 h-4 accent-red-700"
                  />
                  Signaler comme alerte critique nécessitant une action urgente de la coordination BCECO
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="corrective-measures" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mesures correctives proposées (BCeCo / Entreprise / Autorités locales)
                    </label>
                    <textarea
                      id="corrective-measures"
                      rows={3}
                      value={form.constraints.correctiveMeasures}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, constraints: { ...prev.constraints, correctiveMeasures: e.target.value } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="urgent-actions" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Actions urgentes requises {form.constraints.isCritical ? '*' : ''}
                    </label>
                    <textarea
                      id="urgent-actions"
                      rows={3}
                      value={form.constraints.urgentActionsRequired}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? { ...prev, constraints: { ...prev.constraints, urgentActionsRequired: e.target.value } }
                            : prev
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="max-w-sm">
                  <label htmlFor="action-owner" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Responsable de l’action (le cas échéant)
                  </label>
                  <select
                    id="action-owner"
                    value={form.constraints.actionOwner}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, constraints: { ...prev.constraints, actionOwner: e.target.value } } : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Entreprise">Entreprise (PME / ALE)</option>
                    <option value="BCeCo">BCeCo (Coordination / Finances)</option>
                    <option value="Autorités locales">Autorités locales / Territoire</option>
                    <option value="BCeCo & Entreprise">BCeCo & Entreprise (Conjoint)</option>
                    <option value="Mission de contrôle">Mission de contrôle technique</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 4 : RÉCEPTIONS (RT/RP/RD), OBSERVATIONS & PHOTOS          */}
          {/* ================================================================= */}
          {activeSection === 4 && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2.5 px-3 font-semibold">Type de réception</th>
                      <th className="py-2.5 px-3 font-semibold">Statut</th>
                      <th className="py-2.5 px-3 font-semibold">Date effective / prévue</th>
                      <th className="py-2.5 px-3 font-semibold">Réserves</th>
                      <th className="py-2.5 px-3 font-semibold">Référence PV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(
                      [
                        ['rt', 'Réception Technique (RT)'],
                        ['rp', 'Réception Provisoire (RP)'],
                        ['rd', 'Réception Définitive (RD)'],
                      ] as const
                    ).map(([key, label]) => {
                      const entry = form.receptions[key];
                      return (
                        <tr key={key}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{label}</td>
                          <td className="py-2.5 px-3">
                            <select
                              value={entry.status}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        receptions: {
                                          ...prev.receptions,
                                          [key]: { ...prev.receptions[key], status: e.target.value as ReceptionStatus },
                                        },
                                      }
                                    : prev
                                )
                              }
                              className="px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium"
                            >
                              {(['OK', 'NON', 'NA'] as ReceptionStatus[]).map((st) => (
                                <option key={st} value={st}>
                                  {RECEPTION_STATUS_LABELS[st]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        receptions: {
                                          ...prev.receptions,
                                          [key]: { ...prev.receptions[key], date: e.target.value },
                                        },
                                      }
                                    : prev
                                )
                              }
                              className="px-2 py-1.5 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={entry.reserves}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        receptions: {
                                          ...prev.receptions,
                                          [key]: { ...prev.receptions[key], reserves: e.target.value },
                                        },
                                      }
                                    : prev
                                )
                              }
                              placeholder="Réserves éventuelles"
                              className="w-full min-w-[140px] px-2 py-1.5 border border-slate-300 rounded text-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={entry.pvReference}
                              onChange={(e) =>
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        receptions: {
                                          ...prev.receptions,
                                          [key]: { ...prev.receptions[key], pvReference: e.target.value },
                                        },
                                      }
                                    : prev
                                )
                              }
                              placeholder="Ex: PV-RT-2026-..."
                              className="w-full min-w-[130px] px-2 py-1.5 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Structured Observations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="obs-gen" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Observations générales
                  </label>
                  <textarea
                    id="obs-gen"
                    rows={3}
                    value={form.receptions.generalObservations}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, receptions: { ...prev.receptions, generalObservations: e.target.value } }
                          : prev
                      )
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="obs-guarding" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Gardiennage
                  </label>
                  <input
                    id="obs-guarding"
                    type="text"
                    value={form.receptions.guardingStatus}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, receptions: { ...prev.receptions, guardingStatus: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="Ex: Gardiennage 24h/24 assuré par l'entreprise"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="obs-site" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    État des lieux
                  </label>
                  <input
                    id="obs-site"
                    type="text"
                    value={form.receptions.siteCondition}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, receptions: { ...prev.receptions, siteCondition: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="Ex: Chantier propre, matériaux protégés"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="obs-disputes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Litiges éventuels
                  </label>
                  <input
                    id="obs-disputes"
                    type="text"
                    value={form.receptions.disputes}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, receptions: { ...prev.receptions, disputes: e.target.value } } : prev
                      )
                    }
                    placeholder="Aucun ou détails du différend"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="obs-attendance" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Niveau de fréquentation (si achevé)
                  </label>
                  <input
                    id="obs-attendance"
                    type="text"
                    value={form.receptions.attendanceLevel}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, receptions: { ...prev.receptions, attendanceLevel: e.target.value } }
                          : prev
                      )
                    }
                    placeholder="Ex: 380 élèves / 40 consultations par jour"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Field Photos & Attachments (Offline-safe IndexedDB persistence!) */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">
                      Photographies justificatives du chantier ({form.receptions.photos.length}/6)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Compression automatique hors ligne ; conservées dans IndexedDB jusqu’à synchronisation.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 cursor-pointer min-h-[40px]">
                    <Camera className="w-4 h-4" />
                    <span>Prendre / Ajouter une photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {form.receptions.photos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {form.receptions.photos.map((photo) => (
                      <div key={photo.id} className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                        <img
                          src={photo.remoteUrl || photo.dataUrl}
                          alt={photo.caption || photo.fileName}
                          referrerPolicy="no-referrer"
                          className="w-full h-36 object-cover"
                        />
                        <div className="p-2.5 space-y-2">
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      receptions: {
                                        ...prev.receptions,
                                        photos: prev.receptions.photos.map((p) =>
                                          p.id === photo.id ? { ...p, caption: e.target.value } : p
                                        ),
                                      },
                                    }
                                  : prev
                              )
                            }
                            placeholder="Légende de la photo…"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          />
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-mono">
                              {Math.round(photo.sizeBytes / 1024)} Ko ·{' '}
                              <span
                                className={
                                  photo.syncState === 'UPLOADED'
                                    ? 'text-emerald-800 font-semibold'
                                    : photo.syncState === 'FAILED'
                                    ? 'text-red-700 font-semibold'
                                    : 'text-amber-800 font-semibold'
                                }
                              >
                                {photo.syncState === 'UPLOADED'
                                  ? 'Téléversée'
                                  : photo.syncState === 'FAILED'
                                  ? 'Échec envoi'
                                  : 'File IndexedDB'}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                void removeQueuedPhoto(photo.id);
                                setForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        receptions: {
                                          ...prev.receptions,
                                          photos: prev.receptions.photos.filter((p) => p.id !== photo.id),
                                        },
                                      }
                                    : prev
                                );
                              }}
                              className="text-red-700 hover:underline font-medium"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Autres pièces jointes (PV scannés, attachements) : {form.receptions.attachments.length}
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer min-h-[40px]">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Joindre un document</span>
                    <input type="file" multiple onChange={handleAttachmentUpload} className="hidden" />
                  </label>
                </div>
                {form.receptions.attachments.length > 0 && (
                  <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md text-xs">
                    {form.receptions.attachments.map((at) => (
                      <li key={at.id} className="px-3 py-2 flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-800">{at.fileName}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    receptions: {
                                      ...prev.receptions,
                                      attachments: prev.receptions.attachments.filter((item) => item.id !== at.id),
                                    },
                                  }
                                : prev
                            )
                          }
                          className="text-red-700 hover:underline shrink-0"
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 5 : VALIDATION ET SIGNATURES                               */}
          {/* ================================================================= */}
          {activeSection === 5 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="sig-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nom de l’agent enquêteur *
                  </label>
                  <input
                    id="sig-name"
                    type="text"
                    value={form.signature.agentFullName}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, signature: { ...prev.signature, agentFullName: e.target.value } } : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="sig-func" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fonction *
                  </label>
                  <input
                    id="sig-func"
                    type="text"
                    value={form.signature.agentFunction}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, signature: { ...prev.signature, agentFunction: e.target.value } } : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="sig-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Téléphone *
                  </label>
                  <input
                    id="sig-phone"
                    type="tel"
                    value={form.signature.agentPhone}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, signature: { ...prev.signature, agentPhone: e.target.value } } : prev
                      )
                    }
                    className="w-full px-3 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Signature de l’agent enquêteur *
                </label>
                <SignaturePad
                  value={form.signature.signatureDataUrl}
                  agentName={form.signature.agentFullName}
                  onChange={(dataUrl) =>
                    setForm((prev) =>
                      prev ? { ...prev, signature: { ...prev.signature, signatureDataUrl: dataUrl } } : prev
                    )
                  }
                />
              </div>

              {/* Compact 5-Section Pre-Submission Verification Summary */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-md p-4 space-y-2.5 text-xs">
                <p className="font-bold text-[#0F2544]">
                  Récapitulatif de contrôle des 5 sections avant soumission
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-800">
                  <div>
                    <span className="text-slate-500 block">Ouvrage &amp; Période</span>
                    <span className="font-semibold">
                      {form.identification.matrixNumber} · {PERIODICITY_LABELS[form.identification.periodicity]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Statut &amp; Étapes</span>
                    <span className="font-semibold">
                      {WORK_STATUS_LABELS[form.progress.workStatus]} ({form.progress.executionStages.length}/8)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">TEP / TEF / Écart</span>
                    <span className={`font-mono font-bold ${needsGapReason ? 'text-red-700' : 'text-slate-900'}`}>
                      {form.progress.currentTep}% / {form.progress.currentTef}% ({formatSignedGapFr(computedGap)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contraintes &amp; Médias</span>
                    <span className="font-medium">
                      {form.constraints.categories.length} typologie(s) · {form.receptions.photos.length} photo(s) ·{' '}
                      RT:{form.receptions.rt.status} / RP:{form.receptions.rp.status} / RD:{form.receptions.rd.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automatic Audit Metadata */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 text-xs">
                <p className="font-semibold text-slate-800">Métadonnées d’audit enregistrées automatiquement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-slate-700">
                  <div>
                    <span className="font-sans text-slate-500 block">Identifiant fiche</span>
                    {form.id}
                  </div>
                  <div>
                    <span className="font-sans text-slate-500 block">Affectation active</span>
                    {form.assignmentId}
                  </div>
                  <div>
                    <span className="font-sans text-slate-500 block">Identifiant utilisateur</span>
                    {currentUser.id}
                  </div>
                  <div>
                    <span className="font-sans text-slate-500 block">Date création</span>
                    {formatDateTimeFr(form.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section Navigation + Save Draft / Submit Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeSection > 1 && (
              <button
                type="button"
                onClick={() => setActiveSection((activeSection - 1) as 1 | 2 | 3 | 4 | 5)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
                Section précédente
              </button>
            )}
            {activeSection < 5 && (
              <button
                type="button"
                onClick={() => setActiveSection((activeSection + 1) as 1 | 2 | 3 | 4 | 5)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-100 min-h-[44px]"
              >
                Section suivante
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde…' : 'Enregistrer brouillon'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] disabled:opacity-60 min-h-[44px]"
            >
              {isOnline ? <Send className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
              {submitting
                ? 'Traitement…'
                : !isOnline
                ? 'Mettre en file hors ligne'
                : isEditingReturned
                ? 'Resoumettre la fiche corrigée'
                : 'Soumettre la fiche'}
            </button>
          </div>
        </div>
      </section>

      {!isOnline && (
        <p className="text-xs text-amber-900 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
          Mode hors ligne détecté : la sauvegarde brouillon et la soumission en file sont persistées dans IndexedDB même si vous fermez l’application.
        </p>
      )}
    </div>
  );
};
