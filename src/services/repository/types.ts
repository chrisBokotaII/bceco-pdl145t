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

export interface BootstrapPayload {
  users: UserProfile[];
  projects: Project[];
  assignments: AgentAssignment[];
  reports: FieldReport[];
  generatedReports: GeneratedReportRecord[];
  syncLogs: SyncLog[];
  auditLogs: AuditLog[];
}

export interface CreateAgentInput {
  fullName: string;
  email: string;
  phone: string;
  functionTitle: string;
  provinceScope: string;
  password?: string;
}

export interface UpdateAgentInput {
  fullName?: string;
  phone?: string;
  functionTitle?: string;
  provinceScope?: string;
  isActive?: boolean;
}

export interface CreateAssignmentsInput {
  agentId: string;
  projectIds: string[];
  startDate: string;
  notes: string;
}

export interface UploadPhotoInput {
  id: string;
  reportId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  capturedAt: string;
  dataUrl: string;
  checksum?: string;
}

export interface UploadPhotoResult {
  photoId: string;
  remoteUrl: string;
  uploadedAt: string;
  deduplicated: boolean;
}

export interface SubmitReportResult {
  report: FieldReport;
  conflictDetected: boolean;
  duplicates: string[];
  idempotentReplay?: boolean;
}

export interface ReviewReportResult {
  report: FieldReport;
  review: ReportReview;
  project?: Project;
}

/**
 * Interface de dépôt agnostique (Repository Pattern) découpant totalement
 * l'interface utilisateur de l'implémentation de persistance (Firebase Firestore vs Adaptateur Démo API).
 */
export interface DataRepository {
  readonly modeLabel: string;
  bootstrap(currentUser: UserProfile): Promise<BootstrapPayload>;
  createAgent(currentUser: UserProfile, input: CreateAgentInput): Promise<UserProfile>;
  updateAgent(currentUser: UserProfile, agentId: string, input: UpdateAgentInput): Promise<UserProfile>;
  importProjects(currentUser: UserProfile, projects: Project[]): Promise<Project[]>;
  createAssignments(currentUser: UserProfile, input: CreateAssignmentsInput): Promise<AgentAssignment[]>;
  reassignAssignment(
    currentUser: UserProfile,
    assignmentId: string,
    targetAgentId: string,
    notes: string
  ): Promise<{ closedAssignment: AgentAssignment; newAssignment: AgentAssignment }>;
  endAssignment(currentUser: UserProfile, assignmentId: string, notes: string): Promise<AgentAssignment>;
  uploadPhoto(currentUser: UserProfile, photo: UploadPhotoInput): Promise<UploadPhotoResult>;
  submitReport(
    currentUser: UserProfile,
    report: FieldReport,
    options?: { syncFromOffline?: boolean; clientSubmissionId?: string }
  ): Promise<SubmitReportResult>;
  reviewReport(
    currentUser: UserProfile,
    reportId: string,
    decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE',
    comment: string
  ): Promise<ReviewReportResult>;
  recordGeneratedReport(
    currentUser: UserProfile,
    record: Omit<GeneratedReportRecord, 'id' | 'generatedBy' | 'generatedByName' | 'createdAt'>
  ): Promise<GeneratedReportRecord>;
  recordSyncLog(
    currentUser: UserProfile,
    log: Omit<SyncLog, 'id' | 'userId' | 'createdAt'>
  ): Promise<SyncLog>;
}
