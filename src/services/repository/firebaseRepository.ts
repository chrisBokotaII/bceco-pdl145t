import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { createDemoDataset } from '../../data/demoSeed';
import {
  calculateTepTefGap,
  detectPotentialDuplicates,
  validateFieldReportForSubmission,
} from '../../domain/businessRules';
import { computePeriodKey, generateUniqueId } from '../../domain/formatters';
import type {
  AgentAssignment,
  AuditLog,
  FieldReport,
  GeneratedReportRecord,
  Project,
  ReportReview,
  SyncLog,
  UserProfile,
} from '../../types/domain';
import { db, handleFirestoreError, OperationType } from '../firebase/firebaseClient';
import type {
  BootstrapPayload,
  CreateAgentInput,
  CreateAssignmentsInput,
  DataRepository,
  ReviewReportResult,
  SubmitReportResult,
  UpdateAgentInput,
  UploadPhotoInput,
  UploadPhotoResult,
} from './types';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result as T;
}

export class FirebaseRepository implements DataRepository {
  readonly modeLabel = 'Firebase Cloud Firestore (Production / Sécurisé par Rules)';

  private async logAudit(
    actor: UserProfile,
    action: string,
    entityType: string,
    entityId: string,
    details: string
  ): Promise<void> {
    const id = generateUniqueId('AUD');
    const log: AuditLog = {
      id,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      details: details.slice(0, 600),
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'audit_logs', id), log);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `audit_logs/${id}`);
    }
  }

  async bootstrap(currentUser: UserProfile): Promise<BootstrapPayload> {
    if (currentUser.role === 'COORDINATEUR') {
      try {
        const [usersSnap, projSnap, assignSnap, repSnap, genSnap, syncSnap, auditSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'agent_assignments')),
          getDocs(collection(db, 'field_reports')),
          getDocs(collection(db, 'generated_reports')),
          getDocs(collection(db, 'sync_logs')),
          getDocs(collection(db, 'audit_logs')),
        ]);

        return {
          users: usersSnap.docs.map((d) => d.data() as UserProfile),
          projects: projSnap.docs.map((d) => d.data() as Project),
          assignments: assignSnap.docs.map((d) => d.data() as AgentAssignment),
          reports: repSnap.docs.map((d) => d.data() as FieldReport),
          generatedReports: genSnap.docs
            .map((d) => d.data() as GeneratedReportRecord)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          syncLogs: syncSnap.docs
            .map((d) => d.data() as SyncLog)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          auditLogs: auditSnap.docs
            .map((d) => d.data() as AuditLog)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    }

    // AGENT_TERRAIN: strict queries aligned with firestore.rules
    try {
      const [projSnap, assignSnap, repSnap, syncSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), where('assignedAgentIds', 'array-contains', currentUser.id))),
        getDocs(query(collection(db, 'agent_assignments'), where('agentId', '==', currentUser.id))),
        getDocs(query(collection(db, 'field_reports'), where('agentId', '==', currentUser.id))),
        getDocs(query(collection(db, 'sync_logs'), where('userId', '==', currentUser.id))),
      ]);

      return {
        users: [currentUser],
        projects: projSnap.docs.map((d) => d.data() as Project),
        assignments: assignSnap.docs.map((d) => d.data() as AgentAssignment),
        reports: repSnap.docs.map((d) => d.data() as FieldReport),
        generatedReports: [],
        syncLogs: syncSnap.docs
          .map((d) => d.data() as SyncLog)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        auditLogs: [],
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    }
  }

  /**
   * Initialise le jeu de données de démonstration (clairement marqué isDemoData: true) dans Firestore
   * lorsque la base cloud est vide et que le Coordonnateur déclenche explicitement le peuplement démo.
   */
  async seedDemoDataToFirestore(coordinator: UserProfile): Promise<void> {
    const demo = createDemoDataset();
    const batch = writeBatch(db);

    for (const u of demo.users) {
      if (u.id === coordinator.id) continue;
      batch.set(doc(db, 'users', u.id), stripUndefined(u as unknown as Record<string, unknown>));
    }
    for (const p of demo.projects) {
      batch.set(doc(db, 'projects', p.id), stripUndefined(p as unknown as Record<string, unknown>));
    }
    for (const a of demo.assignments) {
      batch.set(
        doc(db, 'agent_assignments', a.id),
        stripUndefined({ ...a, assignedBy: coordinator.id } as unknown as Record<string, unknown>)
      );
    }
    for (const r of demo.reports) {
      batch.set(doc(db, 'field_reports', r.id), stripUndefined(r as unknown as Record<string, unknown>));
    }
    for (const g of demo.generatedReports) {
      batch.set(
        doc(db, 'generated_reports', g.id),
        stripUndefined({ ...g, generatedBy: coordinator.id } as unknown as Record<string, unknown>)
      );
    }

    try {
      await batch.commit();
      await this.logAudit(
        coordinator,
        'INITIALISATION_DEMO_FIRESTORE',
        'SYSTEME',
        'SEED-DEMO',
        `Peuplement initial du jeu de données de démonstration dans Cloud Firestore (${demo.projects.length} ouvrages, ${demo.reports.length} fiches).`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    }
  }

  async createAgent(currentUser: UserProfile, input: CreateAgentInput): Promise<UserProfile> {
    const id = generateUniqueId('USR-AGT');
    const now = new Date().toISOString();
    const agent: UserProfile = {
      id,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      role: 'AGENT_TERRAIN',
      phone: input.phone.trim(),
      functionTitle: input.functionTitle.trim(),
      provinceScope: input.provinceScope.trim(),
      isActive: true,
      isDemoData: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(db, 'users', id), agent);
      await this.logAudit(currentUser, 'CREATION_AGENT', 'USER', id, `Création agent ${agent.fullName}.`);
      return agent;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${id}`);
    }
  }

  async updateAgent(currentUser: UserProfile, agentId: string, input: UpdateAgentInput): Promise<UserProfile> {
    const ref = doc(db, 'users', agentId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Agent introuvable.');
      const updated: UserProfile = {
        ...(snap.data() as UserProfile),
        ...input,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(ref, stripUndefined(updated as unknown as Record<string, unknown>));
      await this.logAudit(currentUser, 'MISE_A_JOUR_AGENT', 'USER', agentId, `Mise à jour agent ${updated.fullName}.`);
      return updated;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${agentId}`);
    }
  }

  async importProjects(currentUser: UserProfile, projects: Project[]): Promise<Project[]> {
    const batch = writeBatch(db);
    for (const p of projects) {
      batch.set(doc(db, 'projects', p.id), stripUndefined(p as unknown as Record<string, unknown>));
    }
    try {
      await batch.commit();
      await this.logAudit(
        currentUser,
        'IMPORT_AUDIT_MATRICE',
        'PROJECT',
        'BATCH',
        `Import Firestore de ${projects.length} ouvrage(s) après audit.`
      );
      return projects;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  }

  async createAssignments(currentUser: UserProfile, input: CreateAssignmentsInput): Promise<AgentAssignment[]> {
    try {
      const agentSnap = await getDoc(doc(db, 'users', input.agentId));
      if (!agentSnap.exists()) throw new Error('Agent introuvable.');
      const agent = agentSnap.data() as UserProfile;
      if (!agent.isActive) {
        throw new Error('Impossible d’affecter des ouvrages à un compte agent désactivé.');
      }
      const created: AgentAssignment[] = [];
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      for (const projectId of input.projectIds) {
        const projRef = doc(db, 'projects', projectId);
        const projSnap = await getDoc(projRef);
        if (!projSnap.exists()) continue;
        const proj = projSnap.data() as Project;
        if (proj.assignedAgentIds.includes(agent.id)) continue;

        const id = generateUniqueId('AFF');
        const assignment: AgentAssignment = {
          id,
          agentId: agent.id,
          agentName: agent.fullName,
          projectId: proj.id,
          projectMatrixNumber: proj.matrixNumber,
          projectName: proj.projectName,
          startDate: input.startDate,
          endDate: null,
          status: 'ACTIVE',
          assignedBy: currentUser.id,
          assignedByName: currentUser.fullName,
          notes: input.notes || 'Affectation coordonnateur.',
          isDemoData: proj.isDemoData,
          createdAt: now,
          updatedAt: now,
        };
        batch.set(doc(db, 'agent_assignments', id), assignment);
        const nextAgents = Array.from(new Set([...proj.assignedAgentIds, agent.id]));
        batch.update(projRef, { assignedAgentIds: nextAgents, updatedAt: now });
        created.push(assignment);
      }
      if (created.length > 0) {
        await batch.commit();
      }
      await this.logAudit(
        currentUser,
        'AFFECTATION_OUVRAGES',
        'AGENT_ASSIGNMENT',
        agent.id,
        `Affectation de ${created.length} ouvrage(s) à ${agent.fullName}.`
      );
      return created;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agent_assignments');
    }
  }

  async reassignAssignment(
    currentUser: UserProfile,
    assignmentId: string,
    targetAgentId: string,
    notes: string
  ): Promise<{ closedAssignment: AgentAssignment; newAssignment: AgentAssignment }> {
    try {
      const ref = doc(db, 'agent_assignments', assignmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Affectation introuvable.');
      const current = snap.data() as AgentAssignment;

      const targetSnap = await getDoc(doc(db, 'users', targetAgentId));
      if (!targetSnap.exists()) throw new Error('Nouvel agent introuvable.');
      const targetAgent = targetSnap.data() as UserProfile;
      if (!targetAgent.isActive) {
        throw new Error('Impossible de réaffecter un ouvrage vers un compte agent désactivé.');
      }

      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      const closedAssignment: AgentAssignment = {
        ...current,
        status: 'REAFFECTEE',
        endDate: today,
        reassignedToAgentId: targetAgent.id,
        notes: notes ? `${current.notes} | Réaffectation: ${notes}` : current.notes,
        updatedAt: now,
      };

      const newId = generateUniqueId('AFF');
      const newAssignment: AgentAssignment = {
        id: newId,
        agentId: targetAgent.id,
        agentName: targetAgent.fullName,
        projectId: current.projectId,
        projectMatrixNumber: current.projectMatrixNumber,
        projectName: current.projectName,
        startDate: today,
        endDate: null,
        status: 'ACTIVE',
        assignedBy: currentUser.id,
        assignedByName: currentUser.fullName,
        notes: notes || `Réaffecté depuis ${current.agentName}.`,
        isDemoData: current.isDemoData,
        createdAt: now,
        updatedAt: now,
      };

      const projRef = doc(db, 'projects', current.projectId);
      const projSnap = await getDoc(projRef);

      const batch = writeBatch(db);
      batch.update(ref, {
        status: closedAssignment.status,
        endDate: closedAssignment.endDate,
        reassignedToAgentId: closedAssignment.reassignedToAgentId,
        notes: closedAssignment.notes,
        updatedAt: now,
      });
      batch.set(doc(db, 'agent_assignments', newId), newAssignment);
      if (projSnap.exists()) {
        const proj = projSnap.data() as Project;
        const nextAgents = Array.from(
          new Set(proj.assignedAgentIds.filter((id) => id !== current.agentId).concat(targetAgent.id))
        );
        batch.update(projRef, { assignedAgentIds: nextAgents, updatedAt: now });
      }
      await batch.commit();

      await this.logAudit(
        currentUser,
        'REAFFECTATION_OUVRAGE',
        'AGENT_ASSIGNMENT',
        current.projectId,
        `Réaffectation de ${current.projectMatrixNumber} vers ${targetAgent.fullName}.`
      );
      return { closedAssignment, newAssignment };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agent_assignments/${assignmentId}`);
    }
  }

  async endAssignment(currentUser: UserProfile, assignmentId: string, notes: string): Promise<AgentAssignment> {
    try {
      const ref = doc(db, 'agent_assignments', assignmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Affectation introuvable.');
      const current = snap.data() as AgentAssignment;
      const now = new Date().toISOString();
      const updated: AgentAssignment = {
        ...current,
        status: 'TERMINEE',
        endDate: now.slice(0, 10),
        notes: notes ? `${current.notes} | Clôture: ${notes}` : current.notes,
        updatedAt: now,
      };

      const projRef = doc(db, 'projects', current.projectId);
      const projSnap = await getDoc(projRef);

      const batch = writeBatch(db);
      batch.update(ref, {
        status: updated.status,
        endDate: updated.endDate,
        notes: updated.notes,
        updatedAt: now,
      });
      if (projSnap.exists()) {
        const proj = projSnap.data() as Project;
        batch.update(projRef, {
          assignedAgentIds: proj.assignedAgentIds.filter((id) => id !== current.agentId),
          updatedAt: now,
        });
      }
      await batch.commit();

      await this.logAudit(currentUser, 'CLOTURE_AFFECTATION', 'AGENT_ASSIGNMENT', assignmentId, `Clôture affectation ${current.projectMatrixNumber}.`);
      return updated;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agent_assignments/${assignmentId}`);
    }
  }

  async uploadPhoto(_currentUser: UserProfile, photo: UploadPhotoInput): Promise<UploadPhotoResult> {
    if (!photo.dataUrl || !photo.dataUrl.startsWith('data:image/')) {
      throw new Error('Format de photographie invalide pour la synchronisation.');
    }
    // Firestore document limit protection (keep each compressed field photo well under 350 Ko)
    const approxBytes = Math.round((photo.dataUrl.length * 3) / 4);
    if (approxBytes > 380 * 1024) {
      throw new Error(
        `Photo trop volumineuse (${Math.round(approxBytes / 1024)} Ko) pour la limite document Firestore. Veuillez la recompresser.`
      );
    }
    return {
      photoId: photo.id,
      remoteUrl: '',
      uploadedAt: new Date().toISOString(),
      deduplicated: false,
    };
  }

  async submitReport(
    currentUser: UserProfile,
    report: FieldReport,
    options?: { syncFromOffline?: boolean; clientSubmissionId?: string }
  ): Promise<SubmitReportResult> {
    const now = new Date().toISOString();
    const submissionKey = options?.clientSubmissionId ?? report.clientSubmissionId;

    const projSnap = await getDoc(doc(db, 'projects', report.projectId)).catch((err) =>
      handleFirestoreError(err, OperationType.GET, `projects/${report.projectId}`)
    );
    if (!projSnap.exists()) {
      throw new Error('Ouvrage de référence introuvable dans le registre officiel Firestore.');
    }
    const project = projSnap.data() as Project;

    const lockedIdentification = {
      ...report.identification,
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
    };

    const gap = calculateTepTefGap(report.progress.currentTep, report.progress.currentTef);
    const periodKey = computePeriodKey(
      lockedIdentification.periodicity,
      lockedIdentification.collectionDate,
      lockedIdentification.weekNumber,
      lockedIdentification.month
    );

    const normalizedPhotos = (report.receptions.photos || []).map((ph) => ({
      ...ph,
      syncState: 'UPLOADED' as const,
    }));
    const normalizedAttachments = (report.receptions.attachments || []).map((at) => ({
      ...at,
      syncState: 'UPLOADED' as const,
    }));

    const [existingSnap, assignSnap] = await Promise.all([
      getDocs(query(collection(db, 'field_reports'), where('agentId', '==', currentUser.id))).catch((err) =>
        handleFirestoreError(err, OperationType.LIST, 'field_reports')
      ),
      getDocs(query(collection(db, 'agent_assignments'), where('agentId', '==', currentUser.id))).catch((err) =>
        handleFirestoreError(err, OperationType.LIST, 'agent_assignments')
      ),
    ]);

    const agentReports = existingSnap.docs.map((d) => d.data() as FieldReport);
    const existingDoc = agentReports.find((r) => r.id === report.id);
    if (existingDoc && submissionKey && existingDoc.clientSubmissionId === submissionKey) {
      return {
        report: existingDoc,
        conflictDetected: existingDoc.syncStatus === 'CONFLIT_AFFECTATION',
        duplicates: existingDoc.potentialDuplicateOf || [],
        idempotentReplay: true,
      };
    }
    if (existingDoc && existingDoc.status === 'VALIDE') {
      throw new Error('Une fiche déjà validée est verrouillée et ne peut plus être modifiée.');
    }
    if (
      existingDoc &&
      currentUser.role === 'AGENT_TERRAIN' &&
      (existingDoc.status === 'SOUMIS' || existingDoc.status === 'EN_COURS_VERIFICATION')
    ) {
      throw new Error('Cette fiche est déjà soumise ou en cours de vérification ; attendez la revue du Coordonnateur.');
    }

    const activeAssignment = assignSnap.docs
      .map((d) => d.data() as AgentAssignment)
      .find((a) => a.projectId === project.id && a.status === 'ACTIVE');

    const duplicates = detectPotentialDuplicates(
      {
        id: report.id,
        projectId: project.id,
        agentId: currentUser.id,
        periodicity: lockedIdentification.periodicity,
        identification: lockedIdentification,
      },
      agentReports
    );

    const nextVersion = existingDoc ? existingDoc.version + 1 : 1;
    const versionHistory = existingDoc
      ? [
          ...existingDoc.versionHistory,
          {
            version: existingDoc.version,
            savedAt: existingDoc.updatedAt,
            statusAtSnapshot: existingDoc.status,
            currentTep: existingDoc.currentTep,
            currentTef: existingDoc.currentTef,
            workStatus: existingDoc.progress.workStatus,
            summary: existingDoc.progress.periodWorksExecuted.slice(0, 140),
          },
        ]
      : [];

    const finalized: FieldReport = {
      ...report,
      projectId: project.id,
      matrixNumber: project.matrixNumber,
      agentId: currentUser.id,
      agentName: currentUser.fullName,
      // Preserve immutable assignmentId when updating an existing report so Tier 2 rules affectedKeys().hasOnly() succeeds
      assignmentId: existingDoc
        ? existingDoc.assignmentId
        : activeAssignment?.id ?? report.assignmentId ?? 'AFF-ACTIVE',
      status: 'SOUMIS',
      syncStatus: 'SYNCHRONISE',
      ...(submissionKey ? { clientSubmissionId: submissionKey } : {}),
      potentialDuplicateOf: duplicates,
      version: nextVersion,
      periodKey,
      periodicity: lockedIdentification.periodicity,
      collectionDate: lockedIdentification.collectionDate,
      currentTep: report.progress.currentTep,
      currentTef: report.progress.currentTef,
      identification: lockedIdentification,
      progress: { ...report.progress, tepTefGap: gap },
      receptions: {
        ...report.receptions,
        photos: normalizedPhotos,
        attachments: normalizedAttachments,
      },
      reviews: existingDoc ? existingDoc.reviews : [],
      versionHistory,
      createdAt: existingDoc ? existingDoc.createdAt : report.createdAt || now,
      submittedAt: now,
      validatedAt: undefined,
      lastSyncedAt: now,
      updatedAt: now,
    };

    const validationErrors = validateFieldReportForSubmission(finalized);
    if (validationErrors.length > 0) {
      throw new Error(`Validation métier refusée : ${validationErrors[0].message}`);
    }

    try {
      await setDoc(doc(db, 'field_reports', finalized.id), stripUndefined(finalized as unknown as Record<string, unknown>));
      await this.logAudit(
        currentUser,
        existingDoc ? 'RESOUMISSION_FICHE' : 'SOUMISSION_FICHE',
        'FIELD_REPORT',
        finalized.id,
        `Soumission Firestore v${finalized.version} sur ${finalized.matrixNumber} (TEP ${finalized.currentTep}%, TEF ${finalized.currentTef}%).`
      );
      return { report: finalized, conflictDetected: false, duplicates };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `field_reports/${finalized.id}`);
    }
  }

  async reviewReport(
    currentUser: UserProfile,
    reportId: string,
    decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE',
    comment: string
  ): Promise<ReviewReportResult> {
    const trimmedComment = comment.trim();
    if (decision === 'RETOURNE' && trimmedComment.length < 5) {
      throw new Error('Un motif détaillé (minimum 5 caractères) est obligatoire pour retourner une fiche.');
    }

    const ref = doc(db, 'field_reports', reportId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Fiche introuvable.');
      const report = snap.data() as FieldReport;
      if (report.status === 'VALIDE') {
        throw new Error('Cette fiche est déjà validée et archivée définitivement ; elle ne peut plus être modifiée.');
      }
      const now = new Date().toISOString();

      const review: ReportReview = {
        id: generateUniqueId('REV'),
        reportId: report.id,
        reportVersion: report.version,
        reviewerId: currentUser.id,
        reviewerName: currentUser.fullName,
        decision,
        comment:
          trimmedComment ||
          (decision === 'VALIDE' ? 'Fiche vérifiée et validée par le Coordonnateur.' : 'Mise en vérification.'),
        createdAt: now,
      };

      const nextReviews = [...(report.reviews || []), review];
      const batch = writeBatch(db);
      batch.update(ref, {
        status: decision,
        reviews: nextReviews,
        ...(decision === 'VALIDE' ? { validatedAt: now, syncStatus: 'SYNCHRONISE' } : {}),
        updatedAt: now,
      });
      batch.set(doc(db, 'field_reports', report.id, 'reviews', review.id), review);

      let updatedProject: Project | undefined;
      if (decision === 'VALIDE') {
        const projRef = doc(db, 'projects', report.projectId);
        const projSnap = await getDoc(projRef);
        if (projSnap.exists()) {
          const proj = projSnap.data() as Project;
          updatedProject = {
            ...proj,
            currentStatus: report.progress.workStatus,
            latestPeriodRealization: report.progress.periodWorksExecuted,
            latestExecutionStages: [...report.progress.executionStages],
            currentTep: report.progress.currentTep,
            currentTef: report.progress.currentTef,
            currentGap: calculateTepTefGap(report.progress.currentTep, report.progress.currentTef),
            latestConstraintCategories: [...report.constraints.categories],
            latestConstraintsSummary:
              report.constraints.detailedDescriptions.filter((d) => d.trim()).join(' ; ') || 'Aucune contrainte active',
            hasUnresolvedConstraints: report.constraints.categories.length > 0,
            hasCriticalConstraint: report.constraints.isCritical,
            latestImpactsSummary: report.constraints.impacts.details || 'Aucun impact majeur',
            receptions: {
              rt: { ...report.receptions.rt },
              rp: { ...report.receptions.rp },
              rd: { ...report.receptions.rd },
            },
            latestObservation: report.receptions.generalObservations || proj.latestObservation,
            lastValidatedReportId: report.id,
            lastValidatedAt: now,
            updatedAt: now,
          };
          batch.set(projRef, stripUndefined(updatedProject as unknown as Record<string, unknown>));
        }
      }

      await batch.commit();

      const auditAction =
        decision === 'VALIDE'
          ? 'VALIDATION_FICHE'
          : decision === 'RETOURNE'
          ? 'RETOUR_FICHE'
          : 'VERIFICATION_FICHE';
      await this.logAudit(
        currentUser,
        auditAction,
        'FIELD_REPORT',
        report.id,
        `Décision « ${decision} » sur ${report.id} (${report.matrixNumber}) : ${review.comment}`
      );
      return {
        report: {
          ...report,
          status: decision,
          reviews: nextReviews,
          validatedAt: decision === 'VALIDE' ? now : report.validatedAt,
          syncStatus: decision === 'VALIDE' ? 'SYNCHRONISE' : report.syncStatus,
          updatedAt: now,
        },
        review,
        project: updatedProject,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `field_reports/${reportId}`);
    }
  }

  async recordGeneratedReport(
    currentUser: UserProfile,
    record: Omit<GeneratedReportRecord, 'id' | 'generatedBy' | 'generatedByName' | 'createdAt'>
  ): Promise<GeneratedReportRecord> {
    const id = generateUniqueId('RPT-GEN');
    const created: GeneratedReportRecord = {
      ...record,
      id,
      generatedBy: currentUser.id,
      generatedByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'generated_reports', id), created);
      await this.logAudit(currentUser, 'GENERATION_RAPPORT', 'GENERATED_REPORT', id, `Export ${created.format} — ${created.title}`);
      return created;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `generated_reports/${id}`);
    }
  }

  async recordSyncLog(
    currentUser: UserProfile,
    log: Omit<SyncLog, 'id' | 'userId' | 'createdAt'>
  ): Promise<SyncLog> {
    const id = generateUniqueId('SYNC');
    const created: SyncLog = {
      ...log,
      id,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'sync_logs', id), created);
      return created;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sync_logs/${id}`);
    }
  }
}

export async function resolveOrCreateFirebaseUserProfile(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): Promise<UserProfile> {
  const ref = doc(db, 'users', fbUser.uid);
  const isBootstrapCoord = fbUser.email?.toLowerCase() === 'el305330@students.cavendish.ac.ug';
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const profile = snap.data() as UserProfile;
      if (isBootstrapCoord && profile.role !== 'COORDINATEUR') {
        const promoted: UserProfile = {
          ...profile,
          role: 'COORDINATEUR',
          functionTitle: 'Coordonnateur National S&E (Firebase)',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, promoted);
        return promoted;
      }
      return profile;
    }
    const now = new Date().toISOString();
    const created: UserProfile = {
      id: fbUser.uid,
      email: fbUser.email || `${fbUser.uid}@bceco.local`,
      fullName: fbUser.displayName || 'Utilisateur BCECO',
      role: isBootstrapCoord ? 'COORDINATEUR' : 'AGENT_TERRAIN',
      phone: '',
      functionTitle: isBootstrapCoord ? 'Coordonnateur National S&E' : 'Agent de Terrain S&E',
      provinceScope: isBootstrapCoord ? 'National — Toutes provinces' : 'Non affecté',
      isActive: true,
      isDemoData: true,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, created);
    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}
