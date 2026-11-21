import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Columns,
  Eye,
  FileSpreadsheet,
  FileUp,
  History,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  auditMatrixRows,
  auditUploadedExcelFile,
  buildDemoAuditSampleRows,
} from '../../domain/businessRules';
import {
  CONTRACT_STATUS_LABELS,
  EXCEL_AUDIT_CATEGORY_LABELS,
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  MATRICE_UNIQUE_HEADERS,
  PERIODICITY_LABELS,
  WORK_STATUS_LABELS,
} from '../../domain/constants';
import {
  formatDateFr,
  formatDateTimeFr,
  formatExecutionStagesLabel,
  formatExecutionStagesShort,
  formatPercentFr,
  formatReceptionCell,
  formatSignedGapFr,
  generateUniqueId,
} from '../../domain/formatters';
import type {
  ContractStatus,
  ExcelAuditResult,
  InfrastructureType,
  Project,
  WorkStatus,
} from '../../types/domain';
import { AssignmentStatusText, ReportStatusText, WorkStatusText } from '../common/StatusBadge';

interface Props {
  initialSelectedProjectId?: string | null;
  onClearInitialProject?: () => void;
  onAssignProject?: (projectId: string) => void;
}

export const ProjectRegisterView: React.FC<Props> = ({
  initialSelectedProjectId,
  onClearInitialProject,
  onAssignProject,
}) => {
  const { projects, assignments, reports, users, importAuditedProjects, pushToast } = useApp();

  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fullMatrixMode, setFullMatrixMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (initialSelectedProjectId) {
      const target = projects.find((p) => p.id === initialSelectedProjectId);
      if (target) {
        setSelectedProject(target);
        onClearInitialProject?.();
      }
    }
  }, [initialSelectedProjectId, projects, onClearInitialProject]);

  // Excel / CSV Audit Modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<ExcelAuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual New Project Modal state
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [formMatrixNumber, setFormMatrixNumber] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formType, setFormType] = useState<InfrastructureType>('ECOLE_PRIMAIRE');
  const [formProvince, setFormProvince] = useState('Haut-Katanga');
  const [formTerritory, setFormTerritory] = useState('');
  const [formSector, setFormSector] = useState('');
  const [formLocality, setFormLocality] = useState('');
  const [formContractor, setFormContractor] = useState('');
  const [formContractStatus, setFormContractStatus] = useState<ContractStatus>('CONTRAT_ACTIF');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDeadline, setFormDeadline] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formStatus, setFormStatus] = useState<WorkStatus>('NON_DEMARRE');
  const [formTep, setFormTep] = useState('0');
  const [formTef, setFormTef] = useState('0');
  const [savingNewProject, setSavingNewProject] = useState(false);

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatrix = formMatrixNumber.trim().toUpperCase();
    if (!cleanMatrix) {
      pushToast('error', 'N° Matrice obligatoire', 'Veuillez saisir un numéro de matrice unique (ex. MAT-HKA-042).');
      return;
    }
    if (existingMatrixSet.has(cleanMatrix)) {
      pushToast('error', 'N° Matrice en doublon', `Le numéro ${cleanMatrix} existe déjà dans le registre.`);
      return;
    }
    if (!formProjectName.trim()) {
      pushToast('error', 'Nom obligatoire', 'Veuillez renseigner le nom exact de l’ouvrage.');
      return;
    }
    if (!formProvince.trim() || !formTerritory.trim()) {
      pushToast('error', 'Localisation incomplète', 'Province et territoire sont obligatoires.');
      return;
    }
    if (!formContractor.trim()) {
      pushToast('error', 'Entreprise obligatoire', 'Renseignez l’entreprise ou l’ALE/PME attributaire.');
      return;
    }

    setSavingNewProject(true);
    try {
      const parsedLat = parseFloat(formLat.replace(',', '.'));
      const parsedLng = parseFloat(formLng.replace(',', '.'));
      const tepNum = Math.min(100, Math.max(0, parseFloat(formTep) || 0));
      const tefNum = Math.min(100, Math.max(0, parseFloat(formTef) || 0));

      const newProj: Project = {
        id: generateUniqueId('PRJ'),
        matrixNumber: cleanMatrix,
        contractor: formContractor.trim(),
        province: formProvince.trim(),
        territory: formTerritory.trim(),
        infrastructureType: formType,
        projectName: formProjectName.trim(),
        sectorChiefdom: formSector.trim() || 'Secteur indéterminé',
        locality: formLocality.trim() || formTerritory.trim(),
        contractStatus: formContractStatus,
        startDate: formStartDate || new Date().toISOString().slice(0, 10),
        definitiveReceptionDeadline: formDeadline || formStartDate || new Date().toISOString().slice(0, 10),
        referenceCoords: {
          lat: !isNaN(parsedLat) ? parsedLat : -4.0383,
          lng: !isNaN(parsedLng) ? parsedLng : 21.7587,
        },
        baselineDate: new Date().toISOString().slice(0, 10),
        baselineStatus: formStatus,
        baselineTep: tepNum,
        baselineTef: tefNum,
        currentStatus: formStatus,
        latestPeriodRealization: 'Inscription initiale dans le registre officiel PDL-145T.',
        latestExecutionStages: [],
        currentTep: tepNum,
        currentTef: tefNum,
        currentGap: Math.round((tepNum - tefNum) * 10) / 10,
        latestConstraintsSummary: 'Aucune contrainte active enregistrée.',
        latestConstraintCategories: [],
        hasUnresolvedConstraints: false,
        hasCriticalConstraint: false,
        latestImpactsSummary: 'Aucun impact.',
        receptions: {
          rt: { status: 'NA', date: '', reserves: '', pvReference: '' },
          rp: { status: 'NA', date: '', reserves: '', pvReference: '' },
          rd: { status: 'NA', date: '', reserves: '', pvReference: '' },
        },
        latestObservation: 'Ouvrage créé directement par le Coordonnateur.',
        assignedAgentIds: [],
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await importAuditedProjects([newProj]);
      setNewProjectModalOpen(false);
      setFormMatrixNumber('');
      setFormProjectName('');
      setFormTerritory('');
      setFormSector('');
      setFormLocality('');
      setFormContractor('');
      setFormLat('');
      setFormLng('');
    } catch (err) {
      pushToast('error', 'Échec de l’enregistrement', err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setSavingNewProject(false);
    }
  };

  const provinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (provinceFilter && p.province !== provinceFilter) return false;
      if (statusFilter && p.currentStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        p.matrixNumber.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.territory.toLowerCase().includes(q) ||
        p.sectorChiefdom.toLowerCase().includes(q) ||
        INFRASTRUCTURE_TYPE_LABELS[p.infrastructureType].toLowerCase().includes(q)
      );
    });
  }, [projects, search, provinceFilter, statusFilter]);

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [users]);

  const existingMatrixSet = useMemo(
    () => new Set(projects.map((p) => p.matrixNumber)),
    [projects]
  );

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAuditing(true);
    try {
      const result = await auditUploadedExcelFile(file, existingMatrixSet);
      setAuditResult(result);
    } catch (err) {
      pushToast(
        'error',
        'Lecture du fichier impossible',
        err instanceof Error ? err.message : 'Vérifiez le format Excel (.xlsx) ou CSV.'
      );
    } finally {
      setAuditing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRunDemoAudit = () => {
    const sampleRows = buildDemoAuditSampleRows();
    const res = auditMatrixRows(
      sampleRows,
      'Modele_Matrice_Unique_Test_Anomalies_DEMO.xlsx',
      existingMatrixSet
    );
    setAuditResult(res);
  };

  const handleConfirmImport = async () => {
    if (!auditResult || auditResult.validProjectsPreview.length === 0) return;
    setImporting(true);
    try {
      await importAuditedProjects(auditResult.validProjectsPreview);
      setAuditResult(null);
      setAuditModalOpen(false);
    } catch (err) {
      pushToast(
        'error',
        'Échec de l’importation',
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
      );
    } finally {
      setImporting(false);
    }
  };

  const projectReports = useMemo(() => {
    if (!selectedProject) return [];
    return reports
      .filter((r) => r.projectId === selectedProject.id)
      .sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));
  }, [selectedProject, reports]);

  const projectAssignments = useMemo(() => {
    if (!selectedProject) return [];
    return assignments
      .filter((a) => a.projectId === selectedProject.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selectedProject, assignments]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Registre Officiel des Ouvrages
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFullMatrixMode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[38px]"
          >
            <Columns className="w-4 h-4 text-slate-500" />
            <span>{fullMatrixMode ? 'Vue synthétique' : 'Afficher les 21 colonnes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setNewProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 min-h-[38px] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvel Ouvrage</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuditResult(null);
              setAuditModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] min-h-[38px]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Audit &amp; Import Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par N° Matrice, nom d’ouvrage, entreprise, territoire, secteur…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <select
          aria-label="Filtrer par province"
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
        >
          <option value="">Toutes les provinces ({provinces.length})</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrer par statut"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
        >
          <option value="">Tous les statuts</option>
          <option value="ACHEVE">1) Achevé</option>
          <option value="EN_COURS">2) En cours</option>
          <option value="A_L_ARRET">3) À l’arrêt</option>
          <option value="NON_DEMARRE">4) Non démarré</option>
        </select>

        <div className="text-xs font-mono text-slate-600 ml-auto">
          {filteredProjects.length} / {projects.length} ouvrage(s)
        </div>
      </div>

      {/* Official Register Table — scroll X for colonnes, scroll Y for lignes */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[min(70vh,640px)] overscroll-contain">
          {fullMatrixMode ? (
            <table className="w-full text-left border-collapse text-xs min-w-[2150px]">
              <thead className="sticky top-0 z-20">
                {/* Grouped Header matching official Matrice Unique workbook */}
                <tr>
                  <th
                    colSpan={9}
                    className="bg-[#0F2544] text-white py-2 px-3 text-[11px] font-bold tracking-wider uppercase border-r border-white/20"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-200" />
                      IDENTIFICATION
                    </span>
                  </th>
                  <th
                    colSpan={12}
                    className="bg-slate-700 text-white py-2 px-3 text-[11px] font-bold tracking-wider uppercase border-r border-white/20"
                  >
                    SITUATION CONSOLIDÉE TERRAIN (issue des fiches validées Coordonnateur)
                  </th>
                  <th className="bg-slate-800 text-white py-2 px-3 text-[11px] font-bold uppercase text-center">
                    Actions
                  </th>
                </tr>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 text-[11px]">
                  {MATRICE_UNIQUE_HEADERS.map((header, idx) => (
                    <th
                      key={header}
                      className={`py-2.5 px-2.5 font-semibold whitespace-nowrap border-r border-slate-200 bg-slate-100 ${
                        idx === 0 ? 'sticky left-0 z-30 shadow-[2px_0_4px_rgba(15,37,68,0.08)]' : ''
                      } ${idx === 12 || idx === 13 || idx === 14 ? 'text-right' : ''}`}
                    >
                      <span className="font-mono text-[10px] text-slate-400 mr-1">{idx + 1}.</span>
                      {header}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap bg-slate-100">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Cols 1-9: Contractual Identification */}
                    <td className="py-2.5 px-2.5 font-mono font-bold text-[#0F2544] whitespace-nowrap border-r border-slate-100 bg-slate-50 sticky left-0 z-10 shadow-[2px_0_4px_rgba(15,37,68,0.06)]">
                      {p.matrixNumber}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-800 max-w-[180px] border-r border-slate-100 bg-slate-50/40">
                      {p.contractor}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-800 whitespace-nowrap border-r border-slate-100 bg-slate-50/40">
                      {p.province}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-800 whitespace-nowrap border-r border-slate-100 bg-slate-50/40">
                      {p.territory}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap border-r border-slate-100 bg-slate-50/40">
                      {INFRASTRUCTURE_TYPE_LABELS[p.infrastructureType]}
                    </td>
                    <td className="py-2.5 px-2.5 font-semibold text-slate-900 max-w-[230px] border-r border-slate-100 bg-slate-50/40">
                      {p.projectName}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap border-r border-slate-100 bg-slate-50/40">
                      {p.sectorChiefdom}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap border-r border-slate-100 bg-slate-50/40">
                      {formatDateFr(p.startDate)}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap border-r border-slate-300 bg-slate-50/40">
                      {formatDateFr(p.definitiveReceptionDeadline)}
                    </td>

                    {/* Cols 10-21: Field Consolidated State */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap border-r border-slate-100">
                      <WorkStatusText status={p.currentStatus} />
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-[240px] border-r border-slate-100">
                      {p.latestPeriodRealization || '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-[200px] border-r border-slate-100">
                      {formatExecutionStagesShort(p.latestExecutionStages)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap border-r border-slate-100">
                      {formatPercentFr(p.currentTep, 0)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap border-r border-slate-100">
                      {formatPercentFr(p.currentTef, 0)}
                    </td>
                    <td
                      className={`py-2.5 px-2.5 text-right font-mono font-bold tabular-nums whitespace-nowrap border-r border-slate-100 ${
                        Math.abs(p.currentGap) > 10 ? 'text-red-700 bg-red-50/60' : 'text-slate-700'
                      }`}
                    >
                      {formatSignedGapFr(p.currentGap)}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-[220px] border-r border-slate-100">
                      {p.latestConstraintsSummary || 'Aucune'}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-[200px] border-r border-slate-100">
                      {p.latestImpactsSummary || 'Aucun'}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap border-r border-slate-100">
                      {formatReceptionCell(p.receptions.rt)}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap border-r border-slate-100">
                      {formatReceptionCell(p.receptions.rp)}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap border-r border-slate-100">
                      {formatReceptionCell(p.receptions.rd)}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-700 max-w-[240px] border-r border-slate-100">
                      {p.latestObservation || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedProject(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">N° &amp; Ouvrage</th>
                  <th className="py-3 px-3 font-semibold">Localisation</th>
                  <th className="py-3 px-3 font-semibold">Statut</th>
                  <th className="py-3 px-3 font-semibold text-right">TEP / TEF</th>
                  <th className="py-3 px-3 font-semibold">Agent(s) affecté(s)</th>
                  <th className="py-3 px-3 font-semibold">Réceptions</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        <span className="font-mono text-blue-800 mr-1.5">{p.matrixNumber}</span>
                        {p.projectName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {INFRASTRUCTURE_TYPE_SHORT[p.infrastructureType]} · {p.contractor}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{p.province}</div>
                      <div className="text-[11px] text-slate-500">{p.territory} · {p.sectorChiefdom}</div>
                    </td>
                    <td className="py-3 px-3">
                      <WorkStatusText status={p.currentStatus} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {formatPercentFr(p.currentTep, 0)} / {formatPercentFr(p.currentTef, 0)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          Math.abs(p.currentGap) > 10 ? 'text-red-700' : 'text-slate-500'
                        }`}
                      >
                        Écart {formatSignedGapFr(p.currentGap)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {p.assignedAgentIds.length === 0 ? (
                        <span className="text-slate-400">Non affecté</span>
                      ) : (
                        p.assignedAgentIds.map((id) => userNameMap.get(id) ?? id).join(', ')
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      RT:{p.receptions.rt.status} · RP:{p.receptions.rp.status} · RD:{p.receptions.rd.status}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedProject(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredProjects.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            Aucun ouvrage ne correspond aux critères de recherche.
          </div>
        )}
      </div>

      {/* Project Dossier Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Dossier ouvrage ${selectedProject.matrixNumber}`}
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#0F2544] text-white flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono text-blue-200 uppercase tracking-wider">
                  {selectedProject.matrixNumber} · {INFRASTRUCTURE_TYPE_LABELS[selectedProject.infrastructureType]}
                </p>
                <h3 className="text-base font-bold mt-0.5">{selectedProject.projectName}</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  {selectedProject.province} / {selectedProject.territory} / {selectedProject.sectorChiefdom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="p-1.5 text-slate-200 hover:text-white rounded"
                aria-label="Fermer le dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Section A: Locked Contractual Identity */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0F2544] mb-3">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Données contractuelles de référence (immuables pour les agents)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Entreprise / PME</span>
                    <span className="font-semibold text-slate-900">{selectedProject.contractor}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Statut contractuel</span>
                    <span className="font-semibold text-slate-900">
                      {CONTRACT_STATUS_LABELS[selectedProject.contractStatus]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Localité / Coordonnées réf.</span>
                    <span className="font-mono text-slate-900">
                      {selectedProject.locality} ({selectedProject.referenceCoords.lat.toFixed(4)},{' '}
                      {selectedProject.referenceCoords.lng.toFixed(4)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date de démarrage</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatDateFr(selectedProject.startDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Échéance réception définitive</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatDateFr(selectedProject.definitiveReceptionDeadline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Référence figée ({formatDateFr(selectedProject.baselineDate)})</span>
                    <span className="font-mono text-slate-800">
                      TEP {selectedProject.baselineTep}% · TEF {selectedProject.baselineTef}% ·{' '}
                      {WORK_STATUS_LABELS[selectedProject.baselineStatus]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section B: Consolidated Current State */}
              <div className="border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Situation terrain consolidée actuelle
                  </h4>
                  <WorkStatusText status={selectedProject.currentStatus} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">TEP actuel</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatPercentFr(selectedProject.currentTep)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">TEF actuel</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatPercentFr(selectedProject.currentTef)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Écart TEP − TEF</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        Math.abs(selectedProject.currentGap) > 10 ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {formatSignedGapFr(selectedProject.currentGap)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Dernière validation</span>
                    <span className="text-xs font-mono font-semibold text-slate-900">
                      {formatDateTimeFr(selectedProject.lastValidatedAt)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block">Niveau d’exécution atteint</span>
                    <span className="text-slate-900 font-medium">
                      {formatExecutionStagesLabel(selectedProject.latestExecutionStages)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dernière réalisation enregistrée</span>
                    <span className="text-slate-900">{selectedProject.latestPeriodRealization}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contraintes &amp; Alertes</span>
                    <span className="text-slate-900">
                      {selectedProject.latestConstraintsSummary || 'Aucune contrainte active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Impacts &amp; Observations</span>
                    <span className="text-slate-900">
                      {selectedProject.latestImpactsSummary || 'Aucun impact'} — {selectedProject.latestObservation}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500">RT : </span>
                    <span className="text-slate-900">{formatReceptionCell(selectedProject.receptions.rt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">RP : </span>
                    <span className="text-slate-900">{formatReceptionCell(selectedProject.receptions.rp)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">RD : </span>
                    <span className="text-slate-900">{formatReceptionCell(selectedProject.receptions.rd)}</span>
                  </div>
                </div>
              </div>

              {/* Section C: Assignment History */}
              <div className="border border-slate-200 rounded-md p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <h4 className="font-bold text-slate-900 text-xs">
                    Historique des affectations ({projectAssignments.length})
                  </h4>
                  {onAssignProject && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedProject.id;
                        setSelectedProject(null);
                        onAssignProject(targetId);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Gérer l’affectation
                    </button>
                  )}
                </div>
                {projectAssignments.length === 0 ? (
                  <p className="text-slate-500">Aucune affectation enregistrée pour cet ouvrage.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {projectAssignments.map((a) => (
                      <div key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900">{a.agentName}</span>
                          <span className="text-slate-500 ml-2 font-mono">
                            Du {formatDateFr(a.startDate)}
                            {a.endDate ? ` au ${formatDateFr(a.endDate)}` : ' (en cours)'}
                          </span>
                          {a.notes && <p className="text-[11px] text-slate-500 mt-0.5">{a.notes}</p>}
                        </div>
                        <AssignmentStatusText status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section D: Chronological Field Reports History & TEP/TEF Progression */}
              <div className="border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    <History className="w-3.5 h-3.5 text-blue-700" />
                    <span>Historique chronologique des fiches terrain ({projectReports.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Archives immuables — aucune fiche historique n’est écrasée
                  </span>
                </div>

                {/* Chronological TEP/TEF Evolution Strip (Baseline -> Validated Milestones) */}
                {projectReports.some((r) => r.status === 'VALIDE') && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-700">
                      Évolution consolidée TEP / TEF (Référence figée → Fiches validées)
                    </p>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      <span className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700">
                        Réf. {formatDateFr(selectedProject.baselineDate)} : {selectedProject.baselineTep}% /{' '}
                        {selectedProject.baselineTef}%
                      </span>
                      {[...projectReports]
                        .filter((r) => r.status === 'VALIDE')
                        .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate))
                        .map((r) => (
                          <React.Fragment key={r.id}>
                            <span className="text-slate-400">→</span>
                            <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                              {formatDateFr(r.collectionDate)} : {r.currentTep}% / {r.currentTef}% ({formatSignedGapFr(r.progress.tepTefGap)})
                            </span>
                          </React.Fragment>
                        ))}
                    </div>
                  </div>
                )}

                {projectReports.length === 0 ? (
                  <p className="text-slate-500">Aucune fiche terrain soumise pour cet ouvrage.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                          <th className="py-2 pr-3 font-semibold">Date / Période</th>
                          <th className="py-2 px-2 font-semibold">ID, Agent &amp; Versions</th>
                          <th className="py-2 px-2 font-semibold">Statut validation</th>
                          <th className="py-2 px-2 font-semibold text-right">TEP%</th>
                          <th className="py-2 px-2 font-semibold text-right">TEF%</th>
                          <th className="py-2 px-2 font-semibold text-right">Écart</th>
                          <th className="py-2 pl-2 font-semibold">Réalisation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectReports.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 pr-3 font-mono whitespace-nowrap text-slate-800">
                              {formatDateFr(r.collectionDate)}
                              <span className="block text-[10px] text-slate-500">
                                {PERIODICITY_LABELS[r.periodicity]} · {r.periodKey}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span className="font-mono text-slate-900">{r.id}</span>
                              <span className="block text-[11px] text-slate-500">
                                {r.agentName} · v{r.version}
                                {r.versionHistory.length > 0
                                  ? ` (${r.versionHistory.length} révision${r.versionHistory.length > 1 ? 's' : ''} archivée${r.versionHistory.length > 1 ? 's' : ''})`
                                  : ''}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <ReportStatusText status={r.status} />
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-900">
                              {formatPercentFr(r.currentTep, 0)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-900">
                              {formatPercentFr(r.currentTef, 0)}
                            </td>
                            <td
                              className={`py-2 px-2 text-right font-mono tabular-nums font-semibold ${
                                Math.abs(r.progress.tepTefGap) > 10 ? 'text-red-700' : 'text-slate-700'
                              }`}
                            >
                              {formatSignedGapFr(r.progress.tepTefGap)}
                            </td>
                            <td className="py-2 pl-2 text-slate-700 max-w-[220px]">
                              {r.progress.periodWorksExecuted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel / CSV Pre-Import Audit Modal */}
      {auditModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Audit préalable à l’importation Matrice Unique"
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#0F2544] text-white flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">
                  Audit préalable &amp; Importation — Matrice Unique (Excel / CSV)
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Contrôle automatique avant intégration : identifiants manquants, doublons, fiches incomplètes et valeurs incohérentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-1.5 text-slate-200 hover:text-white rounded"
                aria-label="Fermer la fenêtre d’audit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Upload / Demo Audit Controls */}
              <div className="border border-dashed border-slate-300 bg-slate-50 rounded-lg p-5 text-center space-y-3">
                <FileUp className="w-7 h-7 text-[#0F2544] mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Sélectionnez un classeur Matrice Unique (.xlsx, .xls ou .csv)
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Compatible avec le Modèle Matrice Unique officiel (en-tête sur 3 lignes). Aucune ligne anormale
                    n’est insérée automatiquement : seules les fiches conformes peuvent être importées.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Télécharger le modèle :{' '}
                    <a
                      href="/assets/official/Modele_Matrice_Unique.xlsx"
                      download="Modele_Matrice_Unique.xlsx"
                      className="text-blue-700 font-medium underline"
                    >
                      Modele_Matrice_Unique.xlsx
                    </a>
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={auditing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B]"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>{auditing ? 'Analyse en cours…' : 'Choisir un fichier Excel / CSV'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunDemoAudit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-100"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Tester l’audit sur le jeu d’anomalies Démo</span>
                  </button>
                </div>
              </div>

              {/* Audit Result Breakdown */}
              {auditResult && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-900">Fichier analysé : {auditResult.fileName}</p>
                      <p className="text-[11px] text-slate-500">
                        {auditResult.totalRows} ligne(s) lue(s) dans la première feuille
                      </p>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-xs">
                      <span className="text-emerald-800 font-bold">
                        {auditResult.validRowsCount} conforme(s)
                      </span>
                      <span className="text-red-700 font-bold">
                        {auditResult.rejectedRowsCount} rejetée(s)
                      </span>
                      <span className="text-amber-700 font-bold">
                        {auditResult.warningRowsCount} avert.
                      </span>
                    </div>
                  </div>

                  {/* Detected Issues List */}
                  {auditResult.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Anomalies détectées ({auditResult.issues.length})</span>
                      </h4>
                      <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-52 overflow-y-auto">
                        {auditResult.issues.map((issue, idx) => (
                          <div key={`${issue.rowIndex}-${idx}`} className="p-2.5 flex items-start gap-2.5">
                            <span
                              className={`font-mono text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                                issue.severity === 'ERREUR' ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              [{issue.severity}]
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                Ligne {issue.rowIndex} · N° {issue.matrixNumber} ·{' '}
                                {EXCEL_AUDIT_CATEGORY_LABELS[issue.category]}
                              </p>
                              <p className="text-slate-600">{issue.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview */}
                  {auditResult.validProjectsPreview.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-emerald-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Lignes conformes prêtes à l’import ({auditResult.validProjectsPreview.length})</span>
                      </h4>
                      <div className="border border-emerald-200 bg-emerald-50/30 rounded-md divide-y divide-emerald-100">
                        {auditResult.validProjectsPreview.map((p) => (
                          <div key={p.id} className="p-2.5 flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-[#0F2544] mr-2">{p.matrixNumber}</span>
                              <span className="font-semibold text-slate-900">{p.projectName}</span>
                              <span className="text-slate-500 ml-2">
                                {p.province} · {p.territory} · {p.contractor}
                              </span>
                            </div>
                            <span className="font-mono text-slate-700 shrink-0">
                              TEP {p.currentTep}% · TEF {p.currentTef}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Les lignes marquées [ERREUR] sont automatiquement écartées de l’importation.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={!auditResult || auditResult.validProjectsPreview.length === 0 || importing}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50"
                >
                  {importing
                    ? 'Intégration…'
                    : `Importer ${auditResult?.validProjectsPreview.length ?? 0} ouvrage(s) conforme(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual New Project Registration Modal */}
      {newProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Inscrire un nouvel ouvrage au registre officiel"
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#0F2544] text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-600/30 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Inscrire un Nouvel Ouvrage au Registre Officiel
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Données contractuelles de référence (Colonnes 1 à 9 — Matrice Unique PDL-145T)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewProjectModalOpen(false)}
                className="p-1.5 text-slate-200 hover:text-white rounded"
                aria-label="Fermer la fenêtre"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewProject} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Section A: Identification contractuelle */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#0F2544] uppercase tracking-wide text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>A. Identification Contractuelle de Référence (Colonnes 1 à 9)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      1. N° Matrice Unique *
                    </label>
                    <input
                      type="text"
                      required
                      value={formMatrixNumber}
                      onChange={(e) => setFormMatrixNumber(e.target.value.toUpperCase())}
                      placeholder="Ex: MAT-HKA-045"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      5. Type d’ouvrage *
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as InfrastructureType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    >
                      <option value="ECOLE_PRIMAIRE">1) École primaire (EP)</option>
                      <option value="CENTRE_DE_SANTE">2) Centre de santé (CS)</option>
                      <option value="BATIMENT_ADMINISTRATIF">3) Bâtiment administratif (BA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Statut contractuel *
                    </label>
                    <select
                      value={formContractStatus}
                      onChange={(e) => setFormContractStatus(e.target.value as ContractStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    >
                      <option value="CONTRAT_ACTIF">Contrat actif</option>
                      <option value="CONTRAT_RESILIE">Contrat résilié</option>
                      <option value="REATTRIBUE_ALE_PME">Réattribué (ALE/PME)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      6. Nom exact de l’ouvrage *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProjectName}
                      onChange={(e) => setFormProjectName(e.target.value)}
                      placeholder="Ex: EP KANZENZE ou CS LUALABA CENTRE"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      2. Entreprise / ALE / PME attributaire *
                    </label>
                    <input
                      type="text"
                      required
                      value={formContractor}
                      onChange={(e) => setFormContractor(e.target.value)}
                      placeholder="Ex: ETS CONGO BÂTIMENT ou ALE DU SUD"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      8. Date de démarrage effectif *
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      9. Échéance réception définitive (RD) *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Localisation géographique & administrative */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-[#0F2544] uppercase tracking-wide text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>B. Localisation Administrative &amp; Coordonnées GPS de Référence</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      3. Province *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProvince}
                      onChange={(e) => setFormProvince(e.target.value)}
                      placeholder="Ex: Haut-Katanga, Lualaba…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      4. Territoire *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTerritory}
                      onChange={(e) => setFormTerritory(e.target.value)}
                      placeholder="Ex: Mutshatsha, Sakania…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      7. Secteur / Chefferie
                    </label>
                    <input
                      type="text"
                      value={formSector}
                      onChange={(e) => setFormSector(e.target.value)}
                      placeholder="Ex: Chefferie de Luilu"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Localité / Village
                    </label>
                    <input
                      type="text"
                      value={formLocality}
                      onChange={(e) => setFormLocality(e.target.value)}
                      placeholder="Ex: Village Mutoshi"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Coordonnées GPS contractuelles — Latitude
                    </label>
                    <input
                      type="text"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      placeholder="Ex: -11.66089"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Coordonnées GPS contractuelles — Longitude
                    </label>
                    <input
                      type="text"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      placeholder="Ex: 27.47938"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Situation de Référence Initiale (Baseline) */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-[#0F2544] uppercase tracking-wide text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                  <span>C. Situation de Référence Initiale (Baseline de Démarrage)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Statut d’avancement initial
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as WorkStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white"
                    >
                      <option value="NON_DEMARRE">4) Non démarré / Ajourné</option>
                      <option value="EN_COURS">2) En cours d’exécution</option>
                      <option value="A_L_ARRET">3) À l’arrêt</option>
                      <option value="ACHEVE">1) Achevé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      13. TEP initial (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formTep}
                      onChange={(e) => setFormTep(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      14. TEF initial (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formTef}
                      onChange={(e) => setFormTef(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="px-5 py-3.5 -mx-5 -mb-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 sticky bottom-0">
                <span className="text-[11px] text-slate-500">
                  L’ouvrage inscrit apparaîtra immédiatement dans la Matrice Unique et pourra être affecté aux agents.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProjectModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 min-h-[36px]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewProject}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50 min-h-[36px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingNewProject ? 'Enregistrement…' : 'Enregistrer et Inscrire l’Ouvrage'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
