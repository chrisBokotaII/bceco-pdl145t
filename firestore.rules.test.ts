/**
 * Suite de vérification TDD des règles de sécurité Firestore — BCECO / PDL-145T
 * Documente et valide les 12 payloads malveillants (« Dirty Dozen ») définis dans security_spec.md.
 */

export interface SecurityTestCase {
  id: string;
  title: string;
  actor: 'AGENT_1' | 'AGENT_2' | 'UNVERIFIED_SPOOF' | 'COORDINATOR';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
  pillar: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    title: 'Auto-élévation de privilège vers COORDINATEUR',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/users/agent1',
    payload: {
      id: 'agent1',
      email: 'agent1.demo@pd145t.test',
      fullName: 'Agent Malveillant',
      role: 'COORDINATEUR',
      isActive: true,
      isDemoData: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
    pillar: 'Tiered Identity Logic & Anti-Privilege Escalation',
  },
  {
    id: 'DD-02',
    title: 'Lecture PII d un autre agent',
    actor: 'AGENT_1',
    operation: 'get',
    path: '/users/agent2',
    expected: 'PERMISSION_DENIED',
    pillar: 'PII Isolation',
  },
  {
    id: 'DD-03',
    title: 'Accès à un ouvrage non affecté',
    actor: 'AGENT_1',
    operation: 'get',
    path: '/projects/PRJ-DEMO-015',
    expected: 'PERMISSION_DENIED',
    pillar: 'Master Gate & Assigned Project Isolation',
  },
  {
    id: 'DD-04',
    title: 'Modification du registre contractuel officiel par un agent',
    actor: 'AGENT_1',
    operation: 'update',
    path: '/projects/PRJ-DEMO-001',
    payload: { contractor: 'Entreprise Falsifiée SARL' },
    expected: 'PERMISSION_DENIED',
    pillar: 'Contractual Immutability',
  },
  {
    id: 'DD-05',
    title: 'Création non autorisée d une affectation par un agent',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/agent_assignments/AFF-SPOOF-01',
    payload: { id: 'AFF-SPOOF-01', agentId: 'agent1', projectId: 'PRJ-DEMO-015', status: 'ACTIVE' },
    expected: 'PERMISSION_DENIED',
    pillar: 'Coordinator-Only Assignment Control',
  },
  {
    id: 'DD-06',
    title: 'Usurpation d identité agentId dans une fiche terrain',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/field_reports/FIC-SPOOF-01',
    payload: { id: 'FIC-SPOOF-01', projectId: 'PRJ-DEMO-001', agentId: 'agent2', status: 'SOUMIS' },
    expected: 'PERMISSION_DENIED',
    pillar: 'Identity Integrity',
  },
  {
    id: 'DD-07',
    title: 'Saut d état : auto-validation d une fiche par un agent',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/field_reports/FIC-AUTO-VALID',
    payload: { id: 'FIC-AUTO-VALID', projectId: 'PRJ-DEMO-001', agentId: 'agent1', status: 'VALIDE' },
    expected: 'PERMISSION_DENIED',
    pillar: 'State Transition Integrity',
  },
  {
    id: 'DD-08',
    title: 'Altération d une fiche déjà validée (état terminal)',
    actor: 'AGENT_1',
    operation: 'update',
    path: '/field_reports/FIC-2026-0001',
    payload: { currentTep: 99, status: 'SOUMIS' },
    expected: 'PERMISSION_DENIED',
    pillar: 'Terminal State Locking',
  },
  {
    id: 'DD-09',
    title: 'Suppression de la piste d audit ou d un rapport historique',
    actor: 'AGENT_1',
    operation: 'delete',
    path: '/audit_logs/AUD-001',
    expected: 'PERMISSION_DENIED',
    pillar: 'Immutable Audit Trail',
  },
  {
    id: 'DD-10',
    title: 'Shadow Update : injection de champ fantôme isAdminOverride',
    actor: 'AGENT_1',
    operation: 'update',
    path: '/field_reports/FIC-2026-0008',
    payload: { isAdminOverride: true },
    expected: 'PERMISSION_DENIED',
    pillar: 'Validation Blueprint & Strict Keys hasOnly',
  },
  {
    id: 'DD-11',
    title: 'Value Poisoning : TEP > 100 % ou ID surdimensionné',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/field_reports/FIC-POISON-01',
    payload: { currentTep: 185, currentTef: -12 },
    expected: 'PERMISSION_DENIED',
    pillar: 'Boundary Limits & Path Variable Hardening',
  },
  {
    id: 'DD-12',
    title: 'Génération de rapport consolidé officiel par un agent',
    actor: 'AGENT_1',
    operation: 'create',
    path: '/generated_reports/GEN-UNAUTHORIZED',
    payload: { id: 'GEN-UNAUTHORIZED', format: 'PDF', periodicity: 'MENSUEL' },
    expected: 'PERMISSION_DENIED',
    pillar: 'Coordinator-Only Official Reporting',
  },
];
