export type UserRole = 'COORDINATEUR' | 'AGENT_TERRAIN';

export type InfrastructureType =
  | 'ECOLE_PRIMAIRE'
  | 'CENTRE_DE_SANTE'
  | 'BATIMENT_ADMINISTRATIF';

export type ContractStatus =
  | 'CONTRAT_ACTIF'
  | 'CONTRAT_RESILIE'
  | 'REATTRIBUE_ALE_PME';

export type WorkStatus =
  | 'ACHEVE'
  | 'EN_COURS'
  | 'A_L_ARRET'
  | 'NON_DEMARRE';

export type ReportPeriodicity = 'JOURNALIER' | 'HEBDOMADAIRE' | 'MENSUEL';

export type ExecutionStage =
  | 'IMPLANTATION_TERRASSEMENT'
  | 'FONDATION'
  | 'ELEVATION_MURS'
  | 'CHARPENTE_TOITURE'
  | 'MENUISERIE_CREPISSAGE'
  | 'FINITION'
  | 'PETITS_OUVRAGES_ASSAINISSEMENT'
  | 'EQUIPEMENT_MOBILIER';

export type ConstraintCategory =
  | 'TECHNIQUE'
  | 'LOGISTIQUE'
  | 'FINANCIERE'
  | 'SOCIALE_ENVIRONNEMENTALE';

export type ReceptionStatus = 'OK' | 'NON' | 'NA';

export type FieldReportStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE_SYNC'
  | 'SOUMIS'
  | 'EN_COURS_VERIFICATION'
  | 'VALIDE'
  | 'RETOURNE';

export type SyncState =
  | 'LOCAL_BROUILLON'
  | 'EN_ATTENTE_SYNC'
  | 'SYNCHRONISE'
  | 'CONFLIT_AFFECTATION'
  | 'ERREUR_SYNC';

export type AssignmentStatus = 'ACTIVE' | 'TERMINEE' | 'REAFFECTEE';

export type AuthProviderMode = 'DEMO_ADAPTER' | 'FIREBASE_AUTH';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  functionTitle: string;
  provinceScope: string;
  isActive: boolean;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProvinceEntry {
  code: string;
  name: string;
  regionGroup: 'GRAND_KATANGA' | 'EXTENSION_NATIONALE';
  territories: string[];
}

export interface ReceptionEntry {
  status: ReceptionStatus;
  date: string;
  reserves: string;
  pvReference: string;
}

export interface ProjectReceptions {
  rt: ReceptionEntry;
  rp: ReceptionEntry;
  rd: ReceptionEntry;
}

/**
 * Ouvrage du Registre Officiel (Matrice Unique — 21 colonnes).
 * Sépare strictement les données contractuelles de référence (immuables pour les agents)
 * de la situation figée de référence et des observations terrain validées.
 */
export interface Project {
  id: string;
  // Colonnes 1-9 : IDENTIFICATION (données contractuelles – ne pas modifier par les agents)
  matrixNumber: string; // 1. N°
  contractor: string; // 2. Entreprise
  province: string; // 3. Province
  territory: string; // 4. Territoire
  infrastructureType: InfrastructureType; // 5. Type d'ouvrage
  projectName: string; // 6. Nom de l'ouvrage
  sectorChiefdom: string; // 7. Secteur / Chefferie
  locality: string;
  contractStatus: ContractStatus;
  startDate: string; // 8. Date de démarrage
  definitiveReceptionDeadline: string; // 9. Échéance réception définitive
  referenceCoords: {
    lat: number;
    lng: number;
  };

  // Référence figée (ex: Situation au 31/08/2026 dans la Matrice Unique)
  baselineDate: string;
  baselineStatus: WorkStatus;
  baselineTep: number;
  baselineTef: number;

  // Colonnes 10-21 : État courant consolidé issu des fiches terrain validées
  currentStatus: WorkStatus; // 10. Statut à ce jour
  latestPeriodRealization: string; // 11. Réalisation du mois, semaine ou jour
  latestExecutionStages: ExecutionStage[]; // 12. Niveau d'exécution à ce jour
  currentTep: number; // 13. TEP %
  currentTef: number; // 14. TEF %
  currentGap: number; // 15. Écart TEP-TEF observé
  latestConstraintsSummary: string; // 16. Contraintes et alertes
  latestConstraintCategories: ConstraintCategory[];
  hasUnresolvedConstraints: boolean;
  hasCriticalConstraint: boolean;
  latestImpactsSummary: string; // 17. Impacts liés aux contraintes
  receptions: ProjectReceptions; // 18. RT, 19. RP, 20. RD
  latestObservation: string; // 21. Observation

  // Liaison d'affectations actives (maintenue par le Coordonnateur)
  assignedAgentIds: string[];
  lastValidatedReportId?: string;
  lastValidatedAt?: string;

  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAssignment {
  id: string;
  agentId: string;
  agentName: string;
  projectId: string;
  projectMatrixNumber: string;
  projectName: string;
  startDate: string;
  endDate: string | null;
  status: AssignmentStatus;
  assignedBy: string;
  assignedByName: string;
  notes: string;
  reassignedToAgentId?: string;
  isDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPhoto {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  capturedAt: string;
  dataUrl: string;
  remoteUrl?: string;
  checksum?: string;
  retryCount?: number;
  lastError?: string;
  syncState: 'LOCAL' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
}

export interface ReportAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  syncState: 'LOCAL' | 'UPLOADED';
}

export interface ReportIdentificationSection {
  periodicity: ReportPeriodicity;
  weekNumber: string;
  month: string;
  collectionDate: string;
  // Données contractuelles verrouillées issues du registre officiel
  matrixNumber: string;
  province: string;
  territory: string;
  sectorChiefdom: string;
  infrastructureType: InfrastructureType;
  projectName: string;
  contractor: string;
  contractStatus: ContractStatus;
  startDate: string;
  definitiveReceptionDeadline: string;
  // Précisions terrain
  locality: string;
  gpsLat: string;
  gpsLng: string;
  gpsAccuracy?: number;
  gpsCapturedAt?: string;
}

export interface ReportProgressSection {
  workStatus: WorkStatus;
  stoppageDate: string;
  executionStages: ExecutionStage[];
  periodWorksExecuted: string;
  skilledWorkersCount: number;
  laborersCount: number;
  siteEngineerPresent: boolean;
  previousTep: number;
  currentTep: number;
  previousTef: number;
  currentTef: number;
  tepTefGap: number;
  gapJustification: string;
}

export interface ReportConstraintsSection {
  categories: ConstraintCategory[];
  detailedDescriptions: string[];
  impacts: {
    delays: boolean;
    costs: boolean;
    quality: boolean;
    stoppage: boolean;
    details: string;
  };
  isCritical: boolean;
  correctiveMeasures: string;
  urgentActionsRequired: string;
  actionOwner: string;
}

export interface ReportReceptionsSection {
  rt: ReceptionEntry;
  rp: ReceptionEntry;
  rd: ReceptionEntry;
  generalObservations: string;
  guardingStatus: string;
  siteCondition: string;
  disputes: string;
  attendanceLevel: string;
  photos: ReportPhoto[];
  attachments: ReportAttachment[];
}

export interface ReportSignatureSection {
  agentFullName: string;
  agentFunction: string;
  agentPhone: string;
  signatureDataUrl: string;
  signedAt: string;
}

export interface ReportReview {
  id: string;
  reportId: string;
  reportVersion: number;
  reviewerId: string;
  reviewerName: string;
  decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE';
  comment: string;
  createdAt: string;
}

export interface FieldReportVersionSnapshot {
  version: number;
  savedAt: string;
  statusAtSnapshot: FieldReportStatus;
  currentTep: number;
  currentTef: number;
  workStatus: WorkStatus;
  summary: string;
}

export interface FieldReport {
  id: string;
  projectId: string;
  matrixNumber: string;
  agentId: string;
  agentName: string;
  assignmentId: string;

  status: FieldReportStatus;
  syncStatus: SyncState;
  syncConflictReason?: string;
  clientSubmissionId?: string;
  potentialDuplicateOf: string[];
  version: number;
  periodKey: string;
  periodicity: ReportPeriodicity;
  collectionDate: string;
  currentTep: number;
  currentTef: number;

  identification: ReportIdentificationSection;
  progress: ReportProgressSection;
  constraints: ReportConstraintsSection;
  receptions: ReportReceptionsSection;
  signature: ReportSignatureSection;

  reviews: ReportReview[];
  versionHistory: FieldReportVersionSnapshot[];

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  validatedAt?: string;
  lastSyncedAt?: string;
  isDemoData: boolean;
}

export interface SyncLog {
  id: string;
  userId: string;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  summary: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export type ExportFormat = 'EXCEL' | 'CSV' | 'PDF';
export type ReportDataScope = 'VALIDES_UNIQUEMENT' | 'SOUMIS_ET_VALIDES';

export interface GeneratedReportRecord {
  id: string;
  title: string;
  periodicity: ReportPeriodicity;
  periodLabel: string;
  format: ExportFormat;
  dataScope: ReportDataScope;
  filtersSummary: string;
  generatedBy: string;
  generatedByName: string;
  projectCount: number;
  reportCount: number;
  averageTep: number;
  averageTef: number;
  isDemoData: boolean;
  createdAt: string;
}

export interface DashboardFilters {
  province: string;
  territory: string;
  agentId: string;
  contractor: string;
  infrastructureType: string;
  status: string;
  periodicity: string;
}

export interface ExcelAuditIssue {
  rowIndex: number;
  matrixNumber: string;
  severity: 'ERREUR' | 'AVERTISSEMENT';
  category:
    | 'IDENTIFIANT_MANQUANT'
    | 'DOUBLON_IDENTIFIANT'
    | 'FICHE_INCOMPLETE'
    | 'VALEUR_INCOHERENTE';
  message: string;
}

export interface ExcelAuditResult {
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  rejectedRowsCount: number;
  warningRowsCount: number;
  issues: ExcelAuditIssue[];
  validProjectsPreview: Project[];
}

/**
 * Annexe Terrain — Feuille de Route & Synthèse Multi-Chantiers
 * (page 3 du Formulaire officiel de collecte), remplie par l’agent en mission itinérante.
 */
export type RoadmapStatusCode = '1' | '2' | '3';

export interface RoadmapMissionEntry {
  id: string;
  projectId: string;
  matrixNumber: string;
  projectNameAndType: string;
  contractor: string;
  statusCode: RoadmapStatusCode;
  periodRealizationAndStages: string;
  tep: number;
  tef: number;
  constraintsAndImpacts: string;
  receptionsSummary: string;
  keyObservations: string;
}

export interface RoadmapMission {
  id: string;
  agentId: string;
  agentName: string;
  province: string;
  territory: string;
  periodicity: ReportPeriodicity;
  missionDate: string;
  periodLabel: string;
  entries: RoadmapMissionEntry[];
  createdAt: string;
  updatedAt: string;
}
