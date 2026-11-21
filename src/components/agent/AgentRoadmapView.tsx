import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  MapPinned,
  Plus,
  Save,
  Trash2,
  FilePlus2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  EXECUTION_STAGES,
  INFRASTRUCTURE_TYPE_SHORT,
  PERIODICITY_LABELS,
  WORK_STATUS_CONCISE,
} from '../../domain/constants';
import {
  currentIsoWeekLabel,
  currentMonthIso,
  formatPercentFr,
  generateUniqueId,
  todayIsoDate,
} from '../../domain/formatters';
import {
  exportAgentMissionRoadmapPdf,
} from '../../services/export/reportExporter';
import type {
  Project,
  ReportPeriodicity,
  RoadmapMission,
  RoadmapMissionEntry,
  RoadmapStatusCode,
  WorkStatus,
} from '../../types/domain';
import { OfficialDocumentsCard } from '../common/OfficialDocumentsCard';

const STORAGE_PREFIX = 'bceco.roadmap.mission.';

function statusCodeFromWorkStatus(status: WorkStatus): RoadmapStatusCode {
  if (status === 'ACHEVE') return '1';
  if (status === 'EN_COURS') return '2';
  return '3';
}

function stagesHint(project: Project): string {
  if (!project.latestExecutionStages.length) return WORK_STATUS_CONCISE[project.currentStatus];
  const codes = project.latestExecutionStages
    .map((s) => EXECUTION_STAGES.find((e) => e.id === s)?.shortCode ?? s)
    .join('/');
  return `${WORK_STATUS_CONCISE[project.currentStatus]} (${codes})`;
}

function entryFromProject(project: Project): RoadmapMissionEntry {
  return {
    id: generateUniqueId('RM-ROW'),
    projectId: project.id,
    matrixNumber: project.matrixNumber,
    projectNameAndType: `${project.projectName} (${INFRASTRUCTURE_TYPE_SHORT[project.infrastructureType]})`,
    contractor: project.contractor,
    statusCode: statusCodeFromWorkStatus(project.currentStatus),
    periodRealizationAndStages:
      project.latestPeriodRealization?.trim() || stagesHint(project),
    tep: project.currentTep,
    tef: project.currentTef,
    constraintsAndImpacts: [project.latestConstraintsSummary, project.latestImpactsSummary]
      .filter((s) => s && s.trim())
      .join(' — ')
      .slice(0, 280),
    receptionsSummary: `RT:${project.receptions.rt.status} / RP:${project.receptions.rp.status} / RD:${project.receptions.rd.status}`,
    keyObservations: project.latestObservation || '',
  };
}

function periodLabelFor(periodicity: ReportPeriodicity, missionDate: string): string {
  if (periodicity === 'HEBDOMADAIRE') return currentIsoWeekLabel();
  if (periodicity === 'MENSUEL') return currentMonthIso();
  return missionDate;
}

function loadMission(agentId: string): RoadmapMission | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + agentId);
    if (!raw) return null;
    return JSON.parse(raw) as RoadmapMission;
  } catch {
    return null;
  }
}

function saveMission(mission: RoadmapMission): void {
  localStorage.setItem(STORAGE_PREFIX + mission.agentId, JSON.stringify(mission));
}

export const AgentRoadmapView: React.FC = () => {
  const { currentUser, projects, pushToast, isOnline } = useApp();
  const agentId = currentUser?.id ?? '';
  const agentName = currentUser?.fullName ?? 'Agent terrain';

  const [mission, setMission] = useState<RoadmapMission | null>(null);
  const [projectToAdd, setProjectToAdd] = useState('');

  useEffect(() => {
    if (!agentId) return;
    const existing = loadMission(agentId);
    if (existing) {
      setMission(existing);
      return;
    }
    const fresh: RoadmapMission = {
      id: generateUniqueId('RM'),
      agentId,
      agentName,
      province: projects[0]?.province ?? '',
      territory: '',
      periodicity: 'JOURNALIER',
      missionDate: todayIsoDate(),
      periodLabel: todayIsoDate(),
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMission(fresh);
  }, [agentId, agentName, projects]);

  const availableProjects = useMemo(() => {
    if (!mission) return projects;
    const used = new Set(mission.entries.map((e) => e.projectId));
    return projects.filter((p) => !used.has(p.id));
  }, [projects, mission]);

  const provinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).sort((a, b) => a.localeCompare(b, 'fr')),
    [projects]
  );

  const territories = useMemo(() => {
    if (!mission?.province) {
      return Array.from(new Set(projects.map((p) => p.territory))).sort((a, b) => a.localeCompare(b, 'fr'));
    }
    return Array.from(
      new Set(projects.filter((p) => p.province === mission.province).map((p) => p.territory))
    ).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [projects, mission?.province]);

  const updateMission = (patch: Partial<RoadmapMission>) => {
    setMission((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      if (patch.periodicity !== undefined || patch.missionDate !== undefined) {
        next.periodLabel = periodLabelFor(
          patch.periodicity ?? prev.periodicity,
          patch.missionDate ?? prev.missionDate
        );
      }
      return next;
    });
  };

  const updateEntry = (entryId: string, patch: Partial<RoadmapMissionEntry>) => {
    setMission((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        entries: prev.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
      };
    });
  };

  const handleAddProject = () => {
    const project = projects.find((p) => p.id === projectToAdd);
    if (!project || !mission) return;
    setMission({
      ...mission,
      province: mission.province || project.province,
      territory: mission.territory || project.territory,
      entries: [...mission.entries, entryFromProject(project)],
      updatedAt: new Date().toISOString(),
    });
    setProjectToAdd('');
  };

  const handleAddAllAssigned = () => {
    if (!mission) return;
    const used = new Set(mission.entries.map((e) => e.projectId));
    const toAdd = projects.filter((p) => !used.has(p.id)).map(entryFromProject);
    if (!toAdd.length) {
      pushToast('info', 'Feuille de route', 'Tous vos chantiers affectés sont déjà dans la feuille.');
      return;
    }
    const firstProject = projects.find((p) => p.id === toAdd[0].projectId);
    setMission({
      ...mission,
      province: mission.province || firstProject?.province || '',
      territory: mission.territory || firstProject?.territory || '',
      entries: [...mission.entries, ...toAdd],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!mission) return;
    saveMission(mission);
    pushToast(
      'success',
      'Feuille de route enregistrée',
      `${mission.entries.length} chantier(s) conservés localement${isOnline ? '' : ' (hors ligne)'}.`
    );
  };

  const handleExportPdf = () => {
    if (!mission || mission.entries.length === 0) {
      pushToast('error', 'Export impossible', 'Ajoutez au moins un chantier avant d’exporter le PDF.');
      return;
    }
    saveMission(mission);
    exportAgentMissionRoadmapPdf({
      province: mission.province,
      territory: mission.territory,
      periodLabel: mission.periodLabel,
      agentName,
      generatedAt: new Date().toISOString(),
      isDemoData: Boolean(currentUser?.isDemoData),
      rows: mission.entries.map((e) => [
        e.matrixNumber,
        e.projectNameAndType,
        e.contractor,
        e.statusCode,
        e.periodRealizationAndStages,
        String(e.tep),
        String(e.tef),
        e.constraintsAndImpacts,
        e.receptionsSummary,
        e.keyObservations,
      ]),
    });
    pushToast('success', 'PDF généré', 'Annexe Terrain — Feuille de Route multi-chantiers téléchargée.');
  };

  if (!mission) {
    return (
      <div className="p-6 text-sm text-slate-500">Chargement de la feuille de route…</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[#0F2544]">
          <MapPinned className="w-5 h-5" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Annexe Terrain — Feuille de Route
          </h1>
        </div>
        <p className="text-sm text-slate-600 max-w-3xl">
          Synthèse multi-chantiers pour missions itinérantes (page 3 du formulaire officiel). Complète les
          fiches individuelles : un tableau rapide par ouvrage visité le même jour / la même semaine.
        </p>
      </header>

      <OfficialDocumentsCard compact />

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Province</label>
            <select
              value={mission.province}
              onChange={(e) => updateMission({ province: e.target.value, territory: '' })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Territoire</label>
            <select
              value={mission.territory}
              onChange={(e) => updateMission({ territory: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="">—</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Périodicité</label>
            <select
              value={mission.periodicity}
              onChange={(e) =>
                updateMission({ periodicity: e.target.value as ReportPeriodicity })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              {(Object.keys(PERIODICITY_LABELS) as ReportPeriodicity[]).map((k) => (
                <option key={k} value={k}>
                  {PERIODICITY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date de mission</label>
            <input
              type="date"
              value={mission.missionDate}
              onChange={(e) => updateMission({ missionDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Période affichée : <strong className="text-slate-700">{mission.periodLabel}</strong> ·{' '}
          {mission.entries.length} ouvrage(s)
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ajouter un chantier affecté
            </label>
            <select
              value={projectToAdd}
              onChange={(e) => setProjectToAdd(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="">Sélectionner…</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matrixNumber} — {p.projectName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddProject}
            disabled={!projectToAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-[#0F2544] text-white disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
          <button
            type="button"
            onClick={handleAddAllAssigned}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-slate-300 text-slate-700 bg-white"
          >
            <FilePlus2 className="w-4 h-4" />
            Tous les chantiers
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0F2544] text-white">
                <th className="py-2 px-2 font-semibold">N° Matrice</th>
                <th className="py-2 px-2 font-semibold">Nom & Type (EP/CS/BA)</th>
                <th className="py-2 px-2 font-semibold">Entreprise (PME)</th>
                <th className="py-2 px-2 font-semibold">Statut*</th>
                <th className="py-2 px-2 font-semibold">Réalisation & niveau</th>
                <th className="py-2 px-2 font-semibold">TEP%</th>
                <th className="py-2 px-2 font-semibold">TEF%</th>
                <th className="py-2 px-2 font-semibold">Contraintes (1-4)** & Impacts</th>
                <th className="py-2 px-2 font-semibold">RT/RP/RD</th>
                <th className="py-2 px-2 font-semibold">Observations</th>
                <th className="py-2 px-2 font-semibold w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mission.entries.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 px-4 text-center text-slate-500">
                    Aucun chantier dans la feuille de route. Ajoutez les ouvrages visités lors de la mission.
                  </td>
                </tr>
              )}
              {mission.entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="py-2 px-2 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                    {entry.matrixNumber}
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      rows={2}
                      value={entry.projectNameAndType}
                      onChange={(e) => updateEntry(entry.id, { projectNameAndType: e.target.value })}
                      className="w-full min-w-[140px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={entry.contractor}
                      onChange={(e) => updateEntry(entry.id, { contractor: e.target.value })}
                      className="w-full min-w-[110px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={entry.statusCode}
                      onChange={(e) =>
                        updateEntry(entry.id, { statusCode: e.target.value as RoadmapStatusCode })
                      }
                      className="px-1.5 py-1 border border-slate-200 rounded bg-white text-[11px]"
                    >
                      <option value="1">1 — Achevé</option>
                      <option value="2">2 — En cours</option>
                      <option value="3">3 — Arrêt / Non démarré</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      rows={2}
                      value={entry.periodRealizationAndStages}
                      onChange={(e) =>
                        updateEntry(entry.id, { periodRealizationAndStages: e.target.value })
                      }
                      className="w-full min-w-[150px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={entry.tep}
                      onChange={(e) => updateEntry(entry.id, { tep: Number(e.target.value) })}
                      className="w-16 px-1.5 py-1 border border-slate-200 rounded text-[11px] font-mono"
                    />
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatPercentFr(entry.tep, 0)}</div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={entry.tef}
                      onChange={(e) => updateEntry(entry.id, { tef: Number(e.target.value) })}
                      className="w-16 px-1.5 py-1 border border-slate-200 rounded text-[11px] font-mono"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      rows={2}
                      value={entry.constraintsAndImpacts}
                      onChange={(e) =>
                        updateEntry(entry.id, { constraintsAndImpacts: e.target.value })
                      }
                      className="w-full min-w-[150px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                      placeholder="1-4 + impacts"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={entry.receptionsSummary}
                      onChange={(e) => updateEntry(entry.id, { receptionsSummary: e.target.value })}
                      className="w-full min-w-[110px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      rows={2}
                      value={entry.keyObservations}
                      onChange={(e) => updateEntry(entry.id, { keyObservations: e.target.value })}
                      className="w-full min-w-[120px] px-1.5 py-1 border border-slate-200 rounded text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      title="Retirer"
                      onClick={() =>
                        setMission({
                          ...mission,
                          entries: mission.entries.filter((e) => e.id !== entry.id),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="p-1.5 rounded text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
          <p>* Codes Statut : 1) Achevé | 2) En cours (F/E/T/Fin/PO) | 3) À l&apos;arrêt / Non démarré.</p>
          <p>
            ** Codes Contraintes : 1) Technique | 2) Logistique | 3) Financière | 4) Sociale et
            Environnementale.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 sticky bottom-16 md:bottom-4 z-10">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md bg-white border border-slate-300 text-slate-800 shadow-sm"
        >
          <Save className="w-4 h-4" />
          Enregistrer localement
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md bg-[#0F2544] text-white shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exporter PDF Annexe
        </button>
      </div>
    </div>
  );
};
