import type {
  AssignmentStatus,
  ConstraintCategory,
  ContractStatus,
  ExecutionStage,
  FieldReportStatus,
  InfrastructureType,
  ProvinceEntry,
  ReceptionStatus,
  ReportPeriodicity,
  SyncState,
  WorkStatus,
} from '../types/domain';

export const APP_TITLE = 'Assistant de Fiche Terrain';
export const INSTITUTION_REF = 'BCECO / PDL-145T';
export const DEMO_BANNER_TEXT =
  'MODE DÉMONSTRATION — Données fictives de test (non officielles BCECO / PDL-145T)';

export const INFRASTRUCTURE_TYPE_LABELS: Record<InfrastructureType, string> = {
  ECOLE_PRIMAIRE: '1) École primaire',
  CENTRE_DE_SANTE: '2) Centre de santé',
  BATIMENT_ADMINISTRATIF: '3) Bâtiment administratif',
};

export const INFRASTRUCTURE_TYPE_SHORT: Record<InfrastructureType, string> = {
  ECOLE_PRIMAIRE: 'EP',
  CENTRE_DE_SANTE: 'CS',
  BATIMENT_ADMINISTRATIF: 'BA',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  CONTRAT_ACTIF: 'Contrat actif',
  CONTRAT_RESILIE: 'Contrat résilié',
  REATTRIBUE_ALE_PME: 'Réattribué (ALE/PME)',
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  ACHEVE: '1) Achevé',
  EN_COURS: "2) En cours d'exécution",
  A_L_ARRET: "3) À l'arrêt",
  NON_DEMARRE: '4) Non démarré / Ajourné',
};

export const WORK_STATUS_CONCISE: Record<WorkStatus, string> = {
  ACHEVE: 'Achevé',
  EN_COURS: 'En cours',
  A_L_ARRET: "À l'arrêt",
  NON_DEMARRE: 'Non démarré',
};

export const PERIODICITY_LABELS: Record<ReportPeriodicity, string> = {
  JOURNALIER: 'Journalier',
  HEBDOMADAIRE: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
};

export const EXECUTION_STAGES: {
  id: ExecutionStage;
  label: string;
  shortCode: string;
  description: string;
}[] = [
  {
    id: 'IMPLANTATION_TERRASSEMENT',
    label: 'Implantation & Terrassement',
    shortCode: 'Imp',
    description: 'Piquetage, déblaiement et nivellement de la parcelle',
  },
  {
    id: 'FONDATION',
    label: 'Fondation',
    shortCode: 'F',
    description: 'Fouilles, béton de propreté, maçonnerie de soubassement et longrines',
  },
  {
    id: 'ELEVATION_MURS',
    label: 'Élévation des murs',
    shortCode: 'E',
    description: 'Maçonnerie en élévation, poteaux, linteaux et chaînage haut',
  },
  {
    id: 'CHARPENTE_TOITURE',
    label: 'Charpente & Toiture',
    shortCode: 'T',
    description: 'Pose des fermes, pannes, couverture en tôles et planches de rive',
  },
  {
    id: 'MENUISERIE_CREPISSAGE',
    label: 'Menuiserie & Crépissage',
    shortCode: 'M/C',
    description: 'Portes, fenêtres métalliques/bois, enduits intérieurs et extérieurs',
  },
  {
    id: 'FINITION',
    label: 'Finition',
    shortCode: 'Fin',
    description: 'Peinture, carrelage, plafonnage, électricité / solaire',
  },
  {
    id: 'PETITS_OUVRAGES_ASSAINISSEMENT',
    label: 'Petits œuvres & Assainissement',
    shortCode: 'PO',
    description: 'Latrines, forage/citerne, caniveaux, clôture et aménagement cour',
  },
  {
    id: 'EQUIPEMENT_MOBILIER',
    label: 'Équipement / Mobilier',
    shortCode: 'Éq',
    description: 'Bancs-pupitres, mobilier de bureau ou équipements médicaux',
  },
];

export const CONSTRAINT_CATEGORIES: {
  id: ConstraintCategory;
  number: string;
  label: string;
  examples: string;
}[] = [
  {
    id: 'TECHNIQUE',
    number: '1',
    label: 'Technique',
    examples: 'Malfaçons, plans, études, qualité des matériaux',
  },
  {
    id: 'LOGISTIQUE',
    number: '2',
    label: 'Logistique',
    examples: 'Enclavement, rupture de stock, transport, saison des pluies',
  },
  {
    id: 'FINANCIERE',
    number: '3',
    label: 'Financière',
    examples: "Retard paiement décomptes, trésorerie de l'entreprise",
  },
  {
    id: 'SOCIALE_ENVIRONNEMENTALE',
    number: '4',
    label: 'Sociale & Environnementale',
    examples: 'Conflit foncier, insécurité, HSE',
  },
];

export const RECEPTION_STATUS_LABELS: Record<ReceptionStatus, string> = {
  OK: 'OK',
  NON: 'Non',
  NA: 'N/A',
};

export const REPORT_STATUS_LABELS: Record<FieldReportStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE_SYNC: 'En attente de synchronisation',
  SOUMIS: 'Soumis',
  EN_COURS_VERIFICATION: 'En cours de vérification',
  VALIDE: 'Validé',
  RETOURNE: 'Retourné pour correction',
};

export const SYNC_STATUS_LABELS: Record<SyncState, string> = {
  LOCAL_BROUILLON: 'Enregistré localement (brouillon)',
  EN_ATTENTE_SYNC: 'En attente de synchronisation',
  SYNCHRONISE: 'Confirmé serveur',
  CONFLIT_AFFECTATION: 'Conflit d’affectation (à arbitrer)',
  ERREUR_SYNC: 'Échec de synchronisation (nouvel essai requis)',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  ACTIVE: 'Active',
  TERMINEE: 'Clôturée',
  REAFFECTEE: 'Réaffectée',
};

export const DRC_PROVINCES: ProvinceEntry[] = [
  {
    code: 'HK',
    name: 'Haut-Katanga',
    regionGroup: 'GRAND_KATANGA',
    territories: ['Kambove', 'Kasenga', 'Kipushi', 'Mitwaba', 'Pweto', 'Sakania'],
  },
  {
    code: 'HL',
    name: 'Haut-Lomami',
    regionGroup: 'GRAND_KATANGA',
    territories: ['Bukama', 'Kabongo', 'Kamina', 'Kaniama', 'Malemba-Nkulu'],
  },
  {
    code: 'LU',
    name: 'Lualaba',
    regionGroup: 'GRAND_KATANGA',
    territories: ['Dilolo', 'Kapanga', 'Lubudi', 'Mutshatsha', 'Sandoa'],
  },
  {
    code: 'TG',
    name: 'Tanganyika',
    regionGroup: 'EXTENSION_NATIONALE',
    territories: ['Kalemie', 'Kongolo', 'Manono', 'Moba', 'Nyunzu'],
  },
  {
    code: 'KC',
    name: 'Kasaï-Central',
    regionGroup: 'EXTENSION_NATIONALE',
    territories: ['Demba', 'Dibaya', 'Dimbelenge', 'Kazumba', 'Luiza'],
  },
  {
    code: 'KG',
    name: 'Kongo-Central',
    regionGroup: 'EXTENSION_NATIONALE',
    territories: ['Kasangulu', 'Madimba', 'Mbanza-Ngungu', 'Songololo'],
  },
];

export const MATRICE_UNIQUE_HEADERS: string[] = [
  'N°',
  'Entreprise',
  'Province',
  'Territoire',
  "Type d'ouvrage",
  "Nom de l'ouvrage",
  'Secteur / Chefferie / Commune',
  'Date de démarrage',
  'Échéance réception définitive',
  'Statut à ce jour',
  'Réalisation du mois, semaine ou jour',
  "Niveau d'exécution à ce jour",
  "Taux moyen d'exécution physique (TEP%)",
  "Taux moyen d'exécution financière (TEF%)",
  'Écart TEP-TEF observé',
  'Contraintes et alertes',
  'Impacts liés aux contraintes',
  'Réception Technique',
  'Réception Provisoire',
  'Réception définitive',
  'Observation',
];

/** Documents officiels BCECO / PDL-145T embarqués (Formulaire RSE + Modele Matrice Unique). */
export const OFFICIAL_DOCUMENTS = [
  {
    id: 'FORMULAIRE_COLLECTE',
    title: 'Formulaire de collecte terrain RSE / PDL-145T',
    description:
      'Fiche officielle en 5 sections + Annexe Feuille de Route multi-chantiers (Word).',
    href: '/assets/official/Formulaire_Collecte_Terrain_RSE_PDL145T_GK.docx',
    fileName: 'Formulaire_Collecte_Terrain_RSE_PDL145T_GK.docx',
    kind: 'DOCX' as const,
  },
  {
    id: 'MODELE_MATRICE',
    title: 'Modèle Matrice Unique des ouvrages',
    description:
      'Classeur Excel officiel à 21 colonnes (Identification contractuelle + Situation à ce jour).',
    href: '/assets/official/Modele_Matrice_Unique.xlsx',
    fileName: 'Modele_Matrice_Unique.xlsx',
    kind: 'XLSX' as const,
  },
] as const;

export const USER_ROLE_LABELS = {
  COORDINATEUR: 'Coordonnateur',
  AGENT_TERRAIN: 'Agent de terrain',
} as const;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  INITIALISATION_DEMO: 'Initialisation données Démo',
  INITIALISATION_DEMO_FIRESTORE: 'Initialisation données Démo Firestore',
  CONNEXION_DEMO: 'Connexion (Mode Démo)',
  IMPORT_AUDIT_MATRICE: 'Import Matrice Unique audité',
  CREATION_AGENT: 'Création compte agent',
  MISE_A_JOUR_AGENT: 'Mise à jour compte agent',
  AFFECTATION_OUVRAGES: 'Affectation d’ouvrages',
  REAFFECTATION_OUVRAGE: 'Réaffectation d’ouvrage',
  CLOTURE_AFFECTATION: 'Clôture d’affectation',
  SOUMISSION_FICHE: 'Soumission fiche terrain',
  RESOUMISSION_FICHE: 'Resoumission après correction',
  SYNCHRO_CONFLIT_AFFECTATION: 'Synchro avec conflit d’affectation',
  VERIFICATION_FICHE: 'Mise en vérification',
  VALIDATION_FICHE: 'Validation de fiche',
  RETOUR_FICHE: 'Retour pour correction',
  GENERATION_RAPPORT: 'Export rapport consolidé',
};

export const EXCEL_AUDIT_CATEGORY_LABELS = {
  IDENTIFIANT_MANQUANT: 'Identifiant manquant',
  DOUBLON_IDENTIFIANT: 'Doublon d’identifiant',
  FICHE_INCOMPLETE: 'Fiche incomplète',
  VALEUR_INCOHERENTE: 'Valeur incohérente',
} as const;

export const DEMO_ACCOUNTS_DISPLAY = [
  {
    label: 'Coordonnateur National (Démo)',
    role: 'COORDINATEUR' as const,
    email: 'coordinateur.demo@pd145t.test',
    passwordHint: 'Demo2026!',
    scope: 'Registre national (24 ouvrages), Affectations, Validation, Rapports Excel/CSV/PDF',
  },
  {
    label: 'Agent de Terrain 1 — P. Kalumba (Démo)',
    role: 'AGENT_TERRAIN' as const,
    email: 'agent1.demo@pd145t.test',
    passwordHint: 'Demo2026!',
    scope: 'Haut-Katanga & Lualaba — 8 chantiers affectés',
  },
  {
    label: 'Agent de Terrain 2 — C. Mwamba (Démo)',
    role: 'AGENT_TERRAIN' as const,
    email: 'agent2.demo@pd145t.test',
    passwordHint: 'Demo2026!',
    scope: 'Haut-Lomami & Haut-Katanga — 7 chantiers affectés',
  },
  {
    label: 'Agent de Terrain 3 — D. Kasongo (Démo)',
    role: 'AGENT_TERRAIN' as const,
    email: 'agent3.demo@pd145t.test',
    passwordHint: 'Demo2026!',
    scope: 'Tanganyika, Kasaï-Central & Kongo-Central — 5 chantiers affectés',
  },
];

