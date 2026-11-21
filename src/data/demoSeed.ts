import type {
  AgentAssignment,
  AuditLog,
  ConstraintCategory,
  ContractStatus,
  ExecutionStage,
  FieldReport,
  FieldReportStatus,
  GeneratedReportRecord,
  InfrastructureType,
  Project,
  ReportPhoto,
  ReportPeriodicity,
  SyncLog,
  UserProfile,
  WorkStatus,
} from '../types/domain';
import { calculateTepTefGap } from '../domain/businessRules';
import { computePeriodKey } from '../domain/formatters';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Tiny SVG « photos » for demo fiches — visible in Revue des soumissions without upload. */
function demoPhotoDataUrl(opts: {
  title: string;
  subtitle: string;
  sky: string;
  ground: string;
  accent: string;
}): string {
  const title = escapeXml(opts.title);
  const subtitle = escapeXml(opts.subtitle);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${opts.sky}"/>
      <stop offset="100%" stop-color="#f1e8d8"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#sky)"/>
  <rect y="260" width="640" height="160" fill="${opts.ground}"/>
  <rect x="90" y="140" width="220" height="140" fill="#d6c3a3" stroke="#6b5344" stroke-width="3"/>
  <polygon points="80,140 200,70 310,140" fill="${opts.accent}" stroke="#5c4033" stroke-width="3"/>
  <rect x="130" y="190" width="48" height="70" fill="#5b7c99"/>
  <rect x="210" y="190" width="48" height="48" fill="#5b7c99"/>
  <rect x="360" y="180" width="160" height="100" fill="#c4b49a" stroke="#6b5344" stroke-width="2"/>
  <rect x="390" y="210" width="40" height="40" fill="#7a94a8"/>
  <rect x="450" y="210" width="40" height="40" fill="#7a94a8"/>
  <circle cx="520" cy="90" r="28" fill="#f0c14a" opacity="0.85"/>
  <rect x="0" y="360" width="640" height="60" fill="rgba(15,37,68,0.78)"/>
  <text x="24" y="388" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700">${title}</text>
  <text x="24" y="410" fill="#d7e3f4" font-family="Segoe UI, Arial, sans-serif" font-size="14">${subtitle}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const DEMO_PHOTO_SCENES = [
  {
    key: 'vue',
    fileName: 'vue-generale-chantier.svg',
    caption: 'Vue générale du chantier',
    sky: '#87b7d9',
    ground: '#8a7a55',
    accent: '#8b3a2a',
  },
  {
    key: 'structure',
    fileName: 'structure-toiture.svg',
    caption: 'Avancement structure / toiture',
    sky: '#9bc4e0',
    ground: '#7d6b4a',
    accent: '#b45309',
  },
  {
    key: 'finitions',
    fileName: 'finitions-interieures.svg',
    caption: 'Finitions et aménagements',
    sky: '#a8c5d4',
    ground: '#6f6248',
    accent: '#0f766e',
  },
  {
    key: 'reception',
    fileName: 'preparation-reception.svg',
    caption: 'Préparation réception technique',
    sky: '#7eb0cf',
    ground: '#756648',
    accent: '#1d4ed8',
  },
] as const;

function buildDemoPhotos(opts: {
  reportId: string;
  collectionDate: string;
  projectName: string;
  infrastructureType: InfrastructureType;
}): ReportPhoto[] {
  const seed = opts.reportId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const count = 2 + (seed % 2); // 2 or 3 photos
  const start = seed % DEMO_PHOTO_SCENES.length;
  const capturedAt = `${opts.collectionDate}T11:${String(10 + (seed % 40)).padStart(2, '0')}:00Z`;
  const typeLabel = opts.infrastructureType.replace(/_/g, ' ');

  return Array.from({ length: count }, (_, i) => {
    const scene = DEMO_PHOTO_SCENES[(start + i) % DEMO_PHOTO_SCENES.length];
    const id = `PH-DEMO-${opts.reportId}-${scene.key}`;
    const dataUrl = demoPhotoDataUrl({
      title: scene.caption,
      subtitle: `${opts.projectName} · ${typeLabel}`,
      sky: scene.sky,
      ground: scene.ground,
      accent: scene.accent,
    });
    return {
      id,
      fileName: scene.fileName,
      mimeType: 'image/svg+xml',
      sizeBytes: Math.round(dataUrl.length * 0.75),
      caption: scene.caption,
      capturedAt,
      dataUrl,
      syncState: 'UPLOADED' as const,
    };
  });
}

export interface DemoDataset {
  users: UserProfile[];
  projects: Project[];
  assignments: AgentAssignment[];
  reports: FieldReport[];
  generatedReports: GeneratedReportRecord[];
  syncLogs: SyncLog[];
  auditLogs: AuditLog[];
}

export function createDemoDataset(): DemoDataset {
  const users: UserProfile[] = [
    {
      id: 'USR-COORD-DEMO',
      email: 'coordinateur.demo@pd145t.test',
      fullName: 'Jean-Baptiste Mukendi (Démo)',
      role: 'COORDINATEUR',
      phone: '+243 81 000 1000',
      functionTitle: 'Coordonnateur National Suivi-Évaluation (Démo)',
      provinceScope: 'National — Toutes provinces',
      isActive: true,
      isDemoData: true,
      createdAt: '2026-01-05T08:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'USR-AGENT-1',
      email: 'agent1.demo@pd145t.test',
      fullName: 'Patrice Kalumba (Démo)',
      role: 'AGENT_TERRAIN',
      phone: '+243 82 000 1001',
      functionTitle: 'Superviseur Terrain S&E — Zone Sud (Démo)',
      provinceScope: 'Haut-Katanga & Lualaba',
      isActive: true,
      isDemoData: true,
      createdAt: '2026-01-10T08:30:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'USR-AGENT-2',
      email: 'agent2.demo@pd145t.test',
      fullName: 'Chantal Mwamba (Démo)',
      role: 'AGENT_TERRAIN',
      phone: '+243 82 000 1002',
      functionTitle: 'Enquêtrice Technique Terrain (Démo)',
      provinceScope: 'Haut-Lomami & Haut-Katanga',
      isActive: true,
      isDemoData: true,
      createdAt: '2026-01-12T08:30:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'USR-AGENT-3',
      email: 'agent3.demo@pd145t.test',
      fullName: 'Didier Kasongo (Démo)',
      role: 'AGENT_TERRAIN',
      phone: '+243 82 000 1003',
      functionTitle: 'Agent Enquêteur S&E — Extension Nationale (Démo)',
      provinceScope: 'Tanganyika, Kasaï-Central & Kongo-Central',
      isActive: true,
      isDemoData: true,
      createdAt: '2026-02-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
  ];

  interface ProjectSeedSpec {
    num: number;
    contractor: string;
    province: string;
    territory: string;
    type: InfrastructureType;
    name: string;
    sector: string;
    locality: string;
    contractStatus: ContractStatus;
    startDate: string;
    deadline: string;
    lat: number;
    lng: number;
    baselineStatus: WorkStatus;
    baselineTep: number;
    baselineTef: number;
    status: WorkStatus;
    tep: number;
    tef: number;
    stages: ExecutionStage[];
    realization: string;
    constraints: ConstraintCategory[];
    constraintsSummary: string;
    impactsSummary: string;
    critical: boolean;
    rt: 'OK' | 'NON' | 'NA';
    rtDate: string;
    rtRes: string;
    rtPv: string;
    rp: 'OK' | 'NON' | 'NA';
    rpDate: string;
    rpRes: string;
    rpPv: string;
    rd: 'OK' | 'NON' | 'NA';
    rdDate: string;
    rdRes: string;
    rdPv: string;
    observation: string;
    agents: string[];
  }

  const specs: ProjectSeedSpec[] = [
    // --- HAUT-KATANGA (8 ouvrages) ---
    {
      num: 1,
      contractor: 'Katanga Bâtir Horizon SARL (Démo)',
      province: 'Haut-Katanga',
      territory: 'Kambove',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Lufira Centre (6 salles + direction)',
      sector: 'Secteur Lufira',
      locality: 'Village Lufira-Nord',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-03-10',
      deadline: '2026-11-30',
      lat: -10.8742,
      lng: 26.5974,
      baselineStatus: 'EN_COURS',
      baselineTep: 92,
      baselineTef: 88,
      status: 'ACHEVE',
      tep: 100,
      tef: 96,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Livraison complète des 120 bancs-pupitres, peinture extérieure finale et pose de la plaque PDL-145T.',
      constraints: [],
      constraintsSummary: 'Aucune contrainte bloquante',
      impactsSummary: 'Aucun retard majeur',
      critical: false,
      rt: 'OK', rtDate: '2026-09-12', rtRes: 'Néant', rtPv: 'PV-RT-DEMO-001',
      rp: 'OK', rpDate: '2026-10-04', rpRes: 'Retouche peinture salle 4 levée', rpPv: 'PV-RP-DEMO-001',
      rd: 'NON', rdDate: '2026-11-30', rdRes: 'Période de garantie en cours', rdPv: '',
      observation: 'Ouvrage achevé, gardiennage assuré par le comité de parents, rentrée scolaire effective (380 élèves).',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 2,
      contractor: 'Katanga Bâtir Horizon SARL (Démo)',
      province: 'Haut-Katanga',
      territory: 'Kipushi',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Mimbulu (Maternité + Dispensaire)',
      sector: 'Secteur Bukanda',
      locality: 'Localité Mimbulu',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-05-04',
      deadline: '2026-12-20',
      lat: -11.7615,
      lng: 27.2481,
      baselineStatus: 'EN_COURS',
      baselineTep: 68,
      baselineTef: 52,
      status: 'EN_COURS',
      tep: 78,
      tef: 58,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION'],
      realization: 'Pose du carrelage en salle d’accouchement et installation du système photovoltaïque 3 kVA.',
      constraints: ['FINANCIERE'],
      constraintsSummary: '3) Financière : Retard de règlement du décompte n°4 (préfinancement PME, écart TEP > TEF supérieur à 10 pts).',
      impactsSummary: 'Tension de trésorerie PME, risque de ralentissement sur les petits ouvrages.',
      critical: true,
      rt: 'NON', rtDate: '2026-11-25', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '2026-12-20', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Travaux de bonne qualité technique ; accélération du paiement décompte n°4 recommandée au BCECO.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 3,
      contractor: 'BTP Lubumbashi Sud SARL (Démo)',
      province: 'Haut-Katanga',
      territory: 'Kasenga',
      type: 'BATIMENT_ADMINISTRATIF',
      name: 'Bâtiment Administratif Démo Territoire de Kasenga',
      sector: 'Chefferie Kisamamba',
      locality: 'Cité de Kasenga',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-04-18',
      deadline: '2027-01-31',
      lat: -10.3658,
      lng: 28.6132,
      baselineStatus: 'EN_COURS',
      baselineTep: 54,
      baselineTef: 50,
      status: 'EN_COURS',
      tep: 64,
      tef: 60,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE'],
      realization: 'Achèvement de la pose des tôles BG28 et démarrage du crépissage intérieur des bureaux.',
      constraints: ['LOGISTIQUE'],
      constraintsSummary: '2) Logistique : Dégradation de la route d’accès sur 18 km après les premières pluies.',
      impactsSummary: 'Allongement de 10 jours sur l’acheminement du ciment et de la menuiserie métallique.',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Présence effective du chef de chantier et de 26 ouvriers ; stock de ciment reconstitué.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 4,
      contractor: 'Entreprise Sakania Génie Civil (Démo)',
      province: 'Haut-Katanga',
      territory: 'Sakania',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Mokambo Frontière',
      sector: 'Secteur Balamba',
      locality: 'Mokambo',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-06-01',
      deadline: '2026-12-15',
      lat: -12.4211,
      lng: 28.3489,
      baselineStatus: 'EN_COURS',
      baselineTep: 42,
      baselineTef: 60,
      status: 'A_L_ARRET',
      tep: 44,
      tef: 62,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS'],
      realization: 'Aucun travail physique significatif depuis le 14/09/2026 suite à l’arrêt du chantier.',
      constraints: ['TECHNIQUE', 'FINANCIERE'],
      constraintsSummary: '1) Technique : Non-conformité des linteaux béton ; 3) Financière : Déséquilibre TEF > TEP (-18 pts).',
      impactsSummary: 'Arrêt total des travaux ordonné par la mission de contrôle jusqu’à reprise des malfaçons.',
      critical: true,
      rt: 'NON', rtDate: '', rtRes: 'Reprise structurelle exigée', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Mise en demeure adressée à l’entreprise ; écart financier défavorable de -18 pts à justifier d’urgence.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 5,
      contractor: 'BTP Lubumbashi Sud SARL (Démo)',
      province: 'Haut-Katanga',
      territory: 'Pweto',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Kilwa Lac Moero',
      sector: 'Chefferie Pweto',
      locality: 'Kilwa',
      contractStatus: 'REATTRIBUE_ALE_PME',
      startDate: '2025-09-12',
      deadline: '2027-03-30',
      lat: -9.3025,
      lng: 28.4148,
      baselineStatus: 'EN_COURS',
      baselineTep: 30,
      baselineTef: 28,
      status: 'EN_COURS',
      tep: 46,
      tef: 40,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE'],
      realization: 'Reprise dynamique après réattribution PME : élévation achevée et montage de la charpente bois traité.',
      constraints: ['LOGISTIQUE'],
      constraintsSummary: '2) Logistique : Enclavement saisonnier sur l’axe Pweto–Kilwa.',
      impactsSummary: 'Surcoût de transport des tôles et menuiseries (+8 %).',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Bonne dynamique depuis la réattribution ; suivi rapproché maintenu.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 6,
      contractor: 'Constructeurs Mitwaba Démo SARL',
      province: 'Haut-Katanga',
      territory: 'Mitwaba',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Kiubo Plateau',
      sector: 'Chefferie Kyona Nzini',
      locality: 'Kiubo',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2026-01-20',
      deadline: '2027-05-20',
      lat: -8.6412,
      lng: 27.3218,
      baselineStatus: 'NON_DEMARRE',
      baselineTep: 0,
      baselineTef: 15,
      status: 'NON_DEMARRE',
      tep: 5,
      tef: 20,
      stages: ['IMPLANTATION_TERRASSEMENT'],
      realization: 'Piquetage initial effectué mais installation de chantier bloquée par un différend parcellaire.',
      constraints: ['SOCIALE_ENVIRONNEMENTALE', 'FINANCIERE'],
      constraintsSummary: '4) Sociale & Environnementale : Litige foncier sur la limite Nord ; avance de démarrage versée (20 %).',
      impactsSummary: 'Report du démarrage effectif des fouilles de 45 jours ; écart TEP-TEF de -15 pts.',
      critical: true,
      rt: 'NA', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NA', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Médiation ouverte avec l’Administrateur de Territoire et le chef coutumier local.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 7,
      contractor: 'Katanga Bâtir Horizon SARL (Démo)',
      province: 'Haut-Katanga',
      territory: 'Kambove',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Likasi Périphérie (Panda-Rural)',
      sector: 'Secteur Sources du Fleuve Congo',
      locality: 'Panda-Rural',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-02-15',
      deadline: '2026-10-30',
      lat: -10.9854,
      lng: 26.7421,
      baselineStatus: 'ACHEVE',
      baselineTep: 100,
      baselineTef: 100,
      status: 'ACHEVE',
      tep: 100,
      tef: 100,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Ouvrage opérationnel et réceptionné définitivement sans réserve.',
      constraints: [],
      constraintsSummary: 'Aucune',
      impactsSummary: 'Aucun',
      critical: false,
      rt: 'OK', rtDate: '2026-06-10', rtRes: 'Néant', rtPv: 'PV-RT-DEMO-007',
      rp: 'OK', rpDate: '2026-07-02', rpRes: 'Néant', rpPv: 'PV-RP-DEMO-007',
      rd: 'OK', rdDate: '2026-10-18', rdRes: 'Aucune réserve', rdPv: 'PV-RD-DEMO-007',
      observation: 'Centre de santé fréquenté (moyenne de 42 consultations/jour), forage fonctionnel.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 8,
      contractor: 'Entreprise Sakania Génie Civil (Démo)',
      province: 'Haut-Katanga',
      territory: 'Kipushi',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Kaponda Agronomie',
      sector: 'Chefferie Kaponda',
      locality: 'Kaponda',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-07-10',
      deadline: '2027-01-15',
      lat: -11.6122,
      lng: 27.3921,
      baselineStatus: 'EN_COURS',
      baselineTep: 75,
      baselineTef: 72,
      status: 'EN_COURS',
      tep: 88,
      tef: 82,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT'],
      realization: 'Peinture intérieure achevée, construction des 6 cabines de latrines terminée à 90 %.',
      constraints: [],
      constraintsSummary: 'Aucune contrainte critique',
      impactsSummary: 'Respect du calendrier révisé',
      critical: false,
      rt: 'NON', rtDate: '2026-11-28', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Préparation de la visite de pré-réception technique prévue fin novembre.',
      agents: ['USR-AGENT-2'],
    },

    // --- HAUT-LOMAMI (6 ouvrages) ---
    {
      num: 9,
      contractor: 'Lomami Infrastructures PME (Démo)',
      province: 'Haut-Lomami',
      territory: 'Kamina',
      type: 'BATIMENT_ADMINISTRATIF',
      name: 'Bâtiment Administratif Démo Territoire de Kamina',
      sector: 'Chefferie Kasongo Nyembo',
      locality: 'Kamina-Centre',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-03-01',
      deadline: '2026-12-01',
      lat: -8.7386,
      lng: 24.9912,
      baselineStatus: 'EN_COURS',
      baselineTep: 86,
      baselineTef: 84,
      status: 'ACHEVE',
      tep: 100,
      tef: 95,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Pose complète des mobiliers de bureau, clôture périmétrique et raccordement solaire.',
      constraints: [],
      constraintsSummary: 'Réserves mineures sur 2 serrures de porte en cours de levée',
      impactsSummary: 'Aucun impact sur la mise en service',
      critical: false,
      rt: 'OK', rtDate: '2026-09-22', rtRes: '2 serrures à ajuster', rtPv: 'PV-RT-DEMO-009',
      rp: 'OK', rpDate: '2026-10-12', rpRes: 'Réserve mineure serrurerie', rpPv: 'PV-RP-DEMO-009',
      rd: 'NON', rdDate: '2027-04-12', rdRes: '', rdPv: '',
      observation: 'Bâtiment remis à l’administration territoriale ; gardiennage permanent en place.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 10,
      contractor: 'Lomami Infrastructures PME (Démo)',
      province: 'Haut-Lomami',
      territory: 'Bukama',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Luena Fleuve',
      sector: 'Chefferie Kibanda',
      locality: 'Luena',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-06-15',
      deadline: '2027-02-28',
      lat: -9.4501,
      lng: 25.7834,
      baselineStatus: 'EN_COURS',
      baselineTep: 58,
      baselineTef: 44,
      status: 'EN_COURS',
      tep: 71,
      tef: 54,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE'],
      realization: 'Crépissage extérieur des deux blocs de 3 classes et installation des cadres métalliques.',
      constraints: ['FINANCIERE', 'LOGISTIQUE'],
      constraintsSummary: '3) Financière : Décompte n°3 en circuit de validation (+17 pts TEP-TEF) ; 2) Logistique : Transport fluvial lent.',
      impactsSummary: 'Pression sur la paie de la main-d’œuvre locale.',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Qualité de maçonnerie conforme aux plans BCECO.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 11,
      contractor: 'Génie Rural Kabongo ALE (Démo)',
      province: 'Haut-Lomami',
      territory: 'Kabongo',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Kabongo Nord',
      sector: 'Chefferie Kabongo',
      locality: 'Kabongo-Cité',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-05-22',
      deadline: '2026-12-30',
      lat: -7.3191,
      lng: 25.5812,
      baselineStatus: 'EN_COURS',
      baselineTep: 48,
      baselineTef: 48,
      status: 'A_L_ARRET',
      tep: 48,
      tef: 48,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS'],
      realization: 'Chantier interrompu depuis le 03/10/2026 pour rupture totale d’approvisionnement en tôles et ciment.',
      constraints: ['LOGISTIQUE'],
      constraintsSummary: '2) Logistique : Pont routier endommagé sur la RN1 bloquant les camions lourds.',
      impactsSummary: 'Arrêt complet du chantier estimé à 30 jours.',
      critical: true,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Solution de transbordement par piste secondaire à l’étude avec les autorités locales.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 12,
      contractor: 'Génie Rural Kabongo ALE (Démo)',
      province: 'Haut-Lomami',
      territory: 'Kaniama',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Kaniama Gare',
      sector: 'Chefferie Mutombo Mukulu',
      locality: 'Kaniama',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-03-18',
      deadline: '2026-11-15',
      lat: -7.5681,
      lng: 24.1842,
      baselineStatus: 'EN_COURS',
      baselineTep: 90,
      baselineTef: 85,
      status: 'ACHEVE',
      tep: 100,
      tef: 92,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Réception technique effectuée, aménagement de la cour et installation citerne d’eau pluviale.',
      constraints: ['TECHNIQUE'],
      constraintsSummary: '1) Technique : Fissure capillaire sur la rampe PMR signalée en réserve RT.',
      impactsSummary: 'Reprise locale de 48h requise avant réception provisoire.',
      critical: false,
      rt: 'OK', rtDate: '2026-10-20', rtRes: 'Reprise rampe PMR exigée', rtPv: 'PV-RT-DEMO-012',
      rp: 'NON', rpDate: '2026-11-28', rpRes: 'En attente levée réserve RT', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'École sécurisée par gardiennage ; bonne adhésion communautaire.',
      agents: ['USR-AGENT-2'],
    },
    {
      num: 13,
      contractor: 'Lomami Infrastructures PME (Démo)',
      province: 'Haut-Lomami',
      territory: 'Malemba-Nkulu',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Mulongo Lac',
      sector: 'Chefferie Mulongo',
      locality: 'Mulongo',
      contractStatus: 'CONTRAT_RESILIE',
      startDate: '2025-04-05',
      deadline: '2026-10-15',
      lat: -7.8321,
      lng: 26.9612,
      baselineStatus: 'A_L_ARRET',
      baselineTep: 22,
      baselineTef: 38,
      status: 'A_L_ARRET',
      tep: 22,
      tef: 38,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION'],
      realization: 'Chantier arrêté suite à résiliation pour défaillance contractuelle ; dossier de réattribution en cours.',
      constraints: ['FINANCIERE', 'TECHNIQUE'],
      constraintsSummary: '3) Financière : Écart défavorable -16 pts suite à abandon ; 1) Technique : Conservation des fondations à contrôler.',
      impactsSummary: 'Retard supérieur à 6 mois ; réattribution PME/ALE urgente.',
      critical: true,
      rt: 'NON', rtDate: '', rtRes: 'Constat d’huissier établi', rtPv: '',
      rp: 'NA', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Site gardienné par la chefferie locale en attendant le repreneur.',
      agents: [],
    },
    {
      num: 14,
      contractor: 'Constructeurs Mitwaba Démo SARL',
      province: 'Haut-Lomami',
      territory: 'Kamina',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Kinda Savane',
      sector: 'Secteur Kinda',
      locality: 'Kinda',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-08-01',
      deadline: '2027-02-01',
      lat: -8.9102,
      lng: 24.7124,
      baselineStatus: 'EN_COURS',
      baselineTep: 40,
      baselineTef: 38,
      status: 'EN_COURS',
      tep: 56,
      tef: 52,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE'],
      realization: 'Pose de la charpente métallique sur le bâtiment principal et fouilles du bloc latrines.',
      constraints: [],
      constraintsSummary: 'Aucune contrainte majeure',
      impactsSummary: 'Avancement conforme',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Équipe complète sur site, contrôle journalier assuré.',
      agents: [],
    },

    // --- LUALABA (5 ouvrages) ---
    {
      num: 15,
      contractor: 'Constructions Lualaba Plus (Démo)',
      province: 'Lualaba',
      territory: 'Dilolo',
      type: 'BATIMENT_ADMINISTRATIF',
      name: 'Bâtiment Administratif Démo Territoire de Dilolo',
      sector: 'Chefferie Muyeye',
      locality: 'Dilolo-Poste',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-04-12',
      deadline: '2026-12-31',
      lat: -10.6845,
      lng: 22.3461,
      baselineStatus: 'EN_COURS',
      baselineTep: 72,
      baselineTef: 68,
      status: 'EN_COURS',
      tep: 84,
      tef: 76,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION'],
      realization: 'Plafonnage en plaques PVC, pose des portes vitrées et câblage électrique solaire.',
      constraints: ['LOGISTIQUE'],
      constraintsSummary: '2) Logistique : Distance d’approvisionnement depuis Kolwezi (420 km).',
      impactsSummary: 'Décalage modéré de 12 jours sur la livraison du mobilier.',
      critical: false,
      rt: 'NON', rtDate: '2026-12-05', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Excellente finition intérieure observée lors de la visite.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 16,
      contractor: 'Constructions Lualaba Plus (Démo)',
      province: 'Lualaba',
      territory: 'Lubudi',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Fungurume Rural',
      sector: 'Chefferie Bayeke',
      locality: 'Kapolowe-Ouest',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-02-20',
      deadline: '2026-10-30',
      lat: -10.6167,
      lng: 26.3104,
      baselineStatus: 'ACHEVE',
      baselineTep: 100,
      baselineTef: 98,
      status: 'ACHEVE',
      tep: 100,
      tef: 100,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Réception définitive prononcée, école pleinement opérationnelle.',
      constraints: [],
      constraintsSummary: 'Aucune',
      impactsSummary: 'Aucun',
      critical: false,
      rt: 'OK', rtDate: '2026-06-25', rtRes: 'Néant', rtPv: 'PV-RT-DEMO-016',
      rp: 'OK', rpDate: '2026-07-18', rpRes: 'Néant', rpPv: 'PV-RP-DEMO-016',
      rd: 'OK', rdDate: '2026-10-28', rdRes: 'Néant', rdPv: 'PV-RD-DEMO-016',
      observation: 'Taux de fréquentation élevé (415 élèves inscrits) ; propreté satisfaisante.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 17,
      contractor: 'Kolwezi Travaux Modernes SARL (Démo)',
      province: 'Lualaba',
      territory: 'Mutshatsha',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Lualaba-Gare',
      sector: 'Secteur Lufupa',
      locality: 'Mutshatsha',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-07-05',
      deadline: '2027-01-20',
      lat: -10.6378,
      lng: 24.4581,
      baselineStatus: 'EN_COURS',
      baselineTep: 50,
      baselineTef: 35,
      status: 'EN_COURS',
      tep: 67,
      tef: 45,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE'],
      realization: 'Enduit extérieur achevé et pose des fenêtres métalliques anti-moustiques.',
      constraints: ['FINANCIERE'],
      constraintsSummary: '3) Financière : Préfinancement entreprise important (écart TEP > TEF supérieur à 10 pts).',
      impactsSummary: 'Risque d’arrêt si l’attachement n°3 n’est pas liquidé sous 15 jours.',
      critical: true,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Entreprise volontaire ayant préfinancé la toiture ; dossier transmis pour paiement prioritaire.',
      agents: ['USR-AGENT-1'],
    },
    {
      num: 18,
      contractor: 'Kolwezi Travaux Modernes SARL (Démo)',
      province: 'Lualaba',
      territory: 'Kapanga',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Musumba Historique',
      sector: 'Chefferie Mwant Yav',
      locality: 'Musumba',
      contractStatus: 'REATTRIBUE_ALE_PME',
      startDate: '2026-01-10',
      deadline: '2027-06-30',
      lat: -8.3514,
      lng: 22.5792,
      baselineStatus: 'EN_COURS',
      baselineTep: 18,
      baselineTef: 20,
      status: 'EN_COURS',
      tep: 34,
      tef: 30,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS'],
      realization: 'Achèvement de la dalle de fondation et élévation des murs à hauteur d’allège.',
      constraints: ['LOGISTIQUE'],
      constraintsSummary: '2) Logistique : Piste sableuse difficile pendant la saison des pluies.',
      impactsSummary: 'Cadence d’approvisionnement réduite en gravier concassé.',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Fabrication locale des briques cuites contrôlée conforme.',
      agents: [],
    },
    {
      num: 19,
      contractor: 'Constructions Lualaba Plus (Démo)',
      province: 'Lualaba',
      territory: 'Sandoa',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Sandoa Centre',
      sector: 'Chefferie Samuteb',
      locality: 'Sandoa',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2026-03-01',
      deadline: '2027-07-31',
      lat: -9.6871,
      lng: 22.9274,
      baselineStatus: 'NON_DEMARRE',
      baselineTep: 0,
      baselineTef: 0,
      status: 'NON_DEMARRE',
      tep: 0,
      tef: 0,
      stages: [],
      realization: 'En attente de validation définitive de l’implantation géotechnique (sol argileux).',
      constraints: ['TECHNIQUE'],
      constraintsSummary: '1) Technique : Étude de sol complémentaire requise pour dimensionner les semelles.',
      impactsSummary: 'Démarrage des travaux reporté de 4 semaines.',
      critical: false,
      rt: 'NA', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NA', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Aucun décaissement effectué à ce jour (TEF 0 %).',
      agents: [],
    },

    // --- EXTENSION NATIONALE : TANGANYIKA (2), KASAÏ-CENTRAL (2), KONGO-CENTRAL (1) ---
    {
      num: 20,
      contractor: 'Tanganyika BTP & Services (Démo)',
      province: 'Tanganyika',
      territory: 'Kalemie',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Kabimba Lac (Extension Nationale)',
      sector: 'Chefferie Tumbwe',
      locality: 'Kabimba',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-05-10',
      deadline: '2026-12-20',
      lat: -5.5812,
      lng: 29.3421,
      baselineStatus: 'EN_COURS',
      baselineTep: 74,
      baselineTef: 70,
      status: 'EN_COURS',
      tep: 89,
      tef: 84,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT'],
      realization: 'Finitions peinture achevées et pose du forage manuel dans la cour de l’école.',
      constraints: [],
      constraintsSummary: 'Aucune contrainte active',
      impactsSummary: 'Livraison prévue dans les délais',
      critical: false,
      rt: 'NON', rtDate: '2026-12-01', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Chantier pilote de l’extension nationale Tanganyika.',
      agents: ['USR-AGENT-3'],
    },
    {
      num: 21,
      contractor: 'Tanganyika BTP & Services (Démo)',
      province: 'Tanganyika',
      territory: 'Kongolo',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Kongolo Rive Droite (Extension Nationale)',
      sector: 'Chefferie Bena Nyembo',
      locality: 'Kongolo',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-06-20',
      deadline: '2027-02-15',
      lat: -5.3852,
      lng: 27.0014,
      baselineStatus: 'EN_COURS',
      baselineTep: 46,
      baselineTef: 45,
      status: 'EN_COURS',
      tep: 60,
      tef: 55,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE'],
      realization: 'Pose de la toiture et démarrage de l’assainissement (fosse septique et incinérateur médical).',
      constraints: ['SOCIALE_ENVIRONNEMENTALE'],
      constraintsSummary: '4) Sociale & Environnementale : Mesures HSE à renforcer pour le stockage des déchets de chantier.',
      impactsSummary: 'Correction immédiate demandée à l’entreprise sans arrêt de chantier.',
      critical: false,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Suivi HSE planifié à la prochaine visite hebdomadaire.',
      agents: ['USR-AGENT-3'],
    },
    {
      num: 22,
      contractor: 'Kasaï Génie Construct SARL (Démo)',
      province: 'Kasaï-Central',
      territory: 'Demba',
      type: 'BATIMENT_ADMINISTRATIF',
      name: 'Bâtiment Administratif Démo Demba (Extension Nationale)',
      sector: 'Secteur Diofwa',
      locality: 'Demba-Cité',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-05-01',
      deadline: '2027-01-10',
      lat: -5.4981,
      lng: 22.2654,
      baselineStatus: 'EN_COURS',
      baselineTep: 55,
      baselineTef: 68,
      status: 'EN_COURS',
      tep: 58,
      tef: 72,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE'],
      realization: 'Pose partielle des pannes métalliques ; ralentissement constaté sur la menuiserie.',
      constraints: ['FINANCIERE', 'LOGISTIQUE'],
      constraintsSummary: '3) Financière : Écart défavorable TEF > TEP supérieur à 10 pts ; 2) Logistique : Retard convoi ferroviaire.',
      impactsSummary: 'Glissement de planning de 3 semaines.',
      critical: true,
      rt: 'NON', rtDate: '', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Plan de rattrapage exigé de l’entreprise sous 10 jours.',
      agents: ['USR-AGENT-3'],
    },
    {
      num: 23,
      contractor: 'Kasaï Génie Construct SARL (Démo)',
      province: 'Kasaï-Central',
      territory: 'Luiza',
      type: 'ECOLE_PRIMAIRE',
      name: 'EP Démo Luiza Plateau (Extension Nationale)',
      sector: 'Secteur Lusanza',
      locality: 'Luiza',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-03-25',
      deadline: '2026-11-25',
      lat: -7.1965,
      lng: 22.4188,
      baselineStatus: 'EN_COURS',
      baselineTep: 94,
      baselineTef: 90,
      status: 'ACHEVE',
      tep: 100,
      tef: 96,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION', 'PETITS_OUVRAGES_ASSAINISSEMENT', 'EQUIPEMENT_MOBILIER'],
      realization: 'Travaux 100 % achevés, mobilier livré, réception provisoire signée.',
      constraints: [],
      constraintsSummary: 'Aucune',
      impactsSummary: 'Aucun',
      critical: false,
      rt: 'OK', rtDate: '2026-09-18', rtRes: 'Néant', rtPv: 'PV-RT-DEMO-023',
      rp: 'OK', rpDate: '2026-10-08', rpRes: 'Néant', rpPv: 'PV-RP-DEMO-023',
      rd: 'NON', rdDate: '2027-04-08', rdRes: '', rdPv: '',
      observation: 'Ouvrage exemplaire ; comité scolaire formé à l’entretien.',
      agents: ['USR-AGENT-3'],
    },
    {
      num: 24,
      contractor: 'Kongo Bâtiments Durables SARL (Démo)',
      province: 'Kongo-Central',
      territory: 'Kasangulu',
      type: 'CENTRE_DE_SANTE',
      name: 'CS Démo Kasangulu Rural (Extension Nationale)',
      sector: 'Secteur Kasangulu',
      locality: 'Kasangulu-Est',
      contractStatus: 'CONTRAT_ACTIF',
      startDate: '2025-08-14',
      deadline: '2027-03-15',
      lat: -4.5831,
      lng: 15.1652,
      baselineStatus: 'EN_COURS',
      baselineTep: 62,
      baselineTef: 60,
      status: 'EN_COURS',
      tep: 76,
      tef: 74,
      stages: ['IMPLANTATION_TERRASSEMENT', 'FONDATION', 'ELEVATION_MURS', 'CHARPENTE_TOITURE', 'MENUISERIE_CREPISSAGE', 'FINITION'],
      realization: 'Pose des faux plafonds, plomberie sanitaire et équipements de stérilisation.',
      constraints: [],
      constraintsSummary: 'Aucune contrainte active',
      impactsSummary: 'Exécution équilibrée (écart +2 pts)',
      critical: false,
      rt: 'NON', rtDate: '2026-12-12', rtRes: '', rtPv: '',
      rp: 'NON', rpDate: '', rpRes: '', rpPv: '',
      rd: 'NA', rdDate: '', rdRes: '', rdPv: '',
      observation: 'Bonne coordination avec la zone de santé de Kasangulu.',
      agents: ['USR-AGENT-3'],
    },
  ];

  const projects: Project[] = specs.map((s) => {
    const padded = String(s.num).padStart(3, '0');
    return {
      id: `PRJ-DEMO-${padded}`,
      matrixNumber: `DEMO-${padded}`,
      contractor: s.contractor,
      province: s.province,
      territory: s.territory,
      infrastructureType: s.type,
      projectName: s.name,
      sectorChiefdom: s.sector,
      locality: s.locality,
      contractStatus: s.contractStatus,
      startDate: s.startDate,
      definitiveReceptionDeadline: s.deadline,
      referenceCoords: { lat: s.lat, lng: s.lng },
      baselineDate: '2026-08-31',
      baselineStatus: s.baselineStatus,
      baselineTep: s.baselineTep,
      baselineTef: s.baselineTef,
      currentStatus: s.status,
      latestPeriodRealization: s.realization,
      latestExecutionStages: s.stages,
      currentTep: s.tep,
      currentTef: s.tef,
      currentGap: calculateTepTefGap(s.tep, s.tef),
      latestConstraintsSummary: s.constraintsSummary,
      latestConstraintCategories: s.constraints,
      hasUnresolvedConstraints: s.constraints.length > 0,
      hasCriticalConstraint: s.critical,
      latestImpactsSummary: s.impactsSummary,
      receptions: {
        rt: { status: s.rt, date: s.rtDate, reserves: s.rtRes, pvReference: s.rtPv },
        rp: { status: s.rp, date: s.rpDate, reserves: s.rpRes, pvReference: s.rpPv },
        rd: { status: s.rd, date: s.rdDate, reserves: s.rdRes, pvReference: s.rdPv },
      },
      latestObservation: s.observation,
      assignedAgentIds: [...s.agents],
      isDemoData: true,
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-11-12T10:00:00Z',
    };
  });

  // Active assignments + historical inactive/reassigned assignments
  const assignments: AgentAssignment[] = [];
  let affIndex = 1;
  for (const p of projects) {
    for (const agentId of p.assignedAgentIds) {
      const agent = users.find((u) => u.id === agentId)!;
      assignments.push({
        id: `AFF-DEMO-${String(affIndex++).padStart(3, '0')}`,
        agentId: agent.id,
        agentName: agent.fullName,
        projectId: p.id,
        projectMatrixNumber: p.matrixNumber,
        projectName: p.projectName,
        startDate: '2026-08-01',
        endDate: null,
        status: 'ACTIVE',
        assignedBy: 'USR-COORD-DEMO',
        assignedByName: 'Jean-Baptiste Mukendi (Démo)',
        notes: 'Affectation initiale de campagne S&E T3–T4 2026 (Démo).',
        isDemoData: true,
        createdAt: '2026-08-01T08:00:00Z',
        updatedAt: '2026-08-01T08:00:00Z',
      });
    }
  }
  // Historical reassigned & ended assignments (demonstrating audit preservation!)
  assignments.push(
    {
      id: `AFF-DEMO-${String(affIndex++).padStart(3, '0')}`,
      agentId: 'USR-AGENT-1',
      agentName: 'Patrice Kalumba (Démo)',
      projectId: 'PRJ-DEMO-005',
      projectMatrixNumber: 'DEMO-005',
      projectName: projects[4].projectName,
      startDate: '2026-04-01',
      endDate: '2026-07-31',
      status: 'REAFFECTEE',
      assignedBy: 'USR-COORD-DEMO',
      assignedByName: 'Jean-Baptiste Mukendi (Démo)',
      notes: 'Réaffecté à Chantal Mwamba pour équilibrage géographique Pweto–Haut-Lomami.',
      reassignedToAgentId: 'USR-AGENT-2',
      isDemoData: true,
      createdAt: '2026-04-01T08:00:00Z',
      updatedAt: '2026-07-31T16:30:00Z',
    },
    {
      id: `AFF-DEMO-${String(affIndex++).padStart(3, '0')}`,
      agentId: 'USR-AGENT-2',
      agentName: 'Chantal Mwamba (Démo)',
      projectId: 'PRJ-DEMO-013',
      projectMatrixNumber: 'DEMO-013',
      projectName: projects[12].projectName,
      startDate: '2026-03-15',
      endDate: '2026-09-20',
      status: 'TERMINEE',
      assignedBy: 'USR-COORD-DEMO',
      assignedByName: 'Jean-Baptiste Mukendi (Démo)',
      notes: 'Affectation clôturée temporairement suite à résiliation contractuelle en attente de réattribution.',
      isDemoData: true,
      createdAt: '2026-03-15T08:00:00Z',
      updatedAt: '2026-09-20T14:00:00Z',
    }
  );

  // Build 32 coherent historical & current field reports across multiple periods & statuses
  const reports: FieldReport[] = [];
  let repCounter = 1;

  function makeReport(opts: {
    project: Project;
    agent: UserProfile;
    periodicity: ReportPeriodicity;
    collectionDate: string;
    weekNumber?: string;
    month?: string;
    prevTep: number;
    currTep: number;
    prevTef: number;
    currTef: number;
    workStatus: WorkStatus;
    stoppageDate?: string;
    works: string;
    skilled: number;
    laborers: number;
    engineer: boolean;
    status: FieldReportStatus;
    reviewComment?: string;
    gapJustification?: string;
    urgentActions?: string;
    correctiveMeasures?: string;
    actionOwner?: string;
    duplicateOf?: string[];
  }): FieldReport {
    const id = `FIC-2026-${String(repCounter++).padStart(4, '0')}`;
    const weekNumber = opts.weekNumber ?? '';
    const month = opts.month ?? (opts.periodicity === 'MENSUEL' ? opts.collectionDate.slice(0, 7) : '');
    const periodKey = computePeriodKey(opts.periodicity, opts.collectionDate, weekNumber, month);
    const gap = calculateTepTefGap(opts.currTep, opts.currTef);
    const assignment = assignments.find((a) => a.projectId === opts.project.id && a.agentId === opts.agent.id);
    const createdAt = `${opts.collectionDate}T09:15:00Z`;
    const submittedAt = opts.status !== 'BROUILLON' ? `${opts.collectionDate}T14:30:00Z` : undefined;
    const validatedAt = opts.status === 'VALIDE' ? `${opts.collectionDate}T17:45:00Z` : undefined;

    const reviews = [];
    if (opts.status === 'VALIDE') {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: 'USR-COORD-DEMO',
        reviewerName: 'Jean-Baptiste Mukendi (Démo)',
        decision: 'VALIDE' as const,
        comment: opts.reviewComment ?? 'Données cohérentes avec le suivi physique et financier. Fiche validée.',
        createdAt: `${opts.collectionDate}T17:45:00Z`,
      });
    } else if (opts.status === 'RETOURNE') {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: 'USR-COORD-DEMO',
        reviewerName: 'Jean-Baptiste Mukendi (Démo)',
        decision: 'RETOURNE' as const,
        comment:
          opts.reviewComment ??
          'Veuillez compléter la justification détaillée de l’écart TEP/TEF et préciser la référence du procès-verbal de constat.',
        createdAt: `${opts.collectionDate}T16:20:00Z`,
      });
    } else if (opts.status === 'EN_COURS_VERIFICATION') {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: 'USR-COORD-DEMO',
        reviewerName: 'Jean-Baptiste Mukendi (Démo)',
        decision: 'EN_COURS_VERIFICATION' as const,
        comment: 'Vérification croisée en cours avec l’attachement financier mensuel.',
        createdAt: `${opts.collectionDate}T15:50:00Z`,
      });
    }

    return {
      id,
      projectId: opts.project.id,
      matrixNumber: opts.project.matrixNumber,
      agentId: opts.agent.id,
      agentName: opts.agent.fullName,
      assignmentId: assignment?.id ?? 'AFF-HIST',
      status: opts.status,
      syncStatus: 'SYNCHRONISE',
      potentialDuplicateOf: opts.duplicateOf ?? [],
      version: 1,
      periodKey,
      periodicity: opts.periodicity,
      collectionDate: opts.collectionDate,
      currentTep: opts.currTep,
      currentTef: opts.currTef,
      identification: {
        periodicity: opts.periodicity,
        weekNumber,
        month,
        collectionDate: opts.collectionDate,
        matrixNumber: opts.project.matrixNumber,
        province: opts.project.province,
        territory: opts.project.territory,
        sectorChiefdom: opts.project.sectorChiefdom,
        infrastructureType: opts.project.infrastructureType,
        projectName: opts.project.projectName,
        contractor: opts.project.contractor,
        contractStatus: opts.project.contractStatus,
        startDate: opts.project.startDate,
        definitiveReceptionDeadline: opts.project.definitiveReceptionDeadline,
        locality: opts.project.locality,
        gpsLat: opts.project.referenceCoords.lat.toFixed(4),
        gpsLng: opts.project.referenceCoords.lng.toFixed(4),
        gpsAccuracy: 12,
        gpsCapturedAt: createdAt,
      },
      progress: {
        workStatus: opts.workStatus,
        stoppageDate: opts.stoppageDate ?? (opts.workStatus === 'A_L_ARRET' ? '2026-09-14' : ''),
        executionStages: [...opts.project.latestExecutionStages],
        periodWorksExecuted: opts.works,
        skilledWorkersCount: opts.skilled,
        laborersCount: opts.laborers,
        siteEngineerPresent: opts.engineer,
        previousTep: opts.prevTep,
        currentTep: opts.currTep,
        previousTef: opts.prevTef,
        currentTef: opts.currTef,
        tepTefGap: gap,
        gapJustification:
          opts.gapJustification ??
          (Math.abs(gap) > 10
            ? gap > 0
              ? 'Travaux préfinancés par l’entreprise ; décompte en cours de traitement au niveau financier BCECO.'
              : 'Décaissement d’avance de démarrage ou attachement antérieur non encore compensé par l’avancement physique sur site.'
            : ''),
      },
      constraints: {
        categories: [...opts.project.latestConstraintCategories],
        detailedDescriptions: opts.project.latestConstraintCategories.length > 0 ? [opts.project.latestConstraintsSummary] : [],
        impacts: {
          delays: opts.project.hasUnresolvedConstraints,
          costs: opts.project.latestConstraintCategories.includes('LOGISTIQUE') || opts.project.latestConstraintCategories.includes('FINANCIERE'),
          quality: opts.project.latestConstraintCategories.includes('TECHNIQUE'),
          stoppage: opts.workStatus === 'A_L_ARRET',
          details: opts.project.latestImpactsSummary,
        },
        isCritical: opts.project.hasCriticalConstraint,
        correctiveMeasures:
          opts.correctiveMeasures ??
          (opts.project.hasUnresolvedConstraints
            ? 'Tenue d’une réunion de cadrage technique tripartite (BCECO, Entreprise, Autorité locale) avec chronogramme contraignant.'
            : 'Maintien de la cadence hebdomadaire jusqu’à la réception.'),
        urgentActionsRequired:
          opts.urgentActions ??
          (opts.project.hasCriticalConstraint
            ? 'Accélérer la décision de coordination provinciale et débloquer le point critique identifié sous 10 jours.'
            : ''),
        actionOwner: opts.actionOwner ?? (opts.project.hasCriticalConstraint ? 'BCECO & Entreprise' : 'Entreprise'),
      },
      receptions: {
        rt: { ...opts.project.receptions.rt },
        rp: { ...opts.project.receptions.rp },
        rd: { ...opts.project.receptions.rd },
        generalObservations: opts.project.latestObservation,
        guardingStatus: opts.workStatus === 'ACHEVE' ? 'Gardiennage communautaire permanent' : 'Gardiennage entreprise 24h/24',
        siteCondition: opts.workStatus === 'A_L_ARRET' ? 'Matériaux sécurisés, reprise en attente' : 'Chantier propre et balisé',
        disputes: opts.project.latestConstraintCategories.includes('SOCIALE_ENVIRONNEMENTALE')
          ? 'Médiation foncière en cours avec la chefferie'
          : 'Aucun litige signalé',
        attendanceLevel: opts.workStatus === 'ACHEVE' ? 'Exploitation effective par la communauté locale' : 'Non applicable (en chantier)',
        photos:
          opts.status === 'BROUILLON'
            ? []
            : buildDemoPhotos({
                reportId: id,
                collectionDate: opts.collectionDate,
                projectName: opts.project.projectName,
                infrastructureType: opts.project.infrastructureType,
              }),
        attachments: [],
      },
      signature: {
        agentFullName: opts.agent.fullName,
        agentFunction: opts.agent.functionTitle,
        agentPhone: opts.agent.phone,
        signatureDataUrl: 'CERTIFIE_ELECTRONIQUEMENT_DEMO',
        signedAt: createdAt,
      },
      reviews,
      versionHistory: [],
      createdAt,
      updatedAt: validatedAt ?? submittedAt ?? createdAt,
      submittedAt,
      validatedAt,
      lastSyncedAt: submittedAt ?? createdAt,
      isDemoData: true,
    };
  }

  const agent1 = users[1];
  const agent2 = users[2];
  const agent3 = users[3];

  // Historical September 2026 validated reports (showing multi-period progression on key projects!)
  const sepSpecs: [number, UserProfile, number, number, number, number, string][] = [
    [0, agent1, 86, 94, 82, 90, 'Pose des dernières menuiseries métalliques et première couche de peinture.'],
    [1, agent1, 60, 70, 48, 52, 'Achèvement de la toiture et démarrage de l’enduit intérieur maternité.'],
    [2, agent1, 46, 56, 44, 52, 'Montage de la charpente métallique du bloc administratif.'],
    [3, agent1, 40, 44, 55, 62, 'Constat de non-conformité sur les linteaux avant suspension des travaux.'],
    [4, agent2, 22, 36, 22, 32, 'Élévation des murs du dispensaire après relance PME.'],
    [7, agent2, 68, 79, 66, 76, 'Crépissage intégral et démarrage de la construction des latrines.'],
    [8, agent2, 80, 92, 78, 88, 'Carrelage, faux plafonds et aménagement des bureaux.'],
    [9, agent2, 50, 62, 42, 48, 'Pose des tôles et début du crépissage extérieur.'],
    [11, agent2, 84, 94, 80, 88, 'Peinture finale et livraison des bancs-pupitres.'],
    [14, agent1, 64, 76, 62, 70, 'Pose des menuiseries et enduit de façade principale.'],
    [16, agent1, 44, 56, 35, 40, 'Achèvement de la toiture en tôles BG28 sur le centre de santé.'],
    [19, agent3, 66, 78, 64, 74, 'Crépissage et installation du bloc sanitaire.'],
    [21, agent3, 48, 55, 60, 68, 'Élévation des murs achevée ; retard de livraison charpente.'],
    [22, agent3, 88, 96, 86, 92, 'Finition peinture et réception technique préparatoire.'],
  ];

  for (const [idx, ag, pTep, cTep, pTef, cTef, works] of sepSpecs) {
    reports.push(
      makeReport({
        project: projects[idx],
        agent: ag,
        periodicity: 'MENSUEL',
        collectionDate: '2026-09-25',
        month: '2026-09',
        prevTep: pTep,
        currTep: cTep,
        prevTef: pTef,
        currTef: cTef,
        workStatus: cTep >= 100 ? 'ACHEVE' : projects[idx].currentStatus === 'A_L_ARRET' ? 'A_L_ARRET' : 'EN_COURS',
        works,
        skilled: 8,
        laborers: 16,
        engineer: true,
        status: 'VALIDE',
      })
    );
  }

  // Capture pending November realizations before syncing projects to their latest VALIDE report
  const pendingNovRealizationByIdx = new Map<number, string>([
    [1, projects[1].latestPeriodRealization],
    [4, projects[4].latestPeriodRealization],
    [16, projects[16].latestPeriodRealization],
    [21, projects[21].latestPeriodRealization],
  ]);

  // October 2026 validated reports (12 reports, chained seamlessly from September or baseline)
  const octValidatedIndices: [number, UserProfile][] = [
    [0, agent1],
    [2, agent1],
    [6, agent1],
    [7, agent2],
    [8, agent2],
    [9, agent2],
    [11, agent2],
    [14, agent1],
    [15, agent1],
    [19, agent3],
    [22, agent3],
    [23, agent3],
  ];

  for (const [idx, ag] of octValidatedIndices) {
    const prj = projects[idx];
    const prevSep = reports.find((rep) => rep.projectId === prj.id && rep.status === 'VALIDE');
    const r = makeReport({
      project: prj,
      agent: ag,
      periodicity: 'MENSUEL',
      collectionDate: '2026-10-26',
      month: '2026-10',
      prevTep: prevSep ? prevSep.currentTep : prj.baselineTep,
      currTep: prj.currentTep,
      prevTef: prevSep ? prevSep.currentTef : prj.baselineTef,
      currTef: prj.currentTef,
      workStatus: prj.currentStatus,
      works: prj.latestPeriodRealization,
      skilled: prj.currentStatus === 'ACHEVE' ? 2 : 10,
      laborers: prj.currentStatus === 'ACHEVE' ? 4 : 18,
      engineer: true,
      status: 'VALIDE',
    });

    // Demonstrate multi-version revision history (v1 retournée -> v2 corrigée et validée) on two key sites
    if (idx === 8 || idx === 11) {
      r.version = 2;
      r.versionHistory = [
        {
          version: 1,
          savedAt: '2026-10-26T14:30:00Z',
          statusAtSnapshot: 'RETOURNE',
          currentTep: Math.max(0, r.currentTep - 2),
          currentTef: r.currentTef,
          workStatus: 'EN_COURS',
          summary: 'Version initiale v1 soumise avant complément de référence PV de réception technique.',
        },
      ];
      r.reviews = [
        {
          id: `REV-${r.id}-0`,
          reportId: r.id,
          reportVersion: 1,
          reviewerId: 'USR-COORD-DEMO',
          reviewerName: 'Jean-Baptiste Mukendi (Démo)',
          decision: 'RETOURNE',
          comment: 'Veuillez renseigner la référence officielle du PV de réception technique et confirmer la levée des réserves.',
          createdAt: '2026-10-26T15:40:00Z',
        },
        {
          ...r.reviews[0],
          reportVersion: 2,
          comment: 'Référence PV ajoutée et réserves documentées en v2. Fiche validée et consolidée.',
          createdAt: '2026-10-26T17:45:00Z',
        },
      ];
    }

    reports.push(r);
  }

  // Strictly synchronize every project's consolidated register state (cols 10-21) with its latest VALIDE report
  for (const prj of projects) {
    const latestValidated = reports
      .filter((rep) => rep.projectId === prj.id && rep.status === 'VALIDE')
      .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate))[0];
    if (latestValidated) {
      prj.currentStatus = latestValidated.progress.workStatus;
      prj.currentTep = latestValidated.progress.currentTep;
      prj.currentTef = latestValidated.progress.currentTef;
      prj.currentGap = calculateTepTefGap(prj.currentTep, prj.currentTef);
      prj.latestPeriodRealization = latestValidated.progress.periodWorksExecuted;
      prj.lastValidatedReportId = latestValidated.id;
      prj.lastValidatedAt = latestValidated.validatedAt;
    }
  }

  // November 2026 active workflow reports (8 reports across SOUMIS, EN_COURS_VERIFICATION, RETOURNE + potential duplicate!)
  // Validating these pending reports immediately advances the official register from September to November levels.
  // 1) SOUMIS - CS Mimbulu (Agent 1) - TEP/TEF gap +20 pts (pending advancement from 70%/52% -> 78%/58%)
  const rMim1 = makeReport({
    project: projects[1],
    agent: agent1,
    periodicity: 'HEBDOMADAIRE',
    collectionDate: '2026-11-12',
    weekNumber: 'S46-2026',
    prevTep: 70,
    currTep: 78,
    prevTef: 52,
    currTef: 58,
    workStatus: 'EN_COURS',
    works: pendingNovRealizationByIdx.get(1) ?? projects[1].latestPeriodRealization,
    skilled: 9,
    laborers: 14,
    engineer: true,
    status: 'SOUMIS',
  });
  reports.push(rMim1);

  // 2) SOUMIS - Flagged potential duplicate for same project/agent/period (for coordinator audit!)
  reports.push(
    makeReport({
      project: projects[1],
      agent: agent1,
      periodicity: 'HEBDOMADAIRE',
      collectionDate: '2026-11-13',
      weekNumber: 'S46-2026',
      prevTep: 70,
      currTep: 79,
      prevTef: 52,
      currTef: 58,
      workStatus: 'EN_COURS',
      works: 'Complément photo suite au raccordement des batteries solaires (doublon potentiel S46).',
      skilled: 9,
      laborers: 14,
      engineer: true,
      status: 'SOUMIS',
      duplicateOf: [rMim1.id],
    })
  );

  // 3) RETOURNE - EP Mokambo (Agent 1) so Agent 1 can immediately test "Corriger et resoumettre"!
  const rMokamboReturned = makeReport({
    project: projects[3],
    agent: agent1,
    periodicity: 'HEBDOMADAIRE',
    collectionDate: '2026-11-10',
    weekNumber: 'S46-2026',
    prevTep: 44,
    currTep: 44,
    prevTef: 62,
    currTef: 62,
    workStatus: 'A_L_ARRET',
    stoppageDate: '2026-09-14',
    works: 'Visite de constat d’arrêt ; aucun personnel de l’entreprise présent sur chantier.',
    skilled: 0,
    laborers: 0,
    engineer: false,
    status: 'RETOURNE',
    reviewComment:
      'Merci de joindre le numéro du procès-verbal de constat de non-conformité des linteaux et de préciser le responsable désigné pour la levée de la suspension.',
  });
  reports.push(rMokamboReturned);

  // 4) EN_COURS_VERIFICATION - CS Lualaba-Gare (Agent 1) - pending advancement 56%/40% -> 67%/45%
  reports.push(
    makeReport({
      project: projects[16],
      agent: agent1,
      periodicity: 'HEBDOMADAIRE',
      collectionDate: '2026-11-14',
      weekNumber: 'S46-2026',
      prevTep: 56,
      currTep: 67,
      prevTef: 40,
      currTef: 45,
      workStatus: 'EN_COURS',
      works: pendingNovRealizationByIdx.get(16) ?? projects[16].latestPeriodRealization,
      skilled: 7,
      laborers: 15,
      engineer: true,
      status: 'EN_COURS_VERIFICATION',
    })
  );

  // 5) SOUMIS - CS Kilwa (Agent 2) - pending advancement 36%/32% -> 46%/40%
  reports.push(
    makeReport({
      project: projects[4],
      agent: agent2,
      periodicity: 'HEBDOMADAIRE',
      collectionDate: '2026-11-14',
      weekNumber: 'S46-2026',
      prevTep: 36,
      currTep: 46,
      prevTef: 32,
      currTef: 40,
      workStatus: 'EN_COURS',
      works: pendingNovRealizationByIdx.get(4) ?? projects[4].latestPeriodRealization,
      skilled: 6,
      laborers: 12,
      engineer: true,
      status: 'SOUMIS',
    })
  );

  // 6) RETOURNE - EP Kiubo Plateau (Agent 2)
  reports.push(
    makeReport({
      project: projects[5],
      agent: agent2,
      periodicity: 'HEBDOMADAIRE',
      collectionDate: '2026-11-11',
      weekNumber: 'S46-2026',
      prevTep: 0,
      currTep: 5,
      prevTef: 15,
      currTef: 20,
      workStatus: 'NON_DEMARRE',
      works: 'Piquetage suspendu en attente du PV de délimitation parcellaire.',
      skilled: 2,
      laborers: 3,
      engineer: false,
      status: 'RETOURNE',
      reviewComment:
        'Veuillez indiquer la date de la réunion de médiation foncière prévue avec l’Administrateur de Territoire de Mitwaba.',
    })
  );

  // 7) SOUMIS - CS Kabongo Nord (Agent 2)
  reports.push(
    makeReport({
      project: projects[10],
      agent: agent2,
      periodicity: 'JOURNALIER',
      collectionDate: '2026-11-15',
      prevTep: 48,
      currTep: 48,
      prevTef: 48,
      currTef: 48,
      workStatus: 'A_L_ARRET',
      stoppageDate: '2026-10-03',
      works: 'Inspection journalière : pont RN1 toujours impraticable pour les camions de ciment.',
      skilled: 1,
      laborers: 2,
      engineer: false,
      status: 'SOUMIS',
    })
  );

  // 8) SOUMIS - Bâtiment Administratif Demba (Agent 3) - pending advancement 55%/68% -> 58%/72%
  reports.push(
    makeReport({
      project: projects[21],
      agent: agent3,
      periodicity: 'HEBDOMADAIRE',
      collectionDate: '2026-11-15',
      weekNumber: 'S46-2026',
      prevTep: 55,
      currTep: 58,
      prevTef: 68,
      currTef: 72,
      workStatus: 'EN_COURS',
      works: pendingNovRealizationByIdx.get(21) ?? projects[21].latestPeriodRealization,
      skilled: 5,
      laborers: 10,
      engineer: true,
      status: 'SOUMIS',
    })
  );

  const sepValidatedReports = reports.filter((r) => r.status === 'VALIDE' && r.collectionDate.startsWith('2026-09'));
  const allValidatedReports = reports.filter((r) => r.status === 'VALIDE');
  const sepAvgTep =
    Math.round(
      (sepValidatedReports.reduce((acc, r) => acc + r.currentTep, 0) / Math.max(1, sepValidatedReports.length)) * 10
    ) / 10;
  const sepAvgTef =
    Math.round(
      (sepValidatedReports.reduce((acc, r) => acc + r.currentTef, 0) / Math.max(1, sepValidatedReports.length)) * 10
    ) / 10;
  const octConsolidatedAvgTep =
    Math.round((projects.reduce((acc, p) => acc + p.currentTep, 0) / projects.length) * 10) / 10;
  const octConsolidatedAvgTef =
    Math.round((projects.reduce((acc, p) => acc + p.currentTef, 0) / projects.length) * 10) / 10;

  const generatedReports: GeneratedReportRecord[] = [
    {
      id: 'RPT-GEN-2026-001',
      title: 'Rapport Mensuel Consolidé — Septembre 2026 (Données Démo)',
      periodicity: 'MENSUEL',
      periodLabel: 'Septembre 2026',
      format: 'EXCEL',
      dataScope: 'VALIDES_UNIQUEMENT',
      filtersSummary: 'Toutes provinces · Fiches validées septembre 2026',
      generatedBy: 'USR-COORD-DEMO',
      generatedByName: 'Jean-Baptiste Mukendi (Démo)',
      projectCount: projects.length,
      reportCount: sepValidatedReports.length,
      averageTep: sepAvgTep,
      averageTef: sepAvgTef,
      isDemoData: true,
      createdAt: '2026-10-02T11:15:00Z',
    },
    {
      id: 'RPT-GEN-2026-002',
      title: 'Rapport Mensuel Consolidé — Octobre 2026 (Données Démo)',
      periodicity: 'MENSUEL',
      periodLabel: 'Octobre 2026',
      format: 'PDF',
      dataScope: 'VALIDES_UNIQUEMENT',
      filtersSummary: 'Grand Katanga & Extension Nationale — Situation consolidée',
      generatedBy: 'USR-COORD-DEMO',
      generatedByName: 'Jean-Baptiste Mukendi (Démo)',
      projectCount: projects.length,
      reportCount: allValidatedReports.length,
      averageTep: octConsolidatedAvgTep,
      averageTef: octConsolidatedAvgTef,
      isDemoData: true,
      createdAt: '2026-11-01T10:30:00Z',
    },
  ];

  const syncLogs: SyncLog[] = [
    {
      id: 'SYNC-DEMO-001',
      userId: 'USR-AGENT-1',
      syncedCount: 3,
      failedCount: 0,
      conflictCount: 0,
      summary: 'Synchronisation de 3 fiches terrain (Haut-Katanga & Lualaba) confirmée serveur.',
      createdAt: '2026-11-14T16:12:00Z',
    },
    {
      id: 'SYNC-DEMO-002',
      userId: 'USR-AGENT-2',
      syncedCount: 2,
      failedCount: 0,
      conflictCount: 0,
      summary: 'Synchronisation de 2 fiches terrain (Haut-Lomami) confirmée serveur.',
      createdAt: '2026-11-15T12:05:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-DEMO-001',
      actorId: 'USR-COORD-DEMO',
      actorName: 'Jean-Baptiste Mukendi (Démo)',
      actorRole: 'COORDINATEUR',
      action: 'INITIALISATION_DEMO',
      entityType: 'SYSTEME',
      entityId: 'REGISTRE-DEMO-2026',
      details: `Chargement du jeu de données fictives de démonstration (${projects.length} ouvrages, 3 agents, ${reports.length} fiches).`,
      createdAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'AUD-DEMO-002',
      actorId: 'USR-COORD-DEMO',
      actorName: 'Jean-Baptiste Mukendi (Démo)',
      actorRole: 'COORDINATEUR',
      action: 'REAFFECTATION_OUVRAGE',
      entityType: 'AGENT_ASSIGNMENT',
      entityId: 'PRJ-DEMO-005',
      details: 'Réaffectation de DEMO-005 (CS Kilwa Lac Moero) de Patrice Kalumba vers Chantal Mwamba.',
      createdAt: '2026-07-31T16:30:00Z',
    },
    {
      id: 'AUD-DEMO-003',
      actorId: 'USR-COORD-DEMO',
      actorName: 'Jean-Baptiste Mukendi (Démo)',
      actorRole: 'COORDINATEUR',
      action: 'RETOUR_FICHE',
      entityType: 'FIELD_REPORT',
      entityId: rMokamboReturned.id,
      details: 'Fiche retournée à Patrice Kalumba pour complément de référence PV de constat (DEMO-004).',
      createdAt: '2026-11-10T16:20:00Z',
    },
    {
      id: 'AUD-DEMO-004',
      actorId: 'USR-COORD-DEMO',
      actorName: 'Jean-Baptiste Mukendi (Démo)',
      actorRole: 'COORDINATEUR',
      action: 'GENERATION_RAPPORT',
      entityType: 'GENERATED_REPORT',
      entityId: 'RPT-GEN-2026-002',
      details: 'Export PDF mensuel consolidé d’octobre 2026 (24 ouvrages — MODE DÉMONSTRATION).',
      createdAt: '2026-11-01T10:30:00Z',
    },
  ];

  return {
    users,
    projects,
    assignments,
    reports,
    generatedReports,
    syncLogs,
    auditLogs,
  };
}
