import type { ReportingFilterParams } from '../../domain/reportingEngine';
import type { CsvExportVariant } from '../export/reportExporter';
import type {
  AgentAssignment,
  ExportFormat,
  FieldReport,
  GeneratedReportRecord,
  Project,
  SyncLog,
  UserProfile,
} from '../../types/domain';
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

export class DemoApiRepository implements DataRepository {
  readonly modeLabel = 'Adaptateur Démo Isolé (API Serveur RBAC)';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Erreur serveur (${res.status})`);
    }
    return data as T;
  }

  async bootstrap(): Promise<BootstrapPayload> {
    return this.request<BootstrapPayload>('/api/demo/bootstrap');
  }

  async createAgent(_currentUser: UserProfile, input: CreateAgentInput): Promise<UserProfile> {
    const res = await this.request<{ agent: UserProfile }>('/api/demo/agents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.agent;
  }

  async updateAgent(_currentUser: UserProfile, agentId: string, input: UpdateAgentInput): Promise<UserProfile> {
    const res = await this.request<{ agent: UserProfile }>(`/api/demo/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.agent;
  }

  async importProjects(_currentUser: UserProfile, projects: Project[]): Promise<Project[]> {
    const res = await this.request<{ projects: Project[] }>('/api/demo/projects/import', {
      method: 'POST',
      body: JSON.stringify({ projects }),
    });
    return res.projects;
  }

  async createAssignments(_currentUser: UserProfile, input: CreateAssignmentsInput): Promise<AgentAssignment[]> {
    const res = await this.request<{ assignments: AgentAssignment[] }>('/api/demo/assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.assignments;
  }

  async reassignAssignment(
    _currentUser: UserProfile,
    assignmentId: string,
    targetAgentId: string,
    notes: string
  ): Promise<{ closedAssignment: AgentAssignment; newAssignment: AgentAssignment }> {
    return this.request(`/api/demo/assignments/${assignmentId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ targetAgentId, notes }),
    });
  }

  async endAssignment(_currentUser: UserProfile, assignmentId: string, notes: string): Promise<AgentAssignment> {
    const res = await this.request<{ assignment: AgentAssignment }>(`/api/demo/assignments/${assignmentId}/end`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    return res.assignment;
  }

  async uploadPhoto(_currentUser: UserProfile, photo: UploadPhotoInput): Promise<UploadPhotoResult> {
    return this.request<UploadPhotoResult>('/api/demo/uploads/photos', {
      method: 'POST',
      body: JSON.stringify({
        photoId: photo.id,
        reportId: photo.reportId,
        projectId: photo.projectId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        sizeBytes: photo.sizeBytes,
        caption: photo.caption,
        capturedAt: photo.capturedAt,
        dataUrl: photo.dataUrl,
        checksum: photo.checksum,
      }),
    });
  }

  async submitReport(
    _currentUser: UserProfile,
    report: FieldReport,
    options?: { syncFromOffline?: boolean; clientSubmissionId?: string }
  ): Promise<SubmitReportResult> {
    return this.request<SubmitReportResult>('/api/demo/reports', {
      method: 'POST',
      body: JSON.stringify({
        report,
        syncFromOffline: Boolean(options?.syncFromOffline),
        clientSubmissionId: options?.clientSubmissionId ?? report.clientSubmissionId,
      }),
    });
  }

  async reviewReport(
    _currentUser: UserProfile,
    reportId: string,
    decision: 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE',
    comment: string
  ): Promise<ReviewReportResult> {
    return this.request<ReviewReportResult>(`/api/demo/reports/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    });
  }

  async recordGeneratedReport(
    _currentUser: UserProfile,
    record: Omit<GeneratedReportRecord, 'id' | 'generatedBy' | 'generatedByName' | 'createdAt'>
  ): Promise<GeneratedReportRecord> {
    const res = await this.request<{ generatedReport: GeneratedReportRecord }>('/api/demo/generated-reports', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return res.generatedReport;
  }

  async recordSyncLog(
    _currentUser: UserProfile,
    log: Omit<SyncLog, 'id' | 'userId' | 'createdAt'>
  ): Promise<SyncLog> {
    const res = await this.request<{ syncLog: SyncLog }>('/api/demo/sync-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return res.syncLog;
  }

  async exportConsolidatedReport(input: {
    format: ExportFormat;
    csvVariant?: CsvExportVariant;
    isRoadmap?: boolean;
    params: ReportingFilterParams;
  }): Promise<{ blob: Blob; fileName: string; generatedReportId: string | null }> {
    const res = await fetch('/api/demo/reporting/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Échec d'export serveur (${res.status}).`);
    }
    const blob = await res.blob();
    const headerName = res.headers.get('X-Export-Filename');
    const disp = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/i.exec(disp);
    const ext = input.format === 'EXCEL' ? 'xlsx' : input.format === 'CSV' ? 'csv' : 'pdf';
    const fileName = headerName || match?.[1] || `BCECO_PDL145T_Export.${ext}`;
    return {
      blob,
      fileName,
      generatedReportId: res.headers.get('X-Generated-Report-Id'),
    };
  }

  async downloadArchivedReport(reportId: string): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(`/api/demo/generated-reports/${encodeURIComponent(reportId)}/download`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Échec du téléchargement d'archive (${res.status}).`);
    }
    const blob = await res.blob();
    const headerName = res.headers.get('X-Export-Filename');
    const disp = res.headers.get('Content-Disposition') || '';
    const match = /filename="([^"]+)"/i.exec(disp);
    return {
      blob,
      fileName: headerName || match?.[1] || `${reportId}.pdf`,
    };
  }
}

export async function loginWithDemoAdapter(
  email: string,
  password: string
): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/demo/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Échec de connexion à l’adaptateur démo.');
  }
  return { token: data.token, user: data.user };
}

export type DemoSessionVerificationResult =
  | { status: 'VALID'; user: UserProfile }
  | { status: 'INVALID' }
  | { status: 'UNREACHABLE' };

export async function verifyDemoSessionDetailed(token: string): Promise<DemoSessionVerificationResult> {
  try {
    const res = await fetch('/api/demo/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { status: 'INVALID' };
    }
    if (!res.ok) {
      return { status: 'UNREACHABLE' };
    }
    const data = await res.json().catch(() => null);
    if (data?.user) {
      return { status: 'VALID', user: data.user as UserProfile };
    }
    return { status: 'UNREACHABLE' };
  } catch {
    return { status: 'UNREACHABLE' };
  }
}

export async function verifyDemoSession(token: string): Promise<UserProfile | null> {
  const result = await verifyDemoSessionDetailed(token);
  return result.status === 'VALID' ? result.user : null;
}
