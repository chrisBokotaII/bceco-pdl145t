import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckSquare,
  ClipboardList,
  History,
  Info,
  Search,
  Square,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INFRASTRUCTURE_TYPE_SHORT } from '../../domain/constants';
import { formatDateFr, todayIsoDate } from '../../domain/formatters';
import type { AgentAssignment } from '../../types/domain';
import { AssignmentStatusText, WorkStatusText } from '../common/StatusBadge';

interface Props {
  preselectedProjectId?: string | null;
  onConsumePreselectedProject?: () => void;
}

export const AssignmentsView: React.FC<Props> = ({
  preselectedProjectId,
  onConsumePreselectedProject,
}) => {
  const {
    users,
    projects,
    assignments,
    createAssignments,
    reassignAssignment,
    endAssignment,
    pushToast,
  } = useApp();

  const [tab, setTab] = useState<'assign' | 'active' | 'history'>('assign');

  // New Multi-Project Assignment Form
  const agents = useMemo(
    () => users.filter((u) => u.role === 'AGENT_TERRAIN' && u.isActive),
    [users]
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedProjectId) {
      setTab('assign');
      setSelectedProjectIds((prev) =>
        prev.includes(preselectedProjectId) ? prev : [preselectedProjectId, ...prev]
      );
      onConsumePreselectedProject?.();
    }
  }, [preselectedProjectId, onConsumePreselectedProject]);

  // Reassign / End Modal state
  const [reassignTarget, setReassignTarget] = useState<AgentAssignment | null>(null);
  const [newAgentId, setNewAgentId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [endTarget, setEndTarget] = useState<AgentAssignment | null>(null);
  const [endNotes, setEndNotes] = useState('');
  const [modalBusy, setModalBusy] = useState(false);

  const effectiveAgentId = selectedAgentId || agents[0]?.id || '';

  const provinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).sort(),
    [projects]
  );

  const activeAssignments = useMemo(
    () =>
      assignments
        .filter((a) => a.status === 'ACTIVE')
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [assignments]
  );

  const historicalAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [assignments]
  );

  const selectableProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return projects.filter((p) => {
      if (provinceFilter && p.province !== provinceFilter) return false;
      if (onlyUnassigned && p.assignedAgentIds.length > 0) return false;
      if (!q) return true;
      return (
        p.matrixNumber.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.territory.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q)
      );
    });
  }, [projects, projectSearch, provinceFilter, onlyUnassigned]);

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [users]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAgentId) {
      pushToast('warning', 'Sélectionnez un agent actif', 'Aucun agent de terrain sélectionné.');
      return;
    }
    if (selectedProjectIds.length === 0) {
      pushToast('warning', 'Aucun ouvrage sélectionné', 'Cochez au moins un ouvrage du registre officiel.');
      return;
    }
    setSubmitting(true);
    try {
      await createAssignments({
        agentId: effectiveAgentId,
        projectIds: selectedProjectIds,
        startDate,
        notes: notes.trim() || 'Affectation mission terrain PDL-145T.',
      });
      setSelectedProjectIds([]);
      setNotes('');
      setTab('active');
    } catch (err) {
      pushToast(
        'error',
        'Échec de l’affectation',
        err instanceof Error ? err.message : 'Erreur inconnue.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignTarget || !newAgentId) return;
    setModalBusy(true);
    try {
      await reassignAssignment(
        reassignTarget.id,
        newAgentId,
        reassignNotes.trim() || 'Réaffectation ordonnée par le Coordonnateur.'
      );
      setReassignTarget(null);
      setNewAgentId('');
      setReassignNotes('');
    } catch (err) {
      pushToast('error', 'Réaffectation impossible', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setModalBusy(false);
    }
  };

  const handleConfirmEnd = async () => {
    if (!endTarget) return;
    setModalBusy(true);
    try {
      await endAssignment(
        endTarget.id,
        endNotes.trim() || 'Clôture d’affectation décidée par la Coordination.'
      );
      setEndTarget(null);
      setEndNotes('');
    } catch (err) {
      pushToast('error', 'Clôture impossible', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setModalBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            GESTION DES AFFECTATIONS
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Affectation nominative des chantiers du registre officiel aux agents de terrain. Un agent n’accède strictement qu’à ses affectations actives.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setTab('assign')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              tab === 'assign' ? 'bg-[#0F2544] text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Affecter des ouvrages
          </button>
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              tab === 'active' ? 'bg-[#0F2544] text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Actives ({activeAssignments.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              tab === 'history' ? 'bg-[#0F2544] text-white' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Historique ({historicalAssignments.length})
          </button>
        </div>
      </div>

      {/* Preservation Guarantee Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2.5 text-xs text-blue-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <span>
          Intégrité de l’historique : la réaffectation ou la clôture d’une mission révoque l’accès futur de l’ancien agent au chantier concerné, tout en préservant intégralement ses fiches terrain antérieures dans les archives.
        </span>
      </div>

      {/* TAB 1: Multi-Project Assignment Workspace */}
      {tab === 'assign' && (
        <form onSubmit={handleAssignSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Panel: Agent & Assignment Metadata */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserCheck className="w-4 h-4 text-[#1D4ED8]" />
              <span>Paramètres de l’affectation</span>
            </div>

            <div>
              <label htmlFor="assign-agent" className="block text-xs font-semibold text-slate-700 mb-1">
                Agent de terrain destinataire *
              </label>
              <select
                id="assign-agent"
                value={effectiveAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
              >
                {agents.length === 0 && <option value="">Aucun agent actif disponible</option>}
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} — {a.provinceScope}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assign-start" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de prise d’effet *
              </label>
              <input
                id="assign-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="assign-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Instructions / Notes de mission
              </label>
              <textarea
                id="assign-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex. : Suivi hebdomadaire prioritaire et vérification réception technique."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Ouvrages sélectionnés</span>
              <span className="font-mono font-bold text-[#0F2544] text-sm">
                {selectedProjectIds.length}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || selectedProjectIds.length === 0 || !effectiveAgentId}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] disabled:opacity-50 transition-colors"
            >
              {submitting
                ? 'Enregistrement…'
                : `Confirmer l’affectation (${selectedProjectIds.length} ouvrage${selectedProjectIds.length > 1 ? 's' : ''})`}
            </button>
          </div>

          {/* Right Panel: Searchable Multi-Select Official Project Register */}
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Rechercher un ouvrage à affecter (N°, nom, territoire, PME)…"
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>

              <select
                aria-label="Filtrer par province"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="">Toutes provinces</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Non affectés uniquement</span>
              </label>
            </div>

            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
              {selectableProjects.map((p) => {
                const checked = selectedProjectIds.includes(p.id);
                const alreadyAssignedToSelected = p.assignedAgentIds.includes(effectiveAgentId);
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 px-4 py-3 text-xs cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={alreadyAssignedToSelected}
                      onChange={() => toggleProjectSelection(p.id)}
                      className="mt-1 rounded border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono text-blue-800 mr-1.5">{p.matrixNumber}</span>
                          {p.projectName}
                        </div>
                        <WorkStatusText status={p.currentStatus} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{INFRASTRUCTURE_TYPE_SHORT[p.infrastructureType]}</span>
                        <span>·</span>
                        <span>{p.province} / {p.territory}</span>
                        <span>·</span>
                        <span>{p.contractor}</span>
                      </div>
                      <div className="text-[11px] mt-1">
                        {p.assignedAgentIds.length === 0 ? (
                          <span className="text-amber-700 font-medium">Actuellement non affecté</span>
                        ) : (
                          <span className="text-slate-600">
                            Affecté à :{' '}
                            <strong className="text-slate-800">
                              {p.assignedAgentIds.map((id) => userNameMap.get(id) ?? id).join(', ')}
                            </strong>
                            {alreadyAssignedToSelected && (
                              <span className="text-emerald-700 font-semibold ml-1.5">
                                (déjà affecté à cet agent)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    )}
                  </label>
                );
              })}

              {selectableProjects.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aucun ouvrage ne correspond à votre filtre.
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Active Assignments */}
      {tab === 'active' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#0F2544]" />
              <h3 className="text-sm font-bold text-slate-900">
                Affectations actives ({activeAssignments.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">N° &amp; Ouvrage</th>
                  <th className="py-2.5 px-3 font-semibold">Agent affecté</th>
                  <th className="py-2.5 px-3 font-semibold">Début mission</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-800 mr-1.5">
                        {a.projectMatrixNumber}
                      </span>
                      <span className="font-semibold text-slate-900">{a.projectName}</span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {a.agentName}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {formatDateFr(a.startDate)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[260px]">{a.notes || '—'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReassignTarget(a);
                          const other = agents.find((ag) => ag.id !== a.agentId);
                          setNewAgentId(other?.id ?? '');
                          setReassignNotes('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Réaffecter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndTarget(a);
                          setEndNotes('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Clôturer
                      </button>
                    </td>
                  </tr>
                ))}
                {activeAssignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Aucune affectation active enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Historical Assignments */}
      {tab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-[#0F2544]" />
            <h3 className="text-sm font-bold text-slate-900">
              Journal complet des affectations (actives, réaffectées et clôturées)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">N° &amp; Ouvrage</th>
                  <th className="py-2.5 px-3 font-semibold">Agent</th>
                  <th className="py-2.5 px-3 font-semibold">Statut</th>
                  <th className="py-2.5 px-3 font-semibold">Période</th>
                  <th className="py-2.5 px-3 font-semibold">Décidé par</th>
                  <th className="py-2.5 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historicalAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-blue-800 mr-1.5">
                        {a.projectMatrixNumber}
                      </span>
                      <span className="font-semibold text-slate-900">{a.projectName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">{a.agentName}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <AssignmentStatusText status={a.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {formatDateFr(a.startDate)} → {a.endDate ? formatDateFr(a.endDate) : 'En cours'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{a.assignedByName}</td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-[280px]">{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0F2544] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Réaffecter l’ouvrage {reassignTarget.projectMatrixNumber}</h3>
              <button
                type="button"
                onClick={() => setReassignTarget(null)}
                aria-label="Fermer"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] -mr-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700">
                Ouvrage : <strong>{reassignTarget.projectName}</strong>
                <br />
                Agent actuel : <strong>{reassignTarget.agentName}</strong>
              </p>
              <div>
                <label htmlFor="reassign-agent" className="block font-semibold text-slate-700 mb-1">
                  Nouvel agent destinataire *
                </label>
                <select
                  id="reassign-agent"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="">Sélectionnez un agent…</option>
                  {agents
                    .filter((ag) => ag.id !== reassignTarget.agentId)
                    .map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.fullName} — {ag.provinceScope}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="reassign-notes" className="block font-semibold text-slate-700 mb-1">
                  Motif de la réaffectation
                </label>
                <textarea
                  id="reassign-notes"
                  rows={3}
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Ex. : Rotation territoriale ou indisponibilité temporaire."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!newAgentId || modalBusy}
                onClick={handleConfirmReassign}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md disabled:opacity-50"
              >
                {modalBusy ? 'Traitement…' : 'Confirmer la réaffectation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Assignment Modal */}
      {endTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-red-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Clôturer l’affectation</h3>
              <button
                type="button"
                onClick={() => setEndTarget(null)}
                aria-label="Fermer"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] -mr-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-700">
                Retirer <strong>{endTarget.agentName}</strong> de l’ouvrage{' '}
                <strong>
                  {endTarget.projectMatrixNumber} — {endTarget.projectName}
                </strong>{' '}
                ? Les fiches déjà soumises resteront conservées dans les archives.
              </p>
              <div>
                <label htmlFor="end-notes" className="block font-semibold text-slate-700 mb-1">
                  Motif de clôture
                </label>
                <textarea
                  id="end-notes"
                  rows={3}
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                  placeholder="Ex. : Fin de mission sur le chantier."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEndTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={modalBusy}
                onClick={handleConfirmEnd}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-md disabled:opacity-50"
              >
                {modalBusy ? 'Clôture…' : 'Clôturer l’affectation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
