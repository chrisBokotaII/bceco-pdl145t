import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createDemoDataset, type DemoDataset } from './src/data/demoSeed.ts';
import {
  calculateTepTefGap,
  detectPotentialDuplicates,
  validateFieldReportForSubmission,
} from './src/domain/businessRules.ts';
import { computePeriodKey, generateUniqueId } from './src/domain/formatters.ts';
import {
  buildConsolidatedReportModel,
  type ReportingFilterParams,
} from './src/domain/reportingEngine.ts';
import {
  buildConsolidatedCsvBuffer,
  buildConsolidatedExcelBuffer,
  buildConsolidatedPdfBuffer,
  buildMultiSiteRoadmapPdfBuffer,
  buildSingleReportPdfBuffer,
  type BuiltExportArtifact,
  type CsvExportVariant,
} from './src/services/export/reportExporter.ts';
import type {
  AgentAssignment,
  AuditLog,
  ExportFormat,
  FieldReport,
  GeneratedReportRecord,
  Project,
  SyncLog,
  UserProfile,
} from './src/types/domain.ts';

const PORT = 3000;
const STORE_PATH = '/tmp/bceco-pdl145t-demo-store-v2.json';
const PHOTOS_DIR = '/tmp/bceco-pdl145t-demo-photos';
const SESSION_SECRET = process.env.DEMO_SESSION_SECRET || 'bceco-pdl145t-isolated-demo-adapter-2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours max pour un jeton de démonstration

interface StoredPhotoMeta {
  photoId: string;
  reportId: string;
  projectId: string;
  agentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  remoteUrl: string;
  diskPath: string;
  uploadedAt: string;
}

interface StoredReportRecipe {
  format: ExportFormat;
  csvVariant?: CsvExportVariant;
  isRoadmap?: boolean;
  params: ReportingFilterParams;
}

type PersistedDemoStore = DemoDataset & {
  uploadedPhotos?: Record<string, StoredPhotoMeta>;
  generatedReportRecipes?: Record<string, StoredReportRecipe>;
  demoPasswords?: Record<string, string>;
};

const DEFAULT_SEEDED_RECIPES: Record<string, StoredReportRecipe> = {
  'RPT-GEN-2026-001': {
    format: 'EXCEL',
    params: {
      periodicity: 'MENSUEL',
      periodKeyFilter: '2026-09',
      periodLabel: 'Septembre 2026',
      dataScope: 'VALIDES_UNIQUEMENT',
    },
  },
  'RPT-GEN-2026-002': {
    format: 'PDF',
    params: {
      periodicity: 'MENSUEL',
      periodKeyFilter: '2026-10',
      periodLabel: 'Octobre 2026',
      dataScope: 'VALIDES_UNIQUEMENT',
    },
  },
};

// Isolated demo credentials ONLY (never used for production Firebase Auth)
const DEFAULT_DEMO_PASSWORDS: Record<string, string> = {
  'coordinateur.demo@pd145t.test': 'Demo2026!',
  'agent1.demo@pd145t.test': 'Demo2026!',
  'agent2.demo@pd145t.test': 'Demo2026!',
  'agent3.demo@pd145t.test': 'Demo2026!',
};

function loadStore(): PersistedDemoStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as PersistedDemoStore;
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        if (!parsed.uploadedPhotos) parsed.uploadedPhotos = {};
        if (!parsed.generatedReportRecipes) {
          parsed.generatedReportRecipes = { ...DEFAULT_SEEDED_RECIPES };
        }
        parsed.demoPasswords = { ...DEFAULT_DEMO_PASSWORDS, ...(parsed.demoPasswords || {}) };
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Reinitializing isolated demo store:', err);
  }
  const fresh: PersistedDemoStore = {
    ...createDemoDataset(),
    uploadedPhotos: {},
    generatedReportRecipes: { ...DEFAULT_SEEDED_RECIPES },
    demoPasswords: { ...DEFAULT_DEMO_PASSWORDS },
  };
  saveStore(fresh);
  return fresh;
}

function saveStore(data: PersistedDemoStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Demo store disk persistence warning (in-memory active):', err);
  }
}

let store: PersistedDemoStore = loadStore();

function signToken(payload: { userId: string; role: string; email: string }): string {
  const encoded = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string; role: string; email: string; iat: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      userId?: unknown;
      role?: unknown;
      email?: unknown;
      iat?: unknown;
    };
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.iat !== 'number' ||
      !Number.isFinite(parsed.iat)
    ) {
      return null;
    }
    const ageMs = Date.now() - parsed.iat;
    if (ageMs < -60_000 || ageMs > TOKEN_TTL_MS) {
      return null;
    }
    return { userId: parsed.userId, role: parsed.role, email: parsed.email, iat: parsed.iat };
  } catch {
    return null;
  }
}

function signPhotoAccess(photoId: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`photo:${photoId}`).digest('base64url');
}

function verifyPhotoSignature(photoId: string, sig: string): boolean {
  if (!sig) return false;
  const expected = signPhotoAccess(photoId);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

interface AuthedRequest extends Request {
  demoUser?: UserProfile;
}

function requireDemoAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentification requise (Adaptateur Démo isolé).' });
    return;
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: 'Session expirée ou jeton invalide.' });
    return;
  }
  const user = store.users.find((u) => u.id === decoded.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: 'Compte utilisateur introuvable ou désactivé par le Coordonnateur.' });
    return;
  }
  req.demoUser = user;
  next();
}

function requireCoordinator(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.demoUser || req.demoUser.role !== 'COORDINATEUR') {
    res.status(403).json({
      error: 'Accès refusé (HTTP 403) : opération réservée exclusivement au Coordonnateur.',
    });
    return;
  }
  next();
}

function appendAudit(
  actor: UserProfile,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): AuditLog {
  const entry: AuditLog = {
    id: generateUniqueId('AUD'),
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };
  store.auditLogs.unshift(entry);
  return entry;
}

function recomputeProjectAssignedAgents(projectId: string): void {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return;
  const activeAgentIds = Array.from(
    new Set(
      store.assignments
        .filter((a) => a.projectId === projectId && a.status === 'ACTIVE')
        .map((a) => a.agentId)
    )
  );
  project.assignedAgentIds = activeAgentIds;
  project.updatedAt = new Date().toISOString();
}

/**
 * Express API app (demo adapter). Used by local `tsx server.ts` and by the
 * Vercel serverless entry in `api/index.ts`. Does not serve the Vite SPA.
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // ---------------------------------------------------------------------------
  // Isolated Demo Auth & Server-Side RBAC API (/api/demo/*)
  // ---------------------------------------------------------------------------
  app.post('/api/demo/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const user = store.users.find((u) => u.email.toLowerCase() === email);
    const expectedPassword = store.demoPasswords?.[email] ?? DEFAULT_DEMO_PASSWORDS[email] ?? 'Demo2026!';

    if (!user || password !== expectedPassword) {
      res.status(401).json({
        error: 'Identifiants de démonstration incorrects. Vérifiez l’adresse e-mail et le mot de passe (Demo2026!).',
      });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({
        error: 'Ce compte agent a été désactivé par le Coordonnateur.',
      });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    appendAudit(user, 'CONNEXION_DEMO', 'USER', user.id, `Connexion via adaptateur démo (${user.role}).`);
    saveStore(store);

    res.json({
      adapter: 'ISOLATED_DEMO_ADAPTER',
      token,
      user,
    });
  });

  app.get('/api/demo/auth/me', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    res.json({ adapter: 'ISOLATED_DEMO_ADAPTER', user: req.demoUser });
  });

  // Strict RBAC Bootstrap: Coordinator sees national scope; Agent sees ONLY assigned projects & own reports
  app.get('/api/demo/bootstrap', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    if (user.role === 'COORDINATEUR') {
      res.json({
        adapter: 'ISOLATED_DEMO_ADAPTER',
        users: store.users,
        projects: store.projects,
        assignments: store.assignments,
        reports: store.reports,
        generatedReports: store.generatedReports,
        syncLogs: store.syncLogs,
        auditLogs: store.auditLogs,
      });
      return;
    }

    // AGENT_TERRAIN strict isolation enforced server-side
    const assignedProjects = store.projects.filter((p) => p.assignedAgentIds.includes(user.id));
    const myAssignments = store.assignments.filter((a) => a.agentId === user.id);
    const myReports = store.reports.filter((r) => r.agentId === user.id);
    const mySyncLogs = store.syncLogs.filter((l) => l.userId === user.id);

    res.json({
      adapter: 'ISOLATED_DEMO_ADAPTER',
      users: [user],
      projects: assignedProjects,
      assignments: myAssignments,
      reports: myReports,
      generatedReports: [],
      syncLogs: mySyncLogs,
      auditLogs: [],
    });
  });

  // Single project read with strict agent assignment check
  app.get('/api/demo/projects/:projectId', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const project = store.projects.find((p) => p.id === req.params.projectId);
    if (!project) {
      res.status(404).json({ error: 'Ouvrage introuvable.' });
      return;
    }
    if (user.role === 'AGENT_TERRAIN' && !project.assignedAgentIds.includes(user.id)) {
      res.status(403).json({ error: 'Accès interdit : cet ouvrage ne vous est pas affecté.' });
      return;
    }
    res.json({ project });
  });

  // Coordinator-only: Import audited projects
  app.post('/api/demo/projects/import', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const incomingProjects = Array.isArray(req.body?.projects) ? (req.body.projects as Project[]) : [];
    if (incomingProjects.length === 0) {
      res.status(400).json({ error: 'Aucun ouvrage valide fourni pour l’importation.' });
      return;
    }

    const VALID_INFRA = new Set(['ECOLE_PRIMAIRE', 'CENTRE_DE_SANTE', 'BATIMENT_ADMINISTRATIF']);
    const VALID_CONTRACT = new Set(['CONTRAT_ACTIF', 'CONTRAT_RESILIE', 'REATTRIBUE_ALE_PME']);
    const VALID_STATUS = new Set(['ACHEVE', 'EN_COURS', 'A_L_ARRET', 'NON_DEMARRE']);

    const existingMatrix = new Set(store.projects.map((p) => p.matrixNumber));
    const added: Project[] = [];
    let rejectedCount = 0;

    for (const p of incomingProjects) {
      const matrixNumber = String(p?.matrixNumber ?? '').trim();
      const contractor = String(p?.contractor ?? '').trim();
      const province = String(p?.province ?? '').trim();
      const territory = String(p?.territory ?? '').trim();
      const projectName = String(p?.projectName ?? '').trim();
      const tep = Number(p?.currentTep ?? 0);
      const tef = Number(p?.currentTef ?? 0);

      if (
        !matrixNumber ||
        existingMatrix.has(matrixNumber) ||
        !contractor ||
        !province ||
        !territory ||
        projectName.length < 2 ||
        !VALID_INFRA.has(String(p?.infrastructureType ?? '')) ||
        !VALID_CONTRACT.has(String(p?.contractStatus ?? 'CONTRAT_ACTIF')) ||
        !VALID_STATUS.has(String(p?.currentStatus ?? 'EN_COURS')) ||
        Number.isNaN(tep) ||
        tep < 0 ||
        tep > 100 ||
        Number.isNaN(tef) ||
        tef < 0 ||
        tef > 100
      ) {
        rejectedCount += 1;
        continue;
      }

      const sanitized: Project = {
        ...p,
        id: p.id && /^[a-zA-Z0-9_-]{2,128}$/.test(p.id) ? p.id : generateUniqueId('PRJ-DEMO'),
        matrixNumber,
        contractor,
        province,
        territory,
        projectName,
        contractStatus: p.contractStatus || 'CONTRAT_ACTIF',
        currentStatus: p.currentStatus || 'EN_COURS',
        currentTep: tep,
        currentTef: tef,
        currentGap: calculateTepTefGap(tep, tef),
        isDemoData: true,
        assignedAgentIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.projects.push(sanitized);
      existingMatrix.add(sanitized.matrixNumber);
      added.push(sanitized);
    }

    if (added.length === 0) {
      res.status(400).json({
        error: `Importation rejetée : ${rejectedCount} ligne(s) invalide(s) ou en doublon dans le registre officiel.`,
        rejectedCount,
      });
      return;
    }

    appendAudit(
      user,
      'IMPORT_AUDIT_MATRICE',
      'PROJECT',
      'BATCH',
      `Import de ${added.length} ouvrage(s) après audit préalable (${rejectedCount} ligne(s) écartée(s)).`
    );
    saveStore(store);
    res.json({ addedCount: added.length, rejectedCount, projects: added });
  });

  // Coordinator-only: Create field agent
  app.post('/api/demo/agents', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const fullName = String(req.body?.fullName ?? '').trim();
    const phone = String(req.body?.phone ?? '').trim();
    const functionTitle = String(req.body?.functionTitle ?? 'Agent Enquêteur Terrain (Démo)').trim();
    const provinceScope = String(req.body?.provinceScope ?? 'Haut-Katanga').trim();
    const password = String(req.body?.password ?? 'Demo2026!').trim() || 'Demo2026!';

    if (!email || !fullName) {
      res.status(400).json({ error: 'Le nom complet et l’adresse e-mail sont obligatoires.' });
      return;
    }
    if (fullName.length < 2 || fullName.length > 140) {
      res.status(400).json({ error: 'Le nom complet doit contenir entre 2 et 140 caractères.' });
      return;
    }
    if (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Format d’adresse e-mail invalide.' });
      return;
    }
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
      return;
    }

    const now = new Date().toISOString();
    const newAgent: UserProfile = {
      id: generateUniqueId('USR-AGT'),
      email,
      fullName,
      role: 'AGENT_TERRAIN',
      phone: phone || '+243 82 000 0000',
      functionTitle,
      provinceScope,
      isActive: true,
      isDemoData: true,
      createdAt: now,
      updatedAt: now,
    };
    if (!store.demoPasswords) store.demoPasswords = { ...DEFAULT_DEMO_PASSWORDS };
    store.demoPasswords[email] = password;
    store.users.push(newAgent);
    appendAudit(coord, 'CREATION_AGENT', 'USER', newAgent.id, `Création du compte agent terrain ${newAgent.fullName} (${newAgent.email}).`);
    saveStore(store);
    res.status(201).json({ agent: newAgent });
  });

  // Coordinator-only: Update / toggle agent
  app.patch('/api/demo/agents/:agentId', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const agent = store.users.find((u) => u.id === req.params.agentId && u.role === 'AGENT_TERRAIN');
    if (!agent) {
      res.status(404).json({ error: 'Agent de terrain introuvable.' });
      return;
    }

    if (typeof req.body?.fullName === 'string' && req.body.fullName.trim()) {
      agent.fullName = req.body.fullName.trim();
    }
    if (typeof req.body?.phone === 'string') {
      agent.phone = req.body.phone.trim();
    }
    if (typeof req.body?.functionTitle === 'string') {
      agent.functionTitle = req.body.functionTitle.trim();
    }
    if (typeof req.body?.provinceScope === 'string') {
      agent.provinceScope = req.body.provinceScope.trim();
    }
    if (typeof req.body?.isActive === 'boolean') {
      agent.isActive = req.body.isActive;
    }
    agent.updatedAt = new Date().toISOString();

    appendAudit(
      coord,
      'MISE_A_JOUR_AGENT',
      'USER',
      agent.id,
      `Mise à jour du profil agent ${agent.fullName} (statut actif : ${agent.isActive ? 'Oui' : 'Non'}).`
    );
    saveStore(store);
    res.json({ agent });
  });

  // Coordinator-only: Assign one or multiple projects to an agent
  app.post('/api/demo/assignments', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const agentId = String(req.body?.agentId ?? '');
    const projectIds = Array.isArray(req.body?.projectIds) ? (req.body.projectIds as string[]) : [];
    const startDate = String(req.body?.startDate ?? new Date().toISOString().slice(0, 10));
    const notes = String(req.body?.notes ?? '').trim();

    const agent = store.users.find((u) => u.id === agentId && u.role === 'AGENT_TERRAIN');
    if (!agent) {
      res.status(404).json({ error: 'Agent cible introuvable.' });
      return;
    }
    if (!agent.isActive) {
      res.status(400).json({ error: 'Impossible d’affecter des ouvrages à un compte agent désactivé.' });
      return;
    }
    if (projectIds.length === 0) {
      res.status(400).json({ error: 'Sélectionnez au moins un ouvrage à affecter.' });
      return;
    }

    const created: AgentAssignment[] = [];
    const now = new Date().toISOString();

    for (const projectId of projectIds) {
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) continue;
      // Avoid duplicate active assignment for the same (agentId, projectId)
      const alreadyActive = store.assignments.some(
        (a) => a.agentId === agentId && a.projectId === projectId && a.status === 'ACTIVE'
      );
      if (alreadyActive) continue;

      const assignment: AgentAssignment = {
        id: generateUniqueId('AFF'),
        agentId: agent.id,
        agentName: agent.fullName,
        projectId: project.id,
        projectMatrixNumber: project.matrixNumber,
        projectName: project.projectName,
        startDate,
        endDate: null,
        status: 'ACTIVE',
        assignedBy: coord.id,
        assignedByName: coord.fullName,
        notes: notes || 'Affectation coordonnateur.',
        isDemoData: true,
        createdAt: now,
        updatedAt: now,
      };
      store.assignments.unshift(assignment);
      recomputeProjectAssignedAgents(project.id);
      created.push(assignment);
    }

    appendAudit(
      coord,
      'AFFECTATION_OUVRAGES',
      'AGENT_ASSIGNMENT',
      agent.id,
      `Affectation de ${created.length} ouvrage(s) à ${agent.fullName} à compter du ${startDate}.`
    );
    saveStore(store);
    res.status(201).json({ assignments: created });
  });

  // Coordinator-only: Reassign assignment to another agent (never deletes historical reports!)
  app.post('/api/demo/assignments/:assignmentId/reassign', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const current = store.assignments.find((a) => a.id === req.params.assignmentId);
    if (!current || current.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Affectation active introuvable.' });
      return;
    }
    const targetAgentId = String(req.body?.targetAgentId ?? '');
    const notes = String(req.body?.notes ?? '').trim();
    const targetAgent = store.users.find((u) => u.id === targetAgentId && u.role === 'AGENT_TERRAIN');
    if (!targetAgent) {
      res.status(404).json({ error: 'Nouvel agent introuvable.' });
      return;
    }
    if (!targetAgent.isActive) {
      res.status(400).json({ error: 'Impossible de réaffecter un ouvrage vers un compte agent désactivé.' });
      return;
    }
    if (targetAgent.id === current.agentId) {
      res.status(400).json({ error: 'Sélectionnez un agent différent pour la réaffectation.' });
      return;
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    current.status = 'REAFFECTEE';
    current.endDate = today;
    current.reassignedToAgentId = targetAgent.id;
    current.notes = notes ? `${current.notes} | Réaffectation: ${notes}` : current.notes;
    current.updatedAt = now;

    const newAssignment: AgentAssignment = {
      id: generateUniqueId('AFF'),
      agentId: targetAgent.id,
      agentName: targetAgent.fullName,
      projectId: current.projectId,
      projectMatrixNumber: current.projectMatrixNumber,
      projectName: current.projectName,
      startDate: today,
      endDate: null,
      status: 'ACTIVE',
      assignedBy: coord.id,
      assignedByName: coord.fullName,
      notes: notes || `Réaffecté depuis ${current.agentName}.`,
      isDemoData: true,
      createdAt: now,
      updatedAt: now,
    };
    store.assignments.unshift(newAssignment);
    recomputeProjectAssignedAgents(current.projectId);

    appendAudit(
      coord,
      'REAFFECTATION_OUVRAGE',
      'AGENT_ASSIGNMENT',
      current.projectId,
      `Réaffectation de ${current.projectMatrixNumber} de ${current.agentName} vers ${targetAgent.fullName}. Historique des fiches préservé.`
    );
    saveStore(store);
    res.json({ closedAssignment: current, newAssignment });
  });

  // Coordinator-only: End an assignment (historical reports preserved)
  app.post('/api/demo/assignments/:assignmentId/end', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const current = store.assignments.find((a) => a.id === req.params.assignmentId);
    if (!current || current.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Affectation active introuvable.' });
      return;
    }
    const reason = String(req.body?.notes ?? '').trim();
    const now = new Date().toISOString();
    current.status = 'TERMINEE';
    current.endDate = now.slice(0, 10);
    if (reason) current.notes = `${current.notes} | Clôture: ${reason}`;
    current.updatedAt = now;
    recomputeProjectAssignedAgents(current.projectId);

    appendAudit(
      coord,
      'CLOTURE_AFFECTATION',
      'AGENT_ASSIGNMENT',
      current.id,
      `Clôture de l’affectation ${current.projectMatrixNumber} pour ${current.agentName}.`
    );
    saveStore(store);
    res.json({ assignment: current });
  });

  // ---------------------------------------------------------------------------
  // Idempotent Field Photograph Upload Queue Endpoint (survives server restart)
  // ---------------------------------------------------------------------------
  app.post('/api/demo/uploads/photos', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const photoId = String(req.body?.photoId ?? '').trim();
    const reportId = String(req.body?.reportId ?? '').trim();
    const projectId = String(req.body?.projectId ?? '').trim();
    const fileName = String(req.body?.fileName ?? 'photo-terrain.jpg').trim();
    const mimeType = String(req.body?.mimeType ?? 'image/jpeg').trim();
    const dataUrl = String(req.body?.dataUrl ?? '');
    const checksum = typeof req.body?.checksum === 'string' ? req.body.checksum.trim() : undefined;

    if (!photoId || !/^[a-zA-Z0-9_-]{2,128}$/.test(photoId)) {
      res.status(400).json({ error: 'Identifiant photo invalide.' });
      return;
    }
    if (!projectId) {
      res.status(400).json({ error: 'Identifiant d’ouvrage (projectId) obligatoire pour téléverser une photo.' });
      return;
    }
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      res.status(404).json({ error: 'Ouvrage cible introuvable dans le registre officiel.' });
      return;
    }
    if (user.role === 'AGENT_TERRAIN') {
      const hasActiveOrPriorAssignment =
        project.assignedAgentIds.includes(user.id) ||
        store.assignments.some((a) => a.projectId === project.id && a.agentId === user.id);
      if (!hasActiveOrPriorAssignment) {
        res.status(403).json({ error: 'Accès refusé : vous n’êtes pas affecté à cet ouvrage.' });
        return;
      }
    }
    if (!dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Contenu image invalide (seuls les formats image/* sont acceptés).' });
      return;
    }
    const base64Idx = dataUrl.indexOf('base64,');
    if (base64Idx < 0) {
      res.status(400).json({ error: 'Encodage image base64 manquant.' });
      return;
    }

    if (!store.uploadedPhotos) store.uploadedPhotos = {};
    const signedRemoteUrl = `/api/demo/uploads/photos/${encodeURIComponent(photoId)}?sig=${encodeURIComponent(
      signPhotoAccess(photoId)
    )}`;
    const existing = store.uploadedPhotos[photoId];
    if (existing) {
      if (user.role === 'AGENT_TERRAIN' && existing.agentId !== user.id) {
        res.status(403).json({ error: 'Accès interdit sur une photographie appartenant à un autre agent.' });
        return;
      }
      if (!existing.remoteUrl.includes('?sig=')) {
        existing.remoteUrl = signedRemoteUrl;
        saveStore(store);
      }
      res.status(200).json({
        photoId: existing.photoId,
        remoteUrl: existing.remoteUrl,
        sizeBytes: existing.sizeBytes,
        uploadedAt: existing.uploadedAt,
        deduplicated: true,
      });
      return;
    }

    const buffer = Buffer.from(dataUrl.slice(base64Idx + 7), 'base64');
    if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'Taille de photographie invalide (maximum 8 Mo).' });
      return;
    }

    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const diskPath = path.join(PHOTOS_DIR, `${photoId}.${ext}`);
    fs.writeFileSync(diskPath, buffer);

    const uploadedAt = new Date().toISOString();
    const meta: StoredPhotoMeta = {
      photoId,
      reportId,
      projectId,
      agentId: user.id,
      fileName,
      mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
      sizeBytes: buffer.byteLength,
      checksum,
      remoteUrl: signedRemoteUrl,
      diskPath,
      uploadedAt,
    };
    store.uploadedPhotos[photoId] = meta;
    saveStore(store);

    res.status(201).json({
      photoId: meta.photoId,
      remoteUrl: meta.remoteUrl,
      sizeBytes: meta.sizeBytes,
      uploadedAt: meta.uploadedAt,
      deduplicated: false,
    });
  });

  app.get('/api/demo/uploads/photos/:photoId', (req: Request, res: Response) => {
    const photoId = String(req.params.photoId ?? '').trim();
    if (!/^[a-zA-Z0-9_-]{2,128}$/.test(photoId)) {
      res.status(400).json({ error: 'Identifiant photo invalide.' });
      return;
    }

    const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
    const meta = store.uploadedPhotos?.[photoId];
    let authorized = verifyPhotoSignature(photoId, sig);

    if (!authorized) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const decoded = verifyToken(authHeader.slice(7));
        const user = decoded ? store.users.find((u) => u.id === decoded.userId && u.isActive) : undefined;
        if (user && (user.role === 'COORDINATEUR' || (meta && meta.agentId === user.id))) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      res.status(403).json({ error: 'Accès interdit : authentification ou signature d’accès requise.' });
      return;
    }

    if (!meta || !fs.existsSync(meta.diskPath)) {
      res.status(404).json({ error: 'Photographie terrain introuvable.' });
      return;
    }
    res.setHeader('Content-Type', meta.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=2592000');
    res.sendFile(meta.diskPath);
  });

  // Submit or sync field report (Agent or Coordinator)
  app.post('/api/demo/reports', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const payload = req.body?.report as FieldReport | undefined;
    const syncFromOffline = Boolean(req.body?.syncFromOffline);
    const clientSubmissionId =
      typeof req.body?.clientSubmissionId === 'string' && req.body.clientSubmissionId.trim()
        ? req.body.clientSubmissionId.trim()
        : typeof payload?.clientSubmissionId === 'string' && payload.clientSubmissionId.trim()
        ? payload.clientSubmissionId.trim()
        : undefined;

    if (!payload || !payload.projectId) {
      res.status(400).json({ error: 'Données de fiche terrain invalides.' });
      return;
    }

    const project = store.projects.find((p) => p.id === payload.projectId);
    if (!project) {
      res.status(404).json({ error: 'Ouvrage de référence introuvable dans le registre officiel.' });
      return;
    }

    if (user.role === 'AGENT_TERRAIN' && payload.agentId !== user.id) {
      res.status(403).json({ error: 'Usurpation d’identité refusée : agentId ne correspond pas au compte connecté.' });
      return;
    }

    const isActivelyAssigned = project.assignedAgentIds.includes(user.id);
    const hadPriorAssignment = store.assignments.some(
      (a) => a.projectId === project.id && a.agentId === user.id && (a.status === 'TERMINEE' || a.status === 'REAFFECTEE')
    );
    let conflictDetected = false;
    let conflictReason: string | undefined;

    if (user.role === 'AGENT_TERRAIN' && !isActivelyAssigned) {
      if (!syncFromOffline || !hadPriorAssignment) {
        res.status(403).json({ error: 'Accès refusé : vous n’êtes pas activement affecté à cet ouvrage.' });
        return;
      }
      // Offline work from a recently revoked/reassigned mission MUST NEVER be silently discarded: flag conflict for coordinator review!
      conflictDetected = true;
      conflictReason =
        "L'affectation de cet ouvrage a été révoquée ou réaffectée pendant la collecte hors ligne. Travail conservé intégralement pour arbitrage du Coordonnateur.";
    }

    const existingIdx = store.reports.findIndex((r) => r.id === payload.id);
    const now = new Date().toISOString();
    const gap = calculateTepTefGap(payload.progress.currentTep, payload.progress.currentTef);
    const periodKey = computePeriodKey(
      payload.identification.periodicity,
      payload.identification.collectionDate,
      payload.identification.weekNumber,
      payload.identification.month
    );

    // Enforce locked contractual fields from official project register
    const lockedIdentification = {
      ...payload.identification,
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

    const normalizedPhotos = (payload.receptions.photos || []).map((ph) => ({
      ...ph,
      syncState: 'UPLOADED' as const,
    }));
    const normalizedAttachments = (payload.receptions.attachments || []).map((at) => ({
      ...at,
      syncState: 'UPLOADED' as const,
    }));

    // Enforce official 5-section business validation rules strictly on the server
    const candidateForValidation: FieldReport = {
      ...payload,
      periodKey,
      periodicity: lockedIdentification.periodicity,
      collectionDate: lockedIdentification.collectionDate,
      currentTep: payload.progress.currentTep,
      currentTef: payload.progress.currentTef,
      identification: lockedIdentification,
      progress: { ...payload.progress, tepTefGap: gap },
      receptions: {
        ...payload.receptions,
        photos: normalizedPhotos,
        attachments: normalizedAttachments,
      },
    };
    const validationErrors = validateFieldReportForSubmission(candidateForValidation);
    if (validationErrors.length > 0) {
      res.status(400).json({
        error: `Validation métier refusée : ${validationErrors[0].message}`,
        validationErrors,
      });
      return;
    }

    if (existingIdx >= 0) {
      const existing = store.reports[existingIdx];
      if (user.role === 'AGENT_TERRAIN' && existing.agentId !== user.id) {
        res.status(403).json({ error: 'Accès interdit sur une fiche appartenant à un autre agent.' });
        return;
      }

      // Idempotent retry protection: if network dropped after server commit before client ACK,
      // replay the committed record without inflating version or creating phantom duplicates!
      if (clientSubmissionId && existing.clientSubmissionId === clientSubmissionId) {
        res.status(200).json({
          report: existing,
          conflictDetected: existing.syncStatus === 'CONFLIT_AFFECTATION',
          duplicates: existing.potentialDuplicateOf || [],
          idempotentReplay: true,
        });
        return;
      }

      if (existing.status === 'VALIDE') {
        res.status(409).json({ error: 'Une fiche déjà validée est verrouillée et ne peut plus être modifiée.' });
        return;
      }
      if (
        user.role === 'AGENT_TERRAIN' &&
        (existing.status === 'SOUMIS' || existing.status === 'EN_COURS_VERIFICATION')
      ) {
        res.status(409).json({
          error:
            'Cette fiche est déjà soumise ou en cours de vérification. Attendez la décision ou le retour du Coordonnateur avant toute modification.',
        });
        return;
      }

      // Preserve version snapshot before updating (never erase previous submissions!)
      const snapshot = {
        version: existing.version,
        savedAt: existing.updatedAt,
        statusAtSnapshot: existing.status,
        currentTep: existing.currentTep,
        currentTef: existing.currentTef,
        workStatus: existing.progress.workStatus,
        summary: existing.progress.periodWorksExecuted.slice(0, 140),
      };

      const duplicates = detectPotentialDuplicates(
        {
          id: existing.id,
          projectId: project.id,
          agentId: existing.agentId,
          periodicity: lockedIdentification.periodicity,
          identification: lockedIdentification,
        },
        store.reports
      );

      const updated: FieldReport = {
        ...payload,
        id: existing.id,
        matrixNumber: project.matrixNumber,
        agentId: existing.agentId,
        agentName: existing.agentName,
        status: 'SOUMIS',
        syncStatus: conflictDetected ? 'CONFLIT_AFFECTATION' : 'SYNCHRONISE',
        syncConflictReason: conflictReason,
        clientSubmissionId,
        potentialDuplicateOf: duplicates,
        version: existing.version + 1,
        periodKey,
        periodicity: lockedIdentification.periodicity,
        collectionDate: lockedIdentification.collectionDate,
        currentTep: payload.progress.currentTep,
        currentTef: payload.progress.currentTef,
        identification: lockedIdentification,
        progress: { ...payload.progress, tepTefGap: gap },
        receptions: {
          ...payload.receptions,
          photos: normalizedPhotos,
          attachments: normalizedAttachments,
        },
        reviews: existing.reviews,
        versionHistory: [...existing.versionHistory, snapshot],
        createdAt: existing.createdAt,
        updatedAt: now,
        submittedAt: now,
        validatedAt: undefined,
        lastSyncedAt: now,
        isDemoData: true,
      };
      store.reports[existingIdx] = updated;
      appendAudit(
        user,
        'RESOUMISSION_FICHE',
        'FIELD_REPORT',
        updated.id,
        `Resoumission v${updated.version} sur ${project.matrixNumber} (TEP ${updated.currentTep}%, TEF ${updated.currentTef}%).`
      );
      saveStore(store);
      res.json({ report: updated, conflictDetected, duplicates });
      return;
    }

    // Create new submitted report (never overwriting another report on the same project!)
    const newId = payload.id && !store.reports.some((r) => r.id === payload.id)
      ? payload.id
      : generateUniqueId('FIC');

    const duplicates = detectPotentialDuplicates(
      {
        id: newId,
        projectId: project.id,
        agentId: user.id,
        periodicity: lockedIdentification.periodicity,
        identification: lockedIdentification,
      },
      store.reports
    );

    const activeAssignment = store.assignments.find(
      (a) => a.projectId === project.id && a.agentId === user.id && a.status === 'ACTIVE'
    );

    const created: FieldReport = {
      ...payload,
      id: newId,
      projectId: project.id,
      matrixNumber: project.matrixNumber,
      agentId: user.id,
      agentName: user.fullName,
      assignmentId: activeAssignment?.id ?? payload.assignmentId ?? 'AFF-OFFLINE',
      status: 'SOUMIS',
      syncStatus: conflictDetected ? 'CONFLIT_AFFECTATION' : 'SYNCHRONISE',
      syncConflictReason: conflictReason,
      clientSubmissionId,
      potentialDuplicateOf: duplicates,
      version: 1,
      periodKey,
      periodicity: lockedIdentification.periodicity,
      collectionDate: lockedIdentification.collectionDate,
      currentTep: payload.progress.currentTep,
      currentTef: payload.progress.currentTef,
      identification: lockedIdentification,
      progress: { ...payload.progress, tepTefGap: gap },
      receptions: {
        ...payload.receptions,
        photos: normalizedPhotos,
        attachments: normalizedAttachments,
      },
      reviews: [],
      versionHistory: [],
      createdAt: payload.createdAt || now,
      updatedAt: now,
      submittedAt: now,
      validatedAt: undefined,
      lastSyncedAt: now,
      isDemoData: true,
    };

    store.reports.unshift(created);
    appendAudit(
      user,
      conflictDetected ? 'SYNCHRO_CONFLIT_AFFECTATION' : 'SOUMISSION_FICHE',
      'FIELD_REPORT',
      created.id,
      `Soumission fiche ${created.id} sur ${project.matrixNumber} (${periodKey})${
        duplicates.length > 0 ? ` — Doublon potentiel signalé (${duplicates.join(', ')})` : ''
      }.`
    );
    saveStore(store);
    res.status(201).json({ report: created, conflictDetected, duplicates });
  });

  // Coordinator-only: Review, validate, or return a field report
  app.post('/api/demo/reports/:reportId/review', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const report = store.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      res.status(404).json({ error: 'Fiche terrain introuvable.' });
      return;
    }

    const decision = req.body?.decision as 'EN_COURS_VERIFICATION' | 'VALIDE' | 'RETOURNE';
    const comment = String(req.body?.comment ?? '').trim();

    if (!['EN_COURS_VERIFICATION', 'VALIDE', 'RETOURNE'].includes(decision)) {
      res.status(400).json({ error: 'Décision de validation invalide.' });
      return;
    }
    if (report.status === 'VALIDE') {
      res.status(409).json({
        error: 'Cette fiche est déjà validée et archivée définitivement ; elle ne peut plus être modifiée ou retournée.',
      });
      return;
    }
    if (decision === 'RETOURNE' && comment.length < 5) {
      res.status(400).json({ error: 'Un motif détaillé (minimum 5 caractères) est obligatoire pour retourner une fiche.' });
      return;
    }

    const now = new Date().toISOString();
    const review = {
      id: generateUniqueId('REV'),
      reportId: report.id,
      reportVersion: report.version,
      reviewerId: coord.id,
      reviewerName: coord.fullName,
      decision,
      comment: comment || (decision === 'VALIDE' ? 'Fiche vérifiée et validée par le Coordonnateur.' : 'Mise en vérification.'),
      createdAt: now,
    };

    report.reviews.push(review);
    report.status = decision;
    report.updatedAt = now;
    if (decision === 'VALIDE') {
      report.validatedAt = now;
      if (report.syncStatus === 'CONFLIT_AFFECTATION') {
        report.syncStatus = 'SYNCHRONISE';
      }

      // Update ONLY field-observed columns on the project; NEVER alter contractual columns 1-9!
      const project = store.projects.find((p) => p.id === report.projectId);
      if (project) {
        project.currentStatus = report.progress.workStatus;
        project.latestPeriodRealization = report.progress.periodWorksExecuted;
        project.latestExecutionStages = [...report.progress.executionStages];
        project.currentTep = report.progress.currentTep;
        project.currentTef = report.progress.currentTef;
        project.currentGap = calculateTepTefGap(report.progress.currentTep, report.progress.currentTef);
        project.latestConstraintCategories = [...report.constraints.categories];
        project.latestConstraintsSummary =
          report.constraints.detailedDescriptions.filter((d) => d.trim()).join(' ; ') || 'Aucune contrainte active';
        project.hasUnresolvedConstraints = report.constraints.categories.length > 0;
        project.hasCriticalConstraint = report.constraints.isCritical;
        project.latestImpactsSummary = report.constraints.impacts.details || 'Aucun impact majeur';
        project.receptions = {
          rt: { ...report.receptions.rt },
          rp: { ...report.receptions.rp },
          rd: { ...report.receptions.rd },
        };
        project.latestObservation = report.receptions.generalObservations || project.latestObservation;
        project.lastValidatedReportId = report.id;
        project.lastValidatedAt = now;
        project.updatedAt = now;
      }
    }

    appendAudit(
      coord,
      decision === 'VALIDE' ? 'VALIDATION_FICHE' : decision === 'RETOURNE' ? 'RETOUR_FICHE' : 'VERIFICATION_FICHE',
      'FIELD_REPORT',
      report.id,
      `Décision « ${decision} » sur ${report.id} (${report.matrixNumber}) : ${review.comment}`
    );
    saveStore(store);

    const updatedProject = store.projects.find((p) => p.id === report.projectId);
    res.json({ report, review, project: updatedProject });
  });

  // Download instant synthesis PDF for a single field report
  app.get('/api/demo/reports/:reportId/pdf', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const report = store.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Fiche terrain introuvable' });
    }

    if (user.role === 'AGENT_TERRAIN') {
      const isAuthor = report.agentId === user.id;
      const isAssigned = store.assignments.some(
        (a) => a.projectId === report.projectId && a.agentId === user.id && a.status === 'ACTIVE'
      );
      if (!isAuthor && !isAssigned) {
        return res.status(403).json({ error: 'Accès non autorisé à cette fiche de synthèse' });
      }
    }

    const project = store.projects.find((p) => p.id === report.projectId);
    const artifact = buildSingleReportPdfBuffer(report, project, {
      generatedByName: user.fullName,
      isDemoData: report.isDemoData || (project ? project.isDemoData : true),
    });

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    res.send(Buffer.from(artifact.bytes));
  });

  // Coordinator-only: Record official generated consolidated report in history
  app.post('/api/demo/generated-reports', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const body = req.body as Partial<GeneratedReportRecord>;
    const record: GeneratedReportRecord = {
      id: generateUniqueId('RPT-GEN'),
      title: String(body.title ?? 'Rapport consolidé BCECO / PDL-145T'),
      periodicity: body.periodicity ?? 'MENSUEL',
      periodLabel: String(body.periodLabel ?? ''),
      format: body.format ?? 'PDF',
      dataScope: body.dataScope ?? 'VALIDES_UNIQUEMENT',
      filtersSummary: String(body.filtersSummary ?? 'Périmètre national'),
      generatedBy: coord.id,
      generatedByName: coord.fullName,
      projectCount: Number(body.projectCount ?? 0),
      reportCount: Number(body.reportCount ?? 0),
      averageTep: Number(body.averageTep ?? 0),
      averageTef: Number(body.averageTef ?? 0),
      isDemoData: true,
      createdAt: new Date().toISOString(),
    };
    store.generatedReports.unshift(record);
    appendAudit(
      coord,
      'GENERATION_RAPPORT',
      'GENERATED_REPORT',
      record.id,
      `Export ${record.format} (${record.periodicity} — ${record.periodLabel}) sur ${record.projectCount} ouvrages.`
    );
    saveStore(store);
    res.status(201).json({ generatedReport: record });
  });

  // Coordinator-only: Server-side validated consolidated model preview
  app.post('/api/demo/reporting/preview', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const params = (req.body?.params ?? req.body ?? {}) as ReportingFilterParams;
    const normalized: ReportingFilterParams = {
      periodicity: params.periodicity === 'HEBDOMADAIRE' || params.periodicity === 'JOURNALIER' ? params.periodicity : 'MENSUEL',
      periodKeyFilter: typeof params.periodKeyFilter === 'string' ? params.periodKeyFilter : '',
      periodLabel: typeof params.periodLabel === 'string' ? params.periodLabel : undefined,
      dataScope: params.dataScope === 'SOUMIS_ET_VALIDES' ? 'SOUMIS_ET_VALIDES' : 'VALIDES_UNIQUEMENT',
      province: typeof params.province === 'string' ? params.province : '',
      territory: typeof params.territory === 'string' ? params.territory : '',
      infrastructureType: params.infrastructureType || '',
      contractor: typeof params.contractor === 'string' ? params.contractor : '',
      workStatus: params.workStatus || '',
      contractStatus: params.contractStatus || '',
      referenceDate: typeof params.referenceDate === 'string' ? params.referenceDate : undefined,
    };
    const model = buildConsolidatedReportModel(store.projects, store.reports, normalized);
    res.json({ model });
  });

  // Coordinator-only: Authoritative binary export (Excel .xlsx / CSV / PDF / Annexe Feuille de Route)
  app.post('/api/demo/reporting/export', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const format = String(req.body?.format ?? 'PDF').toUpperCase() as ExportFormat;
    const csvVariant = (req.body?.csvVariant ?? 'MATRICE_21') as CsvExportVariant;
    const isRoadmap = Boolean(req.body?.isRoadmap);
    const rawParams = (req.body?.params ?? {}) as ReportingFilterParams;

    if (!['EXCEL', 'CSV', 'PDF'].includes(format)) {
      res.status(400).json({ error: 'Format d’export invalide (formats autorisés : EXCEL, CSV, PDF).' });
      return;
    }

    const params: ReportingFilterParams = {
      periodicity: rawParams.periodicity === 'HEBDOMADAIRE' || rawParams.periodicity === 'JOURNALIER' ? rawParams.periodicity : 'MENSUEL',
      periodKeyFilter: typeof rawParams.periodKeyFilter === 'string' ? rawParams.periodKeyFilter : '',
      periodLabel: typeof rawParams.periodLabel === 'string' ? rawParams.periodLabel : undefined,
      dataScope: rawParams.dataScope === 'SOUMIS_ET_VALIDES' ? 'SOUMIS_ET_VALIDES' : 'VALIDES_UNIQUEMENT',
      province: typeof rawParams.province === 'string' ? rawParams.province : '',
      territory: typeof rawParams.territory === 'string' ? rawParams.territory : '',
      infrastructureType: rawParams.infrastructureType || '',
      contractor: typeof rawParams.contractor === 'string' ? rawParams.contractor : '',
      workStatus: rawParams.workStatus || '',
      contractStatus: rawParams.contractStatus || '',
      referenceDate: typeof rawParams.referenceDate === 'string' ? rawParams.referenceDate : undefined,
    };

    const model = buildConsolidatedReportModel(store.projects, store.reports, params);
    if (model.rows.length === 0) {
      res.status(400).json({
        error: 'Aucun ouvrage ne correspond aux filtres sélectionnés. Élargissez le périmètre avant d’exporter.',
      });
      return;
    }

    const now = new Date().toISOString();
    const ctx = {
      model,
      generatedByName: coord.fullName,
      generatedAt: now,
      isDemoData: true,
    };

    let artifact: BuiltExportArtifact;
    if (format === 'EXCEL') {
      artifact = buildConsolidatedExcelBuffer(ctx);
    } else if (format === 'CSV') {
      artifact = buildConsolidatedCsvBuffer(ctx, csvVariant);
    } else if (isRoadmap) {
      artifact = buildMultiSiteRoadmapPdfBuffer(ctx);
    } else {
      artifact = buildConsolidatedPdfBuffer(ctx);
    }

    const title = isRoadmap
      ? `Annexe Terrain — Feuille de Route Multi-Chantiers (${params.province || 'National'})`
      : format === 'CSV' && csvVariant !== 'MATRICE_21'
      ? `${model.title} — Annexe CSV (${csvVariant})`
      : model.title;

    const record: GeneratedReportRecord = {
      id: generateUniqueId('RPT-GEN'),
      title: title.slice(0, 220),
      periodicity: model.params.periodicity,
      periodLabel: model.params.periodLabel.slice(0, 80),
      format,
      dataScope: model.params.dataScope,
      filtersSummary: model.filtersSummary,
      generatedBy: coord.id,
      generatedByName: coord.fullName,
      projectCount: model.kpis.totalProjects,
      reportCount: model.kpis.reportsCount,
      averageTep: model.kpis.averageTep,
      averageTef: model.kpis.averageTef,
      isDemoData: true,
      createdAt: now,
    };

    if (!store.generatedReportRecipes) store.generatedReportRecipes = {};
    store.generatedReports.unshift(record);
    store.generatedReportRecipes[record.id] = {
      format,
      csvVariant: format === 'CSV' ? csvVariant : undefined,
      isRoadmap: format === 'PDF' ? isRoadmap : undefined,
      params: model.params,
    };

    appendAudit(
      coord,
      'GENERATION_RAPPORT',
      'GENERATED_REPORT',
      record.id,
      `Export serveur ${format}${isRoadmap ? ' (Feuille de Route)' : ''} (${record.periodicity} — ${record.periodLabel}) sur ${record.projectCount} ouvrages · Contrôles source : ${
        model.hasCheckFailures ? 'ANOMALIE' : 'CONFORME'
      }.`
    );
    saveStore(store);

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    res.setHeader('X-Generated-Report-Id', record.id);
    res.setHeader('X-Export-Filename', artifact.fileName);
    res.setHeader('X-Validation-Status', model.hasCheckFailures ? 'FAIL' : model.allChecksPassed ? 'PASS' : 'WARNING');
    res.status(200).send(Buffer.from(artifact.bytes));
  });

  // Coordinator-only: Re-download an archived generated report
  app.get('/api/demo/generated-reports/:reportId/download', requireDemoAuth, requireCoordinator, (req: AuthedRequest, res: Response) => {
    const coord = req.demoUser!;
    const reportId = String(req.params.reportId ?? '').trim();
    const record = store.generatedReports.find((g) => g.id === reportId);
    if (!record) {
      res.status(404).json({ error: 'Archive de rapport introuvable.' });
      return;
    }

    const recipe: StoredReportRecipe = store.generatedReportRecipes?.[reportId] ?? {
      format: record.format,
      isRoadmap: record.title.toLowerCase().includes('feuille de route'),
      params: {
        periodicity: record.periodicity,
        periodLabel: record.periodLabel,
        dataScope: record.dataScope,
      },
    };

    const model = buildConsolidatedReportModel(store.projects, store.reports, recipe.params);
    const ctx = {
      model,
      generatedByName: record.generatedByName || coord.fullName,
      generatedAt: record.createdAt,
      isDemoData: record.isDemoData,
    };

    let artifact: BuiltExportArtifact;
    if (recipe.format === 'EXCEL') {
      artifact = buildConsolidatedExcelBuffer(ctx);
    } else if (recipe.format === 'CSV') {
      artifact = buildConsolidatedCsvBuffer(ctx, recipe.csvVariant ?? 'MATRICE_21');
    } else if (recipe.isRoadmap) {
      artifact = buildMultiSiteRoadmapPdfBuffer(ctx);
    } else {
      artifact = buildConsolidatedPdfBuffer(ctx);
    }

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    res.setHeader('X-Export-Filename', artifact.fileName);
    res.status(200).send(Buffer.from(artifact.bytes));
  });

  // Save sync log for agent
  app.post('/api/demo/sync-logs', requireDemoAuth, (req: AuthedRequest, res: Response) => {
    const user = req.demoUser!;
    const log: SyncLog = {
      id: generateUniqueId('SYNC'),
      userId: user.id,
      syncedCount: Number(req.body?.syncedCount ?? 0),
      failedCount: Number(req.body?.failedCount ?? 0),
      conflictCount: Number(req.body?.conflictCount ?? 0),
      summary: String(req.body?.summary ?? 'Synchronisation terrain exécutée.'),
      createdAt: new Date().toISOString(),
    };
    store.syncLogs.unshift(log);
    saveStore(store);
    res.status(201).json({ syncLog: log });
  });

  // Coordinator-only: Reset demo dataset cleanly
  app.post('/api/demo/reset', requireDemoAuth, requireCoordinator, (_req: AuthedRequest, res: Response) => {
    store = {
      ...createDemoDataset(),
      uploadedPhotos: {},
      generatedReportRecipes: { ...DEFAULT_SEEDED_RECIPES },
      demoPasswords: { ...DEFAULT_DEMO_PASSWORDS },
    };
    try {
      if (fs.existsSync(PHOTOS_DIR)) {
        fs.rmSync(PHOTOS_DIR, { recursive: true, force: true });
      }
    } catch {
      // ignore disk cleanup errors
    }
    saveStore(store);
    res.json({ ok: true });
  });

  // Clean JSON 404 for unknown API endpoints (prevents HTML SPA fallback on /api/*)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Point de terminaison API introuvable.' });
  });

  // Global Express JSON error handler (malformed JSON, payload too large, unexpected server errors)
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      next(err);
      return;
    }
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    const errType =
      typeof err === 'object' && err !== null && 'type' in err ? String((err as { type?: unknown }).type) : '';
    if (errType === 'entity.parse.failed' || status === 400) {
      res.status(400).json({ error: 'Corps de requête JSON invalide ou mal formé.' });
      return;
    }
    if (errType === 'entity.too.large' || status === 413) {
      res.status(413).json({ error: 'Charge utile trop volumineuse (limite 15 Mo dépassée).' });
      return;
    }
    console.error('Erreur interne API /api:', err);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'Erreur interne du serveur lors du traitement de la requête.',
    });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();

  // ---------------------------------------------------------------------------
  // Vite Middleware (Dev) / Static Build Serving (Prod) — local server only
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BCECO / PDL-145T Assistant de Fiche Terrain actif sur http://0.0.0.0:${PORT}`);
  });
}

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1]!)).href;

if (isDirectRun && !process.env.VERCEL) {
  void startServer();
}
