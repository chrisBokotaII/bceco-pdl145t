var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_url = require("node:url");
var import_express = __toESM(require("express"), 1);

// src/domain/businessRules.ts
var XLSX = __toESM(require("xlsx"), 1);

// src/domain/constants.ts
var INSTITUTION_REF = "BCECO / PDL-145T";
var DEMO_BANNER_TEXT = "MODE D\xC9MONSTRATION \u2014 Donn\xE9es fictives de test (non officielles BCECO / PDL-145T)";
var INFRASTRUCTURE_TYPE_LABELS = {
  ECOLE_PRIMAIRE: "1) \xC9cole primaire",
  CENTRE_DE_SANTE: "2) Centre de sant\xE9",
  BATIMENT_ADMINISTRATIF: "3) B\xE2timent administratif"
};
var INFRASTRUCTURE_TYPE_SHORT = {
  ECOLE_PRIMAIRE: "EP",
  CENTRE_DE_SANTE: "CS",
  BATIMENT_ADMINISTRATIF: "BA"
};
var CONTRACT_STATUS_LABELS = {
  CONTRAT_ACTIF: "Contrat actif",
  CONTRAT_RESILIE: "Contrat r\xE9sili\xE9",
  REATTRIBUE_ALE_PME: "R\xE9attribu\xE9 (ALE/PME)"
};
var WORK_STATUS_LABELS = {
  ACHEVE: "1) Achev\xE9",
  EN_COURS: "2) En cours d'ex\xE9cution",
  A_L_ARRET: "3) \xC0 l'arr\xEAt",
  NON_DEMARRE: "4) Non d\xE9marr\xE9 / Ajourn\xE9"
};
var WORK_STATUS_CONCISE = {
  ACHEVE: "Achev\xE9",
  EN_COURS: "En cours",
  A_L_ARRET: "\xC0 l'arr\xEAt",
  NON_DEMARRE: "Non d\xE9marr\xE9"
};
var PERIODICITY_LABELS = {
  JOURNALIER: "Journalier",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL: "Mensuel"
};
var EXECUTION_STAGES = [
  {
    id: "IMPLANTATION_TERRASSEMENT",
    label: "Implantation & Terrassement",
    shortCode: "Imp",
    description: "Piquetage, d\xE9blaiement et nivellement de la parcelle"
  },
  {
    id: "FONDATION",
    label: "Fondation",
    shortCode: "F",
    description: "Fouilles, b\xE9ton de propret\xE9, ma\xE7onnerie de soubassement et longrines"
  },
  {
    id: "ELEVATION_MURS",
    label: "\xC9l\xE9vation des murs",
    shortCode: "E",
    description: "Ma\xE7onnerie en \xE9l\xE9vation, poteaux, linteaux et cha\xEEnage haut"
  },
  {
    id: "CHARPENTE_TOITURE",
    label: "Charpente & Toiture",
    shortCode: "T",
    description: "Pose des fermes, pannes, couverture en t\xF4les et planches de rive"
  },
  {
    id: "MENUISERIE_CREPISSAGE",
    label: "Menuiserie & Cr\xE9pissage",
    shortCode: "M/C",
    description: "Portes, fen\xEAtres m\xE9talliques/bois, enduits int\xE9rieurs et ext\xE9rieurs"
  },
  {
    id: "FINITION",
    label: "Finition",
    shortCode: "Fin",
    description: "Peinture, carrelage, plafonnage, \xE9lectricit\xE9 / solaire"
  },
  {
    id: "PETITS_OUVRAGES_ASSAINISSEMENT",
    label: "Petits \u0153uvres & Assainissement",
    shortCode: "PO",
    description: "Latrines, forage/citerne, caniveaux, cl\xF4ture et am\xE9nagement cour"
  },
  {
    id: "EQUIPEMENT_MOBILIER",
    label: "\xC9quipement / Mobilier",
    shortCode: "\xC9q",
    description: "Bancs-pupitres, mobilier de bureau ou \xE9quipements m\xE9dicaux"
  }
];
var CONSTRAINT_CATEGORIES = [
  {
    id: "TECHNIQUE",
    number: "1",
    label: "Technique",
    examples: "Malfa\xE7ons, plans, \xE9tudes, qualit\xE9 des mat\xE9riaux"
  },
  {
    id: "LOGISTIQUE",
    number: "2",
    label: "Logistique",
    examples: "Enclavement, rupture de stock, transport, saison des pluies"
  },
  {
    id: "FINANCIERE",
    number: "3",
    label: "Financi\xE8re",
    examples: "Retard paiement d\xE9comptes, tr\xE9sorerie de l'entreprise"
  },
  {
    id: "SOCIALE_ENVIRONNEMENTALE",
    number: "4",
    label: "Sociale & Environnementale",
    examples: "Conflit foncier, ins\xE9curit\xE9, HSE"
  }
];
var REPORT_STATUS_LABELS = {
  BROUILLON: "Brouillon",
  EN_ATTENTE_SYNC: "En attente de synchronisation",
  SOUMIS: "Soumis",
  EN_COURS_VERIFICATION: "En cours de v\xE9rification",
  VALIDE: "Valid\xE9",
  RETOURNE: "Retourn\xE9 pour correction"
};
var MATRICE_UNIQUE_HEADERS = [
  "N\xB0",
  "Entreprise",
  "Province",
  "Territoire",
  "Type d'ouvrage",
  "Nom de l'ouvrage",
  "Secteur / Chefferie / Commune",
  "Date de d\xE9marrage",
  "\xC9ch\xE9ance r\xE9ception d\xE9finitive",
  "Statut \xE0 ce jour",
  "R\xE9alisation du mois, semaine ou jour",
  "Niveau d'ex\xE9cution \xE0 ce jour",
  "Taux moyen d'ex\xE9cution physique (TEP%)",
  "Taux moyen d'ex\xE9cution financi\xE8re (TEF%)",
  "\xC9cart TEP-TEF observ\xE9",
  "Contraintes et alertes",
  "Impacts li\xE9s aux contraintes",
  "R\xE9ception Technique",
  "R\xE9ception Provisoire",
  "R\xE9ception d\xE9finitive",
  "Observation"
];

// src/domain/formatters.ts
function formatDateFr(isoDate) {
  if (!isoDate) return "\u2014";
  const normalized = isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}
function formatDateTimeFr(isoDate) {
  if (!isoDate) return "\u2014";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}
function formatPercentFr(value, digits = 1) {
  if (value === null || value === void 0 || Number.isNaN(value)) return "\u2014";
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)} %`;
}
function formatSignedGapFr(gap) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Math.abs(gap));
  if (gap > 0) return `+${formatted} pts`;
  if (gap < 0) return `-${formatted} pts`;
  return `0,0 pt`;
}
function computePeriodKey(periodicity, collectionDate, weekNumber, month) {
  if (periodicity === "HEBDOMADAIRE") {
    return weekNumber.trim() ? `SEM-${weekNumber.trim().toUpperCase()}` : `SEM-${collectionDate.slice(0, 10)}`;
  }
  if (periodicity === "MENSUEL") {
    return month.trim() ? `MOIS-${month.trim()}` : `MOIS-${collectionDate.slice(0, 7)}`;
  }
  return `JOUR-${collectionDate.slice(0, 10)}`;
}
function formatExecutionStagesLabel(stages) {
  if (!stages || stages.length === 0) return "Aucune \xE9tape renseign\xE9e";
  return stages.map((s) => EXECUTION_STAGES.find((item) => item.id === s)?.label ?? s).join(", ");
}
function formatExecutionStagesShort(stages) {
  if (!stages || stages.length === 0) return "\u2014";
  return stages.map((s) => EXECUTION_STAGES.find((item) => item.id === s)?.shortCode ?? s).join(" \xB7 ");
}
function formatReceptionCell(rec) {
  if (rec.status === "NA") return "N/A";
  const datePart = rec.date ? ` (${formatDateFr(rec.date)})` : "";
  const pvPart = rec.pvReference ? ` \xB7 PV ${rec.pvReference}` : "";
  const resPart = rec.reserves ? ` \xB7 R\xE9serves: ${rec.reserves}` : "";
  return `${rec.status}${datePart}${pvPart}${resPart}`;
}
function generateUniqueId(prefix) {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}
function todayIsoDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}

// src/domain/businessRules.ts
var TEP_TEF_GAP_THRESHOLD = 10;
var MIN_GAP_JUSTIFICATION_LENGTH = 10;
function calculateTepTefGap(tep, tef) {
  return Math.round((tep - tef) * 10) / 10;
}
function requiresGapJustification(tep, tef) {
  return Math.abs(calculateTepTefGap(tep, tef)) > TEP_TEF_GAP_THRESHOLD;
}
function validateFieldReportForSubmission(report) {
  const errors = [];
  if (!report.identification.collectionDate) {
    errors.push({ section: 1, field: "collectionDate", message: "La date de collecte est obligatoire." });
  }
  if (report.identification.periodicity === "HEBDOMADAIRE" && !report.identification.weekNumber.trim()) {
    errors.push({ section: 1, field: "weekNumber", message: "Le num\xE9ro de semaine est requis pour un rapport hebdomadaire." });
  }
  if (report.identification.periodicity === "MENSUEL" && !report.identification.month.trim()) {
    errors.push({ section: 1, field: "month", message: "Le mois concern\xE9 est requis pour un rapport mensuel." });
  }
  if (!report.identification.locality.trim()) {
    errors.push({ section: 1, field: "locality", message: "La localit\xE9 / village doit \xEAtre pr\xE9cis\xE9e." });
  }
  if (report.identification.gpsLat.trim()) {
    const lat = Number(report.identification.gpsLat);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({ section: 1, field: "gpsLat", message: "Latitude GPS invalide (doit \xEAtre comprise entre -90 et 90)." });
    }
  }
  if (report.identification.gpsLng.trim()) {
    const lng = Number(report.identification.gpsLng);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({ section: 1, field: "gpsLng", message: "Longitude GPS invalide (doit \xEAtre comprise entre -180 et 180)." });
    }
  }
  const p = report.progress;
  if (p.workStatus === "A_L_ARRET" && !p.stoppageDate.trim()) {
    errors.push({ section: 2, field: "stoppageDate", message: "La date d'arr\xEAt des travaux est obligatoire lorsque l'ouvrage est \xE0 l'arr\xEAt." });
  }
  if (!p.periodWorksExecuted.trim()) {
    errors.push({ section: 2, field: "periodWorksExecuted", message: "Veuillez d\xE9crire les travaux ex\xE9cut\xE9s durant la p\xE9riode (ou indiquer \xAB N\xE9ant \xBB)." });
  }
  for (const [key, label, val] of [
    ["previousTep", "TEP pr\xE9c\xE9dent", p.previousTep],
    ["currentTep", "TEP actuel", p.currentTep],
    ["previousTef", "TEF pr\xE9c\xE9dent", p.previousTef],
    ["currentTef", "TEF actuel", p.currentTef]
  ]) {
    if (typeof val !== "number" || Number.isNaN(val) || val < 0 || val > 100) {
      errors.push({ section: 2, field: key, message: `${label} doit \xEAtre compris entre 0 % et 100 %.` });
    }
  }
  if (typeof p.skilledWorkersCount !== "number" || Number.isNaN(p.skilledWorkersCount) || p.skilledWorkersCount < 0 || typeof p.laborersCount !== "number" || Number.isNaN(p.laborersCount) || p.laborersCount < 0) {
    errors.push({ section: 2, field: "workers", message: "Les effectifs mobilis\xE9s doivent \xEAtre des nombres positifs ou nuls." });
  }
  if (requiresGapJustification(p.currentTep, p.currentTef) && p.gapJustification.trim().length < MIN_GAP_JUSTIFICATION_LENGTH) {
    errors.push({
      section: 2,
      field: "gapJustification",
      message: "L'\xE9cart absolu TEP \u2212 TEF d\xE9passe 10 points de pourcentage : une justification d\xE9taill\xE9e (min. 10 caract\xE8res) est obligatoire."
    });
  }
  const c = report.constraints;
  if (c.categories.length > 0 && c.detailedDescriptions.filter((d) => d.trim().length > 0).length === 0) {
    errors.push({
      section: 3,
      field: "detailedDescriptions",
      message: "Veuillez d\xE9crire au moins une contrainte correspondant aux typologies coch\xE9es."
    });
  }
  if (c.isCritical && !c.urgentActionsRequired.trim()) {
    errors.push({
      section: 3,
      field: "urgentActionsRequired",
      message: "Pour une alerte critique, les actions urgentes requises doivent \xEAtre renseign\xE9es."
    });
  }
  const r = report.receptions;
  if (r.rt.status === "OK" && !r.rt.date) {
    errors.push({ section: 4, field: "rtDate", message: "Date de R\xE9ception Technique requise lorsque le statut est OK." });
  }
  if (r.rp.status === "OK" && !r.rp.date) {
    errors.push({ section: 4, field: "rpDate", message: "Date de R\xE9ception Provisoire requise lorsque le statut est OK." });
  }
  if (r.rd.status === "OK" && !r.rd.date) {
    errors.push({ section: 4, field: "rdDate", message: "Date de R\xE9ception D\xE9finitive requise lorsque le statut est OK." });
  }
  if (r.rp.status === "OK" && r.rt.status !== "OK") {
    errors.push({
      section: 4,
      field: "rpStatus",
      message: "La R\xE9ception Provisoire (RP) ne peut pas \xEAtre d\xE9clar\xE9e OK avant la R\xE9ception Technique (RT)."
    });
  }
  if (r.rd.status === "OK" && (r.rt.status !== "OK" || r.rp.status !== "OK")) {
    errors.push({
      section: 4,
      field: "rdStatus",
      message: "La R\xE9ception D\xE9finitive (RD) exige que les R\xE9ceptions Technique (RT) et Provisoire (RP) soient pr\xE9alablement OK."
    });
  }
  if (r.rt.status === "OK" && r.rp.status === "OK" && r.rt.date && r.rp.date && r.rp.date < r.rt.date) {
    errors.push({
      section: 4,
      field: "rpDate",
      message: "La date de R\xE9ception Provisoire (RP) ne peut pas \xEAtre ant\xE9rieure \xE0 la date de R\xE9ception Technique (RT)."
    });
  }
  if (r.rp.status === "OK" && r.rd.status === "OK" && r.rp.date && r.rd.date && r.rd.date < r.rp.date) {
    errors.push({
      section: 4,
      field: "rdDate",
      message: "La date de R\xE9ception D\xE9finitive (RD) ne peut pas \xEAtre ant\xE9rieure \xE0 la date de R\xE9ception Provisoire (RP)."
    });
  }
  const s = report.signature;
  if (!s.agentFullName.trim()) {
    errors.push({ section: 5, field: "agentFullName", message: "Le nom de l'agent enqu\xEAteur est obligatoire." });
  }
  if (!s.agentFunction.trim()) {
    errors.push({ section: 5, field: "agentFunction", message: "La fonction de l'agent enqu\xEAteur est obligatoire." });
  }
  if (!s.agentPhone.trim()) {
    errors.push({ section: 5, field: "agentPhone", message: "Le num\xE9ro de t\xE9l\xE9phone de l'agent est obligatoire." });
  }
  if (!s.signatureDataUrl.trim()) {
    errors.push({ section: 5, field: "signatureDataUrl", message: "La signature (manuscrite ou certifi\xE9e) est requise avant soumission." });
  }
  return errors;
}
function detectPotentialDuplicates(candidate, existingReports) {
  const candidateKey = computePeriodKey(
    candidate.periodicity,
    candidate.identification.collectionDate,
    candidate.identification.weekNumber,
    candidate.identification.month
  );
  return existingReports.filter(
    (r) => r.id !== candidate.id && r.projectId === candidate.projectId && r.agentId === candidate.agentId && r.periodicity === candidate.periodicity && r.periodKey === candidateKey && r.status !== "BROUILLON"
  ).map((r) => r.id);
}

// src/data/demoSeed.ts
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function demoPhotoDataUrl(opts) {
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
var DEMO_PHOTO_SCENES = [
  {
    key: "vue",
    fileName: "vue-generale-chantier.svg",
    caption: "Vue g\xE9n\xE9rale du chantier",
    sky: "#87b7d9",
    ground: "#8a7a55",
    accent: "#8b3a2a"
  },
  {
    key: "structure",
    fileName: "structure-toiture.svg",
    caption: "Avancement structure / toiture",
    sky: "#9bc4e0",
    ground: "#7d6b4a",
    accent: "#b45309"
  },
  {
    key: "finitions",
    fileName: "finitions-interieures.svg",
    caption: "Finitions et am\xE9nagements",
    sky: "#a8c5d4",
    ground: "#6f6248",
    accent: "#0f766e"
  },
  {
    key: "reception",
    fileName: "preparation-reception.svg",
    caption: "Pr\xE9paration r\xE9ception technique",
    sky: "#7eb0cf",
    ground: "#756648",
    accent: "#1d4ed8"
  }
];
function buildDemoPhotos(opts) {
  const seed = opts.reportId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const count = 2 + seed % 2;
  const start = seed % DEMO_PHOTO_SCENES.length;
  const capturedAt = `${opts.collectionDate}T11:${String(10 + seed % 40).padStart(2, "0")}:00Z`;
  const typeLabel = opts.infrastructureType.replace(/_/g, " ");
  return Array.from({ length: count }, (_, i) => {
    const scene = DEMO_PHOTO_SCENES[(start + i) % DEMO_PHOTO_SCENES.length];
    const id = `PH-DEMO-${opts.reportId}-${scene.key}`;
    const dataUrl = demoPhotoDataUrl({
      title: scene.caption,
      subtitle: `${opts.projectName} \xB7 ${typeLabel}`,
      sky: scene.sky,
      ground: scene.ground,
      accent: scene.accent
    });
    return {
      id,
      fileName: scene.fileName,
      mimeType: "image/svg+xml",
      sizeBytes: Math.round(dataUrl.length * 0.75),
      caption: scene.caption,
      capturedAt,
      dataUrl,
      syncState: "UPLOADED"
    };
  });
}
function createDemoDataset() {
  const users = [
    {
      id: "USR-COORD-DEMO",
      email: "coordinateur.demo@pd145t.test",
      fullName: "Jean-Baptiste Mukendi (D\xE9mo)",
      role: "COORDINATEUR",
      phone: "+243 81 000 1000",
      functionTitle: "Coordonnateur National Suivi-\xC9valuation (D\xE9mo)",
      provinceScope: "National \u2014 Toutes provinces",
      isActive: true,
      isDemoData: true,
      createdAt: "2026-01-05T08:00:00Z",
      updatedAt: "2026-10-01T09:00:00Z"
    },
    {
      id: "USR-AGENT-1",
      email: "agent1.demo@pd145t.test",
      fullName: "Patrice Kalumba (D\xE9mo)",
      role: "AGENT_TERRAIN",
      phone: "+243 82 000 1001",
      functionTitle: "Superviseur Terrain S&E \u2014 Zone Sud (D\xE9mo)",
      provinceScope: "Haut-Katanga & Lualaba",
      isActive: true,
      isDemoData: true,
      createdAt: "2026-01-10T08:30:00Z",
      updatedAt: "2026-10-01T09:00:00Z"
    },
    {
      id: "USR-AGENT-2",
      email: "agent2.demo@pd145t.test",
      fullName: "Chantal Mwamba (D\xE9mo)",
      role: "AGENT_TERRAIN",
      phone: "+243 82 000 1002",
      functionTitle: "Enqu\xEAtrice Technique Terrain (D\xE9mo)",
      provinceScope: "Haut-Lomami & Haut-Katanga",
      isActive: true,
      isDemoData: true,
      createdAt: "2026-01-12T08:30:00Z",
      updatedAt: "2026-10-01T09:00:00Z"
    },
    {
      id: "USR-AGENT-3",
      email: "agent3.demo@pd145t.test",
      fullName: "Didier Kasongo (D\xE9mo)",
      role: "AGENT_TERRAIN",
      phone: "+243 82 000 1003",
      functionTitle: "Agent Enqu\xEAteur S&E \u2014 Extension Nationale (D\xE9mo)",
      provinceScope: "Tanganyika, Kasa\xEF-Central & Kongo-Central",
      isActive: true,
      isDemoData: true,
      createdAt: "2026-02-01T09:00:00Z",
      updatedAt: "2026-10-01T09:00:00Z"
    }
  ];
  const specs = [
    // --- HAUT-KATANGA (8 ouvrages) ---
    {
      num: 1,
      contractor: "Katanga B\xE2tir Horizon SARL (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Kambove",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Lufira Centre (6 salles + direction)",
      sector: "Secteur Lufira",
      locality: "Village Lufira-Nord",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-03-10",
      deadline: "2026-11-30",
      lat: -10.8742,
      lng: 26.5974,
      baselineStatus: "EN_COURS",
      baselineTep: 92,
      baselineTef: 88,
      status: "ACHEVE",
      tep: 100,
      tef: 96,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "Livraison compl\xE8te des 120 bancs-pupitres, peinture ext\xE9rieure finale et pose de la plaque PDL-145T.",
      constraints: [],
      constraintsSummary: "Aucune contrainte bloquante",
      impactsSummary: "Aucun retard majeur",
      critical: false,
      rt: "OK",
      rtDate: "2026-09-12",
      rtRes: "N\xE9ant",
      rtPv: "PV-RT-DEMO-001",
      rp: "OK",
      rpDate: "2026-10-04",
      rpRes: "Retouche peinture salle 4 lev\xE9e",
      rpPv: "PV-RP-DEMO-001",
      rd: "NON",
      rdDate: "2026-11-30",
      rdRes: "P\xE9riode de garantie en cours",
      rdPv: "",
      observation: "Ouvrage achev\xE9, gardiennage assur\xE9 par le comit\xE9 de parents, rentr\xE9e scolaire effective (380 \xE9l\xE8ves).",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 2,
      contractor: "Katanga B\xE2tir Horizon SARL (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Kipushi",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Mimbulu (Maternit\xE9 + Dispensaire)",
      sector: "Secteur Bukanda",
      locality: "Localit\xE9 Mimbulu",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-05-04",
      deadline: "2026-12-20",
      lat: -11.7615,
      lng: 27.2481,
      baselineStatus: "EN_COURS",
      baselineTep: 68,
      baselineTef: 52,
      status: "EN_COURS",
      tep: 78,
      tef: 58,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION"],
      realization: "Pose du carrelage en salle d\u2019accouchement et installation du syst\xE8me photovolta\xEFque 3 kVA.",
      constraints: ["FINANCIERE"],
      constraintsSummary: "3) Financi\xE8re : Retard de r\xE8glement du d\xE9compte n\xB04 (pr\xE9financement PME, \xE9cart TEP > TEF sup\xE9rieur \xE0 10 pts).",
      impactsSummary: "Tension de tr\xE9sorerie PME, risque de ralentissement sur les petits ouvrages.",
      critical: true,
      rt: "NON",
      rtDate: "2026-11-25",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "2026-12-20",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Travaux de bonne qualit\xE9 technique ; acc\xE9l\xE9ration du paiement d\xE9compte n\xB04 recommand\xE9e au BCECO.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 3,
      contractor: "BTP Lubumbashi Sud SARL (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Kasenga",
      type: "BATIMENT_ADMINISTRATIF",
      name: "B\xE2timent Administratif D\xE9mo Territoire de Kasenga",
      sector: "Chefferie Kisamamba",
      locality: "Cit\xE9 de Kasenga",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-04-18",
      deadline: "2027-01-31",
      lat: -10.3658,
      lng: 28.6132,
      baselineStatus: "EN_COURS",
      baselineTep: 54,
      baselineTef: 50,
      status: "EN_COURS",
      tep: 64,
      tef: 60,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE"],
      realization: "Ach\xE8vement de la pose des t\xF4les BG28 et d\xE9marrage du cr\xE9pissage int\xE9rieur des bureaux.",
      constraints: ["LOGISTIQUE"],
      constraintsSummary: "2) Logistique : D\xE9gradation de la route d\u2019acc\xE8s sur 18 km apr\xE8s les premi\xE8res pluies.",
      impactsSummary: "Allongement de 10 jours sur l\u2019acheminement du ciment et de la menuiserie m\xE9tallique.",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Pr\xE9sence effective du chef de chantier et de 26 ouvriers ; stock de ciment reconstitu\xE9.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 4,
      contractor: "Entreprise Sakania G\xE9nie Civil (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Sakania",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Mokambo Fronti\xE8re",
      sector: "Secteur Balamba",
      locality: "Mokambo",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-06-01",
      deadline: "2026-12-15",
      lat: -12.4211,
      lng: 28.3489,
      baselineStatus: "EN_COURS",
      baselineTep: 42,
      baselineTef: 60,
      status: "A_L_ARRET",
      tep: 44,
      tef: 62,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS"],
      realization: "Aucun travail physique significatif depuis le 14/09/2026 suite \xE0 l\u2019arr\xEAt du chantier.",
      constraints: ["TECHNIQUE", "FINANCIERE"],
      constraintsSummary: "1) Technique : Non-conformit\xE9 des linteaux b\xE9ton ; 3) Financi\xE8re : D\xE9s\xE9quilibre TEF > TEP (-18 pts).",
      impactsSummary: "Arr\xEAt total des travaux ordonn\xE9 par la mission de contr\xF4le jusqu\u2019\xE0 reprise des malfa\xE7ons.",
      critical: true,
      rt: "NON",
      rtDate: "",
      rtRes: "Reprise structurelle exig\xE9e",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Mise en demeure adress\xE9e \xE0 l\u2019entreprise ; \xE9cart financier d\xE9favorable de -18 pts \xE0 justifier d\u2019urgence.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 5,
      contractor: "BTP Lubumbashi Sud SARL (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Pweto",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Kilwa Lac Moero",
      sector: "Chefferie Pweto",
      locality: "Kilwa",
      contractStatus: "REATTRIBUE_ALE_PME",
      startDate: "2025-09-12",
      deadline: "2027-03-30",
      lat: -9.3025,
      lng: 28.4148,
      baselineStatus: "EN_COURS",
      baselineTep: 30,
      baselineTef: 28,
      status: "EN_COURS",
      tep: 46,
      tef: 40,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE"],
      realization: "Reprise dynamique apr\xE8s r\xE9attribution PME : \xE9l\xE9vation achev\xE9e et montage de la charpente bois trait\xE9.",
      constraints: ["LOGISTIQUE"],
      constraintsSummary: "2) Logistique : Enclavement saisonnier sur l\u2019axe Pweto\u2013Kilwa.",
      impactsSummary: "Surco\xFBt de transport des t\xF4les et menuiseries (+8 %).",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Bonne dynamique depuis la r\xE9attribution ; suivi rapproch\xE9 maintenu.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 6,
      contractor: "Constructeurs Mitwaba D\xE9mo SARL",
      province: "Haut-Katanga",
      territory: "Mitwaba",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Kiubo Plateau",
      sector: "Chefferie Kyona Nzini",
      locality: "Kiubo",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2026-01-20",
      deadline: "2027-05-20",
      lat: -8.6412,
      lng: 27.3218,
      baselineStatus: "NON_DEMARRE",
      baselineTep: 0,
      baselineTef: 15,
      status: "NON_DEMARRE",
      tep: 5,
      tef: 20,
      stages: ["IMPLANTATION_TERRASSEMENT"],
      realization: "Piquetage initial effectu\xE9 mais installation de chantier bloqu\xE9e par un diff\xE9rend parcellaire.",
      constraints: ["SOCIALE_ENVIRONNEMENTALE", "FINANCIERE"],
      constraintsSummary: "4) Sociale & Environnementale : Litige foncier sur la limite Nord ; avance de d\xE9marrage vers\xE9e (20 %).",
      impactsSummary: "Report du d\xE9marrage effectif des fouilles de 45 jours ; \xE9cart TEP-TEF de -15 pts.",
      critical: true,
      rt: "NA",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NA",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "M\xE9diation ouverte avec l\u2019Administrateur de Territoire et le chef coutumier local.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 7,
      contractor: "Katanga B\xE2tir Horizon SARL (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Kambove",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Likasi P\xE9riph\xE9rie (Panda-Rural)",
      sector: "Secteur Sources du Fleuve Congo",
      locality: "Panda-Rural",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-02-15",
      deadline: "2026-10-30",
      lat: -10.9854,
      lng: 26.7421,
      baselineStatus: "ACHEVE",
      baselineTep: 100,
      baselineTef: 100,
      status: "ACHEVE",
      tep: 100,
      tef: 100,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "Ouvrage op\xE9rationnel et r\xE9ceptionn\xE9 d\xE9finitivement sans r\xE9serve.",
      constraints: [],
      constraintsSummary: "Aucune",
      impactsSummary: "Aucun",
      critical: false,
      rt: "OK",
      rtDate: "2026-06-10",
      rtRes: "N\xE9ant",
      rtPv: "PV-RT-DEMO-007",
      rp: "OK",
      rpDate: "2026-07-02",
      rpRes: "N\xE9ant",
      rpPv: "PV-RP-DEMO-007",
      rd: "OK",
      rdDate: "2026-10-18",
      rdRes: "Aucune r\xE9serve",
      rdPv: "PV-RD-DEMO-007",
      observation: "Centre de sant\xE9 fr\xE9quent\xE9 (moyenne de 42 consultations/jour), forage fonctionnel.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 8,
      contractor: "Entreprise Sakania G\xE9nie Civil (D\xE9mo)",
      province: "Haut-Katanga",
      territory: "Kipushi",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Kaponda Agronomie",
      sector: "Chefferie Kaponda",
      locality: "Kaponda",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-07-10",
      deadline: "2027-01-15",
      lat: -11.6122,
      lng: 27.3921,
      baselineStatus: "EN_COURS",
      baselineTep: 75,
      baselineTef: 72,
      status: "EN_COURS",
      tep: 88,
      tef: 82,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT"],
      realization: "Peinture int\xE9rieure achev\xE9e, construction des 6 cabines de latrines termin\xE9e \xE0 90 %.",
      constraints: [],
      constraintsSummary: "Aucune contrainte critique",
      impactsSummary: "Respect du calendrier r\xE9vis\xE9",
      critical: false,
      rt: "NON",
      rtDate: "2026-11-28",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Pr\xE9paration de la visite de pr\xE9-r\xE9ception technique pr\xE9vue fin novembre.",
      agents: ["USR-AGENT-2"]
    },
    // --- HAUT-LOMAMI (6 ouvrages) ---
    {
      num: 9,
      contractor: "Lomami Infrastructures PME (D\xE9mo)",
      province: "Haut-Lomami",
      territory: "Kamina",
      type: "BATIMENT_ADMINISTRATIF",
      name: "B\xE2timent Administratif D\xE9mo Territoire de Kamina",
      sector: "Chefferie Kasongo Nyembo",
      locality: "Kamina-Centre",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-03-01",
      deadline: "2026-12-01",
      lat: -8.7386,
      lng: 24.9912,
      baselineStatus: "EN_COURS",
      baselineTep: 86,
      baselineTef: 84,
      status: "ACHEVE",
      tep: 100,
      tef: 95,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "Pose compl\xE8te des mobiliers de bureau, cl\xF4ture p\xE9rim\xE9trique et raccordement solaire.",
      constraints: [],
      constraintsSummary: "R\xE9serves mineures sur 2 serrures de porte en cours de lev\xE9e",
      impactsSummary: "Aucun impact sur la mise en service",
      critical: false,
      rt: "OK",
      rtDate: "2026-09-22",
      rtRes: "2 serrures \xE0 ajuster",
      rtPv: "PV-RT-DEMO-009",
      rp: "OK",
      rpDate: "2026-10-12",
      rpRes: "R\xE9serve mineure serrurerie",
      rpPv: "PV-RP-DEMO-009",
      rd: "NON",
      rdDate: "2027-04-12",
      rdRes: "",
      rdPv: "",
      observation: "B\xE2timent remis \xE0 l\u2019administration territoriale ; gardiennage permanent en place.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 10,
      contractor: "Lomami Infrastructures PME (D\xE9mo)",
      province: "Haut-Lomami",
      territory: "Bukama",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Luena Fleuve",
      sector: "Chefferie Kibanda",
      locality: "Luena",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-06-15",
      deadline: "2027-02-28",
      lat: -9.4501,
      lng: 25.7834,
      baselineStatus: "EN_COURS",
      baselineTep: 58,
      baselineTef: 44,
      status: "EN_COURS",
      tep: 71,
      tef: 54,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE"],
      realization: "Cr\xE9pissage ext\xE9rieur des deux blocs de 3 classes et installation des cadres m\xE9talliques.",
      constraints: ["FINANCIERE", "LOGISTIQUE"],
      constraintsSummary: "3) Financi\xE8re : D\xE9compte n\xB03 en circuit de validation (+17 pts TEP-TEF) ; 2) Logistique : Transport fluvial lent.",
      impactsSummary: "Pression sur la paie de la main-d\u2019\u0153uvre locale.",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Qualit\xE9 de ma\xE7onnerie conforme aux plans BCECO.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 11,
      contractor: "G\xE9nie Rural Kabongo ALE (D\xE9mo)",
      province: "Haut-Lomami",
      territory: "Kabongo",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Kabongo Nord",
      sector: "Chefferie Kabongo",
      locality: "Kabongo-Cit\xE9",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-05-22",
      deadline: "2026-12-30",
      lat: -7.3191,
      lng: 25.5812,
      baselineStatus: "EN_COURS",
      baselineTep: 48,
      baselineTef: 48,
      status: "A_L_ARRET",
      tep: 48,
      tef: 48,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS"],
      realization: "Chantier interrompu depuis le 03/10/2026 pour rupture totale d\u2019approvisionnement en t\xF4les et ciment.",
      constraints: ["LOGISTIQUE"],
      constraintsSummary: "2) Logistique : Pont routier endommag\xE9 sur la RN1 bloquant les camions lourds.",
      impactsSummary: "Arr\xEAt complet du chantier estim\xE9 \xE0 30 jours.",
      critical: true,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Solution de transbordement par piste secondaire \xE0 l\u2019\xE9tude avec les autorit\xE9s locales.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 12,
      contractor: "G\xE9nie Rural Kabongo ALE (D\xE9mo)",
      province: "Haut-Lomami",
      territory: "Kaniama",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Kaniama Gare",
      sector: "Chefferie Mutombo Mukulu",
      locality: "Kaniama",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-03-18",
      deadline: "2026-11-15",
      lat: -7.5681,
      lng: 24.1842,
      baselineStatus: "EN_COURS",
      baselineTep: 90,
      baselineTef: 85,
      status: "ACHEVE",
      tep: 100,
      tef: 92,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "R\xE9ception technique effectu\xE9e, am\xE9nagement de la cour et installation citerne d\u2019eau pluviale.",
      constraints: ["TECHNIQUE"],
      constraintsSummary: "1) Technique : Fissure capillaire sur la rampe PMR signal\xE9e en r\xE9serve RT.",
      impactsSummary: "Reprise locale de 48h requise avant r\xE9ception provisoire.",
      critical: false,
      rt: "OK",
      rtDate: "2026-10-20",
      rtRes: "Reprise rampe PMR exig\xE9e",
      rtPv: "PV-RT-DEMO-012",
      rp: "NON",
      rpDate: "2026-11-28",
      rpRes: "En attente lev\xE9e r\xE9serve RT",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "\xC9cole s\xE9curis\xE9e par gardiennage ; bonne adh\xE9sion communautaire.",
      agents: ["USR-AGENT-2"]
    },
    {
      num: 13,
      contractor: "Lomami Infrastructures PME (D\xE9mo)",
      province: "Haut-Lomami",
      territory: "Malemba-Nkulu",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Mulongo Lac",
      sector: "Chefferie Mulongo",
      locality: "Mulongo",
      contractStatus: "CONTRAT_RESILIE",
      startDate: "2025-04-05",
      deadline: "2026-10-15",
      lat: -7.8321,
      lng: 26.9612,
      baselineStatus: "A_L_ARRET",
      baselineTep: 22,
      baselineTef: 38,
      status: "A_L_ARRET",
      tep: 22,
      tef: 38,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION"],
      realization: "Chantier arr\xEAt\xE9 suite \xE0 r\xE9siliation pour d\xE9faillance contractuelle ; dossier de r\xE9attribution en cours.",
      constraints: ["FINANCIERE", "TECHNIQUE"],
      constraintsSummary: "3) Financi\xE8re : \xC9cart d\xE9favorable -16 pts suite \xE0 abandon ; 1) Technique : Conservation des fondations \xE0 contr\xF4ler.",
      impactsSummary: "Retard sup\xE9rieur \xE0 6 mois ; r\xE9attribution PME/ALE urgente.",
      critical: true,
      rt: "NON",
      rtDate: "",
      rtRes: "Constat d\u2019huissier \xE9tabli",
      rtPv: "",
      rp: "NA",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Site gardienn\xE9 par la chefferie locale en attendant le repreneur.",
      agents: []
    },
    {
      num: 14,
      contractor: "Constructeurs Mitwaba D\xE9mo SARL",
      province: "Haut-Lomami",
      territory: "Kamina",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Kinda Savane",
      sector: "Secteur Kinda",
      locality: "Kinda",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-08-01",
      deadline: "2027-02-01",
      lat: -8.9102,
      lng: 24.7124,
      baselineStatus: "EN_COURS",
      baselineTep: 40,
      baselineTef: 38,
      status: "EN_COURS",
      tep: 56,
      tef: 52,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE"],
      realization: "Pose de la charpente m\xE9tallique sur le b\xE2timent principal et fouilles du bloc latrines.",
      constraints: [],
      constraintsSummary: "Aucune contrainte majeure",
      impactsSummary: "Avancement conforme",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "\xC9quipe compl\xE8te sur site, contr\xF4le journalier assur\xE9.",
      agents: []
    },
    // --- LUALABA (5 ouvrages) ---
    {
      num: 15,
      contractor: "Constructions Lualaba Plus (D\xE9mo)",
      province: "Lualaba",
      territory: "Dilolo",
      type: "BATIMENT_ADMINISTRATIF",
      name: "B\xE2timent Administratif D\xE9mo Territoire de Dilolo",
      sector: "Chefferie Muyeye",
      locality: "Dilolo-Poste",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-04-12",
      deadline: "2026-12-31",
      lat: -10.6845,
      lng: 22.3461,
      baselineStatus: "EN_COURS",
      baselineTep: 72,
      baselineTef: 68,
      status: "EN_COURS",
      tep: 84,
      tef: 76,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION"],
      realization: "Plafonnage en plaques PVC, pose des portes vitr\xE9es et c\xE2blage \xE9lectrique solaire.",
      constraints: ["LOGISTIQUE"],
      constraintsSummary: "2) Logistique : Distance d\u2019approvisionnement depuis Kolwezi (420 km).",
      impactsSummary: "D\xE9calage mod\xE9r\xE9 de 12 jours sur la livraison du mobilier.",
      critical: false,
      rt: "NON",
      rtDate: "2026-12-05",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Excellente finition int\xE9rieure observ\xE9e lors de la visite.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 16,
      contractor: "Constructions Lualaba Plus (D\xE9mo)",
      province: "Lualaba",
      territory: "Lubudi",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Fungurume Rural",
      sector: "Chefferie Bayeke",
      locality: "Kapolowe-Ouest",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-02-20",
      deadline: "2026-10-30",
      lat: -10.6167,
      lng: 26.3104,
      baselineStatus: "ACHEVE",
      baselineTep: 100,
      baselineTef: 98,
      status: "ACHEVE",
      tep: 100,
      tef: 100,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "R\xE9ception d\xE9finitive prononc\xE9e, \xE9cole pleinement op\xE9rationnelle.",
      constraints: [],
      constraintsSummary: "Aucune",
      impactsSummary: "Aucun",
      critical: false,
      rt: "OK",
      rtDate: "2026-06-25",
      rtRes: "N\xE9ant",
      rtPv: "PV-RT-DEMO-016",
      rp: "OK",
      rpDate: "2026-07-18",
      rpRes: "N\xE9ant",
      rpPv: "PV-RP-DEMO-016",
      rd: "OK",
      rdDate: "2026-10-28",
      rdRes: "N\xE9ant",
      rdPv: "PV-RD-DEMO-016",
      observation: "Taux de fr\xE9quentation \xE9lev\xE9 (415 \xE9l\xE8ves inscrits) ; propret\xE9 satisfaisante.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 17,
      contractor: "Kolwezi Travaux Modernes SARL (D\xE9mo)",
      province: "Lualaba",
      territory: "Mutshatsha",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Lualaba-Gare",
      sector: "Secteur Lufupa",
      locality: "Mutshatsha",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-07-05",
      deadline: "2027-01-20",
      lat: -10.6378,
      lng: 24.4581,
      baselineStatus: "EN_COURS",
      baselineTep: 50,
      baselineTef: 35,
      status: "EN_COURS",
      tep: 67,
      tef: 45,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE"],
      realization: "Enduit ext\xE9rieur achev\xE9 et pose des fen\xEAtres m\xE9talliques anti-moustiques.",
      constraints: ["FINANCIERE"],
      constraintsSummary: "3) Financi\xE8re : Pr\xE9financement entreprise important (\xE9cart TEP > TEF sup\xE9rieur \xE0 10 pts).",
      impactsSummary: "Risque d\u2019arr\xEAt si l\u2019attachement n\xB03 n\u2019est pas liquid\xE9 sous 15 jours.",
      critical: true,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Entreprise volontaire ayant pr\xE9financ\xE9 la toiture ; dossier transmis pour paiement prioritaire.",
      agents: ["USR-AGENT-1"]
    },
    {
      num: 18,
      contractor: "Kolwezi Travaux Modernes SARL (D\xE9mo)",
      province: "Lualaba",
      territory: "Kapanga",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Musumba Historique",
      sector: "Chefferie Mwant Yav",
      locality: "Musumba",
      contractStatus: "REATTRIBUE_ALE_PME",
      startDate: "2026-01-10",
      deadline: "2027-06-30",
      lat: -8.3514,
      lng: 22.5792,
      baselineStatus: "EN_COURS",
      baselineTep: 18,
      baselineTef: 20,
      status: "EN_COURS",
      tep: 34,
      tef: 30,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS"],
      realization: "Ach\xE8vement de la dalle de fondation et \xE9l\xE9vation des murs \xE0 hauteur d\u2019all\xE8ge.",
      constraints: ["LOGISTIQUE"],
      constraintsSummary: "2) Logistique : Piste sableuse difficile pendant la saison des pluies.",
      impactsSummary: "Cadence d\u2019approvisionnement r\xE9duite en gravier concass\xE9.",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Fabrication locale des briques cuites contr\xF4l\xE9e conforme.",
      agents: []
    },
    {
      num: 19,
      contractor: "Constructions Lualaba Plus (D\xE9mo)",
      province: "Lualaba",
      territory: "Sandoa",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Sandoa Centre",
      sector: "Chefferie Samuteb",
      locality: "Sandoa",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2026-03-01",
      deadline: "2027-07-31",
      lat: -9.6871,
      lng: 22.9274,
      baselineStatus: "NON_DEMARRE",
      baselineTep: 0,
      baselineTef: 0,
      status: "NON_DEMARRE",
      tep: 0,
      tef: 0,
      stages: [],
      realization: "En attente de validation d\xE9finitive de l\u2019implantation g\xE9otechnique (sol argileux).",
      constraints: ["TECHNIQUE"],
      constraintsSummary: "1) Technique : \xC9tude de sol compl\xE9mentaire requise pour dimensionner les semelles.",
      impactsSummary: "D\xE9marrage des travaux report\xE9 de 4 semaines.",
      critical: false,
      rt: "NA",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NA",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Aucun d\xE9caissement effectu\xE9 \xE0 ce jour (TEF 0 %).",
      agents: []
    },
    // --- EXTENSION NATIONALE : TANGANYIKA (2), KASAÏ-CENTRAL (2), KONGO-CENTRAL (1) ---
    {
      num: 20,
      contractor: "Tanganyika BTP & Services (D\xE9mo)",
      province: "Tanganyika",
      territory: "Kalemie",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Kabimba Lac (Extension Nationale)",
      sector: "Chefferie Tumbwe",
      locality: "Kabimba",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-05-10",
      deadline: "2026-12-20",
      lat: -5.5812,
      lng: 29.3421,
      baselineStatus: "EN_COURS",
      baselineTep: 74,
      baselineTef: 70,
      status: "EN_COURS",
      tep: 89,
      tef: 84,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT"],
      realization: "Finitions peinture achev\xE9es et pose du forage manuel dans la cour de l\u2019\xE9cole.",
      constraints: [],
      constraintsSummary: "Aucune contrainte active",
      impactsSummary: "Livraison pr\xE9vue dans les d\xE9lais",
      critical: false,
      rt: "NON",
      rtDate: "2026-12-01",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Chantier pilote de l\u2019extension nationale Tanganyika.",
      agents: ["USR-AGENT-3"]
    },
    {
      num: 21,
      contractor: "Tanganyika BTP & Services (D\xE9mo)",
      province: "Tanganyika",
      territory: "Kongolo",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Kongolo Rive Droite (Extension Nationale)",
      sector: "Chefferie Bena Nyembo",
      locality: "Kongolo",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-06-20",
      deadline: "2027-02-15",
      lat: -5.3852,
      lng: 27.0014,
      baselineStatus: "EN_COURS",
      baselineTep: 46,
      baselineTef: 45,
      status: "EN_COURS",
      tep: 60,
      tef: 55,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE"],
      realization: "Pose de la toiture et d\xE9marrage de l\u2019assainissement (fosse septique et incin\xE9rateur m\xE9dical).",
      constraints: ["SOCIALE_ENVIRONNEMENTALE"],
      constraintsSummary: "4) Sociale & Environnementale : Mesures HSE \xE0 renforcer pour le stockage des d\xE9chets de chantier.",
      impactsSummary: "Correction imm\xE9diate demand\xE9e \xE0 l\u2019entreprise sans arr\xEAt de chantier.",
      critical: false,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Suivi HSE planifi\xE9 \xE0 la prochaine visite hebdomadaire.",
      agents: ["USR-AGENT-3"]
    },
    {
      num: 22,
      contractor: "Kasa\xEF G\xE9nie Construct SARL (D\xE9mo)",
      province: "Kasa\xEF-Central",
      territory: "Demba",
      type: "BATIMENT_ADMINISTRATIF",
      name: "B\xE2timent Administratif D\xE9mo Demba (Extension Nationale)",
      sector: "Secteur Diofwa",
      locality: "Demba-Cit\xE9",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-05-01",
      deadline: "2027-01-10",
      lat: -5.4981,
      lng: 22.2654,
      baselineStatus: "EN_COURS",
      baselineTep: 55,
      baselineTef: 68,
      status: "EN_COURS",
      tep: 58,
      tef: 72,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE"],
      realization: "Pose partielle des pannes m\xE9talliques ; ralentissement constat\xE9 sur la menuiserie.",
      constraints: ["FINANCIERE", "LOGISTIQUE"],
      constraintsSummary: "3) Financi\xE8re : \xC9cart d\xE9favorable TEF > TEP sup\xE9rieur \xE0 10 pts ; 2) Logistique : Retard convoi ferroviaire.",
      impactsSummary: "Glissement de planning de 3 semaines.",
      critical: true,
      rt: "NON",
      rtDate: "",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Plan de rattrapage exig\xE9 de l\u2019entreprise sous 10 jours.",
      agents: ["USR-AGENT-3"]
    },
    {
      num: 23,
      contractor: "Kasa\xEF G\xE9nie Construct SARL (D\xE9mo)",
      province: "Kasa\xEF-Central",
      territory: "Luiza",
      type: "ECOLE_PRIMAIRE",
      name: "EP D\xE9mo Luiza Plateau (Extension Nationale)",
      sector: "Secteur Lusanza",
      locality: "Luiza",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-03-25",
      deadline: "2026-11-25",
      lat: -7.1965,
      lng: 22.4188,
      baselineStatus: "EN_COURS",
      baselineTep: 94,
      baselineTef: 90,
      status: "ACHEVE",
      tep: 100,
      tef: 96,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION", "PETITS_OUVRAGES_ASSAINISSEMENT", "EQUIPEMENT_MOBILIER"],
      realization: "Travaux 100 % achev\xE9s, mobilier livr\xE9, r\xE9ception provisoire sign\xE9e.",
      constraints: [],
      constraintsSummary: "Aucune",
      impactsSummary: "Aucun",
      critical: false,
      rt: "OK",
      rtDate: "2026-09-18",
      rtRes: "N\xE9ant",
      rtPv: "PV-RT-DEMO-023",
      rp: "OK",
      rpDate: "2026-10-08",
      rpRes: "N\xE9ant",
      rpPv: "PV-RP-DEMO-023",
      rd: "NON",
      rdDate: "2027-04-08",
      rdRes: "",
      rdPv: "",
      observation: "Ouvrage exemplaire ; comit\xE9 scolaire form\xE9 \xE0 l\u2019entretien.",
      agents: ["USR-AGENT-3"]
    },
    {
      num: 24,
      contractor: "Kongo B\xE2timents Durables SARL (D\xE9mo)",
      province: "Kongo-Central",
      territory: "Kasangulu",
      type: "CENTRE_DE_SANTE",
      name: "CS D\xE9mo Kasangulu Rural (Extension Nationale)",
      sector: "Secteur Kasangulu",
      locality: "Kasangulu-Est",
      contractStatus: "CONTRAT_ACTIF",
      startDate: "2025-08-14",
      deadline: "2027-03-15",
      lat: -4.5831,
      lng: 15.1652,
      baselineStatus: "EN_COURS",
      baselineTep: 62,
      baselineTef: 60,
      status: "EN_COURS",
      tep: 76,
      tef: 74,
      stages: ["IMPLANTATION_TERRASSEMENT", "FONDATION", "ELEVATION_MURS", "CHARPENTE_TOITURE", "MENUISERIE_CREPISSAGE", "FINITION"],
      realization: "Pose des faux plafonds, plomberie sanitaire et \xE9quipements de st\xE9rilisation.",
      constraints: [],
      constraintsSummary: "Aucune contrainte active",
      impactsSummary: "Ex\xE9cution \xE9quilibr\xE9e (\xE9cart +2 pts)",
      critical: false,
      rt: "NON",
      rtDate: "2026-12-12",
      rtRes: "",
      rtPv: "",
      rp: "NON",
      rpDate: "",
      rpRes: "",
      rpPv: "",
      rd: "NA",
      rdDate: "",
      rdRes: "",
      rdPv: "",
      observation: "Bonne coordination avec la zone de sant\xE9 de Kasangulu.",
      agents: ["USR-AGENT-3"]
    }
  ];
  const projects = specs.map((s) => {
    const padded = String(s.num).padStart(3, "0");
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
      baselineDate: "2026-08-31",
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
        rd: { status: s.rd, date: s.rdDate, reserves: s.rdRes, pvReference: s.rdPv }
      },
      latestObservation: s.observation,
      assignedAgentIds: [...s.agents],
      isDemoData: true,
      createdAt: "2026-01-15T08:00:00Z",
      updatedAt: "2026-11-12T10:00:00Z"
    };
  });
  const assignments = [];
  let affIndex = 1;
  for (const p of projects) {
    for (const agentId of p.assignedAgentIds) {
      const agent = users.find((u) => u.id === agentId);
      assignments.push({
        id: `AFF-DEMO-${String(affIndex++).padStart(3, "0")}`,
        agentId: agent.id,
        agentName: agent.fullName,
        projectId: p.id,
        projectMatrixNumber: p.matrixNumber,
        projectName: p.projectName,
        startDate: "2026-08-01",
        endDate: null,
        status: "ACTIVE",
        assignedBy: "USR-COORD-DEMO",
        assignedByName: "Jean-Baptiste Mukendi (D\xE9mo)",
        notes: "Affectation initiale de campagne S&E T3\u2013T4 2026 (D\xE9mo).",
        isDemoData: true,
        createdAt: "2026-08-01T08:00:00Z",
        updatedAt: "2026-08-01T08:00:00Z"
      });
    }
  }
  assignments.push(
    {
      id: `AFF-DEMO-${String(affIndex++).padStart(3, "0")}`,
      agentId: "USR-AGENT-1",
      agentName: "Patrice Kalumba (D\xE9mo)",
      projectId: "PRJ-DEMO-005",
      projectMatrixNumber: "DEMO-005",
      projectName: projects[4].projectName,
      startDate: "2026-04-01",
      endDate: "2026-07-31",
      status: "REAFFECTEE",
      assignedBy: "USR-COORD-DEMO",
      assignedByName: "Jean-Baptiste Mukendi (D\xE9mo)",
      notes: "R\xE9affect\xE9 \xE0 Chantal Mwamba pour \xE9quilibrage g\xE9ographique Pweto\u2013Haut-Lomami.",
      reassignedToAgentId: "USR-AGENT-2",
      isDemoData: true,
      createdAt: "2026-04-01T08:00:00Z",
      updatedAt: "2026-07-31T16:30:00Z"
    },
    {
      id: `AFF-DEMO-${String(affIndex++).padStart(3, "0")}`,
      agentId: "USR-AGENT-2",
      agentName: "Chantal Mwamba (D\xE9mo)",
      projectId: "PRJ-DEMO-013",
      projectMatrixNumber: "DEMO-013",
      projectName: projects[12].projectName,
      startDate: "2026-03-15",
      endDate: "2026-09-20",
      status: "TERMINEE",
      assignedBy: "USR-COORD-DEMO",
      assignedByName: "Jean-Baptiste Mukendi (D\xE9mo)",
      notes: "Affectation cl\xF4tur\xE9e temporairement suite \xE0 r\xE9siliation contractuelle en attente de r\xE9attribution.",
      isDemoData: true,
      createdAt: "2026-03-15T08:00:00Z",
      updatedAt: "2026-09-20T14:00:00Z"
    }
  );
  const reports = [];
  let repCounter = 1;
  function makeReport(opts) {
    const id = `FIC-2026-${String(repCounter++).padStart(4, "0")}`;
    const weekNumber = opts.weekNumber ?? "";
    const month = opts.month ?? (opts.periodicity === "MENSUEL" ? opts.collectionDate.slice(0, 7) : "");
    const periodKey = computePeriodKey(opts.periodicity, opts.collectionDate, weekNumber, month);
    const gap = calculateTepTefGap(opts.currTep, opts.currTef);
    const assignment = assignments.find((a) => a.projectId === opts.project.id && a.agentId === opts.agent.id);
    const createdAt = `${opts.collectionDate}T09:15:00Z`;
    const submittedAt = opts.status !== "BROUILLON" ? `${opts.collectionDate}T14:30:00Z` : void 0;
    const validatedAt = opts.status === "VALIDE" ? `${opts.collectionDate}T17:45:00Z` : void 0;
    const reviews = [];
    if (opts.status === "VALIDE") {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: "USR-COORD-DEMO",
        reviewerName: "Jean-Baptiste Mukendi (D\xE9mo)",
        decision: "VALIDE",
        comment: opts.reviewComment ?? "Donn\xE9es coh\xE9rentes avec le suivi physique et financier. Fiche valid\xE9e.",
        createdAt: `${opts.collectionDate}T17:45:00Z`
      });
    } else if (opts.status === "RETOURNE") {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: "USR-COORD-DEMO",
        reviewerName: "Jean-Baptiste Mukendi (D\xE9mo)",
        decision: "RETOURNE",
        comment: opts.reviewComment ?? "Veuillez compl\xE9ter la justification d\xE9taill\xE9e de l\u2019\xE9cart TEP/TEF et pr\xE9ciser la r\xE9f\xE9rence du proc\xE8s-verbal de constat.",
        createdAt: `${opts.collectionDate}T16:20:00Z`
      });
    } else if (opts.status === "EN_COURS_VERIFICATION") {
      reviews.push({
        id: `REV-${id}-1`,
        reportId: id,
        reportVersion: 1,
        reviewerId: "USR-COORD-DEMO",
        reviewerName: "Jean-Baptiste Mukendi (D\xE9mo)",
        decision: "EN_COURS_VERIFICATION",
        comment: "V\xE9rification crois\xE9e en cours avec l\u2019attachement financier mensuel.",
        createdAt: `${opts.collectionDate}T15:50:00Z`
      });
    }
    return {
      id,
      projectId: opts.project.id,
      matrixNumber: opts.project.matrixNumber,
      agentId: opts.agent.id,
      agentName: opts.agent.fullName,
      assignmentId: assignment?.id ?? "AFF-HIST",
      status: opts.status,
      syncStatus: "SYNCHRONISE",
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
        gpsCapturedAt: createdAt
      },
      progress: {
        workStatus: opts.workStatus,
        stoppageDate: opts.stoppageDate ?? (opts.workStatus === "A_L_ARRET" ? "2026-09-14" : ""),
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
        gapJustification: opts.gapJustification ?? (Math.abs(gap) > 10 ? gap > 0 ? "Travaux pr\xE9financ\xE9s par l\u2019entreprise ; d\xE9compte en cours de traitement au niveau financier BCECO." : "D\xE9caissement d\u2019avance de d\xE9marrage ou attachement ant\xE9rieur non encore compens\xE9 par l\u2019avancement physique sur site." : "")
      },
      constraints: {
        categories: [...opts.project.latestConstraintCategories],
        detailedDescriptions: opts.project.latestConstraintCategories.length > 0 ? [opts.project.latestConstraintsSummary] : [],
        impacts: {
          delays: opts.project.hasUnresolvedConstraints,
          costs: opts.project.latestConstraintCategories.includes("LOGISTIQUE") || opts.project.latestConstraintCategories.includes("FINANCIERE"),
          quality: opts.project.latestConstraintCategories.includes("TECHNIQUE"),
          stoppage: opts.workStatus === "A_L_ARRET",
          details: opts.project.latestImpactsSummary
        },
        isCritical: opts.project.hasCriticalConstraint,
        correctiveMeasures: opts.correctiveMeasures ?? (opts.project.hasUnresolvedConstraints ? "Tenue d\u2019une r\xE9union de cadrage technique tripartite (BCECO, Entreprise, Autorit\xE9 locale) avec chronogramme contraignant." : "Maintien de la cadence hebdomadaire jusqu\u2019\xE0 la r\xE9ception."),
        urgentActionsRequired: opts.urgentActions ?? (opts.project.hasCriticalConstraint ? "Acc\xE9l\xE9rer la d\xE9cision de coordination provinciale et d\xE9bloquer le point critique identifi\xE9 sous 10 jours." : ""),
        actionOwner: opts.actionOwner ?? (opts.project.hasCriticalConstraint ? "BCECO & Entreprise" : "Entreprise")
      },
      receptions: {
        rt: { ...opts.project.receptions.rt },
        rp: { ...opts.project.receptions.rp },
        rd: { ...opts.project.receptions.rd },
        generalObservations: opts.project.latestObservation,
        guardingStatus: opts.workStatus === "ACHEVE" ? "Gardiennage communautaire permanent" : "Gardiennage entreprise 24h/24",
        siteCondition: opts.workStatus === "A_L_ARRET" ? "Mat\xE9riaux s\xE9curis\xE9s, reprise en attente" : "Chantier propre et balis\xE9",
        disputes: opts.project.latestConstraintCategories.includes("SOCIALE_ENVIRONNEMENTALE") ? "M\xE9diation fonci\xE8re en cours avec la chefferie" : "Aucun litige signal\xE9",
        attendanceLevel: opts.workStatus === "ACHEVE" ? "Exploitation effective par la communaut\xE9 locale" : "Non applicable (en chantier)",
        photos: opts.status === "BROUILLON" ? [] : buildDemoPhotos({
          reportId: id,
          collectionDate: opts.collectionDate,
          projectName: opts.project.projectName,
          infrastructureType: opts.project.infrastructureType
        }),
        attachments: []
      },
      signature: {
        agentFullName: opts.agent.fullName,
        agentFunction: opts.agent.functionTitle,
        agentPhone: opts.agent.phone,
        signatureDataUrl: "CERTIFIE_ELECTRONIQUEMENT_DEMO",
        signedAt: createdAt
      },
      reviews,
      versionHistory: [],
      createdAt,
      updatedAt: validatedAt ?? submittedAt ?? createdAt,
      submittedAt,
      validatedAt,
      lastSyncedAt: submittedAt ?? createdAt,
      isDemoData: true
    };
  }
  const agent1 = users[1];
  const agent2 = users[2];
  const agent3 = users[3];
  const sepSpecs = [
    [0, agent1, 86, 94, 82, 90, "Pose des derni\xE8res menuiseries m\xE9talliques et premi\xE8re couche de peinture."],
    [1, agent1, 60, 70, 48, 52, "Ach\xE8vement de la toiture et d\xE9marrage de l\u2019enduit int\xE9rieur maternit\xE9."],
    [2, agent1, 46, 56, 44, 52, "Montage de la charpente m\xE9tallique du bloc administratif."],
    [3, agent1, 40, 44, 55, 62, "Constat de non-conformit\xE9 sur les linteaux avant suspension des travaux."],
    [4, agent2, 22, 36, 22, 32, "\xC9l\xE9vation des murs du dispensaire apr\xE8s relance PME."],
    [7, agent2, 68, 79, 66, 76, "Cr\xE9pissage int\xE9gral et d\xE9marrage de la construction des latrines."],
    [8, agent2, 80, 92, 78, 88, "Carrelage, faux plafonds et am\xE9nagement des bureaux."],
    [9, agent2, 50, 62, 42, 48, "Pose des t\xF4les et d\xE9but du cr\xE9pissage ext\xE9rieur."],
    [11, agent2, 84, 94, 80, 88, "Peinture finale et livraison des bancs-pupitres."],
    [14, agent1, 64, 76, 62, 70, "Pose des menuiseries et enduit de fa\xE7ade principale."],
    [16, agent1, 44, 56, 35, 40, "Ach\xE8vement de la toiture en t\xF4les BG28 sur le centre de sant\xE9."],
    [19, agent3, 66, 78, 64, 74, "Cr\xE9pissage et installation du bloc sanitaire."],
    [21, agent3, 48, 55, 60, 68, "\xC9l\xE9vation des murs achev\xE9e ; retard de livraison charpente."],
    [22, agent3, 88, 96, 86, 92, "Finition peinture et r\xE9ception technique pr\xE9paratoire."]
  ];
  for (const [idx, ag, pTep, cTep, pTef, cTef, works] of sepSpecs) {
    reports.push(
      makeReport({
        project: projects[idx],
        agent: ag,
        periodicity: "MENSUEL",
        collectionDate: "2026-09-25",
        month: "2026-09",
        prevTep: pTep,
        currTep: cTep,
        prevTef: pTef,
        currTef: cTef,
        workStatus: cTep >= 100 ? "ACHEVE" : projects[idx].currentStatus === "A_L_ARRET" ? "A_L_ARRET" : "EN_COURS",
        works,
        skilled: 8,
        laborers: 16,
        engineer: true,
        status: "VALIDE"
      })
    );
  }
  const pendingNovRealizationByIdx = /* @__PURE__ */ new Map([
    [1, projects[1].latestPeriodRealization],
    [4, projects[4].latestPeriodRealization],
    [16, projects[16].latestPeriodRealization],
    [21, projects[21].latestPeriodRealization]
  ]);
  const octValidatedIndices = [
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
    [23, agent3]
  ];
  for (const [idx, ag] of octValidatedIndices) {
    const prj = projects[idx];
    const prevSep = reports.find((rep) => rep.projectId === prj.id && rep.status === "VALIDE");
    const r = makeReport({
      project: prj,
      agent: ag,
      periodicity: "MENSUEL",
      collectionDate: "2026-10-26",
      month: "2026-10",
      prevTep: prevSep ? prevSep.currentTep : prj.baselineTep,
      currTep: prj.currentTep,
      prevTef: prevSep ? prevSep.currentTef : prj.baselineTef,
      currTef: prj.currentTef,
      workStatus: prj.currentStatus,
      works: prj.latestPeriodRealization,
      skilled: prj.currentStatus === "ACHEVE" ? 2 : 10,
      laborers: prj.currentStatus === "ACHEVE" ? 4 : 18,
      engineer: true,
      status: "VALIDE"
    });
    if (idx === 8 || idx === 11) {
      r.version = 2;
      r.versionHistory = [
        {
          version: 1,
          savedAt: "2026-10-26T14:30:00Z",
          statusAtSnapshot: "RETOURNE",
          currentTep: Math.max(0, r.currentTep - 2),
          currentTef: r.currentTef,
          workStatus: "EN_COURS",
          summary: "Version initiale v1 soumise avant compl\xE9ment de r\xE9f\xE9rence PV de r\xE9ception technique."
        }
      ];
      r.reviews = [
        {
          id: `REV-${r.id}-0`,
          reportId: r.id,
          reportVersion: 1,
          reviewerId: "USR-COORD-DEMO",
          reviewerName: "Jean-Baptiste Mukendi (D\xE9mo)",
          decision: "RETOURNE",
          comment: "Veuillez renseigner la r\xE9f\xE9rence officielle du PV de r\xE9ception technique et confirmer la lev\xE9e des r\xE9serves.",
          createdAt: "2026-10-26T15:40:00Z"
        },
        {
          ...r.reviews[0],
          reportVersion: 2,
          comment: "R\xE9f\xE9rence PV ajout\xE9e et r\xE9serves document\xE9es en v2. Fiche valid\xE9e et consolid\xE9e.",
          createdAt: "2026-10-26T17:45:00Z"
        }
      ];
    }
    reports.push(r);
  }
  for (const prj of projects) {
    const latestValidated = reports.filter((rep) => rep.projectId === prj.id && rep.status === "VALIDE").sort((a, b) => b.collectionDate.localeCompare(a.collectionDate))[0];
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
  const rMim1 = makeReport({
    project: projects[1],
    agent: agent1,
    periodicity: "HEBDOMADAIRE",
    collectionDate: "2026-11-12",
    weekNumber: "S46-2026",
    prevTep: 70,
    currTep: 78,
    prevTef: 52,
    currTef: 58,
    workStatus: "EN_COURS",
    works: pendingNovRealizationByIdx.get(1) ?? projects[1].latestPeriodRealization,
    skilled: 9,
    laborers: 14,
    engineer: true,
    status: "SOUMIS"
  });
  reports.push(rMim1);
  reports.push(
    makeReport({
      project: projects[1],
      agent: agent1,
      periodicity: "HEBDOMADAIRE",
      collectionDate: "2026-11-13",
      weekNumber: "S46-2026",
      prevTep: 70,
      currTep: 79,
      prevTef: 52,
      currTef: 58,
      workStatus: "EN_COURS",
      works: "Compl\xE9ment photo suite au raccordement des batteries solaires (doublon potentiel S46).",
      skilled: 9,
      laborers: 14,
      engineer: true,
      status: "SOUMIS",
      duplicateOf: [rMim1.id]
    })
  );
  const rMokamboReturned = makeReport({
    project: projects[3],
    agent: agent1,
    periodicity: "HEBDOMADAIRE",
    collectionDate: "2026-11-10",
    weekNumber: "S46-2026",
    prevTep: 44,
    currTep: 44,
    prevTef: 62,
    currTef: 62,
    workStatus: "A_L_ARRET",
    stoppageDate: "2026-09-14",
    works: "Visite de constat d\u2019arr\xEAt ; aucun personnel de l\u2019entreprise pr\xE9sent sur chantier.",
    skilled: 0,
    laborers: 0,
    engineer: false,
    status: "RETOURNE",
    reviewComment: "Merci de joindre le num\xE9ro du proc\xE8s-verbal de constat de non-conformit\xE9 des linteaux et de pr\xE9ciser le responsable d\xE9sign\xE9 pour la lev\xE9e de la suspension."
  });
  reports.push(rMokamboReturned);
  reports.push(
    makeReport({
      project: projects[16],
      agent: agent1,
      periodicity: "HEBDOMADAIRE",
      collectionDate: "2026-11-14",
      weekNumber: "S46-2026",
      prevTep: 56,
      currTep: 67,
      prevTef: 40,
      currTef: 45,
      workStatus: "EN_COURS",
      works: pendingNovRealizationByIdx.get(16) ?? projects[16].latestPeriodRealization,
      skilled: 7,
      laborers: 15,
      engineer: true,
      status: "EN_COURS_VERIFICATION"
    })
  );
  reports.push(
    makeReport({
      project: projects[4],
      agent: agent2,
      periodicity: "HEBDOMADAIRE",
      collectionDate: "2026-11-14",
      weekNumber: "S46-2026",
      prevTep: 36,
      currTep: 46,
      prevTef: 32,
      currTef: 40,
      workStatus: "EN_COURS",
      works: pendingNovRealizationByIdx.get(4) ?? projects[4].latestPeriodRealization,
      skilled: 6,
      laborers: 12,
      engineer: true,
      status: "SOUMIS"
    })
  );
  reports.push(
    makeReport({
      project: projects[5],
      agent: agent2,
      periodicity: "HEBDOMADAIRE",
      collectionDate: "2026-11-11",
      weekNumber: "S46-2026",
      prevTep: 0,
      currTep: 5,
      prevTef: 15,
      currTef: 20,
      workStatus: "NON_DEMARRE",
      works: "Piquetage suspendu en attente du PV de d\xE9limitation parcellaire.",
      skilled: 2,
      laborers: 3,
      engineer: false,
      status: "RETOURNE",
      reviewComment: "Veuillez indiquer la date de la r\xE9union de m\xE9diation fonci\xE8re pr\xE9vue avec l\u2019Administrateur de Territoire de Mitwaba."
    })
  );
  reports.push(
    makeReport({
      project: projects[10],
      agent: agent2,
      periodicity: "JOURNALIER",
      collectionDate: "2026-11-15",
      prevTep: 48,
      currTep: 48,
      prevTef: 48,
      currTef: 48,
      workStatus: "A_L_ARRET",
      stoppageDate: "2026-10-03",
      works: "Inspection journali\xE8re : pont RN1 toujours impraticable pour les camions de ciment.",
      skilled: 1,
      laborers: 2,
      engineer: false,
      status: "SOUMIS"
    })
  );
  reports.push(
    makeReport({
      project: projects[21],
      agent: agent3,
      periodicity: "HEBDOMADAIRE",
      collectionDate: "2026-11-15",
      weekNumber: "S46-2026",
      prevTep: 55,
      currTep: 58,
      prevTef: 68,
      currTef: 72,
      workStatus: "EN_COURS",
      works: pendingNovRealizationByIdx.get(21) ?? projects[21].latestPeriodRealization,
      skilled: 5,
      laborers: 10,
      engineer: true,
      status: "SOUMIS"
    })
  );
  const sepValidatedReports = reports.filter((r) => r.status === "VALIDE" && r.collectionDate.startsWith("2026-09"));
  const allValidatedReports = reports.filter((r) => r.status === "VALIDE");
  const sepAvgTep = Math.round(
    sepValidatedReports.reduce((acc, r) => acc + r.currentTep, 0) / Math.max(1, sepValidatedReports.length) * 10
  ) / 10;
  const sepAvgTef = Math.round(
    sepValidatedReports.reduce((acc, r) => acc + r.currentTef, 0) / Math.max(1, sepValidatedReports.length) * 10
  ) / 10;
  const octConsolidatedAvgTep = Math.round(projects.reduce((acc, p) => acc + p.currentTep, 0) / projects.length * 10) / 10;
  const octConsolidatedAvgTef = Math.round(projects.reduce((acc, p) => acc + p.currentTef, 0) / projects.length * 10) / 10;
  const generatedReports = [
    {
      id: "RPT-GEN-2026-001",
      title: "Rapport Mensuel Consolid\xE9 \u2014 Septembre 2026 (Donn\xE9es D\xE9mo)",
      periodicity: "MENSUEL",
      periodLabel: "Septembre 2026",
      format: "EXCEL",
      dataScope: "VALIDES_UNIQUEMENT",
      filtersSummary: "Toutes provinces \xB7 Fiches valid\xE9es septembre 2026",
      generatedBy: "USR-COORD-DEMO",
      generatedByName: "Jean-Baptiste Mukendi (D\xE9mo)",
      projectCount: projects.length,
      reportCount: sepValidatedReports.length,
      averageTep: sepAvgTep,
      averageTef: sepAvgTef,
      isDemoData: true,
      createdAt: "2026-10-02T11:15:00Z"
    },
    {
      id: "RPT-GEN-2026-002",
      title: "Rapport Mensuel Consolid\xE9 \u2014 Octobre 2026 (Donn\xE9es D\xE9mo)",
      periodicity: "MENSUEL",
      periodLabel: "Octobre 2026",
      format: "PDF",
      dataScope: "VALIDES_UNIQUEMENT",
      filtersSummary: "Grand Katanga & Extension Nationale \u2014 Situation consolid\xE9e",
      generatedBy: "USR-COORD-DEMO",
      generatedByName: "Jean-Baptiste Mukendi (D\xE9mo)",
      projectCount: projects.length,
      reportCount: allValidatedReports.length,
      averageTep: octConsolidatedAvgTep,
      averageTef: octConsolidatedAvgTef,
      isDemoData: true,
      createdAt: "2026-11-01T10:30:00Z"
    }
  ];
  const syncLogs = [
    {
      id: "SYNC-DEMO-001",
      userId: "USR-AGENT-1",
      syncedCount: 3,
      failedCount: 0,
      conflictCount: 0,
      summary: "Synchronisation de 3 fiches terrain (Haut-Katanga & Lualaba) confirm\xE9e serveur.",
      createdAt: "2026-11-14T16:12:00Z"
    },
    {
      id: "SYNC-DEMO-002",
      userId: "USR-AGENT-2",
      syncedCount: 2,
      failedCount: 0,
      conflictCount: 0,
      summary: "Synchronisation de 2 fiches terrain (Haut-Lomami) confirm\xE9e serveur.",
      createdAt: "2026-11-15T12:05:00Z"
    }
  ];
  const auditLogs = [
    {
      id: "AUD-DEMO-001",
      actorId: "USR-COORD-DEMO",
      actorName: "Jean-Baptiste Mukendi (D\xE9mo)",
      actorRole: "COORDINATEUR",
      action: "INITIALISATION_DEMO",
      entityType: "SYSTEME",
      entityId: "REGISTRE-DEMO-2026",
      details: `Chargement du jeu de donn\xE9es fictives de d\xE9monstration (${projects.length} ouvrages, 3 agents, ${reports.length} fiches).`,
      createdAt: "2026-08-01T08:00:00Z"
    },
    {
      id: "AUD-DEMO-002",
      actorId: "USR-COORD-DEMO",
      actorName: "Jean-Baptiste Mukendi (D\xE9mo)",
      actorRole: "COORDINATEUR",
      action: "REAFFECTATION_OUVRAGE",
      entityType: "AGENT_ASSIGNMENT",
      entityId: "PRJ-DEMO-005",
      details: "R\xE9affectation de DEMO-005 (CS Kilwa Lac Moero) de Patrice Kalumba vers Chantal Mwamba.",
      createdAt: "2026-07-31T16:30:00Z"
    },
    {
      id: "AUD-DEMO-003",
      actorId: "USR-COORD-DEMO",
      actorName: "Jean-Baptiste Mukendi (D\xE9mo)",
      actorRole: "COORDINATEUR",
      action: "RETOUR_FICHE",
      entityType: "FIELD_REPORT",
      entityId: rMokamboReturned.id,
      details: "Fiche retourn\xE9e \xE0 Patrice Kalumba pour compl\xE9ment de r\xE9f\xE9rence PV de constat (DEMO-004).",
      createdAt: "2026-11-10T16:20:00Z"
    },
    {
      id: "AUD-DEMO-004",
      actorId: "USR-COORD-DEMO",
      actorName: "Jean-Baptiste Mukendi (D\xE9mo)",
      actorRole: "COORDINATEUR",
      action: "GENERATION_RAPPORT",
      entityType: "GENERATED_REPORT",
      entityId: "RPT-GEN-2026-002",
      details: "Export PDF mensuel consolid\xE9 d\u2019octobre 2026 (24 ouvrages \u2014 MODE D\xC9MONSTRATION).",
      createdAt: "2026-11-01T10:30:00Z"
    }
  ];
  return {
    users,
    projects,
    assignments,
    reports,
    generatedReports,
    syncLogs,
    auditLogs
  };
}

// src/domain/reportingEngine.ts
var MATRICE_UNIQUE_BLOC1_LABEL = "IDENTIFICATION (donn\xE9es contractuelles \u2013 ne pas modifier)";
var MATRICE_UNIQUE_BLOC2_LABEL = "SITUATION \xC0 CE JOUR \u2014 SUIVI PHYSIQUE, FINANCIER, CONTRAINTES & R\xC9CEPTIONS";
var MATRICE_UNIQUE_BLOC1_COUNT = 9;
var MATRICE_UNIQUE_BLOC2_COUNT = 12;
var FEUILLE_DE_ROUTE_10_HEADERS = [
  "N\xB0 Matrice",
  "Nom de l\u2019ouvrage & Type (EP/CS/BA)",
  "Entreprise (PME)",
  "Statut (1/2/3)*",
  "R\xE9alisation p\xE9riode & Niveau ex\xE9cution",
  "TEP (%)",
  "TEF (%)",
  "Contraintes (1-4)** & Impacts",
  "R\xE9cept. RT/RP/RD",
  "Observations cl\xE9s"
];
var FEUILLE_DE_ROUTE_FOOTNOTES = [
  "* Codes Statut : 1) Achev\xE9 | 2) En cours (F=Fondation, E=\xC9l\xE9vation, T=Toiture, Fin=Finition, PO=Petits \u0153uvres) | 3) \xC0 l\u2019arr\xEAt / Non d\xE9marr\xE9.",
  "** Codes Contraintes : 1) Technique | 2) Logistique | 3) Financi\xE8re | 4) Sociale et Environnementale."
];
function round1(value) {
  return Math.round(value * 10) / 10;
}
function mean1(values) {
  if (values.length === 0) return 0;
  return round1(values.reduce((acc, v) => acc + v, 0) / values.length);
}
function pct1(part, total) {
  if (total <= 0) return 0;
  return round1(part / total * 100);
}
function getIsoWeekCode(isoDate) {
  const clean = isoDate.slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return "S01-2026";
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `S${String(weekNo).padStart(2, "0")}-${d.getUTCFullYear()}`;
}
function getIsoWeekDateBounds(weekCode) {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return null;
  const week = Number(match[1]);
  const year = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayW1 = new Date(jan4.getTime() - (jan4Day - 1) * 864e5);
  const monday = new Date(mondayW1.getTime() + (week - 1) * 7 * 864e5);
  const sunday = new Date(monday.getTime() + 6 * 864e5);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
}
function getMonthDateBounds(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  };
}
function normalizeReportWeekCode(report) {
  const raw = report.identification?.weekNumber?.trim().toUpperCase();
  if (raw && /^S\d{1,2}-\d{4}$/.test(raw)) {
    const [, w, y] = /^S(\d{1,2})-(\d{4})$/.exec(raw);
    return `S${w.padStart(2, "0")}-${y}`;
  }
  return getIsoWeekCode(report.collectionDate || report.identification?.collectionDate || "");
}
function normalizeReportMonthKey(report) {
  const raw = report.identification?.month?.trim();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }
  const dateStr = report.collectionDate || report.identification?.collectionDate || "";
  return dateStr.length >= 7 ? dateStr.slice(0, 7) : "2026-01";
}
var FRENCH_MONTHS = [
  "Janvier",
  "F\xE9vrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Ao\xFBt",
  "Septembre",
  "Octobre",
  "Novembre",
  "D\xE9cembre"
];
function formatMonthKeyFr(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  const idx = Number(match[2]) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${FRENCH_MONTHS[idx]} ${match[1]}`;
}
function formatWeekCodeFr(weekCode) {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return weekCode;
  return `Semaine ${match[1].padStart(2, "0")} \u2014 ${match[2]}`;
}
function weekSortKey(weekCode) {
  const match = /^S(\d{1,2})-(\d{4})$/i.exec(weekCode.trim());
  if (!match) return weekCode;
  return `${match[2]}-${match[1].padStart(2, "0")}`;
}
function isReceptionsSequenceCoherent(receptions) {
  const rtOk = receptions.rt.status === "OK";
  const rpOk = receptions.rp.status === "OK";
  const rdOk = receptions.rd.status === "OK";
  if (rdOk && (!rpOk || !rtOk)) return false;
  if (rpOk && !rtOk) return false;
  return true;
}
function hasAnyReceptionReserves(receptions) {
  return Boolean(
    receptions.rt.reserves?.trim() || receptions.rp.reserves?.trim() || receptions.rd.reserves?.trim()
  );
}
function computeDaysDifference(targetIso, refIso) {
  if (!targetIso || !refIso) return null;
  const t = Date.parse(`${targetIso.slice(0, 10)}T00:00:00Z`);
  const r = Date.parse(`${refIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(r)) return null;
  return Math.round((t - r) / 864e5);
}
function sortReportsLatestFirst(a, b) {
  const dateDiff = (b.collectionDate || "").localeCompare(a.collectionDate || "");
  if (dateDiff !== 0) return dateDiff;
  if (a.status === "VALIDE" && b.status !== "VALIDE") return -1;
  if (b.status === "VALIDE" && a.status !== "VALIDE") return 1;
  if (b.version !== a.version) return b.version - a.version;
  return (b.updatedAt || "").localeCompare(a.updatedAt || "");
}
function buildPeriodSummaryRows(reports, mode) {
  const groups = /* @__PURE__ */ new Map();
  for (const r of reports) {
    const key = mode === "WEEKLY" ? normalizeReportWeekCode(r) : normalizeReportMonthKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const sortedKeys = Array.from(groups.keys()).sort(
    (a, b) => mode === "WEEKLY" ? weekSortKey(a).localeCompare(weekSortKey(b)) : a.localeCompare(b)
  );
  let prevAvgTep = null;
  let prevAvgTef = null;
  return sortedKeys.map((key) => {
    const list = groups.get(key);
    const validatedCount = list.filter((r) => r.status === "VALIDE").length;
    const submittedCount = list.length - validatedCount;
    const duplicateFlaggedCount = list.filter((r) => (r.potentialDuplicateOf?.length ?? 0) > 0).length;
    const latestByProject = /* @__PURE__ */ new Map();
    for (const r of [...list].sort(sortReportsLatestFirst)) {
      if (!latestByProject.has(r.projectId)) {
        latestByProject.set(r.projectId, r);
      }
    }
    const uniqueLatest = Array.from(latestByProject.values());
    const completedCount = uniqueLatest.filter((r) => r.progress.workStatus === "ACHEVE").length;
    const inProgressCount = uniqueLatest.filter((r) => r.progress.workStatus === "EN_COURS").length;
    const stoppedCount = uniqueLatest.filter((r) => r.progress.workStatus === "A_L_ARRET").length;
    const notStartedCount = uniqueLatest.filter((r) => r.progress.workStatus === "NON_DEMARRE").length;
    const averageTep = mean1(uniqueLatest.map((r) => r.progress.currentTep));
    const averageTef = mean1(uniqueLatest.map((r) => r.progress.currentTef));
    const averageGap = mean1(
      uniqueLatest.map((r) => calculateTepTefGap(r.progress.currentTep, r.progress.currentTef))
    );
    const gapAlertsCount = uniqueLatest.filter(
      (r) => Math.abs(calculateTepTefGap(r.progress.currentTep, r.progress.currentTef)) > 10
    ).length;
    const criticalConstraintsCount = uniqueLatest.filter((r) => r.constraints.isCritical).length;
    const rtOkCount = uniqueLatest.filter((r) => r.receptions.rt.status === "OK").length;
    const rpOkCount = uniqueLatest.filter((r) => r.receptions.rp.status === "OK").length;
    const rdOkCount = uniqueLatest.filter((r) => r.receptions.rd.status === "OK").length;
    const totalWorkforce = uniqueLatest.reduce(
      (sum, r) => sum + (r.progress.skilledWorkersCount || 0) + (r.progress.laborersCount || 0),
      0
    );
    const tepDeltaVsPrev = prevAvgTep !== null ? round1(averageTep - prevAvgTep) : null;
    const tefDeltaVsPrev = prevAvgTef !== null ? round1(averageTef - prevAvgTef) : null;
    prevAvgTep = averageTep;
    prevAvgTef = averageTef;
    let dateRange = "";
    if (mode === "WEEKLY") {
      const bounds = getIsoWeekDateBounds(key);
      dateRange = bounds ? `${formatDateFr(bounds.start)} \u2013 ${formatDateFr(bounds.end)}` : key;
    } else {
      const bounds = getMonthDateBounds(key);
      dateRange = bounds ? `${formatDateFr(bounds.start)} \u2013 ${formatDateFr(bounds.end)}` : key;
    }
    return {
      periodKey: key,
      label: mode === "WEEKLY" ? formatWeekCodeFr(key) : formatMonthKeyFr(key),
      dateRange,
      reportsCount: list.length,
      validatedCount,
      submittedCount,
      duplicateFlaggedCount,
      uniqueProjectsCount: uniqueLatest.length,
      completedCount,
      inProgressCount,
      stoppedCount,
      notStartedCount,
      averageTep,
      averageTef,
      averageGap,
      tepDeltaVsPrev,
      tefDeltaVsPrev,
      gapAlertsCount,
      criticalConstraintsCount,
      rtOkCount,
      rpOkCount,
      rdOkCount,
      totalWorkforce
    };
  });
}
function deriveDefaultPeriodLabel(periodicity, periodKeyFilter) {
  if (!periodKeyFilter) {
    if (periodicity === "HEBDOMADAIRE") return "Synth\xE8se Hebdomadaire Cumul\xE9e";
    if (periodicity === "MENSUEL") return "Synth\xE8se Mensuelle Cumul\xE9e";
    return "Situation Journali\xE8re Cumul\xE9e";
  }
  if (periodicity === "HEBDOMADAIRE") return formatWeekCodeFr(periodKeyFilter);
  if (periodicity === "MENSUEL") return formatMonthKeyFr(periodKeyFilter);
  return `Journ\xE9e du ${formatDateFr(periodKeyFilter)}`;
}
function buildConsolidatedReportModel(allProjects, allReports, rawParams) {
  const periodKeyFilter = (rawParams.periodKeyFilter ?? "").trim();
  const province = (rawParams.province ?? "").trim();
  const territory = (rawParams.territory ?? "").trim();
  const infrastructureType = rawParams.infrastructureType ?? "";
  const contractor = (rawParams.contractor ?? "").trim();
  const workStatus = rawParams.workStatus ?? "";
  const contractStatus = rawParams.contractStatus ?? "";
  const referenceDate = (rawParams.referenceDate ?? todayIsoDate()).slice(0, 10);
  const periodLabel = rawParams.periodLabel?.trim() || deriveDefaultPeriodLabel(rawParams.periodicity, periodKeyFilter);
  const normalizedParams = {
    periodicity: rawParams.periodicity,
    periodKeyFilter,
    periodLabel,
    dataScope: rawParams.dataScope,
    province,
    territory,
    infrastructureType,
    contractor,
    workStatus,
    contractStatus,
    referenceDate
  };
  const preFilteredProjects = allProjects.filter((p) => {
    if (province && p.province !== province) return false;
    if (territory && p.territory !== territory) return false;
    if (infrastructureType && p.infrastructureType !== infrastructureType) return false;
    if (contractor && p.contractor !== contractor) return false;
    if (contractStatus && p.contractStatus !== contractStatus) return false;
    return true;
  }).sort((a, b) => a.matrixNumber.localeCompare(b.matrixNumber, "fr", { numeric: true }));
  const preFilteredProjectIds = new Set(preFilteredProjects.map((p) => p.id));
  const preScopedReports = allReports.filter((r) => {
    if (!preFilteredProjectIds.has(r.projectId)) return false;
    if (r.status === "BROUILLON" || r.status === "RETOURNE") return false;
    if (rawParams.dataScope === "VALIDES_UNIQUEMENT") {
      return r.status === "VALIDE";
    }
    return r.status === "VALIDE" || r.status === "SOUMIS" || r.status === "EN_COURS_VERIFICATION";
  }).sort(sortReportsLatestFirst);
  let periodCutoffEndDate = null;
  if (periodKeyFilter) {
    if (rawParams.periodicity === "HEBDOMADAIRE") {
      periodCutoffEndDate = getIsoWeekDateBounds(periodKeyFilter)?.end ?? null;
    } else if (rawParams.periodicity === "MENSUEL") {
      periodCutoffEndDate = getMonthDateBounds(periodKeyFilter)?.end ?? null;
    } else {
      periodCutoffEndDate = periodKeyFilter.slice(0, 10);
    }
  }
  const matchesSelectedPeriod = (r) => {
    if (!periodKeyFilter) return true;
    if (rawParams.periodicity === "HEBDOMADAIRE") {
      return normalizeReportWeekCode(r) === periodKeyFilter.toUpperCase();
    }
    if (rawParams.periodicity === "MENSUEL") {
      return normalizeReportMonthKey(r) === periodKeyFilter;
    }
    return (r.collectionDate || "").slice(0, 10) === periodKeyFilter.slice(0, 10);
  };
  const reportsByProject = /* @__PURE__ */ new Map();
  for (const r of preScopedReports) {
    const arr = reportsByProject.get(r.projectId) ?? [];
    arr.push(r);
    reportsByProject.set(r.projectId, arr);
  }
  const projectedRows = preFilteredProjects.map((project) => {
    const projectReports = reportsByProject.get(project.id) ?? [];
    const periodReport = periodKeyFilter ? projectReports.find(matchesSelectedPeriod) : projectReports[0];
    const latestValidated = projectReports.find((r) => r.status === "VALIDE");
    let selectedReport;
    let useBaselineFallback = false;
    let hasPendingOverlay = false;
    if (periodKeyFilter && periodCutoffEndDate) {
      if (periodReport) {
        selectedReport = periodReport;
      } else {
        selectedReport = projectReports.find((r) => (r.collectionDate || "").slice(0, 10) <= periodCutoffEndDate);
        if (!selectedReport && project.baselineDate && project.baselineDate <= periodCutoffEndDate) {
          useBaselineFallback = true;
        }
      }
      if (selectedReport && selectedReport.status !== "VALIDE") {
        hasPendingOverlay = true;
      }
    } else if (rawParams.dataScope === "SOUMIS_ET_VALIDES") {
      const latestAny = projectReports[0];
      if (latestAny && latestAny.status !== "VALIDE" && (!latestValidated || sortReportsLatestFirst(latestAny, latestValidated) < 0)) {
        selectedReport = latestAny;
        hasPendingOverlay = true;
      } else {
        selectedReport = latestValidated;
      }
    } else {
      selectedReport = latestValidated;
    }
    let currentStatus;
    let latestPeriodRealization;
    let latestExecutionStages;
    let currentTep;
    let currentTef;
    let latestConstraintCategories;
    let latestConstraintsSummary;
    let hasUnresolvedConstraints;
    let hasCriticalConstraint;
    let latestImpactsSummary;
    let receptions;
    let latestObservation;
    let sourceStatus;
    let sourceLabel;
    if (selectedReport && (periodKeyFilter || hasPendingOverlay)) {
      currentStatus = selectedReport.progress.workStatus;
      latestPeriodRealization = selectedReport.progress.periodWorksExecuted;
      latestExecutionStages = [...selectedReport.progress.executionStages];
      currentTep = selectedReport.progress.currentTep;
      currentTef = selectedReport.progress.currentTef;
      latestConstraintCategories = [...selectedReport.constraints.categories];
      latestConstraintsSummary = selectedReport.constraints.detailedDescriptions.filter((d) => d.trim()).join(" ; ") || (selectedReport.constraints.categories.length > 0 ? selectedReport.constraints.categories.join(", ") : "Aucune contrainte active");
      hasUnresolvedConstraints = selectedReport.constraints.categories.length > 0;
      hasCriticalConstraint = selectedReport.constraints.isCritical;
      latestImpactsSummary = selectedReport.constraints.impacts.details || "Aucun impact majeur";
      receptions = {
        rt: { ...selectedReport.receptions.rt },
        rp: { ...selectedReport.receptions.rp },
        rd: { ...selectedReport.receptions.rd }
      };
      latestObservation = selectedReport.receptions.generalObservations || project.latestObservation;
      sourceStatus = selectedReport.status;
      sourceLabel = selectedReport.status === "VALIDE" ? "Fiche valid\xE9e" : selectedReport.status === "EN_COURS_VERIFICATION" ? "En v\xE9rification (non valid\xE9e)" : "Soumise (non valid\xE9e)";
    } else if (useBaselineFallback) {
      currentStatus = project.baselineStatus;
      latestPeriodRealization = `Situation fig\xE9e de r\xE9f\xE9rence au ${formatDateFr(project.baselineDate)}`;
      latestExecutionStages = [...project.latestExecutionStages];
      currentTep = project.baselineTep;
      currentTef = project.baselineTef;
      latestConstraintCategories = [...project.latestConstraintCategories];
      latestConstraintsSummary = project.latestConstraintsSummary;
      hasUnresolvedConstraints = project.hasUnresolvedConstraints;
      hasCriticalConstraint = project.hasCriticalConstraint;
      latestImpactsSummary = project.latestImpactsSummary;
      receptions = {
        rt: { ...project.receptions.rt },
        rp: { ...project.receptions.rp },
        rd: { ...project.receptions.rd }
      };
      latestObservation = project.latestObservation;
      sourceStatus = "REFERENCE_FIGEE";
      sourceLabel = `R\xE9f\xE9rence fig\xE9e (${formatDateFr(project.baselineDate)})`;
    } else {
      currentStatus = project.currentStatus;
      latestPeriodRealization = project.latestPeriodRealization;
      latestExecutionStages = [...project.latestExecutionStages];
      currentTep = project.currentTep;
      currentTef = project.currentTef;
      latestConstraintCategories = [...project.latestConstraintCategories];
      latestConstraintsSummary = project.latestConstraintsSummary;
      hasUnresolvedConstraints = project.hasUnresolvedConstraints;
      hasCriticalConstraint = project.hasCriticalConstraint;
      latestImpactsSummary = project.latestImpactsSummary;
      receptions = {
        rt: { ...project.receptions.rt },
        rp: { ...project.receptions.rp },
        rd: { ...project.receptions.rd }
      };
      latestObservation = project.latestObservation;
      sourceStatus = "REGISTRE_VALIDE";
      sourceLabel = latestValidated ? "Registre consolid\xE9 (Valid\xE9)" : "Registre initial (R\xE9f\xE9rence)";
    }
    const currentGap = calculateTepTefGap(currentTep, currentTef);
    const isGapAlert = Math.abs(currentGap) > 10;
    const referenceReport = selectedReport ?? latestValidated;
    const gapJustification = referenceReport?.progress.gapJustification?.trim() ?? "";
    const impactsFlags = referenceReport ? {
      delays: Boolean(referenceReport.constraints.impacts.delays),
      costs: Boolean(referenceReport.constraints.impacts.costs),
      quality: Boolean(referenceReport.constraints.impacts.quality),
      stoppage: Boolean(referenceReport.constraints.impacts.stoppage)
    } : {
      delays: hasUnresolvedConstraints,
      costs: latestConstraintCategories.includes("FINANCIERE") || latestConstraintCategories.includes("LOGISTIQUE"),
      quality: latestConstraintCategories.includes("TECHNIQUE"),
      stoppage: currentStatus === "A_L_ARRET"
    };
    const correctiveMeasures = referenceReport?.constraints.correctiveMeasures?.trim() || (hasUnresolvedConstraints || isGapAlert ? "Suivi technique et financier programm\xE9 par la coordination provinciale BCECO." : "Aucune action corrective urgente.");
    const urgentActionsRequired = referenceReport?.constraints.urgentActionsRequired?.trim() || "";
    const actionOwner = referenceReport?.constraints.actionOwner?.trim() || (hasCriticalConstraint ? "BCECO & Entreprise" : hasUnresolvedConstraints ? "Entreprise" : "\u2014");
    const evalDate = periodCutoffEndDate || referenceDate;
    const daysToDeadline = computeDaysDifference(project.definitiveReceptionDeadline, evalDate);
    const isDeadlineOverdue = daysToDeadline !== null && daysToDeadline < 0 && receptions.rd.status !== "OK";
    const skilledWorkers = referenceReport?.progress.skilledWorkersCount ?? 0;
    const laborers = referenceReport?.progress.laborersCount ?? 0;
    return {
      project,
      projectId: project.id,
      matrixNumber: project.matrixNumber,
      contractor: project.contractor,
      province: project.province,
      territory: project.territory,
      sectorChiefdom: project.sectorChiefdom,
      locality: project.locality,
      infrastructureType: project.infrastructureType,
      projectName: project.projectName,
      contractStatus: project.contractStatus,
      startDate: project.startDate,
      definitiveReceptionDeadline: project.definitiveReceptionDeadline,
      baselineDate: project.baselineDate,
      baselineStatus: project.baselineStatus,
      baselineTep: project.baselineTep,
      baselineTef: project.baselineTef,
      currentStatus,
      latestPeriodRealization,
      latestExecutionStages,
      currentTep,
      currentTef,
      currentGap,
      tepDeltaVsBaseline: round1(currentTep - project.baselineTep),
      tefDeltaVsBaseline: round1(currentTef - project.baselineTef),
      isGapAlert,
      gapJustification,
      latestConstraintCategories,
      latestConstraintsSummary,
      hasUnresolvedConstraints,
      hasCriticalConstraint,
      latestImpactsSummary,
      impactsFlags,
      correctiveMeasures,
      urgentActionsRequired,
      actionOwner,
      receptions,
      receptionsCoherent: isReceptionsSequenceCoherent(receptions),
      hasReceptionReserves: hasAnyReceptionReserves(receptions),
      isDeadlineOverdue,
      daysToDeadline,
      latestObservation,
      sourceStatus,
      sourceLabel,
      hasPendingOverlay,
      sourceReportId: referenceReport?.id,
      sourceReportDate: referenceReport?.collectionDate,
      reportedInSelectedPeriod: Boolean(periodReport),
      skilledWorkers,
      laborers,
      totalWorkers: skilledWorkers + laborers,
      siteEngineerPresent: referenceReport ? referenceReport.progress.siteEngineerPresent : null
    };
  });
  const rows = workStatus ? projectedRows.filter((r) => r.currentStatus === workStatus) : projectedRows;
  const finalProjectIds = new Set(rows.map((r) => r.projectId));
  const allScopedReports = preScopedReports.filter((r) => finalProjectIds.has(r.projectId));
  const periodReports = allScopedReports.filter(matchesSelectedPeriod);
  const totalProjects = rows.length;
  const projectsReportedInPeriod = rows.filter((r) => r.reportedInSelectedPeriod).length;
  const provinces = Array.from(new Set(rows.map((r) => r.province))).sort((a, b) => a.localeCompare(b, "fr"));
  const territories = Array.from(new Set(rows.map((r) => r.territory))).sort((a, b) => a.localeCompare(b, "fr"));
  const completed = rows.filter((r) => r.currentStatus === "ACHEVE").length;
  const inProgress = rows.filter((r) => r.currentStatus === "EN_COURS").length;
  const stopped = rows.filter((r) => r.currentStatus === "A_L_ARRET").length;
  const notStarted = rows.filter((r) => r.currentStatus === "NON_DEMARRE").length;
  const averageTep = mean1(rows.map((r) => r.currentTep));
  const averageTef = mean1(rows.map((r) => r.currentTef));
  const averageGap = mean1(rows.map((r) => r.currentGap));
  const baselineAverageTep = mean1(rows.map((r) => r.baselineTep));
  const baselineAverageTef = mean1(rows.map((r) => r.baselineTef));
  const rtOk = rows.filter((r) => r.receptions.rt.status === "OK").length;
  const rpOk = rows.filter((r) => r.receptions.rp.status === "OK").length;
  const rdOk = rows.filter((r) => r.receptions.rd.status === "OK").length;
  const rtPending = totalProjects - rtOk;
  const rpPending = totalProjects - rpOk;
  const rdPending = totalProjects - rdOk;
  const validatedReportsCount = periodReports.filter((r) => r.status === "VALIDE").length;
  const submittedOnlyReportsCount = periodReports.length - validatedReportsCount;
  const duplicateFlaggedReportsCount = periodReports.filter(
    (r) => (r.potentialDuplicateOf?.length ?? 0) > 0
  ).length;
  const kpis = {
    totalProjects,
    projectsReportedInPeriod,
    periodCoveragePercent: pct1(projectsReportedInPeriod, totalProjects),
    reportsCount: periodReports.length,
    allScopedReportsCount: allScopedReports.length,
    validatedReportsCount,
    submittedOnlyReportsCount,
    duplicateFlaggedReportsCount,
    pendingOverlayProjectsCount: rows.filter((r) => r.hasPendingOverlay).length,
    provinces,
    territories,
    provincesCount: provinces.length,
    territoriesCount: territories.length,
    completed,
    inProgress,
    stopped,
    notStarted,
    completionRatePercent: pct1(completed, totalProjects),
    averageTep,
    averageTef,
    averageGap,
    baselineAverageTep,
    baselineAverageTef,
    tepProgressionVsBaseline: round1(averageTep - baselineAverageTep),
    tefProgressionVsBaseline: round1(averageTef - baselineAverageTef),
    gapAlertsCount: rows.filter((r) => r.isGapAlert).length,
    unresolvedConstraintsCount: rows.filter((r) => r.hasUnresolvedConstraints).length,
    criticalConstraintsCount: rows.filter((r) => r.hasCriticalConstraint).length,
    overdueDeadlineCount: rows.filter((r) => r.isDeadlineOverdue).length,
    rtOk,
    rpOk,
    rdOk,
    rtPending,
    rpPending,
    rdPending,
    receptionsWithReservesCount: rows.filter((r) => r.hasReceptionReserves).length,
    totalSkilledWorkers: rows.reduce((s, r) => s + r.skilledWorkers, 0),
    totalLaborers: rows.reduce((s, r) => s + r.laborers, 0),
    totalWorkforce: rows.reduce((s, r) => s + r.totalWorkers, 0)
  };
  const weeklySummaries = buildPeriodSummaryRows(allScopedReports, "WEEKLY");
  const monthlySummaries = buildPeriodSummaryRows(allScopedReports, "MONTHLY");
  const buildGeoMetrics = (subset) => ({
    totalProjects: subset.length,
    epCount: subset.filter((r) => r.infrastructureType === "ECOLE_PRIMAIRE").length,
    csCount: subset.filter((r) => r.infrastructureType === "CENTRE_DE_SANTE").length,
    baCount: subset.filter((r) => r.infrastructureType === "BATIMENT_ADMINISTRATIF").length,
    completed: subset.filter((r) => r.currentStatus === "ACHEVE").length,
    inProgress: subset.filter((r) => r.currentStatus === "EN_COURS").length,
    stopped: subset.filter((r) => r.currentStatus === "A_L_ARRET").length,
    notStarted: subset.filter((r) => r.currentStatus === "NON_DEMARRE").length,
    averageTep: mean1(subset.map((r) => r.currentTep)),
    averageTef: mean1(subset.map((r) => r.currentTef)),
    averageGap: mean1(subset.map((r) => r.currentGap)),
    rtOk: subset.filter((r) => r.receptions.rt.status === "OK").length,
    rpOk: subset.filter((r) => r.receptions.rp.status === "OK").length,
    rdOk: subset.filter((r) => r.receptions.rd.status === "OK").length,
    gapAlertsCount: subset.filter((r) => r.isGapAlert).length,
    criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length,
    overdueCount: subset.filter((r) => r.isDeadlineOverdue).length
  });
  const byProvince = provinces.map((prov) => {
    const subset = rows.filter((r) => r.province === prov);
    return {
      province: prov,
      territoriesCount: new Set(subset.map((r) => r.territory)).size,
      ...buildGeoMetrics(subset)
    };
  });
  const territoryKeys = Array.from(new Set(rows.map((r) => `${r.province}|||${r.territory}`))).sort(
    (a, b) => a.localeCompare(b, "fr")
  );
  const byTerritory = territoryKeys.map((key) => {
    const [prov, terr] = key.split("|||");
    const subset = rows.filter((r) => r.province === prov && r.territory === terr);
    return {
      province: prov,
      territory: terr,
      ...buildGeoMetrics(subset)
    };
  });
  const infraTypes = [
    "ECOLE_PRIMAIRE",
    "CENTRE_DE_SANTE",
    "BATIMENT_ADMINISTRATIF"
  ];
  const byInfrastructureType = infraTypes.map((type) => {
    const subset = rows.filter((r) => r.infrastructureType === type);
    return {
      infrastructureType: type,
      label: INFRASTRUCTURE_TYPE_LABELS[type],
      shortCode: INFRASTRUCTURE_TYPE_SHORT[type],
      totalProjects: subset.length,
      sharePercent: pct1(subset.length, totalProjects),
      completed: subset.filter((r) => r.currentStatus === "ACHEVE").length,
      inProgress: subset.filter((r) => r.currentStatus === "EN_COURS").length,
      stopped: subset.filter((r) => r.currentStatus === "A_L_ARRET").length,
      notStarted: subset.filter((r) => r.currentStatus === "NON_DEMARRE").length,
      averageTep: mean1(subset.map((r) => r.currentTep)),
      averageTef: mean1(subset.map((r) => r.currentTef)),
      averageGap: mean1(subset.map((r) => r.currentGap)),
      rtOk: subset.filter((r) => r.receptions.rt.status === "OK").length,
      rpOk: subset.filter((r) => r.receptions.rp.status === "OK").length,
      rdOk: subset.filter((r) => r.receptions.rd.status === "OK").length,
      criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length
    };
  });
  const contractors = Array.from(new Set(rows.map((r) => r.contractor))).sort(
    (a, b) => a.localeCompare(b, "fr")
  );
  const byContractor = contractors.map((cName) => {
    const subset = rows.filter((r) => r.contractor === cName);
    return {
      contractor: cName,
      totalProjects: subset.length,
      provinces: Array.from(new Set(subset.map((r) => r.province))).sort(),
      completed: subset.filter((r) => r.currentStatus === "ACHEVE").length,
      inProgress: subset.filter((r) => r.currentStatus === "EN_COURS").length,
      stopped: subset.filter((r) => r.currentStatus === "A_L_ARRET").length,
      notStarted: subset.filter((r) => r.currentStatus === "NON_DEMARRE").length,
      averageTep: mean1(subset.map((r) => r.currentTep)),
      averageTef: mean1(subset.map((r) => r.currentTef)),
      averageGap: mean1(subset.map((r) => r.currentGap)),
      gapAlertsCount: subset.filter((r) => r.isGapAlert).length,
      criticalConstraintsCount: subset.filter((r) => r.hasCriticalConstraint).length,
      overdueCount: subset.filter((r) => r.isDeadlineOverdue).length,
      rdOk: subset.filter((r) => r.receptions.rd.status === "OK").length
    };
  }).sort((a, b) => b.totalProjects - a.totalProjects || a.contractor.localeCompare(b.contractor, "fr"));
  const constrainedCount = rows.filter((r) => r.latestConstraintCategories.length > 0).length;
  const constraintsBreakdown = CONSTRAINT_CATEGORIES.map((cat) => {
    const subset = rows.filter((r) => r.latestConstraintCategories.includes(cat.id));
    return {
      category: cat.id,
      number: cat.number,
      label: cat.label,
      examples: cat.examples,
      projectsCount: subset.length,
      shareOfConstrainedPercent: pct1(subset.length, constrainedCount),
      criticalCount: subset.filter((r) => r.hasCriticalConstraint).length,
      stoppedCount: subset.filter((r) => r.currentStatus === "A_L_ARRET").length
    };
  });
  const impactTotals = {
    delays: rows.filter((r) => r.impactsFlags.delays).length,
    costs: rows.filter((r) => r.impactsFlags.costs).length,
    quality: rows.filter((r) => r.impactsFlags.quality).length,
    stoppage: rows.filter((r) => r.impactsFlags.stoppage).length
  };
  const flaggedRows = rows.filter(
    (r) => r.hasUnresolvedConstraints || r.isGapAlert || r.hasCriticalConstraint || r.currentStatus === "A_L_ARRET"
  );
  const statusSum = completed + inProgress + stopped + notStarted;
  const provinceSum = byProvince.reduce((s, p) => s + p.totalProjects, 0);
  const territorySum = byTerritory.reduce((s, t) => s + t.totalProjects, 0);
  const typeSum = byInfrastructureType.reduce((s, t) => s + t.totalProjects, 0);
  const contractorSum = byContractor.reduce((s, c) => s + c.totalProjects, 0);
  const weeklyReportsSum = weeklySummaries.reduce((s, w) => s + w.reportsCount, 0);
  const monthlyReportsSum = monthlySummaries.reduce((s, m) => s + m.reportsCount, 0);
  const invalidBoundsRows = rows.filter(
    (r) => r.currentTep < 0 || r.currentTep > 100 || r.currentTef < 0 || r.currentTef > 100
  );
  const mismatchedGapRows = rows.filter(
    (r) => Math.abs(r.currentGap - calculateTepTefGap(r.currentTep, r.currentTef)) > 1e-3
  );
  const meanDiffDelta = Math.abs(round1(averageTep - averageTef) - averageGap);
  const gapAlertsWithoutJustification = rows.filter((r) => r.isGapAlert && !r.gapJustification);
  const incoherentReceptions = rows.filter((r) => !r.receptionsCoherent);
  const invalidScopeReports = periodReports.filter(
    (r) => rawParams.dataScope === "VALIDES_UNIQUEMENT" ? r.status !== "VALIDE" : r.status === "BROUILLON" || r.status === "RETOURNE"
  );
  const validationChecks = [
    {
      code: "SCHEMA_MATRICE_21",
      label: "Conformit\xE9 structure Matrice Unique (21 colonnes)",
      status: MATRICE_UNIQUE_HEADERS.length === 21 && MATRICE_UNIQUE_BLOC1_COUNT + MATRICE_UNIQUE_BLOC2_COUNT === 21 ? "PASS" : "FAIL",
      expected: "21 colonnes (9 Identification + 12 Suivi) + TOTAL / CONTR\xD4LES",
      actual: `${MATRICE_UNIQUE_HEADERS.length} colonnes (${MATRICE_UNIQUE_BLOC1_COUNT} + ${MATRICE_UNIQUE_BLOC2_COUNT})`,
      detail: "En-t\xEAtes et hi\xE9rarchie de blocs align\xE9s sur le mod\xE8le officiel BCECO / PDL-145T."
    },
    {
      code: "SCHEMA_FEUILLE_ROUTE_10",
      label: "Conformit\xE9 Annexe Feuille de Route Multi-Chantiers (10 colonnes)",
      status: FEUILLE_DE_ROUTE_10_HEADERS.length === 10 ? "PASS" : "FAIL",
      expected: "10 colonnes officielles + l\xE9gendes Statut/Contraintes",
      actual: `${FEUILLE_DE_ROUTE_10_HEADERS.length} colonnes`,
      detail: "Structure align\xE9e sur la page 3 du Formulaire de Collecte Terrain RSE PDL-145T."
    },
    {
      code: "RECONCILIATION_STATUTS",
      label: "R\xE9conciliation des statuts d\u2019avancement",
      status: statusSum === totalProjects ? "PASS" : "FAIL",
      expected: `${totalProjects} ouvrages`,
      actual: `${completed} + ${inProgress} + ${stopped} + ${notStarted} = ${statusSum}`,
      detail: "La somme des 4 statuts officiels (Achev\xE9, En cours, \xC0 l\u2019arr\xEAt, Non d\xE9marr\xE9) \xE9gale exactement le total."
    },
    {
      code: "RECONCILIATION_GEOGRAPHIQUE",
      label: "R\xE9conciliation g\xE9ographique (Provinces, Territoires, Entreprises)",
      status: provinceSum === totalProjects && territorySum === totalProjects && contractorSum === totalProjects ? "PASS" : "FAIL",
      expected: `${totalProjects} ouvrages sur chaque ventilation`,
      actual: `Provinces=${provinceSum} \xB7 Territoires=${territorySum} \xB7 Entreprises=${contractorSum}`,
      detail: "Aucun ouvrage perdu ni compt\xE9 en double lors de la consolidation territoriale."
    },
    {
      code: "RECONCILIATION_TYPES",
      label: "R\xE9conciliation par type d\u2019ouvrage (EP / CS / BA)",
      status: typeSum === totalProjects ? "PASS" : "FAIL",
      expected: `${totalProjects} ouvrages`,
      actual: `EP=${byInfrastructureType[0].totalProjects} \xB7 CS=${byInfrastructureType[1].totalProjects} \xB7 BA=${byInfrastructureType[2].totalProjects} (\u03A3=${typeSum})`,
      detail: "Couverture compl\xE8te des 3 cat\xE9gories officielles du programme PDL-145T."
    },
    {
      code: "INTEGRITE_TEP_TEF",
      label: "Bornes [0\u2013100 %] et formule \xC9cart = TEP \u2212 TEF par ligne",
      status: invalidBoundsRows.length === 0 && mismatchedGapRows.length === 0 ? "PASS" : "FAIL",
      expected: "0 hors bornes \xB7 0 divergence de formule",
      actual: `${invalidBoundsRows.length} hors bornes \xB7 ${mismatchedGapRows.length} divergence(s)`,
      detail: "Chaque taux physique/financier et chaque \xE9cart observ\xE9 respecte la r\xE8gle de calcul officielle."
    },
    {
      code: "COHERENCE_MOYENNES",
      label: "Coh\xE9rence moyenne \xC9cart vs (TEP moyen \u2212 TEF moyen)",
      status: meanDiffDelta <= 0.15 ? "PASS" : "FAIL",
      expected: `|(${averageTep} \u2212 ${averageTef}) \u2212 ${averageGap}| \u2264 0,1 pt`,
      actual: `\xC9cart d\u2019arrondi = ${round1(meanDiffDelta)} pt`,
      detail: "Lin\xE9arit\xE9 des moyennes arithm\xE9tiques v\xE9rifi\xE9e sur la ligne TOTAL / CONTR\xD4LES."
    },
    {
      code: "SEUIL_ALERTE_ECART_10",
      label: "Justification des \xE9carts critiques |TEP \u2212 TEF| > 10 pts",
      status: gapAlertsWithoutJustification.length === 0 ? "PASS" : "WARNING",
      expected: `${kpis.gapAlertsCount} alerte(s) document\xE9e(s)`,
      actual: `${kpis.gapAlertsCount - gapAlertsWithoutJustification.length}/${kpis.gapAlertsCount} justifi\xE9e(s)`,
      detail: gapAlertsWithoutJustification.length === 0 ? "Tous les ouvrages en \xE9cart > 10 pts disposent d\u2019une justification issue des fiches terrain." : `${gapAlertsWithoutJustification.length} ouvrage(s) sans fiche terrain r\xE9cente comportant une justification d\u2019\xE9cart (${gapAlertsWithoutJustification.map((r) => r.matrixNumber).join(", ")}).`
    },
    {
      code: "SEQUENCE_RECEPTIONS",
      label: "Int\xE9grit\xE9 de la s\xE9quence de r\xE9ceptions (RT \u2192 RP \u2192 RD)",
      status: incoherentReceptions.length === 0 ? "PASS" : "FAIL",
      expected: "0 inversion (RD\u21D2RP\u21D2RT)",
      actual: `${incoherentReceptions.length} anomalie(s)`,
      detail: "Aucune r\xE9ception d\xE9finitive ou provisoire d\xE9clar\xE9e sans r\xE9ception technique pr\xE9alable."
    },
    {
      code: "RECONCILIATION_PERIODES",
      label: "R\xE9conciliation des synth\xE8ses hebdomadaire et mensuelle",
      status: weeklyReportsSum === allScopedReports.length && monthlyReportsSum === allScopedReports.length ? "PASS" : "FAIL",
      expected: `${allScopedReports.length} fiches sur chaque agr\xE9gation`,
      actual: `Hebdo=${weeklyReportsSum} (${weeklySummaries.length} sem.) \xB7 Mensuel=${monthlyReportsSum} (${monthlySummaries.length} mois)`,
      detail: "Toutes les fiches terrain du p\xE9rim\xE8tre sont ventil\xE9es sans omission ni duplication."
    },
    {
      code: "ISOLATION_PERIMETRE_VALIDATION",
      label: "Isolation du p\xE9rim\xE8tre de validation (exclusion brouillons / retourn\xE9es)",
      status: invalidScopeReports.length === 0 ? "PASS" : "FAIL",
      expected: rawParams.dataScope === "VALIDES_UNIQUEMENT" ? "100 % fiches VALIDE uniquement" : "Uniquement VALIDE / SOUMIS / EN_COURS_VERIFICATION",
      actual: `${invalidScopeReports.length} fiche(s) non conforme(s)`,
      detail: "Les brouillons locaux et fiches retourn\xE9es sont strictement exclus des rapports consolid\xE9s."
    }
  ];
  const filterParts = [];
  filterParts.push(province ? `Province : ${province}` : "National (Toutes provinces)");
  if (territory) filterParts.push(`Territoire : ${territory}`);
  if (infrastructureType) filterParts.push(`Type : ${INFRASTRUCTURE_TYPE_SHORT[infrastructureType]}`);
  if (workStatus) filterParts.push(`Statut : ${WORK_STATUS_CONCISE[workStatus]}`);
  if (contractor) filterParts.push(`Entreprise : ${contractor}`);
  if (contractStatus) filterParts.push(`Contrat : ${contractStatus}`);
  if (periodKeyFilter) filterParts.push(`P\xE9riode filtr\xE9e : ${periodLabel}`);
  const title = `Rapport ${PERIODICITY_LABELS[rawParams.periodicity]} Consolid\xE9 \u2014 BCECO / PDL-145T (${periodLabel})`;
  return {
    params: normalizedParams,
    title,
    filtersSummary: filterParts.join(" \xB7 "),
    referenceDate,
    kpis,
    rows,
    periodReports,
    allScopedReports,
    weeklySummaries,
    monthlySummaries,
    byProvince,
    byTerritory,
    byInfrastructureType,
    byContractor,
    constraintsBreakdown,
    impactTotals,
    flaggedRows,
    validationChecks,
    allChecksPassed: validationChecks.every((c) => c.status === "PASS"),
    hasCheckFailures: validationChecks.some((c) => c.status === "FAIL")
  };
}
function consolidatedRowToMatrix21(row) {
  return [
    row.matrixNumber,
    row.contractor,
    row.province,
    row.territory,
    INFRASTRUCTURE_TYPE_LABELS[row.infrastructureType],
    row.projectName,
    row.sectorChiefdom,
    formatDateFr(row.startDate),
    formatDateFr(row.definitiveReceptionDeadline),
    WORK_STATUS_LABELS[row.currentStatus],
    row.latestPeriodRealization,
    formatExecutionStagesLabel(row.latestExecutionStages),
    row.currentTep,
    row.currentTef,
    row.currentGap,
    row.latestConstraintsSummary || "Aucune contrainte active",
    row.latestImpactsSummary || "Aucun impact majeur",
    formatReceptionCell(row.receptions.rt),
    formatReceptionCell(row.receptions.rp),
    formatReceptionCell(row.receptions.rd),
    row.hasPendingOverlay ? `[DONN\xC9E SOUMISE NON VALID\xC9E] ${row.latestObservation}` : row.latestObservation
  ];
}
function consolidatedRowToRoadmap10(row) {
  const catNumbers = row.latestConstraintCategories.map((id) => CONSTRAINT_CATEGORIES.find((c) => c.id === id)?.number ?? "").filter(Boolean).join(",");
  const constraintPrefix = catNumbers ? `[Cat. ${catNumbers}] ` : "";
  return [
    row.matrixNumber,
    `${row.projectName} (${INFRASTRUCTURE_TYPE_SHORT[row.infrastructureType]})`,
    row.contractor,
    WORK_STATUS_LABELS[row.currentStatus],
    `${row.latestPeriodRealization} [${formatExecutionStagesShort(row.latestExecutionStages)}]`,
    `${row.currentTep}%`,
    `${row.currentTef}%`,
    `${constraintPrefix}${row.latestConstraintsSummary || "N\xE9ant"}${row.latestImpactsSummary && row.latestImpactsSummary !== "Aucun impact majeur" ? ` \u2014 Impact : ${row.latestImpactsSummary}` : ""}`,
    `RT:${row.receptions.rt.status} / RP:${row.receptions.rp.status} / RD:${row.receptions.rd.status}`,
    row.hasPendingOverlay ? `[Soumis non valid\xE9] ${row.latestObservation}` : row.latestObservation
  ];
}

// src/services/export/reportExporter.ts
var XLSX2 = __toESM(require("xlsx"), 1);
var import_jspdf = require("jspdf");
var import_jspdf_autotable = require("jspdf-autotable");
var import_jszip = __toESM(require("jszip"), 1);
function safeFileSlug(input) {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 64) || "export";
}
function pdfSafeText(value) {
  return String(value ?? "").replace(/[\u202F\u00A0]/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–−]/g, "-").replace(/·/g, "|").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/⇒/g, "=>").replace(/Σ/g, "Somme");
}
function pdfSafeRow(cells) {
  return cells.map((c) => {
    if (c !== null && typeof c === "object" && "content" in c) {
      return {
        ...c,
        content: pdfSafeText(c.content)
      };
    }
    return pdfSafeText(c);
  });
}
function formatDeltaShort(delta) {
  if (delta === null) return "\u2014";
  if (delta > 0) return `+${delta.toFixed(1).replace(".", ",")} pts`;
  if (delta < 0) return `${delta.toFixed(1).replace(".", ",")} pts`;
  return "0,0 pt";
}
function getLastTableY(doc, fallback) {
  const withTable = doc;
  return withTable.lastAutoTable?.finalY ?? fallback;
}
function buildMatrixTotalRow(model) {
  const { kpis } = model;
  return [
    "TOTAL / CONTR\xD4LES",
    `${kpis.totalProjects} ouvrages`,
    `${kpis.provincesCount} provinces`,
    `${kpis.territoriesCount} territoires`,
    `EP:${model.byInfrastructureType[0].totalProjects} | CS:${model.byInfrastructureType[1].totalProjects} | BA:${model.byInfrastructureType[2].totalProjects}`,
    `Couverture p\xE9riode : ${kpis.projectsReportedInPeriod}/${kpis.totalProjects}`,
    "",
    "",
    `${kpis.overdueDeadlineCount} \xE9ch\xE9ance(s) d\xE9pass\xE9e(s)`,
    `Achev\xE9s: ${kpis.completed} | En cours: ${kpis.inProgress} | Arr\xEAt: ${kpis.stopped} | Non d\xE9m.: ${kpis.notStarted}`,
    "",
    "",
    kpis.averageTep,
    kpis.averageTef,
    kpis.averageGap,
    `${kpis.criticalConstraintsCount} critiques | ${kpis.gapAlertsCount} \xE9carts > 10 pts`,
    `Retards: ${model.impactTotals.delays} | Arr\xEAts: ${model.impactTotals.stoppage}`,
    `RT OK: ${kpis.rtOk}/${kpis.totalProjects}`,
    `RP OK: ${kpis.rpOk}/${kpis.totalProjects}`,
    `RD OK: ${kpis.rdOk}/${kpis.totalProjects}`,
    `Contr\xF4les source : ${model.validationChecks.filter((c) => c.status === "PASS").length}/${model.validationChecks.length} conformes`
  ];
}
function buildConsolidatedExcelBuffer(ctx) {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const { kpis } = model;
  const wb = XLSX2.utils.book_new();
  const sheetNames = [];
  const appendSheet = (name, ws) => {
    XLSX2.utils.book_append_sheet(wb, ws, name);
    sheetNames.push(name);
  };
  const synthRows = [
    [`R\xC9PUBLIQUE D\xC9MOCRATIQUE DU CONGO \u2014 ${INSTITUTION_REF}`],
    [model.title],
    [isDemoData ? DEMO_BANNER_TEXT : "RAPPORT CONSOLID\xC9 OFFICIEL \u2014 DIFFUSION COORDONNATEUR"],
    [],
    ["M\xC9TADONN\xC9ES DU RAPPORT", "VALEUR"],
    ["P\xE9riodicit\xE9", PERIODICITY_LABELS[model.params.periodicity]],
    ["P\xE9riode couverte", model.params.periodLabel],
    [
      "P\xE9rim\xE8tre de validation",
      model.params.dataScope === "VALIDES_UNIQUEMENT" ? "Fiches valid\xE9es par le Coordonnateur uniquement (Officiel)" : "Fiches soumises et valid\xE9es (avec distinction explicite)"
    ],
    ["Filtres appliqu\xE9s", model.filtersSummary],
    ["Date de r\xE9f\xE9rence \xE9ch\xE9ances", formatDateFr(model.referenceDate)],
    ["G\xE9n\xE9r\xE9 par (Coordonnateur)", generatedByName],
    ["Date et heure de g\xE9n\xE9ration", formatDateTimeFr(generatedAt)],
    ["Provinces couvertes", `${kpis.provincesCount} : ${kpis.provinces.join(", ") || "Aucune"}`],
    ["Territoires couverts", `${kpis.territoriesCount} : ${kpis.territories.join(", ") || "Aucun"}`],
    [],
    ["INDICATEURS EX\xC9CUTIFS CONSOLID\xC9S", "VALEUR", "OBSERVATION / R\xC9F\xC9RENCE"],
    ["Nombre total d'ouvrages dans le p\xE9rim\xE8tre", kpis.totalProjects, "Registre consolid\xE9"],
    ["Ouvrages avec fiche sur la p\xE9riode", kpis.projectsReportedInPeriod, `${kpis.periodCoveragePercent} % de couverture`],
    ["Fiches terrain re\xE7ues (p\xE9riode active)", kpis.reportsCount, `${kpis.validatedReportsCount} valid\xE9es \xB7 ${kpis.submittedOnlyReportsCount} soumises`],
    ["Fiches terrain cumul\xE9es (toutes p\xE9riodes)", kpis.allScopedReportsCount, `${kpis.duplicateFlaggedReportsCount} doublon(s) potentiel(s) sur p\xE9riode`],
    ["Ouvrages achev\xE9s", kpis.completed, `${kpis.completionRatePercent} % du parc`],
    ["Ouvrages en cours d'ex\xE9cution", kpis.inProgress, ""],
    ["Ouvrages \xE0 l'arr\xEAt", kpis.stopped, "Suivi critique requis"],
    ["Ouvrages non d\xE9marr\xE9s / ajourn\xE9s", kpis.notStarted, ""],
    ["TEP moyen (%)", kpis.averageTep, `R\xE9f\xE9rence fig\xE9e : ${kpis.baselineAverageTep} % (${formatDeltaShort(kpis.tepProgressionVsBaseline)})`],
    ["TEF moyen (%)", kpis.averageTef, `R\xE9f\xE9rence fig\xE9e : ${kpis.baselineAverageTef} % (${formatDeltaShort(kpis.tefProgressionVsBaseline)})`],
    ["\xC9cart moyen TEP \u2212 TEF (pts)", kpis.averageGap, `${kpis.gapAlertsCount} ouvrage(s) avec |\xE9cart| > 10 pts`],
    ["Ouvrages avec contraintes actives", kpis.unresolvedConstraintsCount, `${kpis.criticalConstraintsCount} contrainte(s) critique(s)`],
    ["\xC9ch\xE9ances RD contractuelles d\xE9pass\xE9es", kpis.overdueDeadlineCount, `\xC9valu\xE9es au ${formatDateFr(model.referenceDate)}`],
    ["R\xE9ceptions Techniques (RT) OK", kpis.rtOk, `${kpis.rtPending} en attente`],
    ["R\xE9ceptions Provisoires (RP) OK", kpis.rpOk, `${kpis.rpPending} en attente`],
    ["R\xE9ceptions D\xE9finitives (RD) OK", kpis.rdOk, `${kpis.rdPending} en attente \xB7 ${kpis.receptionsWithReservesCount} avec r\xE9serves`],
    ["Effectifs mobilis\xE9s sur chantiers", kpis.totalWorkforce, `${kpis.totalSkilledWorkers} ouvriers qualifi\xE9s \xB7 ${kpis.totalLaborers} man\u0153uvres`],
    [],
    ["VENTILATION PAR TYPE D\u2019OUVRAGE (EP / CS / BA)", "Ouvrages", "Part (%)", "Achev\xE9s", "En cours", "Arr\xEAt", "Non d\xE9m.", "TEP (%)", "TEF (%)", "\xC9cart", "RT OK", "RP OK", "RD OK"],
    ...model.byInfrastructureType.map((t) => [
      t.label,
      t.totalProjects,
      t.sharePercent,
      t.completed,
      t.inProgress,
      t.stopped,
      t.notStarted,
      t.averageTep,
      t.averageTef,
      t.averageGap,
      t.rtOk,
      t.rpOk,
      t.rdOk
    ]),
    [
      "TOTAL TYPES",
      kpis.totalProjects,
      100,
      kpis.completed,
      kpis.inProgress,
      kpis.stopped,
      kpis.notStarted,
      kpis.averageTep,
      kpis.averageTef,
      kpis.averageGap,
      kpis.rtOk,
      kpis.rpOk,
      kpis.rdOk
    ],
    [],
    ["TYPOLOGIE DES CONTRAINTES (4 CAT\xC9GORIES BCECO)", "Ouvrages touch\xE9s", "Part (%)", "Critiques", "\xC0 l\u2019arr\xEAt", "Exemples officiels"],
    ...model.constraintsBreakdown.map((c) => [
      `${c.number}) ${c.label}`,
      c.projectsCount,
      c.shareOfConstrainedPercent,
      c.criticalCount,
      c.stoppedCount,
      c.examples
    ]),
    [],
    ["CONTR\xD4LES DE VALIDATION CONTRE LA STRUCTURE SOURCE", "STATUT", "ATTENDU", "OBSERV\xC9", "D\xC9TAIL"],
    ...model.validationChecks.map((chk) => [
      `${chk.code} \u2014 ${chk.label}`,
      chk.status,
      chk.expected,
      chk.actual,
      chk.detail
    ])
  ];
  const wsSynth = XLSX2.utils.aoa_to_sheet(synthRows);
  wsSynth["!cols"] = [
    { wch: 46 },
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    { wch: 24 },
    { wch: 40 },
    { wch: 12 },
    { wch: 11 },
    { wch: 11 },
    { wch: 11 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 }
  ];
  appendSheet("1_Synthese_Executive", wsSynth);
  const periodAoA = [
    [`SYNTH\xC8SES HEBDOMADAIRE ET MENSUELLE \u2014 ${INSTITUTION_REF}${isDemoData ? " [MODE D\xC9MONSTRATION]" : ""}`],
    [`Filtres : ${model.filtersSummary} | P\xE9rim\xE8tre : ${model.params.dataScope}`],
    [],
    ["A. SYNTH\xC8SE HEBDOMADAIRE (PAR SEMAINE ISO)"],
    [
      "Code Semaine",
      "Libell\xE9",
      "Plage de dates",
      "Fiches re\xE7ues",
      "Valid\xE9es",
      "Soumises",
      "Ouvrages couverts",
      "Achev\xE9s",
      "En cours",
      "Arr\xEAt",
      "TEP moy. (%)",
      "TEF moy. (%)",
      "\xC9cart moy.",
      "\u0394TEP vs S-1",
      "\u0394TEF vs S-1",
      "\xC9carts >10 pts",
      "Critiques",
      "RT / RP / RD OK",
      "Effectifs"
    ],
    ...model.weeklySummaries.map((w) => [
      w.periodKey,
      w.label,
      w.dateRange,
      w.reportsCount,
      w.validatedCount,
      w.submittedCount,
      w.uniqueProjectsCount,
      w.completedCount,
      w.inProgressCount,
      w.stoppedCount,
      w.averageTep,
      w.averageTef,
      w.averageGap,
      formatDeltaShort(w.tepDeltaVsPrev),
      formatDeltaShort(w.tefDeltaVsPrev),
      w.gapAlertsCount,
      w.criticalConstraintsCount,
      `${w.rtOkCount} / ${w.rpOkCount} / ${w.rdOkCount}`,
      w.totalWorkforce
    ]),
    [],
    ["B. SYNTH\xC8SE MENSUELLE (PAR MOIS CALENDAIRE)"],
    [
      "Code Mois",
      "Mois",
      "Plage de dates",
      "Fiches re\xE7ues",
      "Valid\xE9es",
      "Soumises",
      "Ouvrages couverts",
      "Achev\xE9s",
      "En cours",
      "Arr\xEAt",
      "TEP moy. (%)",
      "TEF moy. (%)",
      "\xC9cart moy.",
      "\u0394TEP vs M-1",
      "\u0394TEF vs M-1",
      "\xC9carts >10 pts",
      "Critiques",
      "RT / RP / RD OK",
      "Effectifs"
    ],
    ...model.monthlySummaries.map((m) => [
      m.periodKey,
      m.label,
      m.dateRange,
      m.reportsCount,
      m.validatedCount,
      m.submittedCount,
      m.uniqueProjectsCount,
      m.completedCount,
      m.inProgressCount,
      m.stoppedCount,
      m.averageTep,
      m.averageTef,
      m.averageGap,
      formatDeltaShort(m.tepDeltaVsPrev),
      formatDeltaShort(m.tefDeltaVsPrev),
      m.gapAlertsCount,
      m.criticalConstraintsCount,
      `${m.rtOkCount} / ${m.rpOkCount} / ${m.rdOkCount}`,
      m.totalWorkforce
    ])
  ];
  const wsPeriod = XLSX2.utils.aoa_to_sheet(periodAoA);
  wsPeriod["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 11 }
  ];
  appendSheet("2_Hebdo_Mensuel", wsPeriod);
  const geoAoA = [
    [`VENTILATION G\xC9OGRAPHIQUE & ENTREPRISES \u2014 ${model.params.periodLabel.toUpperCase()}`],
    [],
    ["A. SYNTH\xC8SE PAR PROVINCE"],
    [
      "Province",
      "Territoires",
      "Total Ouvrages",
      "EP",
      "CS",
      "BA",
      "Achev\xE9s",
      "En cours",
      "\xC0 l\u2019arr\xEAt",
      "Non d\xE9m.",
      "TEP moy. (%)",
      "TEF moy. (%)",
      "\xC9cart moy.",
      "RT OK",
      "RP OK",
      "RD OK",
      "\xC9carts >10",
      "Critiques",
      "\xC9ch. d\xE9pass\xE9es"
    ],
    ...model.byProvince.map((p) => [
      p.province,
      p.territoriesCount,
      p.totalProjects,
      p.epCount,
      p.csCount,
      p.baCount,
      p.completed,
      p.inProgress,
      p.stopped,
      p.notStarted,
      p.averageTep,
      p.averageTef,
      p.averageGap,
      p.rtOk,
      p.rpOk,
      p.rdOk,
      p.gapAlertsCount,
      p.criticalConstraintsCount,
      p.overdueCount
    ]),
    [
      "TOTAL / CONTR\xD4LES",
      kpis.territoriesCount,
      kpis.totalProjects,
      model.byInfrastructureType[0].totalProjects,
      model.byInfrastructureType[1].totalProjects,
      model.byInfrastructureType[2].totalProjects,
      kpis.completed,
      kpis.inProgress,
      kpis.stopped,
      kpis.notStarted,
      kpis.averageTep,
      kpis.averageTef,
      kpis.averageGap,
      kpis.rtOk,
      kpis.rpOk,
      kpis.rdOk,
      kpis.gapAlertsCount,
      kpis.criticalConstraintsCount,
      kpis.overdueDeadlineCount
    ],
    [],
    ["B. SYNTH\xC8SE PAR TERRITOIRE"],
    [
      "Province",
      "Territoire",
      "Total Ouvrages",
      "EP",
      "CS",
      "BA",
      "Achev\xE9s",
      "En cours",
      "\xC0 l\u2019arr\xEAt",
      "Non d\xE9m.",
      "TEP moy. (%)",
      "TEF moy. (%)",
      "\xC9cart moy.",
      "RT OK",
      "RP OK",
      "RD OK",
      "\xC9carts >10",
      "Critiques",
      "\xC9ch. d\xE9pass\xE9es"
    ],
    ...model.byTerritory.map((t) => [
      t.province,
      t.territory,
      t.totalProjects,
      t.epCount,
      t.csCount,
      t.baCount,
      t.completed,
      t.inProgress,
      t.stopped,
      t.notStarted,
      t.averageTep,
      t.averageTef,
      t.averageGap,
      t.rtOk,
      t.rpOk,
      t.rdOk,
      t.gapAlertsCount,
      t.criticalConstraintsCount,
      t.overdueCount
    ]),
    [],
    ["C. PERFORMANCE PAR ENTREPRISE ATTRIBUTAIRE (PME)"],
    [
      "Entreprise",
      "Provinces",
      "Total Ouvrages",
      "Achev\xE9s",
      "En cours",
      "\xC0 l\u2019arr\xEAt",
      "Non d\xE9m.",
      "TEP moy. (%)",
      "TEF moy. (%)",
      "\xC9cart moy.",
      "RD OK",
      "\xC9carts >10",
      "Critiques",
      "\xC9ch. d\xE9pass\xE9es"
    ],
    ...model.byContractor.map((c) => [
      c.contractor,
      c.provinces.join(", "),
      c.totalProjects,
      c.completed,
      c.inProgress,
      c.stopped,
      c.notStarted,
      c.averageTep,
      c.averageTef,
      c.averageGap,
      c.rdOk,
      c.gapAlertsCount,
      c.criticalConstraintsCount,
      c.overdueCount
    ])
  ];
  const wsGeo = XLSX2.utils.aoa_to_sheet(geoAoA);
  wsGeo["!cols"] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 11 },
    { wch: 10 },
    { wch: 14 }
  ];
  appendSheet("3_Geographie", wsGeo);
  const blocHeaderRow = [
    MATRICE_UNIQUE_BLOC1_LABEL,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    MATRICE_UNIQUE_BLOC2_LABEL,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ];
  const matrixHeaders = [...MATRICE_UNIQUE_HEADERS, "Photos Miniatures (URLs)"];
  const matrixRows = model.rows.map((row) => {
    const base = consolidatedRowToMatrix21(row);
    const projReports = ctx.reports?.filter((r) => r.projectId === row.projectId) ?? [];
    const photos = projReports.flatMap((r) => r.receptions?.photos || []);
    const photoSummary = photos.length > 0 ? photos.map((p, i) => `[Photo ${i + 1}: ${p.fileName}] (${p.dataUrl ? "Miniature base64 dispo" : "Lien absent"})`).join(" ; ") : "Aucune photo jointe";
    return [...base, photoSummary];
  });
  const totalRow = buildMatrixTotalRow(model);
  const matrixAoA = [
    [`MATRICE UNIQUE DES OUVRAGES ${INSTITUTION_REF} \u2014 ${model.params.periodLabel.toUpperCase()}${isDemoData ? " [DONN\xC9ES D\xC9MO]" : ""}`],
    blocHeaderRow,
    matrixHeaders,
    ...matrixRows,
    [...totalRow, ""]
  ];
  const wsMatrix = XLSX2.utils.aoa_to_sheet(matrixAoA);
  wsMatrix["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 21 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 1, c: 9 }, e: { r: 1, c: 21 } }
  ];
  wsMatrix["!cols"] = [
    { wch: 13 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 36 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
    { wch: 38 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 36 },
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 38 },
    { wch: 45 }
  ];
  appendSheet("4_Matrice_Unique_21col", wsMatrix);
  const constraintRows = [
    [`REGISTRE DES CONTRAINTES, ALERTES \xC9CART |TEP \u2212 TEF| > 10 PTS ET MESURES CORRECTIVES \u2014 ${model.params.periodLabel}`],
    [
      "N\xB0 Matrice",
      "Ouvrage",
      "Province / Territoire",
      "Entreprise",
      "Statut",
      "TEP (%)",
      "TEF (%)",
      "\xC9cart (pts)",
      "Alerte >10 pts",
      "Cat\xE9gories (1-4)",
      "Critique",
      "Contraintes d\xE9taill\xE9es",
      "Impacts (D/C/Q/A)",
      "Justification \xE9cart",
      "Mesures correctives",
      "Actions urgentes",
      "Responsable"
    ],
    ...model.flaggedRows.map((r) => {
      const catLabels = r.latestConstraintCategories.map((id) => {
        const def = CONSTRAINT_CATEGORIES.find((c) => c.id === id);
        return def ? `${def.number}) ${def.label}` : id;
      }).join(" ; ");
      const impactCodes = [
        r.impactsFlags.delays ? "D\xE9lais" : "",
        r.impactsFlags.costs ? "Co\xFBts" : "",
        r.impactsFlags.quality ? "Qualit\xE9" : "",
        r.impactsFlags.stoppage ? "Arr\xEAt" : ""
      ].filter(Boolean).join(", ");
      return [
        r.matrixNumber,
        r.projectName,
        `${r.province} / ${r.territory}`,
        r.contractor,
        WORK_STATUS_CONCISE[r.currentStatus],
        r.currentTep,
        r.currentTef,
        r.currentGap,
        r.isGapAlert ? "OUI" : "Non",
        catLabels || "Aucune cat\xE9gorie",
        r.hasCriticalConstraint ? "CRITIQUE" : "Standard",
        r.latestConstraintsSummary || "\xC9cart TEP/TEF > 10 pts",
        impactCodes ? `${impactCodes} \u2014 ${r.latestImpactsSummary}` : r.latestImpactsSummary,
        r.gapJustification || (r.isGapAlert ? "Non renseign\xE9e dans les fiches" : "\u2014"),
        r.correctiveMeasures,
        r.urgentActionsRequired || "\u2014",
        r.actionOwner
      ];
    })
  ];
  const wsConstraints = XLSX2.utils.aoa_to_sheet(constraintRows);
  wsConstraints["!cols"] = [
    { wch: 13 },
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 13 },
    { wch: 10 },
    { wch: 10 },
    { wch: 11 },
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 36 },
    { wch: 32 },
    { wch: 34 },
    { wch: 36 },
    { wch: 32 },
    { wch: 20 }
  ];
  appendSheet("5_Contraintes_Alertes", wsConstraints);
  const receptionRows = [
    [`SUIVI DES R\xC9CEPTIONS (RT / RP / RD), PROC\xC8S-VERBAUX ET \xC9CH\xC9ANCES CONTRACTUELLES \u2014 ${model.params.periodLabel}`],
    [
      "N\xB0 Matrice",
      "Ouvrage",
      "Province / Territoire",
      "Entreprise",
      "Contrat",
      "Statut",
      "TEP (%)",
      "Date d\xE9marrage",
      "\xC9ch\xE9ance RD contractuelle",
      "Conformit\xE9 d\xE9lai",
      "RT (Statut / Date / PV)",
      "RP (Statut / Date / PV)",
      "RD (Statut / Date / PV)",
      "R\xE9serves signal\xE9es",
      "S\xE9quence RT\u2192RP\u2192RD"
    ],
    ...model.rows.map((r) => {
      const reservesList = [
        r.receptions.rt.reserves ? `RT: ${r.receptions.rt.reserves}` : "",
        r.receptions.rp.reserves ? `RP: ${r.receptions.rp.reserves}` : "",
        r.receptions.rd.reserves ? `RD: ${r.receptions.rd.reserves}` : ""
      ].filter(Boolean).join(" | ");
      const delayLabel = r.receptions.rd.status === "OK" ? "R\xE9ceptionn\xE9 (RD OK)" : r.isDeadlineOverdue ? `D\xC9PASS\xC9E (${Math.abs(r.daysToDeadline ?? 0)} j)` : r.daysToDeadline !== null ? `Dans ${r.daysToDeadline} j` : "\u2014";
      return [
        r.matrixNumber,
        r.projectName,
        `${r.province} / ${r.territory}`,
        r.contractor,
        CONTRACT_STATUS_LABELS[r.contractStatus],
        WORK_STATUS_CONCISE[r.currentStatus],
        r.currentTep,
        formatDateFr(r.startDate),
        formatDateFr(r.definitiveReceptionDeadline),
        delayLabel,
        formatReceptionCell(r.receptions.rt),
        formatReceptionCell(r.receptions.rp),
        formatReceptionCell(r.receptions.rd),
        reservesList || "Aucune r\xE9serve",
        r.receptionsCoherent ? "Coh\xE9rente" : "ANOMALIE"
      ];
    })
  ];
  const wsReceptions = XLSX2.utils.aoa_to_sheet(receptionRows);
  wsReceptions["!cols"] = [
    { wch: 13 },
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 13 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 34 },
    { wch: 16 }
  ];
  appendSheet("6_Receptions_RT_RP_RD", wsReceptions);
  const reportRows = [
    [`ANNEXE \u2014 FICHES DE COLLECTE TERRAIN INCLUSES (${model.periodReports.length} FICHES)`],
    [
      "ID Fiche",
      "Version",
      "N\xB0 Matrice",
      "Ouvrage",
      "Province / Territoire",
      "Agent Terrain",
      "P\xE9riodicit\xE9",
      "Semaine ISO",
      "Mois",
      "Date collecte",
      "Statut validation",
      "Statut travaux",
      "TEP (%)",
      "TEF (%)",
      "\xC9cart (pts)",
      "Effectifs (Q+M)",
      "Coordonn\xE9es GPS",
      "Doublon potentiel"
    ],
    ...model.periodReports.map((r) => [
      r.id,
      `v${r.version}`,
      r.matrixNumber,
      r.identification.projectName,
      `${r.identification.province} / ${r.identification.territory}`,
      r.agentName,
      PERIODICITY_LABELS[r.periodicity],
      normalizeReportWeekCode(r),
      normalizeReportMonthKey(r),
      formatDateFr(r.collectionDate),
      r.status === "VALIDE" ? "VALID\xC9 COORDONNATEUR" : `NON VALID\xC9 (${r.status})`,
      WORK_STATUS_CONCISE[r.progress.workStatus],
      r.progress.currentTep,
      r.progress.currentTef,
      r.progress.tepTefGap,
      (r.progress.skilledWorkersCount || 0) + (r.progress.laborersCount || 0),
      r.identification.gpsLat && r.identification.gpsLng ? `${r.identification.gpsLat}, ${r.identification.gpsLng}` : "\u2014",
      r.potentialDuplicateOf.length > 0 ? `Oui (${r.potentialDuplicateOf.join(", ")})` : "Non"
    ])
  ];
  const wsReports = XLSX2.utils.aoa_to_sheet(reportRows);
  wsReports["!cols"] = [
    { wch: 20 },
    { wch: 9 },
    { wch: 13 },
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 13 },
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 11 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 }
  ];
  appendSheet("7_Annexe_Fiches_Terrain", wsReports);
  const arrayBuf = XLSX2.write(wb, { type: "array", bookType: "xlsx" });
  const fileName = `BCECO_PDL145T_${safeFileSlug(model.params.periodicity)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.xlsx`;
  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sheetNames
  };
}
function escapeCsvCell(val) {
  const str = String(val ?? "");
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function buildConsolidatedCsvBuffer(ctx, variant = "MATRICE_21") {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const lines = [
    `# ${INSTITUTION_REF} \u2014 ${model.title}`,
    `# P\xE9riode: ${model.params.periodLabel} | P\xE9rim\xE8tre: ${model.params.dataScope} | Filtres: ${model.filtersSummary} | G\xE9n\xE9r\xE9 par: ${generatedByName} le ${formatDateTimeFr(generatedAt)}${isDemoData ? " | MODE D\xC9MONSTRATION" : ""}`
  ];
  let suffix = "Matrice21";
  if (variant === "MATRICE_21") {
    lines.push(MATRICE_UNIQUE_HEADERS.map(escapeCsvCell).join(";"));
    for (const row of model.rows) {
      lines.push(consolidatedRowToMatrix21(row).map(escapeCsvCell).join(";"));
    }
    lines.push(buildMatrixTotalRow(model).map(escapeCsvCell).join(";"));
  } else if (variant === "SYNTHESES_GEO") {
    suffix = "Syntheses_Geo";
    lines.push("# SECTION 1 \u2014 SYNTH\xC8SE HEBDOMADAIRE");
    lines.push(
      [
        "Semaine",
        "Libell\xE9",
        "Plage",
        "Fiches",
        "Valid\xE9es",
        "Soumises",
        "Ouvrages",
        "TEP%",
        "TEF%",
        "\xC9cart",
        "\u0394TEP",
        "\u0394TEF",
        "Critiques"
      ].map(escapeCsvCell).join(";")
    );
    for (const w of model.weeklySummaries) {
      lines.push(
        [
          w.periodKey,
          w.label,
          w.dateRange,
          w.reportsCount,
          w.validatedCount,
          w.submittedCount,
          w.uniqueProjectsCount,
          w.averageTep,
          w.averageTef,
          w.averageGap,
          formatDeltaShort(w.tepDeltaVsPrev),
          formatDeltaShort(w.tefDeltaVsPrev),
          w.criticalConstraintsCount
        ].map(escapeCsvCell).join(";")
      );
    }
    lines.push("");
    lines.push("# SECTION 2 \u2014 SYNTH\xC8SE MENSUELLE");
    lines.push(
      [
        "Mois",
        "Libell\xE9",
        "Plage",
        "Fiches",
        "Valid\xE9es",
        "Soumises",
        "Ouvrages",
        "TEP%",
        "TEF%",
        "\xC9cart",
        "\u0394TEP",
        "\u0394TEF",
        "Critiques"
      ].map(escapeCsvCell).join(";")
    );
    for (const m of model.monthlySummaries) {
      lines.push(
        [
          m.periodKey,
          m.label,
          m.dateRange,
          m.reportsCount,
          m.validatedCount,
          m.submittedCount,
          m.uniqueProjectsCount,
          m.averageTep,
          m.averageTef,
          m.averageGap,
          formatDeltaShort(m.tepDeltaVsPrev),
          formatDeltaShort(m.tefDeltaVsPrev),
          m.criticalConstraintsCount
        ].map(escapeCsvCell).join(";")
      );
    }
    lines.push("");
    lines.push("# SECTION 3 \u2014 SYNTH\xC8SE PAR PROVINCE");
    lines.push(
      [
        "Province",
        "Territoires",
        "Ouvrages",
        "EP",
        "CS",
        "BA",
        "Achev\xE9s",
        "En cours",
        "Arr\xEAt",
        "Non d\xE9m.",
        "TEP%",
        "TEF%",
        "\xC9cart",
        "RT OK",
        "RP OK",
        "RD OK",
        "Critiques"
      ].map(escapeCsvCell).join(";")
    );
    for (const p of model.byProvince) {
      lines.push(
        [
          p.province,
          p.territoriesCount,
          p.totalProjects,
          p.epCount,
          p.csCount,
          p.baCount,
          p.completed,
          p.inProgress,
          p.stopped,
          p.notStarted,
          p.averageTep,
          p.averageTef,
          p.averageGap,
          p.rtOk,
          p.rpOk,
          p.rdOk,
          p.criticalConstraintsCount
        ].map(escapeCsvCell).join(";")
      );
    }
  } else {
    suffix = "Contraintes_Receptions";
    lines.push(
      [
        "N\xB0 Matrice",
        "Ouvrage",
        "Province",
        "Territoire",
        "Entreprise",
        "Statut",
        "TEP%",
        "TEF%",
        "\xC9cart",
        "Alerte >10",
        "Critique",
        "Contraintes",
        "Impacts",
        "Mesures correctives",
        "\xC9ch\xE9ance RD",
        "D\xE9lai",
        "RT",
        "RP",
        "RD"
      ].map(escapeCsvCell).join(";")
    );
    for (const r of model.rows) {
      lines.push(
        [
          r.matrixNumber,
          r.projectName,
          r.province,
          r.territory,
          r.contractor,
          WORK_STATUS_CONCISE[r.currentStatus],
          r.currentTep,
          r.currentTef,
          r.currentGap,
          r.isGapAlert ? "OUI" : "Non",
          r.hasCriticalConstraint ? "OUI" : "Non",
          r.latestConstraintsSummary,
          r.latestImpactsSummary,
          r.correctiveMeasures,
          formatDateFr(r.definitiveReceptionDeadline),
          r.isDeadlineOverdue ? "D\xC9PASS\xC9E" : r.receptions.rd.status === "OK" ? "RD OK" : "En d\xE9lai",
          formatReceptionCell(r.receptions.rt),
          formatReceptionCell(r.receptions.rp),
          formatReceptionCell(r.receptions.rd)
        ].map(escapeCsvCell).join(";")
      );
    }
  }
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const bytes = new TextEncoder().encode(csvContent);
  const fileName = `BCECO_PDL145T_${suffix}_${safeFileSlug(model.params.periodLabel)}_${generatedAt.slice(0, 10)}.csv`;
  return {
    bytes,
    fileName,
    mimeType: "text/csv;charset=utf-8"
  };
}
function buildConsolidatedPdfBuffer(ctx) {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const { kpis } = model;
  const doc = new import_jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const drawSectionHeading = (title, y) => {
    doc.setTextColor(15, 37, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(pdfSafeText(title), 14, y);
    return y + 3;
  };
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text(pdfSafeText("R\xC9PUBLIQUE D\xC9MOCRATIQUE DU CONGO \u2014 PROGRAMME PDL-145T (BCECO)"), 14, 9.5);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(pdfSafeText(model.title), 14, 16);
  doc.setFontSize(8);
  doc.text(
    pdfSafeText(
      `P\xE9riodicit\xE9 : ${PERIODICITY_LABELS[model.params.periodicity]}  |  P\xE9rim\xE8tre : ${model.params.dataScope === "VALIDES_UNIQUEMENT" ? "Valid\xE9es uniquement" : "Soumises + Valid\xE9es"}  |  G\xE9n\xE9r\xE9 le ${formatDateTimeFr(generatedAt)} par ${generatedByName}`
    ),
    14,
    22
  );
  let yPos = 30.5;
  if (isDemoData) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(14, yPos, 269, 6.5, "FD");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(pdfSafeText(DEMO_BANNER_TEXT), 17, yPos + 4.4);
    yPos += 10.5;
  }
  yPos = drawSectionHeading("1. SYNTH\xC8SE EX\xC9CUTIVE, INDICATEURS CL\xC9S & CONTR\xD4LES DE VALIDATION SOURCE", yPos);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    head: [
      pdfSafeRow([
        "Ouvrages",
        "Fiches p\xE9riode (Val. / Soum.)",
        "Achev\xE9s / En cours",
        "Arr\xEAt / Non d\xE9m.",
        "TEP Moyen (vs R\xE9f.)",
        "TEF Moyen (vs R\xE9f.)",
        "\xC9cart Moyen",
        "RT / RP / RD OK",
        "\xC9carts >10 / Critiques",
        "Contr\xF4les source"
      ])
    ],
    body: [
      pdfSafeRow([
        String(kpis.totalProjects),
        `${kpis.reportsCount} (${kpis.validatedReportsCount} / ${kpis.submittedOnlyReportsCount})`,
        `${kpis.completed} (${formatPercentFr(kpis.completionRatePercent, 0)}) / ${kpis.inProgress}`,
        `${kpis.stopped} / ${kpis.notStarted}`,
        `${formatPercentFr(kpis.averageTep, 1)} (${formatDeltaShort(kpis.tepProgressionVsBaseline)})`,
        `${formatPercentFr(kpis.averageTef, 1)} (${formatDeltaShort(kpis.tefProgressionVsBaseline)})`,
        formatSignedGapFr(kpis.averageGap),
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk}`,
        `${kpis.gapAlertsCount} / ${kpis.criticalConstraintsCount}`,
        `${model.validationChecks.filter((c) => c.status === "PASS").length}/${model.validationChecks.length} OK`
      ])
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7.2, fontStyle: "bold" },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 }
  });
  yPos = getLastTableY(doc, yPos + 16) + 4.5;
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(
    pdfSafeText(
      `Filtres actifs : ${model.filtersSummary}  |  Couverture : ${kpis.provincesCount} province(s), ${kpis.territoriesCount} territoire(s)  |  Effectifs mobilis\xE9s : ${kpis.totalWorkforce} (${kpis.totalSkilledWorkers} qualifi\xE9s, ${kpis.totalLaborers} man\u0153uvres).`
    ),
    14,
    yPos
  );
  yPos += 6;
  yPos = drawSectionHeading("2. SYNTH\xC8SES HEBDOMADAIRE ET MENSUELLE (\xC9VOLUTION DES FICHES & TAUX TEP / TEF)", yPos);
  if (model.weeklySummaries.length > 0) {
    (0, import_jspdf_autotable.autoTable)(doc, {
      startY: yPos,
      head: [
        pdfSafeRow([
          "Semaine ISO",
          "Plage de dates",
          "Fiches (Val./Soum.)",
          "Ouvrages",
          "Achev./Cours/Arr\xEAt",
          "TEP moy.",
          "TEF moy.",
          "\xC9cart",
          "\u0394TEP S-1",
          "\u0394TEF S-1",
          "Critiques",
          "Effectifs"
        ])
      ],
      body: model.weeklySummaries.map(
        (w) => pdfSafeRow([
          w.periodKey,
          w.dateRange,
          `${w.reportsCount} (${w.validatedCount}/${w.submittedCount})`,
          String(w.uniqueProjectsCount),
          `${w.completedCount} / ${w.inProgressCount} / ${w.stoppedCount}`,
          formatPercentFr(w.averageTep, 1),
          formatPercentFr(w.averageTef, 1),
          formatSignedGapFr(w.averageGap),
          formatDeltaShort(w.tepDeltaVsPrev),
          formatDeltaShort(w.tefDeltaVsPrev),
          String(w.criticalConstraintsCount),
          String(w.totalWorkforce)
        ])
      ),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7, cellPadding: 1.6 },
      margin: { left: 14, right: 14 }
    });
    yPos = getLastTableY(doc, yPos + 16) + 5;
  }
  if (model.monthlySummaries.length > 0) {
    (0, import_jspdf_autotable.autoTable)(doc, {
      startY: yPos,
      head: [
        pdfSafeRow([
          "Mois",
          "Plage de dates",
          "Fiches (Val./Soum.)",
          "Ouvrages",
          "Achev./Cours/Arr\xEAt",
          "TEP moy.",
          "TEF moy.",
          "\xC9cart",
          "\u0394TEP M-1",
          "\u0394TEF M-1",
          "RT/RP/RD OK",
          "Critiques"
        ])
      ],
      body: model.monthlySummaries.map(
        (m) => pdfSafeRow([
          m.label,
          m.dateRange,
          `${m.reportsCount} (${m.validatedCount}/${m.submittedCount})`,
          String(m.uniqueProjectsCount),
          `${m.completedCount} / ${m.inProgressCount} / ${m.stoppedCount}`,
          formatPercentFr(m.averageTep, 1),
          formatPercentFr(m.averageTef, 1),
          formatSignedGapFr(m.averageGap),
          formatDeltaShort(m.tepDeltaVsPrev),
          formatDeltaShort(m.tefDeltaVsPrev),
          `${m.rtOkCount}/${m.rpOkCount}/${m.rdOkCount}`,
          String(m.criticalConstraintsCount)
        ])
      ),
      theme: "striped",
      headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7, cellPadding: 1.6 },
      margin: { left: 14, right: 14 }
    });
  }
  doc.addPage();
  let yGeo = drawSectionHeading("3. VENTILATION G\xC9OGRAPHIQUE (PROVINCES & TERRITOIRES) ET PAR TYPE D\u2019OUVRAGE", 16);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yGeo,
    head: [
      pdfSafeRow([
        "Province",
        "Terr.",
        "Total",
        "EP / CS / BA",
        "Achev\xE9s",
        "En cours",
        "Arr\xEAt",
        "Non d\xE9m.",
        "TEP moy.",
        "TEF moy.",
        "\xC9cart",
        "RT / RP / RD",
        "\xC9carts >10",
        "Critiques"
      ])
    ],
    body: [
      ...model.byProvince.map(
        (p) => pdfSafeRow([
          p.province,
          String(p.territoriesCount),
          String(p.totalProjects),
          `${p.epCount} / ${p.csCount} / ${p.baCount}`,
          String(p.completed),
          String(p.inProgress),
          String(p.stopped),
          String(p.notStarted),
          formatPercentFr(p.averageTep, 1),
          formatPercentFr(p.averageTef, 1),
          formatSignedGapFr(p.averageGap),
          `${p.rtOk} / ${p.rpOk} / ${p.rdOk}`,
          String(p.gapAlertsCount),
          String(p.criticalConstraintsCount)
        ])
      ),
      pdfSafeRow([
        "TOTAL / CONTR\xD4LES",
        String(kpis.territoriesCount),
        String(kpis.totalProjects),
        `${model.byInfrastructureType[0].totalProjects} / ${model.byInfrastructureType[1].totalProjects} / ${model.byInfrastructureType[2].totalProjects}`,
        String(kpis.completed),
        String(kpis.inProgress),
        String(kpis.stopped),
        String(kpis.notStarted),
        formatPercentFr(kpis.averageTep, 1),
        formatPercentFr(kpis.averageTef, 1),
        formatSignedGapFr(kpis.averageGap),
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk}`,
        String(kpis.gapAlertsCount),
        String(kpis.criticalConstraintsCount)
      ])
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.7 },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === model.byProvince.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    margin: { left: 14, right: 14 }
  });
  yGeo = getLastTableY(doc, yGeo + 40) + 7;
  yGeo = drawSectionHeading("3.B R\xC9PARTITION PAR TYPE D\u2019OUVRAGE (\xC9COLES PRIMAIRES, CENTRES DE SANT\xC9, B\xC2TIMENTS ADMINISTRATIFS)", yGeo);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yGeo,
    head: [
      pdfSafeRow([
        "Type d\u2019ouvrage",
        "Nombre",
        "Part (%)",
        "Achev\xE9s",
        "En cours",
        "\xC0 l\u2019arr\xEAt",
        "Non d\xE9m.",
        "TEP moy.",
        "TEF moy.",
        "\xC9cart moy.",
        "RT / RP / RD OK",
        "Critiques"
      ])
    ],
    body: model.byInfrastructureType.map(
      (t) => pdfSafeRow([
        t.label,
        String(t.totalProjects),
        formatPercentFr(t.sharePercent, 1),
        String(t.completed),
        String(t.inProgress),
        String(t.stopped),
        String(t.notStarted),
        formatPercentFr(t.averageTep, 1),
        formatPercentFr(t.averageTef, 1),
        formatSignedGapFr(t.averageGap),
        `${t.rtOk} / ${t.rpOk} / ${t.rdOk}`,
        String(t.criticalConstraintsCount)
      ])
    ),
    theme: "grid",
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.7 },
    margin: { left: 14, right: 14 }
  });
  doc.addPage();
  let yConst = drawSectionHeading("4. ANALYSE DES CONTRAINTES (4 TYPOLOGIES BCECO), \xC9CARTS |TEP \u2212 TEF| > 10 PTS & MESURES CORRECTIVES", 16);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yConst,
    head: [pdfSafeRow(["Typologie officielle", "Ouvrages touch\xE9s", "Part (%)", "Critiques", "\xC0 l\u2019arr\xEAt", "Nature des contraintes"])],
    body: model.constraintsBreakdown.map(
      (c) => pdfSafeRow([
        `${c.number}) ${c.label}`,
        String(c.projectsCount),
        formatPercentFr(c.shareOfConstrainedPercent, 1),
        String(c.criticalCount),
        String(c.stoppedCount),
        c.examples
      ])
    ),
    theme: "grid",
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.6 },
    margin: { left: 14, right: 14 }
  });
  yConst = getLastTableY(doc, yConst + 30) + 6;
  if (model.flaggedRows.length > 0) {
    (0, import_jspdf_autotable.autoTable)(doc, {
      startY: yConst,
      head: [
        pdfSafeRow([
          "N\xB0",
          "Ouvrage & Localisation",
          "TEP / TEF (\xC9cart)",
          "Critique",
          "Contraintes & Impacts",
          "Mesures correctives & Responsable"
        ])
      ],
      body: model.flaggedRows.map(
        (r) => pdfSafeRow([
          r.matrixNumber,
          `${r.projectName}
${r.province} - ${r.territory} (${r.contractor})`,
          `${r.currentTep}% / ${r.currentTef}%
(${formatSignedGapFr(r.currentGap)})`,
          r.hasCriticalConstraint ? "OUI" : "Non",
          `${r.latestConstraintsSummary || "\xC9cart > 10 pts"}
Impact : ${r.latestImpactsSummary}`,
          `${r.correctiveMeasures}
[Resp. : ${r.actionOwner}]`
        ])
      ),
      theme: "striped",
      headStyles: { fillColor: [153, 27, 27], textColor: 255, fontSize: 7.1 },
      bodyStyles: { fontSize: 6.9, cellPadding: 1.6 },
      margin: { left: 14, right: 14 }
    });
  }
  doc.addPage();
  const yRec = drawSectionHeading("5. SUIVI DES R\xC9CEPTIONS (RT / RP / RD), R\xC9F\xC9RENCES PV ET \xC9CH\xC9ANCES CONTRACTUELLES", 16);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yRec,
    head: [
      pdfSafeRow([
        "N\xB0",
        "Ouvrage & Province",
        "Entreprise",
        "Statut / TEP",
        "\xC9ch\xE9ance RD",
        "Situation d\xE9lai",
        "RT",
        "RP",
        "RD",
        "R\xE9serves / PV"
      ])
    ],
    body: model.rows.map((r) => {
      const delayText = r.receptions.rd.status === "OK" ? "RD OK" : r.isDeadlineOverdue ? `D\xE9pass\xE9e (${Math.abs(r.daysToDeadline ?? 0)} j)` : r.daysToDeadline !== null ? `J-${r.daysToDeadline}` : "-";
      const reserves = [r.receptions.rt.reserves, r.receptions.rp.reserves, r.receptions.rd.reserves].filter(Boolean).join(" | ") || "Aucune r\xE9serve";
      return pdfSafeRow([
        r.matrixNumber,
        `${r.projectName}
${r.province} - ${r.territory}`,
        r.contractor,
        `${WORK_STATUS_CONCISE[r.currentStatus]} (${r.currentTep}%)`,
        formatDateFr(r.definitiveReceptionDeadline),
        delayText,
        formatReceptionCell(r.receptions.rt),
        formatReceptionCell(r.receptions.rp),
        formatReceptionCell(r.receptions.rd),
        reserves
      ]);
    }),
    theme: "striped",
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.7, cellPadding: 1.5 },
    margin: { left: 14, right: 14 }
  });
  doc.addPage();
  const yMat = drawSectionHeading("ANNEXE 1. MATRICE D\xC9TAILL\xC9E DES OUVRAGES (HARMONIS\xC9E MATRICE UNIQUE BCECO / PDL-145T)", 16);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yMat,
    head: [
      pdfSafeRow([
        "N\xB0",
        "Province / Territoire",
        "Type & Nom de l\u2019ouvrage",
        "Entreprise",
        "Statut",
        "Niveau",
        "TEP%",
        "TEF%",
        "\xC9cart",
        "Contraintes & Impacts",
        "RT / RP / RD"
      ])
    ],
    body: [
      ...model.rows.map(
        (r) => pdfSafeRow([
          r.matrixNumber,
          `${r.province}
${r.territory}`,
          `[${INFRASTRUCTURE_TYPE_SHORT[r.infrastructureType]}] ${r.projectName}`,
          r.contractor,
          WORK_STATUS_CONCISE[r.currentStatus],
          formatExecutionStagesShort(r.latestExecutionStages),
          formatPercentFr(r.currentTep, 0),
          formatPercentFr(r.currentTef, 0),
          formatSignedGapFr(r.currentGap),
          r.latestConstraintsSummary || "Aucune",
          `RT:${r.receptions.rt.status} | RP:${r.receptions.rp.status} | RD:${r.receptions.rd.status}`
        ])
      ),
      pdfSafeRow([
        "TOTAL",
        `${kpis.provincesCount} prov. / ${kpis.territoriesCount} terr.`,
        `${kpis.totalProjects} ouvrages consolid\xE9s`,
        `${model.byContractor.length} PME`,
        `${kpis.completed} ach. / ${kpis.inProgress} cours`,
        "",
        formatPercentFr(kpis.averageTep, 1),
        formatPercentFr(kpis.averageTef, 1),
        formatSignedGapFr(kpis.averageGap),
        `${kpis.criticalConstraintsCount} critiques | ${kpis.gapAlertsCount} \xE9carts >10`,
        `${kpis.rtOk} / ${kpis.rpOk} / ${kpis.rdOk} OK`
      ])
    ],
    theme: "striped",
    headStyles: { fillColor: [15, 37, 68], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.7, textColor: [15, 23, 42], cellPadding: 1.5 },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === model.rows.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 28 },
      2: { cellWidth: 44 },
      3: { cellWidth: 32 },
      4: { cellWidth: 18 },
      5: { cellWidth: 21 },
      6: { cellWidth: 13, halign: "right" },
      7: { cellWidth: 13, halign: "right" },
      8: { cellWidth: 15, halign: "right" },
      9: { cellWidth: 42 },
      10: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 }
  });
  doc.addPage();
  const yRoad = drawSectionHeading("ANNEXE 2. FEUILLE DE ROUTE & SYNTH\xC8SE MULTI-CHANTIERS (MOD\xC8LE OFFICIEL PAGE 3)", 16);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yRoad,
    head: [pdfSafeRow(FEUILLE_DE_ROUTE_10_HEADERS)],
    body: model.rows.map((r) => pdfSafeRow(consolidatedRowToRoadmap10(r))),
    theme: "grid",
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 6.9 },
    bodyStyles: { fontSize: 6.6, cellPadding: 1.5 },
    margin: { left: 12, right: 12 }
  });
  const roadEndY = getLastTableY(doc, 180) + 5;
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[0]), 12, Math.min(roadEndY, 193));
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[1]), 12, Math.min(roadEndY + 3.8, 197));
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText(
        `Assistant de Fiche Terrain \u2014 ${INSTITUTION_REF}${isDemoData ? " (MODE D\xC9MONSTRATION)" : ""} \u2014 G\xE9n\xE9r\xE9 le ${formatDateTimeFr(generatedAt)}`
      ),
      14,
      204
    );
    doc.text(`Page ${i} / ${totalPages}`, 270, 204);
  }
  const arrayBuf = doc.output("arraybuffer");
  const fileName = `BCECO_PDL145T_${safeFileSlug(model.params.periodicity)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.pdf`;
  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: "application/pdf",
    pageCount: totalPages
  };
}
function buildMultiSiteRoadmapPdfBuffer(ctx) {
  const { model, generatedByName, generatedAt, isDemoData } = ctx;
  const doc = new import_jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const provinceLabel = model.params.province || "National (Toutes Provinces)";
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, 297, 23, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    pdfSafeText("ANNEXE TERRAIN \u2014 FEUILLE DE ROUTE & SYNTH\xC8SE MULTI-CHANTIERS (BCECO / PDL-145T)"),
    14,
    9.5
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text(
    pdfSafeText(
      `Zone : ${provinceLabel}${model.params.territory ? ` / ${model.params.territory}` : ""}  |  P\xE9riode : ${model.params.periodLabel}  |  Coordonnateur : ${generatedByName}${isDemoData ? "  |  MODE D\xC9MONSTRATION" : ""}`
    ),
    14,
    17
  );
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: 27,
    head: [pdfSafeRow(FEUILLE_DE_ROUTE_10_HEADERS)],
    body: model.rows.map((r) => pdfSafeRow(consolidatedRowToRoadmap10(r))),
    theme: "grid",
    headStyles: { fillColor: [22, 50, 91], textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.6 },
    margin: { left: 12, right: 12 }
  });
  const finalY = getLastTableY(doc, 175) + 5.5;
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[0]), 12, Math.min(finalY, 193));
  doc.text(pdfSafeText(FEUILLE_DE_ROUTE_FOOTNOTES[1]), 12, Math.min(finalY + 3.8, 197));
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText(
        `Annexe Terrain Feuille de Route \u2014 ${INSTITUTION_REF}${isDemoData ? " (MODE D\xC9MONSTRATION)" : ""} \u2014 ${formatDateTimeFr(generatedAt)}`
      ),
      12,
      204
    );
    doc.text(`Page ${i} / ${totalPages}`, 272, 204);
  }
  const arrayBuf = doc.output("arraybuffer");
  const fileName = `Feuille_de_Route_Multi_Chantiers_${safeFileSlug(provinceLabel)}_${safeFileSlug(
    model.params.periodLabel
  )}_${generatedAt.slice(0, 10)}.pdf`;
  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: "application/pdf",
    pageCount: totalPages
  };
}
function buildSingleReportPdfBuffer(report, project, options) {
  const doc = new import_jspdf.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const generatedByName = options?.generatedByName || report.signature?.agentFullName || "Agent de Suivi Terrain";
  const isDemo = options?.isDemoData ?? (report.isDemoData || (project ? project.isDemoData : true));
  const drawHeading = (title, y) => {
    doc.setFillColor(15, 37, 68);
    doc.rect(marginX, y, contentWidth, 5.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(pdfSafeText(title), marginX + 3, y + 4.1);
    return y + 7.5;
  };
  doc.setFillColor(15, 37, 68);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 24, pageWidth, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(pdfSafeText("R\xC9PUBLIQUE D\xC9MOCRATIQUE DU CONGO \u2014 BCECO / PDL-145T"), marginX, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(pdfSafeText("FICHE DE SYNTH\xC8SE INSTANTAN\xC9E D'OUVRAGE TERRAIN"), marginX, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  const statusLabel = REPORT_STATUS_LABELS[report.status] || report.status;
  doc.text(
    pdfSafeText(
      `Fiche N\xB0 : ${report.id}  |  Version : v${report.version}  |  Statut : ${statusLabel}  |  \xC9dit\xE9 le ${formatDateTimeFr(
        generatedAt
      )} par ${generatedByName}`
    ),
    marginX,
    20
  );
  let yPos = 29;
  if (isDemo) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(marginX, yPos, contentWidth, 5.5, "FD");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.text(pdfSafeText(DEMO_BANNER_TEXT), marginX + 3, yPos + 3.8);
    yPos += 8;
  }
  yPos = drawHeading("1. IDENTIFICATION & LOCALISATION G\xC9OGRAPHIQUE DE L\u2019OUVRAGE", yPos);
  const infraLabel = INFRASTRUCTURE_TYPE_LABELS[report.identification.infrastructureType] || report.identification.infrastructureType;
  const contractStatusLabel = CONTRACT_STATUS_LABELS[report.identification.contractStatus] || report.identification.contractStatus;
  const gpsString = report.identification.gpsLat && report.identification.gpsLng ? `${report.identification.gpsLat}, ${report.identification.gpsLng}${report.identification.gpsAccuracy ? ` (\xB1${report.identification.gpsAccuracy} m)` : ""}` : "Non renseign\xE9es";
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    body: [
      pdfSafeRow(["Nom de l\u2019ouvrage", report.identification.projectName, "Type d\u2019infrastructure", infraLabel]),
      pdfSafeRow(["N\xB0 Matrice Unique", report.identification.matrixNumber, "Statut contractuel", contractStatusLabel]),
      pdfSafeRow([
        "Province / Territoire",
        `${report.identification.province} / ${report.identification.territory}`,
        "Secteur / Localit\xE9",
        `${report.identification.sectorChiefdom} \u2014 ${report.identification.locality || "\u2014"}`
      ]),
      pdfSafeRow([
        "Entreprise titulaire",
        report.identification.contractor || "Non attribu\xE9",
        "Dates de contrat",
        `D\xE9marrage: ${formatDateFr(report.identification.startDate)} | \xC9ch\xE9ance RD: ${formatDateFr(
          report.identification.definitiveReceptionDeadline
        )}`
      ]),
      pdfSafeRow([
        "Coordonn\xE9es GPS",
        gpsString,
        "P\xE9riode & Collecte",
        `${PERIODICITY_LABELS[report.periodicity] || report.periodicity} | Date: ${formatDateFr(
          report.identification.collectionDate
        )}${report.identification.weekNumber ? ` (${report.identification.weekNumber})` : ""}`
      ])
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 38 },
      3: { cellWidth: 55 }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 25) + 4;
  yPos = drawHeading("2. \xC9TAT D\u2019AVANCEMENT PHYSIQUE (TEP), FINANCIER (TEF) & EFFECTIFS", yPos);
  const workStatusLabel = WORK_STATUS_LABELS[report.progress.workStatus] || report.progress.workStatus;
  const gap = report.progress.tepTefGap;
  const isGapAlert = Math.abs(gap) > 10;
  const stagesFormatted = formatExecutionStagesShort(report.progress.executionStages);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        "Statut actuel ouvrage",
        workStatusLabel,
        "Effectifs mobilis\xE9s",
        `${report.progress.skilledWorkersCount} qualifi\xE9s, ${report.progress.laborersCount} man\u0153uvres | Ing\xE9nieur: ${report.progress.siteEngineerPresent ? "Pr\xE9sent" : "Absent"}`
      ]),
      pdfSafeRow([
        "Taux Ex\xE9cution Physique (TEP)",
        `${formatPercentFr(report.progress.currentTep)} (Pr\xE9c\xE9dent: ${formatPercentFr(report.progress.previousTep)})`,
        "Taux Ex\xE9cution Financi\xE8re (TEF)",
        `${formatPercentFr(report.progress.currentTef)} (Pr\xE9c\xE9dent: ${formatPercentFr(report.progress.previousTef)})`
      ]),
      pdfSafeRow([
        "\xC9cart TEP - TEF",
        `${formatSignedGapFr(gap)}${isGapAlert ? " [\xC9CART SIGNIFICATIF > 10%]" : " [Conforme]"}`,
        "\xC9tapes du chantier actives",
        stagesFormatted || "Aucune \xE9tape d\xE9clar\xE9e"
      ]),
      pdfSafeRow([
        "Travaux ex\xE9cut\xE9s p\xE9riode",
        { content: pdfSafeText(report.progress.periodWorksExecuted || "Aucun travail majeur renseign\xE9 pour la p\xE9riode."), colSpan: 3 }
      ]),
      ...report.progress.gapJustification ? [
        pdfSafeRow([
          "Justification \xE9cart TEP-TEF",
          { content: pdfSafeText(report.progress.gapJustification), colSpan: 3 }
        ])
      ] : []
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 }
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 2 && data.column.index === 1 && isGapAlert) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 25) + 4;
  yPos = drawHeading("3. CONTRAINTES DU SITE, CRITICIT\xC9 & IMPACTS OP\xC9RATIONNELS", yPos);
  const constraintCategoryLabels = report.constraints.categories.map((c) => CONSTRAINT_CATEGORIES.find((cat) => cat.id === c)?.label || c).join(", ") || "Aucune cat\xE9gorie signal\xE9e";
  const impactFlags = [];
  if (report.constraints.impacts.delays) impactFlags.push("Retard de calendrier");
  if (report.constraints.impacts.costs) impactFlags.push("Surco\xFBts financiers");
  if (report.constraints.impacts.quality) impactFlags.push("Impact qualit\xE9 / malfa\xE7ons");
  if (report.constraints.impacts.stoppage) impactFlags.push("Arr\xEAt total de chantier");
  const impactsText = impactFlags.length > 0 ? impactFlags.join(" | ") : "Aucun impact n\xE9gatif majeur";
  const descriptionsText = report.constraints.detailedDescriptions.filter(Boolean).join(" ; ") || "Aucune contrainte d\xE9taill\xE9e renseign\xE9e.";
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        "Niveau de criticit\xE9",
        report.constraints.isCritical ? "CRITIQUE (Alerte rouge)" : "Non critique (Mineure)",
        "Cat\xE9gories de contraintes",
        constraintCategoryLabels
      ]),
      pdfSafeRow([
        "Impacts op\xE9rationnels",
        impactsText,
        "Responsable d\u2019action",
        report.constraints.actionOwner || "Non assign\xE9"
      ]),
      pdfSafeRow([
        "Descriptions d\xE9taill\xE9es",
        { content: pdfSafeText(descriptionsText), colSpan: 3 }
      ]),
      ...report.constraints.correctiveMeasures || report.constraints.urgentActionsRequired ? [
        pdfSafeRow([
          "Mesures correctives & Actions",
          {
            content: pdfSafeText(
              `Mesures: ${report.constraints.correctiveMeasures || "\u2014"}
Actions requises: ${report.constraints.urgentActionsRequired || "\u2014"}`
            ),
            colSpan: 3
          }
        ])
      ] : []
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 }
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 0 && data.column.index === 1 && report.constraints.isCritical) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 25) + 4;
  if (yPos > 215) {
    doc.addPage();
    yPos = 14;
  }
  yPos = drawHeading("4. \xC9TAT DES R\xC9CEPTIONS (RT / RP / RD) & OBSERVATIONS G\xC9N\xC9RALES DU SITE", yPos);
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    head: [pdfSafeRow(["Type R\xE9ception", "Statut", "Date effective", "N\xB0 R\xE9f. PV", "R\xE9serves formul\xE9es"])],
    body: [
      pdfSafeRow([
        "R\xE9ception Technique (RT)",
        report.receptions.rt.status,
        formatDateFr(report.receptions.rt.date),
        report.receptions.rt.pvReference || "\u2014",
        report.receptions.rt.reserves || "Aucune r\xE9serve"
      ]),
      pdfSafeRow([
        "R\xE9ception Provisoire (RP)",
        report.receptions.rp.status,
        formatDateFr(report.receptions.rp.date),
        report.receptions.rp.pvReference || "\u2014",
        report.receptions.rp.reserves || "Aucune r\xE9serve"
      ]),
      pdfSafeRow([
        "R\xE9ception D\xE9finitive (RD)",
        report.receptions.rd.status,
        formatDateFr(report.receptions.rd.date),
        report.receptions.rd.pvReference || "\u2014",
        report.receptions.rd.reserves || "Aucune r\xE9serve"
      ])
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7, fontStyle: "bold" },
    bodyStyles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42 },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 32 },
      4: { cellWidth: 66 }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 22) + 2.5;
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        "Observations g\xE9n\xE9rales",
        { content: pdfSafeText(report.receptions.generalObservations || "Aucune observation particuli\xE8re."), colSpan: 3 }
      ]),
      pdfSafeRow([
        "Gardiennage & \xC9tat du site",
        `Gardiennage : ${report.receptions.guardingStatus || "\u2014"}  |  \xC9tat : ${report.receptions.siteCondition || "\u2014"}`,
        "Contentieux & Fr\xE9quentation",
        `Contentieux : ${report.receptions.disputes || "Aucun"}  |  Niveau : ${report.receptions.attendanceLevel || "\u2014"}`
      ])
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 18) + 4;
  if (report.receptions.photos && report.receptions.photos.length > 0) {
    if (yPos > 210) {
      doc.addPage();
      yPos = 14;
    }
    yPos = drawHeading(`5. PHOTOGRAPHIES DU CHANTIER (${report.receptions.photos.length} VUES JOINTES)`, yPos);
    (0, import_jspdf_autotable.autoTable)(doc, {
      startY: yPos,
      head: [pdfSafeRow(["N\xB0", "Fichier", "L\xE9gende / Descriptif", "Prise le", "Statut"])],
      body: report.receptions.photos.map(
        (ph, idx) => pdfSafeRow([
          String(idx + 1),
          ph.fileName || `Photo_${idx + 1}`,
          ph.caption || "Vue g\xE9n\xE9rale chantier",
          formatDateTimeFr(ph.capturedAt),
          ph.syncState === "UPLOADED" ? "T\xE9l\xE9vers\xE9e serveur" : "Locale"
        ])
      ),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7, fontStyle: "bold" },
      bodyStyles: { fontSize: 7, cellPadding: 1.4 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 38 },
        2: { cellWidth: 80 },
        3: { cellWidth: 32 },
        4: { cellWidth: 26 }
      },
      margin: { left: marginX, right: marginX }
    });
    yPos = getLastTableY(doc, yPos + 18) + 3;
    const validPhotos = report.receptions.photos.filter((p) => p.dataUrl && p.dataUrl.startsWith("data:image/"));
    if (validPhotos.length > 0) {
      const thumbWidth = 42;
      const thumbHeight = 28;
      const spacingX = 4;
      const maxPerRow = 4;
      if (yPos + thumbHeight + 10 > pageHeight - 25) {
        doc.addPage();
        yPos = 14;
      }
      doc.setFontSize(7.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text(pdfSafeText("Miniatures visuelles certifi\xE9es :"), marginX, yPos + 3);
      yPos += 5;
      validPhotos.slice(0, 4).forEach((ph, idx) => {
        const x = marginX + idx % maxPerRow * (thumbWidth + spacingX);
        try {
          const format = ph.dataUrl.includes("png") ? "PNG" : "JPEG";
          doc.addImage(ph.dataUrl, format, x, yPos, thumbWidth, thumbHeight);
          doc.setDrawColor(203, 213, 225);
          doc.rect(x, yPos, thumbWidth, thumbHeight, "S");
        } catch {
        }
      });
      yPos += thumbHeight + 4;
    }
  }
  if (yPos > 215) {
    doc.addPage();
    yPos = 14;
  }
  yPos = drawHeading("6. SIGNATURE DE L\u2019AGENT ENQU\xCATEUR & D\xC9CISIONS DU COORDONNATEUR", yPos);
  const lastReview = report.reviews && report.reviews.length > 0 ? report.reviews[report.reviews.length - 1] : null;
  (0, import_jspdf_autotable.autoTable)(doc, {
    startY: yPos,
    body: [
      pdfSafeRow([
        "Agent enqu\xEAteur",
        `${report.signature.agentFullName || "Non sign\xE9"} (${report.signature.agentFunction || "Agent terrain"})`,
        "Contact & Horodatage",
        `T\xE9l: ${report.signature.agentPhone || "\u2014"}  |  Sign\xE9 le: ${formatDateTimeFr(report.signature.signedAt)}`
      ]),
      pdfSafeRow([
        "Derni\xE8re d\xE9cision Coordonnateur",
        lastReview ? `${REPORT_STATUS_LABELS[lastReview.decision] || lastReview.decision} par ${lastReview.reviewerName} le ${formatDateTimeFr(lastReview.createdAt)}` : "En attente de revue par le coordonnateur provincial",
        "Commentaire coordonnateur",
        lastReview?.comment ? lastReview.comment : "Aucun commentaire enregistr\xE9."
      ])
    ],
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      1: { cellWidth: 51 },
      2: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 42 },
      3: { cellWidth: 51 }
    },
    margin: { left: marginX, right: marginX }
  });
  yPos = getLastTableY(doc, yPos + 18) + 3;
  if (report.signature.signatureDataUrl && report.signature.signatureDataUrl.startsWith("data:image/")) {
    if (yPos + 22 > pageHeight - 20) {
      doc.addPage();
      yPos = 14;
    }
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(71, 85, 105);
    doc.text(pdfSafeText("Empreinte de signature \xE9lectronique manuscrite :"), marginX, yPos + 3);
    try {
      doc.addImage(report.signature.signatureDataUrl, "PNG", marginX, yPos + 4, 38, 14);
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, yPos + 4, 38, 14, "S");
    } catch {
    }
  }
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafeText("BCECO / PDL-145T \u2014 Direction du Suivi-\xC9valuation \u2014 Fiche officielle certifi\xE9e"),
      marginX,
      pageHeight - 7
    );
    doc.text(
      pdfSafeText(`Page ${page} sur ${totalPages}`),
      pageWidth - marginX,
      pageHeight - 7,
      { align: "right" }
    );
  }
  const arrayBuf = doc.output("arraybuffer");
  const fileName = `Fiche_Synthese_${safeFileSlug(report.identification.matrixNumber || report.id)}_${safeFileSlug(
    report.identification.projectName
  )}_${safeFileSlug(report.identification.collectionDate || "enquete")}.pdf`;
  return {
    bytes: new Uint8Array(arrayBuf),
    fileName,
    mimeType: "application/pdf",
    pageCount: totalPages
  };
}

// server.ts
var import_meta = {};
var PORT = 3e3;
var STORE_PATH = "/tmp/bceco-pdl145t-demo-store-v2.json";
var PHOTOS_DIR = "/tmp/bceco-pdl145t-demo-photos";
var SESSION_SECRET = process.env.DEMO_SESSION_SECRET || "bceco-pdl145t-isolated-demo-adapter-2026";
var TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var DEFAULT_SEEDED_RECIPES = {
  "RPT-GEN-2026-001": {
    format: "EXCEL",
    params: {
      periodicity: "MENSUEL",
      periodKeyFilter: "2026-09",
      periodLabel: "Septembre 2026",
      dataScope: "VALIDES_UNIQUEMENT"
    }
  },
  "RPT-GEN-2026-002": {
    format: "PDF",
    params: {
      periodicity: "MENSUEL",
      periodKeyFilter: "2026-10",
      periodLabel: "Octobre 2026",
      dataScope: "VALIDES_UNIQUEMENT"
    }
  }
};
var DEFAULT_DEMO_PASSWORDS = {
  "coordinateur.demo@pd145t.test": "Demo2026!",
  "agent1.demo@pd145t.test": "Demo2026!",
  "agent2.demo@pd145t.test": "Demo2026!",
  "agent3.demo@pd145t.test": "Demo2026!"
};
function loadStore() {
  try {
    if (import_node_fs.default.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(import_node_fs.default.readFileSync(STORE_PATH, "utf-8"));
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        if (!parsed.uploadedPhotos) parsed.uploadedPhotos = {};
        if (!parsed.generatedReportRecipes) {
          parsed.generatedReportRecipes = { ...DEFAULT_SEEDED_RECIPES };
        }
        parsed.demoPasswords = { ...DEFAULT_DEMO_PASSWORDS, ...parsed.demoPasswords || {} };
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Reinitializing isolated demo store:", err);
  }
  const fresh = {
    ...createDemoDataset(),
    uploadedPhotos: {},
    generatedReportRecipes: { ...DEFAULT_SEEDED_RECIPES },
    demoPasswords: { ...DEFAULT_DEMO_PASSWORDS }
  };
  saveStore(fresh);
  return fresh;
}
function saveStore(data) {
  try {
    import_node_fs.default.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Demo store disk persistence warning (in-memory active):", err);
  }
}
var store = loadStore();
function signToken(payload) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = import_node_crypto.default.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = import_node_crypto.default.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!import_node_crypto.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (typeof parsed.userId !== "string" || typeof parsed.role !== "string" || typeof parsed.email !== "string" || typeof parsed.iat !== "number" || !Number.isFinite(parsed.iat)) {
      return null;
    }
    const ageMs = Date.now() - parsed.iat;
    if (ageMs < -6e4 || ageMs > TOKEN_TTL_MS) {
      return null;
    }
    return { userId: parsed.userId, role: parsed.role, email: parsed.email, iat: parsed.iat };
  } catch {
    return null;
  }
}
function signPhotoAccess(photoId) {
  return import_node_crypto.default.createHmac("sha256", SESSION_SECRET).update(`photo:${photoId}`).digest("base64url");
}
function verifyPhotoSignature(photoId, sig) {
  if (!sig) return false;
  const expected = signPhotoAccess(photoId);
  if (sig.length !== expected.length) return false;
  return import_node_crypto.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
function requireDemoAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentification requise (Adaptateur D\xE9mo isol\xE9)." });
    return;
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: "Session expir\xE9e ou jeton invalide." });
    return;
  }
  const user = store.users.find((u) => u.id === decoded.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: "Compte utilisateur introuvable ou d\xE9sactiv\xE9 par le Coordonnateur." });
    return;
  }
  req.demoUser = user;
  next();
}
function requireCoordinator(req, res, next) {
  if (!req.demoUser || req.demoUser.role !== "COORDINATEUR") {
    res.status(403).json({
      error: "Acc\xE8s refus\xE9 (HTTP 403) : op\xE9ration r\xE9serv\xE9e exclusivement au Coordonnateur."
    });
    return;
  }
  next();
}
function appendAudit(actor, action, entityType, entityId, details) {
  const entry = {
    id: generateUniqueId("AUD"),
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    details,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  store.auditLogs.unshift(entry);
  return entry;
}
function recomputeProjectAssignedAgents(projectId) {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return;
  const activeAgentIds = Array.from(
    new Set(
      store.assignments.filter((a) => a.projectId === projectId && a.status === "ACTIVE").map((a) => a.agentId)
    )
  );
  project.assignedAgentIds = activeAgentIds;
  project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function createApiApp() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "15mb" }));
  app.post("/api/demo/auth/login", (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const user = store.users.find((u) => u.email.toLowerCase() === email);
    const expectedPassword = store.demoPasswords?.[email] ?? DEFAULT_DEMO_PASSWORDS[email] ?? "Demo2026!";
    if (!user || password !== expectedPassword) {
      res.status(401).json({
        error: "Identifiants de d\xE9monstration incorrects. V\xE9rifiez l\u2019adresse e-mail et le mot de passe (Demo2026!)."
      });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({
        error: "Ce compte agent a \xE9t\xE9 d\xE9sactiv\xE9 par le Coordonnateur."
      });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    appendAudit(user, "CONNEXION_DEMO", "USER", user.id, `Connexion via adaptateur d\xE9mo (${user.role}).`);
    saveStore(store);
    res.json({
      adapter: "ISOLATED_DEMO_ADAPTER",
      token,
      user
    });
  });
  app.get("/api/demo/auth/me", requireDemoAuth, (req, res) => {
    res.json({ adapter: "ISOLATED_DEMO_ADAPTER", user: req.demoUser });
  });
  app.get("/api/demo/bootstrap", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    if (user.role === "COORDINATEUR") {
      res.json({
        adapter: "ISOLATED_DEMO_ADAPTER",
        users: store.users,
        projects: store.projects,
        assignments: store.assignments,
        reports: store.reports,
        generatedReports: store.generatedReports,
        syncLogs: store.syncLogs,
        auditLogs: store.auditLogs
      });
      return;
    }
    const assignedProjects = store.projects.filter((p) => p.assignedAgentIds.includes(user.id));
    const myAssignments = store.assignments.filter((a) => a.agentId === user.id);
    const myReports = store.reports.filter((r) => r.agentId === user.id);
    const mySyncLogs = store.syncLogs.filter((l) => l.userId === user.id);
    res.json({
      adapter: "ISOLATED_DEMO_ADAPTER",
      users: [user],
      projects: assignedProjects,
      assignments: myAssignments,
      reports: myReports,
      generatedReports: [],
      syncLogs: mySyncLogs,
      auditLogs: []
    });
  });
  app.get("/api/demo/projects/:projectId", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    const project = store.projects.find((p) => p.id === req.params.projectId);
    if (!project) {
      res.status(404).json({ error: "Ouvrage introuvable." });
      return;
    }
    if (user.role === "AGENT_TERRAIN" && !project.assignedAgentIds.includes(user.id)) {
      res.status(403).json({ error: "Acc\xE8s interdit : cet ouvrage ne vous est pas affect\xE9." });
      return;
    }
    res.json({ project });
  });
  app.post("/api/demo/projects/import", requireDemoAuth, requireCoordinator, (req, res) => {
    const user = req.demoUser;
    const incomingProjects = Array.isArray(req.body?.projects) ? req.body.projects : [];
    if (incomingProjects.length === 0) {
      res.status(400).json({ error: "Aucun ouvrage valide fourni pour l\u2019importation." });
      return;
    }
    const VALID_INFRA = /* @__PURE__ */ new Set(["ECOLE_PRIMAIRE", "CENTRE_DE_SANTE", "BATIMENT_ADMINISTRATIF"]);
    const VALID_CONTRACT = /* @__PURE__ */ new Set(["CONTRAT_ACTIF", "CONTRAT_RESILIE", "REATTRIBUE_ALE_PME"]);
    const VALID_STATUS = /* @__PURE__ */ new Set(["ACHEVE", "EN_COURS", "A_L_ARRET", "NON_DEMARRE"]);
    const existingMatrix = new Set(store.projects.map((p) => p.matrixNumber));
    const added = [];
    let rejectedCount = 0;
    for (const p of incomingProjects) {
      const matrixNumber = String(p?.matrixNumber ?? "").trim();
      const contractor = String(p?.contractor ?? "").trim();
      const province = String(p?.province ?? "").trim();
      const territory = String(p?.territory ?? "").trim();
      const projectName = String(p?.projectName ?? "").trim();
      const tep = Number(p?.currentTep ?? 0);
      const tef = Number(p?.currentTef ?? 0);
      if (!matrixNumber || existingMatrix.has(matrixNumber) || !contractor || !province || !territory || projectName.length < 2 || !VALID_INFRA.has(String(p?.infrastructureType ?? "")) || !VALID_CONTRACT.has(String(p?.contractStatus ?? "CONTRAT_ACTIF")) || !VALID_STATUS.has(String(p?.currentStatus ?? "EN_COURS")) || Number.isNaN(tep) || tep < 0 || tep > 100 || Number.isNaN(tef) || tef < 0 || tef > 100) {
        rejectedCount += 1;
        continue;
      }
      const sanitized = {
        ...p,
        id: p.id && /^[a-zA-Z0-9_-]{2,128}$/.test(p.id) ? p.id : generateUniqueId("PRJ-DEMO"),
        matrixNumber,
        contractor,
        province,
        territory,
        projectName,
        contractStatus: p.contractStatus || "CONTRAT_ACTIF",
        currentStatus: p.currentStatus || "EN_COURS",
        currentTep: tep,
        currentTef: tef,
        currentGap: calculateTepTefGap(tep, tef),
        isDemoData: true,
        assignedAgentIds: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.projects.push(sanitized);
      existingMatrix.add(sanitized.matrixNumber);
      added.push(sanitized);
    }
    if (added.length === 0) {
      res.status(400).json({
        error: `Importation rejet\xE9e : ${rejectedCount} ligne(s) invalide(s) ou en doublon dans le registre officiel.`,
        rejectedCount
      });
      return;
    }
    appendAudit(
      user,
      "IMPORT_AUDIT_MATRICE",
      "PROJECT",
      "BATCH",
      `Import de ${added.length} ouvrage(s) apr\xE8s audit pr\xE9alable (${rejectedCount} ligne(s) \xE9cart\xE9e(s)).`
    );
    saveStore(store);
    res.json({ addedCount: added.length, rejectedCount, projects: added });
  });
  app.post("/api/demo/agents", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const fullName = String(req.body?.fullName ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const functionTitle = String(req.body?.functionTitle ?? "Agent Enqu\xEAteur Terrain (D\xE9mo)").trim();
    const provinceScope = String(req.body?.provinceScope ?? "Haut-Katanga").trim();
    const password = String(req.body?.password ?? "Demo2026!").trim() || "Demo2026!";
    if (!email || !fullName) {
      res.status(400).json({ error: "Le nom complet et l\u2019adresse e-mail sont obligatoires." });
      return;
    }
    if (fullName.length < 2 || fullName.length > 140) {
      res.status(400).json({ error: "Le nom complet doit contenir entre 2 et 140 caract\xE8res." });
      return;
    }
    if (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Format d\u2019adresse e-mail invalide." });
      return;
    }
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: "Un compte existe d\xE9j\xE0 avec cette adresse e-mail." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newAgent = {
      id: generateUniqueId("USR-AGT"),
      email,
      fullName,
      role: "AGENT_TERRAIN",
      phone: phone || "+243 82 000 0000",
      functionTitle,
      provinceScope,
      isActive: true,
      isDemoData: true,
      createdAt: now,
      updatedAt: now
    };
    if (!store.demoPasswords) store.demoPasswords = { ...DEFAULT_DEMO_PASSWORDS };
    store.demoPasswords[email] = password;
    store.users.push(newAgent);
    appendAudit(coord, "CREATION_AGENT", "USER", newAgent.id, `Cr\xE9ation du compte agent terrain ${newAgent.fullName} (${newAgent.email}).`);
    saveStore(store);
    res.status(201).json({ agent: newAgent });
  });
  app.patch("/api/demo/agents/:agentId", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const agent = store.users.find((u) => u.id === req.params.agentId && u.role === "AGENT_TERRAIN");
    if (!agent) {
      res.status(404).json({ error: "Agent de terrain introuvable." });
      return;
    }
    if (typeof req.body?.fullName === "string" && req.body.fullName.trim()) {
      agent.fullName = req.body.fullName.trim();
    }
    if (typeof req.body?.phone === "string") {
      agent.phone = req.body.phone.trim();
    }
    if (typeof req.body?.functionTitle === "string") {
      agent.functionTitle = req.body.functionTitle.trim();
    }
    if (typeof req.body?.provinceScope === "string") {
      agent.provinceScope = req.body.provinceScope.trim();
    }
    if (typeof req.body?.isActive === "boolean") {
      agent.isActive = req.body.isActive;
    }
    agent.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    appendAudit(
      coord,
      "MISE_A_JOUR_AGENT",
      "USER",
      agent.id,
      `Mise \xE0 jour du profil agent ${agent.fullName} (statut actif : ${agent.isActive ? "Oui" : "Non"}).`
    );
    saveStore(store);
    res.json({ agent });
  });
  app.post("/api/demo/assignments", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const agentId = String(req.body?.agentId ?? "");
    const projectIds = Array.isArray(req.body?.projectIds) ? req.body.projectIds : [];
    const startDate = String(req.body?.startDate ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    const notes = String(req.body?.notes ?? "").trim();
    const agent = store.users.find((u) => u.id === agentId && u.role === "AGENT_TERRAIN");
    if (!agent) {
      res.status(404).json({ error: "Agent cible introuvable." });
      return;
    }
    if (!agent.isActive) {
      res.status(400).json({ error: "Impossible d\u2019affecter des ouvrages \xE0 un compte agent d\xE9sactiv\xE9." });
      return;
    }
    if (projectIds.length === 0) {
      res.status(400).json({ error: "S\xE9lectionnez au moins un ouvrage \xE0 affecter." });
      return;
    }
    const created = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const projectId of projectIds) {
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) continue;
      const alreadyActive = store.assignments.some(
        (a) => a.agentId === agentId && a.projectId === projectId && a.status === "ACTIVE"
      );
      if (alreadyActive) continue;
      const assignment = {
        id: generateUniqueId("AFF"),
        agentId: agent.id,
        agentName: agent.fullName,
        projectId: project.id,
        projectMatrixNumber: project.matrixNumber,
        projectName: project.projectName,
        startDate,
        endDate: null,
        status: "ACTIVE",
        assignedBy: coord.id,
        assignedByName: coord.fullName,
        notes: notes || "Affectation coordonnateur.",
        isDemoData: true,
        createdAt: now,
        updatedAt: now
      };
      store.assignments.unshift(assignment);
      recomputeProjectAssignedAgents(project.id);
      created.push(assignment);
    }
    appendAudit(
      coord,
      "AFFECTATION_OUVRAGES",
      "AGENT_ASSIGNMENT",
      agent.id,
      `Affectation de ${created.length} ouvrage(s) \xE0 ${agent.fullName} \xE0 compter du ${startDate}.`
    );
    saveStore(store);
    res.status(201).json({ assignments: created });
  });
  app.post("/api/demo/assignments/:assignmentId/reassign", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const current = store.assignments.find((a) => a.id === req.params.assignmentId);
    if (!current || current.status !== "ACTIVE") {
      res.status(404).json({ error: "Affectation active introuvable." });
      return;
    }
    const targetAgentId = String(req.body?.targetAgentId ?? "");
    const notes = String(req.body?.notes ?? "").trim();
    const targetAgent = store.users.find((u) => u.id === targetAgentId && u.role === "AGENT_TERRAIN");
    if (!targetAgent) {
      res.status(404).json({ error: "Nouvel agent introuvable." });
      return;
    }
    if (!targetAgent.isActive) {
      res.status(400).json({ error: "Impossible de r\xE9affecter un ouvrage vers un compte agent d\xE9sactiv\xE9." });
      return;
    }
    if (targetAgent.id === current.agentId) {
      res.status(400).json({ error: "S\xE9lectionnez un agent diff\xE9rent pour la r\xE9affectation." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const today = now.slice(0, 10);
    current.status = "REAFFECTEE";
    current.endDate = today;
    current.reassignedToAgentId = targetAgent.id;
    current.notes = notes ? `${current.notes} | R\xE9affectation: ${notes}` : current.notes;
    current.updatedAt = now;
    const newAssignment = {
      id: generateUniqueId("AFF"),
      agentId: targetAgent.id,
      agentName: targetAgent.fullName,
      projectId: current.projectId,
      projectMatrixNumber: current.projectMatrixNumber,
      projectName: current.projectName,
      startDate: today,
      endDate: null,
      status: "ACTIVE",
      assignedBy: coord.id,
      assignedByName: coord.fullName,
      notes: notes || `R\xE9affect\xE9 depuis ${current.agentName}.`,
      isDemoData: true,
      createdAt: now,
      updatedAt: now
    };
    store.assignments.unshift(newAssignment);
    recomputeProjectAssignedAgents(current.projectId);
    appendAudit(
      coord,
      "REAFFECTATION_OUVRAGE",
      "AGENT_ASSIGNMENT",
      current.projectId,
      `R\xE9affectation de ${current.projectMatrixNumber} de ${current.agentName} vers ${targetAgent.fullName}. Historique des fiches pr\xE9serv\xE9.`
    );
    saveStore(store);
    res.json({ closedAssignment: current, newAssignment });
  });
  app.post("/api/demo/assignments/:assignmentId/end", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const current = store.assignments.find((a) => a.id === req.params.assignmentId);
    if (!current || current.status !== "ACTIVE") {
      res.status(404).json({ error: "Affectation active introuvable." });
      return;
    }
    const reason = String(req.body?.notes ?? "").trim();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    current.status = "TERMINEE";
    current.endDate = now.slice(0, 10);
    if (reason) current.notes = `${current.notes} | Cl\xF4ture: ${reason}`;
    current.updatedAt = now;
    recomputeProjectAssignedAgents(current.projectId);
    appendAudit(
      coord,
      "CLOTURE_AFFECTATION",
      "AGENT_ASSIGNMENT",
      current.id,
      `Cl\xF4ture de l\u2019affectation ${current.projectMatrixNumber} pour ${current.agentName}.`
    );
    saveStore(store);
    res.json({ assignment: current });
  });
  app.post("/api/demo/uploads/photos", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    const photoId = String(req.body?.photoId ?? "").trim();
    const reportId = String(req.body?.reportId ?? "").trim();
    const projectId = String(req.body?.projectId ?? "").trim();
    const fileName = String(req.body?.fileName ?? "photo-terrain.jpg").trim();
    const mimeType = String(req.body?.mimeType ?? "image/jpeg").trim();
    const dataUrl = String(req.body?.dataUrl ?? "");
    const checksum = typeof req.body?.checksum === "string" ? req.body.checksum.trim() : void 0;
    if (!photoId || !/^[a-zA-Z0-9_-]{2,128}$/.test(photoId)) {
      res.status(400).json({ error: "Identifiant photo invalide." });
      return;
    }
    if (!projectId) {
      res.status(400).json({ error: "Identifiant d\u2019ouvrage (projectId) obligatoire pour t\xE9l\xE9verser une photo." });
      return;
    }
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) {
      res.status(404).json({ error: "Ouvrage cible introuvable dans le registre officiel." });
      return;
    }
    if (user.role === "AGENT_TERRAIN") {
      const hasActiveOrPriorAssignment = project.assignedAgentIds.includes(user.id) || store.assignments.some((a) => a.projectId === project.id && a.agentId === user.id);
      if (!hasActiveOrPriorAssignment) {
        res.status(403).json({ error: "Acc\xE8s refus\xE9 : vous n\u2019\xEAtes pas affect\xE9 \xE0 cet ouvrage." });
        return;
      }
    }
    if (!dataUrl.startsWith("data:image/")) {
      res.status(400).json({ error: "Contenu image invalide (seuls les formats image/* sont accept\xE9s)." });
      return;
    }
    const base64Idx = dataUrl.indexOf("base64,");
    if (base64Idx < 0) {
      res.status(400).json({ error: "Encodage image base64 manquant." });
      return;
    }
    if (!store.uploadedPhotos) store.uploadedPhotos = {};
    const signedRemoteUrl = `/api/demo/uploads/photos/${encodeURIComponent(photoId)}?sig=${encodeURIComponent(
      signPhotoAccess(photoId)
    )}`;
    const existing = store.uploadedPhotos[photoId];
    if (existing) {
      if (user.role === "AGENT_TERRAIN" && existing.agentId !== user.id) {
        res.status(403).json({ error: "Acc\xE8s interdit sur une photographie appartenant \xE0 un autre agent." });
        return;
      }
      if (!existing.remoteUrl.includes("?sig=")) {
        existing.remoteUrl = signedRemoteUrl;
        saveStore(store);
      }
      res.status(200).json({
        photoId: existing.photoId,
        remoteUrl: existing.remoteUrl,
        sizeBytes: existing.sizeBytes,
        uploadedAt: existing.uploadedAt,
        deduplicated: true
      });
      return;
    }
    const buffer = Buffer.from(dataUrl.slice(base64Idx + 7), "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) {
      res.status(400).json({ error: "Taille de photographie invalide (maximum 8 Mo)." });
      return;
    }
    import_node_fs.default.mkdirSync(PHOTOS_DIR, { recursive: true });
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const diskPath = import_node_path.default.join(PHOTOS_DIR, `${photoId}.${ext}`);
    import_node_fs.default.writeFileSync(diskPath, buffer);
    const uploadedAt = (/* @__PURE__ */ new Date()).toISOString();
    const meta = {
      photoId,
      reportId,
      projectId,
      agentId: user.id,
      fileName,
      mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
      sizeBytes: buffer.byteLength,
      checksum,
      remoteUrl: signedRemoteUrl,
      diskPath,
      uploadedAt
    };
    store.uploadedPhotos[photoId] = meta;
    saveStore(store);
    res.status(201).json({
      photoId: meta.photoId,
      remoteUrl: meta.remoteUrl,
      sizeBytes: meta.sizeBytes,
      uploadedAt: meta.uploadedAt,
      deduplicated: false
    });
  });
  app.get("/api/demo/uploads/photos/:photoId", (req, res) => {
    const photoId = String(req.params.photoId ?? "").trim();
    if (!/^[a-zA-Z0-9_-]{2,128}$/.test(photoId)) {
      res.status(400).json({ error: "Identifiant photo invalide." });
      return;
    }
    const sig = typeof req.query.sig === "string" ? req.query.sig : "";
    const meta = store.uploadedPhotos?.[photoId];
    let authorized = verifyPhotoSignature(photoId, sig);
    if (!authorized) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const decoded = verifyToken(authHeader.slice(7));
        const user = decoded ? store.users.find((u) => u.id === decoded.userId && u.isActive) : void 0;
        if (user && (user.role === "COORDINATEUR" || meta && meta.agentId === user.id)) {
          authorized = true;
        }
      }
    }
    if (!authorized) {
      res.status(403).json({ error: "Acc\xE8s interdit : authentification ou signature d\u2019acc\xE8s requise." });
      return;
    }
    if (!meta || !import_node_fs.default.existsSync(meta.diskPath)) {
      res.status(404).json({ error: "Photographie terrain introuvable." });
      return;
    }
    res.setHeader("Content-Type", meta.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=2592000");
    res.sendFile(meta.diskPath);
  });
  app.post("/api/demo/reports", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    const payload = req.body?.report;
    const syncFromOffline = Boolean(req.body?.syncFromOffline);
    const clientSubmissionId = typeof req.body?.clientSubmissionId === "string" && req.body.clientSubmissionId.trim() ? req.body.clientSubmissionId.trim() : typeof payload?.clientSubmissionId === "string" && payload.clientSubmissionId.trim() ? payload.clientSubmissionId.trim() : void 0;
    if (!payload || !payload.projectId) {
      res.status(400).json({ error: "Donn\xE9es de fiche terrain invalides." });
      return;
    }
    const project = store.projects.find((p) => p.id === payload.projectId);
    if (!project) {
      res.status(404).json({ error: "Ouvrage de r\xE9f\xE9rence introuvable dans le registre officiel." });
      return;
    }
    if (user.role === "AGENT_TERRAIN" && payload.agentId !== user.id) {
      res.status(403).json({ error: "Usurpation d\u2019identit\xE9 refus\xE9e : agentId ne correspond pas au compte connect\xE9." });
      return;
    }
    const isActivelyAssigned = project.assignedAgentIds.includes(user.id);
    const hadPriorAssignment = store.assignments.some(
      (a) => a.projectId === project.id && a.agentId === user.id && (a.status === "TERMINEE" || a.status === "REAFFECTEE")
    );
    let conflictDetected = false;
    let conflictReason;
    if (user.role === "AGENT_TERRAIN" && !isActivelyAssigned) {
      if (!syncFromOffline || !hadPriorAssignment) {
        res.status(403).json({ error: "Acc\xE8s refus\xE9 : vous n\u2019\xEAtes pas activement affect\xE9 \xE0 cet ouvrage." });
        return;
      }
      conflictDetected = true;
      conflictReason = "L'affectation de cet ouvrage a \xE9t\xE9 r\xE9voqu\xE9e ou r\xE9affect\xE9e pendant la collecte hors ligne. Travail conserv\xE9 int\xE9gralement pour arbitrage du Coordonnateur.";
    }
    const existingIdx = store.reports.findIndex((r) => r.id === payload.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const gap = calculateTepTefGap(payload.progress.currentTep, payload.progress.currentTef);
    const periodKey = computePeriodKey(
      payload.identification.periodicity,
      payload.identification.collectionDate,
      payload.identification.weekNumber,
      payload.identification.month
    );
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
      definitiveReceptionDeadline: project.definitiveReceptionDeadline
    };
    const normalizedPhotos = (payload.receptions.photos || []).map((ph) => ({
      ...ph,
      syncState: "UPLOADED"
    }));
    const normalizedAttachments = (payload.receptions.attachments || []).map((at) => ({
      ...at,
      syncState: "UPLOADED"
    }));
    const candidateForValidation = {
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
        attachments: normalizedAttachments
      }
    };
    const validationErrors = validateFieldReportForSubmission(candidateForValidation);
    if (validationErrors.length > 0) {
      res.status(400).json({
        error: `Validation m\xE9tier refus\xE9e : ${validationErrors[0].message}`,
        validationErrors
      });
      return;
    }
    if (existingIdx >= 0) {
      const existing = store.reports[existingIdx];
      if (user.role === "AGENT_TERRAIN" && existing.agentId !== user.id) {
        res.status(403).json({ error: "Acc\xE8s interdit sur une fiche appartenant \xE0 un autre agent." });
        return;
      }
      if (clientSubmissionId && existing.clientSubmissionId === clientSubmissionId) {
        res.status(200).json({
          report: existing,
          conflictDetected: existing.syncStatus === "CONFLIT_AFFECTATION",
          duplicates: existing.potentialDuplicateOf || [],
          idempotentReplay: true
        });
        return;
      }
      if (existing.status === "VALIDE") {
        res.status(409).json({ error: "Une fiche d\xE9j\xE0 valid\xE9e est verrouill\xE9e et ne peut plus \xEAtre modifi\xE9e." });
        return;
      }
      if (user.role === "AGENT_TERRAIN" && (existing.status === "SOUMIS" || existing.status === "EN_COURS_VERIFICATION")) {
        res.status(409).json({
          error: "Cette fiche est d\xE9j\xE0 soumise ou en cours de v\xE9rification. Attendez la d\xE9cision ou le retour du Coordonnateur avant toute modification."
        });
        return;
      }
      const snapshot = {
        version: existing.version,
        savedAt: existing.updatedAt,
        statusAtSnapshot: existing.status,
        currentTep: existing.currentTep,
        currentTef: existing.currentTef,
        workStatus: existing.progress.workStatus,
        summary: existing.progress.periodWorksExecuted.slice(0, 140)
      };
      const duplicates2 = detectPotentialDuplicates(
        {
          id: existing.id,
          projectId: project.id,
          agentId: existing.agentId,
          periodicity: lockedIdentification.periodicity,
          identification: lockedIdentification
        },
        store.reports
      );
      const updated = {
        ...payload,
        id: existing.id,
        matrixNumber: project.matrixNumber,
        agentId: existing.agentId,
        agentName: existing.agentName,
        status: "SOUMIS",
        syncStatus: conflictDetected ? "CONFLIT_AFFECTATION" : "SYNCHRONISE",
        syncConflictReason: conflictReason,
        clientSubmissionId,
        potentialDuplicateOf: duplicates2,
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
          attachments: normalizedAttachments
        },
        reviews: existing.reviews,
        versionHistory: [...existing.versionHistory, snapshot],
        createdAt: existing.createdAt,
        updatedAt: now,
        submittedAt: now,
        validatedAt: void 0,
        lastSyncedAt: now,
        isDemoData: true
      };
      store.reports[existingIdx] = updated;
      appendAudit(
        user,
        "RESOUMISSION_FICHE",
        "FIELD_REPORT",
        updated.id,
        `Resoumission v${updated.version} sur ${project.matrixNumber} (TEP ${updated.currentTep}%, TEF ${updated.currentTef}%).`
      );
      saveStore(store);
      res.json({ report: updated, conflictDetected, duplicates: duplicates2 });
      return;
    }
    const newId = payload.id && !store.reports.some((r) => r.id === payload.id) ? payload.id : generateUniqueId("FIC");
    const duplicates = detectPotentialDuplicates(
      {
        id: newId,
        projectId: project.id,
        agentId: user.id,
        periodicity: lockedIdentification.periodicity,
        identification: lockedIdentification
      },
      store.reports
    );
    const activeAssignment = store.assignments.find(
      (a) => a.projectId === project.id && a.agentId === user.id && a.status === "ACTIVE"
    );
    const created = {
      ...payload,
      id: newId,
      projectId: project.id,
      matrixNumber: project.matrixNumber,
      agentId: user.id,
      agentName: user.fullName,
      assignmentId: activeAssignment?.id ?? payload.assignmentId ?? "AFF-OFFLINE",
      status: "SOUMIS",
      syncStatus: conflictDetected ? "CONFLIT_AFFECTATION" : "SYNCHRONISE",
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
        attachments: normalizedAttachments
      },
      reviews: [],
      versionHistory: [],
      createdAt: payload.createdAt || now,
      updatedAt: now,
      submittedAt: now,
      validatedAt: void 0,
      lastSyncedAt: now,
      isDemoData: true
    };
    store.reports.unshift(created);
    appendAudit(
      user,
      conflictDetected ? "SYNCHRO_CONFLIT_AFFECTATION" : "SOUMISSION_FICHE",
      "FIELD_REPORT",
      created.id,
      `Soumission fiche ${created.id} sur ${project.matrixNumber} (${periodKey})${duplicates.length > 0 ? ` \u2014 Doublon potentiel signal\xE9 (${duplicates.join(", ")})` : ""}.`
    );
    saveStore(store);
    res.status(201).json({ report: created, conflictDetected, duplicates });
  });
  app.post("/api/demo/reports/:reportId/review", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const report = store.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      res.status(404).json({ error: "Fiche terrain introuvable." });
      return;
    }
    const decision = req.body?.decision;
    const comment = String(req.body?.comment ?? "").trim();
    if (!["EN_COURS_VERIFICATION", "VALIDE", "RETOURNE"].includes(decision)) {
      res.status(400).json({ error: "D\xE9cision de validation invalide." });
      return;
    }
    if (report.status === "VALIDE") {
      res.status(409).json({
        error: "Cette fiche est d\xE9j\xE0 valid\xE9e et archiv\xE9e d\xE9finitivement ; elle ne peut plus \xEAtre modifi\xE9e ou retourn\xE9e."
      });
      return;
    }
    if (decision === "RETOURNE" && comment.length < 5) {
      res.status(400).json({ error: "Un motif d\xE9taill\xE9 (minimum 5 caract\xE8res) est obligatoire pour retourner une fiche." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const review = {
      id: generateUniqueId("REV"),
      reportId: report.id,
      reportVersion: report.version,
      reviewerId: coord.id,
      reviewerName: coord.fullName,
      decision,
      comment: comment || (decision === "VALIDE" ? "Fiche v\xE9rifi\xE9e et valid\xE9e par le Coordonnateur." : "Mise en v\xE9rification."),
      createdAt: now
    };
    report.reviews.push(review);
    report.status = decision;
    report.updatedAt = now;
    if (decision === "VALIDE") {
      report.validatedAt = now;
      if (report.syncStatus === "CONFLIT_AFFECTATION") {
        report.syncStatus = "SYNCHRONISE";
      }
      const project = store.projects.find((p) => p.id === report.projectId);
      if (project) {
        project.currentStatus = report.progress.workStatus;
        project.latestPeriodRealization = report.progress.periodWorksExecuted;
        project.latestExecutionStages = [...report.progress.executionStages];
        project.currentTep = report.progress.currentTep;
        project.currentTef = report.progress.currentTef;
        project.currentGap = calculateTepTefGap(report.progress.currentTep, report.progress.currentTef);
        project.latestConstraintCategories = [...report.constraints.categories];
        project.latestConstraintsSummary = report.constraints.detailedDescriptions.filter((d) => d.trim()).join(" ; ") || "Aucune contrainte active";
        project.hasUnresolvedConstraints = report.constraints.categories.length > 0;
        project.hasCriticalConstraint = report.constraints.isCritical;
        project.latestImpactsSummary = report.constraints.impacts.details || "Aucun impact majeur";
        project.receptions = {
          rt: { ...report.receptions.rt },
          rp: { ...report.receptions.rp },
          rd: { ...report.receptions.rd }
        };
        project.latestObservation = report.receptions.generalObservations || project.latestObservation;
        project.lastValidatedReportId = report.id;
        project.lastValidatedAt = now;
        project.updatedAt = now;
      }
    }
    appendAudit(
      coord,
      decision === "VALIDE" ? "VALIDATION_FICHE" : decision === "RETOURNE" ? "RETOUR_FICHE" : "VERIFICATION_FICHE",
      "FIELD_REPORT",
      report.id,
      `D\xE9cision \xAB ${decision} \xBB sur ${report.id} (${report.matrixNumber}) : ${review.comment}`
    );
    saveStore(store);
    const updatedProject = store.projects.find((p) => p.id === report.projectId);
    res.json({ report, review, project: updatedProject });
  });
  app.get("/api/demo/reports/:reportId/pdf", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    const report = store.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: "Fiche terrain introuvable" });
    }
    if (user.role === "AGENT_TERRAIN") {
      const isAuthor = report.agentId === user.id;
      const isAssigned = store.assignments.some(
        (a) => a.projectId === report.projectId && a.agentId === user.id && a.status === "ACTIVE"
      );
      if (!isAuthor && !isAssigned) {
        return res.status(403).json({ error: "Acc\xE8s non autoris\xE9 \xE0 cette fiche de synth\xE8se" });
      }
    }
    const project = store.projects.find((p) => p.id === report.projectId);
    const artifact = buildSingleReportPdfBuffer(report, project, {
      generatedByName: user.fullName,
      isDemoData: report.isDemoData || (project ? project.isDemoData : true)
    });
    res.setHeader("Content-Type", artifact.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${artifact.fileName}"`);
    res.send(Buffer.from(artifact.bytes));
  });
  app.post("/api/demo/generated-reports", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const body = req.body;
    const record = {
      id: generateUniqueId("RPT-GEN"),
      title: String(body.title ?? "Rapport consolid\xE9 BCECO / PDL-145T"),
      periodicity: body.periodicity ?? "MENSUEL",
      periodLabel: String(body.periodLabel ?? ""),
      format: body.format ?? "PDF",
      dataScope: body.dataScope ?? "VALIDES_UNIQUEMENT",
      filtersSummary: String(body.filtersSummary ?? "P\xE9rim\xE8tre national"),
      generatedBy: coord.id,
      generatedByName: coord.fullName,
      projectCount: Number(body.projectCount ?? 0),
      reportCount: Number(body.reportCount ?? 0),
      averageTep: Number(body.averageTep ?? 0),
      averageTef: Number(body.averageTef ?? 0),
      isDemoData: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.generatedReports.unshift(record);
    appendAudit(
      coord,
      "GENERATION_RAPPORT",
      "GENERATED_REPORT",
      record.id,
      `Export ${record.format} (${record.periodicity} \u2014 ${record.periodLabel}) sur ${record.projectCount} ouvrages.`
    );
    saveStore(store);
    res.status(201).json({ generatedReport: record });
  });
  app.post("/api/demo/reporting/preview", requireDemoAuth, requireCoordinator, (req, res) => {
    const params = req.body?.params ?? req.body ?? {};
    const normalized = {
      periodicity: params.periodicity === "HEBDOMADAIRE" || params.periodicity === "JOURNALIER" ? params.periodicity : "MENSUEL",
      periodKeyFilter: typeof params.periodKeyFilter === "string" ? params.periodKeyFilter : "",
      periodLabel: typeof params.periodLabel === "string" ? params.periodLabel : void 0,
      dataScope: params.dataScope === "SOUMIS_ET_VALIDES" ? "SOUMIS_ET_VALIDES" : "VALIDES_UNIQUEMENT",
      province: typeof params.province === "string" ? params.province : "",
      territory: typeof params.territory === "string" ? params.territory : "",
      infrastructureType: params.infrastructureType || "",
      contractor: typeof params.contractor === "string" ? params.contractor : "",
      workStatus: params.workStatus || "",
      contractStatus: params.contractStatus || "",
      referenceDate: typeof params.referenceDate === "string" ? params.referenceDate : void 0
    };
    const model = buildConsolidatedReportModel(store.projects, store.reports, normalized);
    res.json({ model });
  });
  app.post("/api/demo/reporting/export", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const format = String(req.body?.format ?? "PDF").toUpperCase();
    const csvVariant = req.body?.csvVariant ?? "MATRICE_21";
    const isRoadmap = Boolean(req.body?.isRoadmap);
    const rawParams = req.body?.params ?? {};
    if (!["EXCEL", "CSV", "PDF"].includes(format)) {
      res.status(400).json({ error: "Format d\u2019export invalide (formats autoris\xE9s : EXCEL, CSV, PDF)." });
      return;
    }
    const params = {
      periodicity: rawParams.periodicity === "HEBDOMADAIRE" || rawParams.periodicity === "JOURNALIER" ? rawParams.periodicity : "MENSUEL",
      periodKeyFilter: typeof rawParams.periodKeyFilter === "string" ? rawParams.periodKeyFilter : "",
      periodLabel: typeof rawParams.periodLabel === "string" ? rawParams.periodLabel : void 0,
      dataScope: rawParams.dataScope === "SOUMIS_ET_VALIDES" ? "SOUMIS_ET_VALIDES" : "VALIDES_UNIQUEMENT",
      province: typeof rawParams.province === "string" ? rawParams.province : "",
      territory: typeof rawParams.territory === "string" ? rawParams.territory : "",
      infrastructureType: rawParams.infrastructureType || "",
      contractor: typeof rawParams.contractor === "string" ? rawParams.contractor : "",
      workStatus: rawParams.workStatus || "",
      contractStatus: rawParams.contractStatus || "",
      referenceDate: typeof rawParams.referenceDate === "string" ? rawParams.referenceDate : void 0
    };
    const model = buildConsolidatedReportModel(store.projects, store.reports, params);
    if (model.rows.length === 0) {
      res.status(400).json({
        error: "Aucun ouvrage ne correspond aux filtres s\xE9lectionn\xE9s. \xC9largissez le p\xE9rim\xE8tre avant d\u2019exporter."
      });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ctx = {
      model,
      generatedByName: coord.fullName,
      generatedAt: now,
      isDemoData: true
    };
    let artifact;
    if (format === "EXCEL") {
      artifact = buildConsolidatedExcelBuffer(ctx);
    } else if (format === "CSV") {
      artifact = buildConsolidatedCsvBuffer(ctx, csvVariant);
    } else if (isRoadmap) {
      artifact = buildMultiSiteRoadmapPdfBuffer(ctx);
    } else {
      artifact = buildConsolidatedPdfBuffer(ctx);
    }
    const title = isRoadmap ? `Annexe Terrain \u2014 Feuille de Route Multi-Chantiers (${params.province || "National"})` : format === "CSV" && csvVariant !== "MATRICE_21" ? `${model.title} \u2014 Annexe CSV (${csvVariant})` : model.title;
    const record = {
      id: generateUniqueId("RPT-GEN"),
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
      createdAt: now
    };
    if (!store.generatedReportRecipes) store.generatedReportRecipes = {};
    store.generatedReports.unshift(record);
    store.generatedReportRecipes[record.id] = {
      format,
      csvVariant: format === "CSV" ? csvVariant : void 0,
      isRoadmap: format === "PDF" ? isRoadmap : void 0,
      params: model.params
    };
    appendAudit(
      coord,
      "GENERATION_RAPPORT",
      "GENERATED_REPORT",
      record.id,
      `Export serveur ${format}${isRoadmap ? " (Feuille de Route)" : ""} (${record.periodicity} \u2014 ${record.periodLabel}) sur ${record.projectCount} ouvrages \xB7 Contr\xF4les source : ${model.hasCheckFailures ? "ANOMALIE" : "CONFORME"}.`
    );
    saveStore(store);
    res.setHeader("Content-Type", artifact.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${artifact.fileName}"`);
    res.setHeader("X-Generated-Report-Id", record.id);
    res.setHeader("X-Export-Filename", artifact.fileName);
    res.setHeader("X-Validation-Status", model.hasCheckFailures ? "FAIL" : model.allChecksPassed ? "PASS" : "WARNING");
    res.status(200).send(Buffer.from(artifact.bytes));
  });
  app.get("/api/demo/generated-reports/:reportId/download", requireDemoAuth, requireCoordinator, (req, res) => {
    const coord = req.demoUser;
    const reportId = String(req.params.reportId ?? "").trim();
    const record = store.generatedReports.find((g) => g.id === reportId);
    if (!record) {
      res.status(404).json({ error: "Archive de rapport introuvable." });
      return;
    }
    const recipe = store.generatedReportRecipes?.[reportId] ?? {
      format: record.format,
      isRoadmap: record.title.toLowerCase().includes("feuille de route"),
      params: {
        periodicity: record.periodicity,
        periodLabel: record.periodLabel,
        dataScope: record.dataScope
      }
    };
    const model = buildConsolidatedReportModel(store.projects, store.reports, recipe.params);
    const ctx = {
      model,
      generatedByName: record.generatedByName || coord.fullName,
      generatedAt: record.createdAt,
      isDemoData: record.isDemoData
    };
    let artifact;
    if (recipe.format === "EXCEL") {
      artifact = buildConsolidatedExcelBuffer(ctx);
    } else if (recipe.format === "CSV") {
      artifact = buildConsolidatedCsvBuffer(ctx, recipe.csvVariant ?? "MATRICE_21");
    } else if (recipe.isRoadmap) {
      artifact = buildMultiSiteRoadmapPdfBuffer(ctx);
    } else {
      artifact = buildConsolidatedPdfBuffer(ctx);
    }
    res.setHeader("Content-Type", artifact.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${artifact.fileName}"`);
    res.setHeader("X-Export-Filename", artifact.fileName);
    res.status(200).send(Buffer.from(artifact.bytes));
  });
  app.post("/api/demo/sync-logs", requireDemoAuth, (req, res) => {
    const user = req.demoUser;
    const log = {
      id: generateUniqueId("SYNC"),
      userId: user.id,
      syncedCount: Number(req.body?.syncedCount ?? 0),
      failedCount: Number(req.body?.failedCount ?? 0),
      conflictCount: Number(req.body?.conflictCount ?? 0),
      summary: String(req.body?.summary ?? "Synchronisation terrain ex\xE9cut\xE9e."),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.syncLogs.unshift(log);
    saveStore(store);
    res.status(201).json({ syncLog: log });
  });
  app.post("/api/demo/reset", requireDemoAuth, requireCoordinator, (_req, res) => {
    store = {
      ...createDemoDataset(),
      uploadedPhotos: {},
      generatedReportRecipes: { ...DEFAULT_SEEDED_RECIPES },
      demoPasswords: { ...DEFAULT_DEMO_PASSWORDS }
    };
    try {
      if (import_node_fs.default.existsSync(PHOTOS_DIR)) {
        import_node_fs.default.rmSync(PHOTOS_DIR, { recursive: true, force: true });
      }
    } catch {
    }
    saveStore(store);
    res.json({ ok: true });
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Point de terminaison API introuvable." });
  });
  app.use((err, req, res, next) => {
    if (!req.path.startsWith("/api")) {
      next(err);
      return;
    }
    const status = typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" ? err.status : 500;
    const errType = typeof err === "object" && err !== null && "type" in err ? String(err.type) : "";
    if (errType === "entity.parse.failed" || status === 400) {
      res.status(400).json({ error: "Corps de requ\xEAte JSON invalide ou mal form\xE9." });
      return;
    }
    if (errType === "entity.too.large" || status === 413) {
      res.status(413).json({ error: "Charge utile trop volumineuse (limite 15 Mo d\xE9pass\xE9e)." });
      return;
    }
    console.error("Erreur interne API /api:", err);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: "Erreur interne du serveur lors du traitement de la requ\xEAte."
    });
  });
  return app;
}
async function startServer() {
  const app = createApiApp();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_node_path.default.resolve(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_node_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BCECO / PDL-145T Assistant de Fiche Terrain actif sur http://0.0.0.0:${PORT}`);
  });
}
var isDirectRun = Boolean(process.argv[1]) && import_meta.url === (0, import_node_url.pathToFileURL)(import_node_path.default.resolve(process.argv[1])).href;
if (isDirectRun && !process.env.VERCEL) {
  void startServer();
}

// vercel-api.cts
module.exports = createApiApp();
