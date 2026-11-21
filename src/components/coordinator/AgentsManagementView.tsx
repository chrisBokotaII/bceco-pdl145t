import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DRC_PROVINCES } from '../../domain/constants';
import { formatDateFr } from '../../domain/formatters';
import type { UserProfile } from '../../types/domain';

export const AgentsManagementView: React.FC = () => {
  const { users, projects, reports, createAgent, updateAgent, pushToast } = useApp();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<UserProfile | null>(null);
  const [busy, setBusy] = useState(false);

  // Create form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [functionTitle, setFunctionTitle] = useState('Agent de Terrain — Suivi-Évaluation');
  const [provinceScope, setProvinceScope] = useState('Haut-Katanga');
  const [password, setPassword] = useState('Demo2026!');

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFunction, setEditFunction] = useState('');
  const [editProvince, setEditProvince] = useState('');

  const agents = useMemo(
    () =>
      users
        .filter((u) => u.role === 'AGENT_TERRAIN')
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  const agentStats = useMemo(() => {
    const map = new Map<
      string,
      { assignedCount: number; submittedCount: number; validatedCount: number; returnedCount: number }
    >();
    for (const ag of agents) {
      const assignedCount = projects.filter((p) => p.assignedAgentIds.includes(ag.id)).length;
      const agReports = reports.filter((r) => r.agentId === ag.id && r.status !== 'BROUILLON');
      map.set(ag.id, {
        assignedCount,
        submittedCount: agReports.length,
        validatedCount: agReports.filter((r) => r.status === 'VALIDE').length,
        returnedCount: agReports.filter((r) => r.status === 'RETOURNE').length,
      });
    }
    return map;
  }, [agents, projects, reports]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setBusy(true);
    try {
      await createAgent({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+243 99 000 0000',
        functionTitle: functionTitle.trim(),
        provinceScope: provinceScope.trim(),
        password: password.trim() || 'Demo2026!',
      });
      setCreateOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
    } catch (err) {
      pushToast(
        'error',
        'Création du compte impossible',
        err instanceof Error ? err.message : 'Erreur inconnue.'
      );
    } finally {
      setBusy(false);
    }
  };

  const openEditModal = (ag: UserProfile) => {
    setEditingAgent(ag);
    setEditName(ag.fullName);
    setEditPhone(ag.phone);
    setEditFunction(ag.functionTitle);
    setEditProvince(ag.provinceScope);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setBusy(true);
    try {
      await updateAgent(editingAgent.id, {
        fullName: editName.trim(),
        phone: editPhone.trim(),
        functionTitle: editFunction.trim(),
        provinceScope: editProvince.trim(),
      });
      setEditingAgent(null);
    } catch (err) {
      pushToast('error', 'Mise à jour impossible', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (ag: UserProfile) => {
    setBusy(true);
    try {
      await updateAgent(ag.id, { isActive: !ag.isActive });
    } catch (err) {
      pushToast('error', 'Changement de statut impossible', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestion des Agents de Terrain
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Création, suivi d’activité et activation/désactivation des comptes enquêteurs PDL-145T. Seul le rôle Agent de Terrain est créé depuis cet écran.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B]"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un compte agent</span>
        </button>
      </div>

      {/* Agents Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((ag) => {
          const stats = agentStats.get(ag.id) ?? {
            assignedCount: 0,
            submittedCount: 0,
            validatedCount: 0,
            returnedCount: 0,
          };
          return (
            <article
              key={ag.id}
              className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{ag.fullName}</h3>
                    <p className="text-xs text-slate-500 truncate">{ag.functionTitle}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                      ag.isActive ? 'text-emerald-800' : 'text-red-700'
                    }`}
                  >
                    {ag.isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Actif
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5 text-red-600" />
                        Désactivé
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{ag.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px]">{ag.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Zone : {ag.provinceScope}</span>
                  </div>
                </div>

                {/* Agent Operational Stats */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <div className="text-sm font-bold font-mono text-[#0F2544]">{stats.assignedCount}</div>
                    <div className="text-[10px] text-slate-500">Chantiers</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900">{stats.submittedCount}</div>
                    <div className="text-[10px] text-slate-500">Fiches</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-emerald-700">{stats.validatedCount}</div>
                    <div className="text-[10px] text-slate-500">Validées</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-red-700">{stats.returnedCount}</div>
                    <div className="text-[10px] text-slate-500">Retournées</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  Créé le {formatDateFr(ag.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(ag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggleActive(ag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border ${
                      ag.isActive
                        ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                        : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {ag.isActive ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Réactiver
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Create Agent Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#0F2544] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Nouveau compte Agent de Terrain</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Fermer"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] -mr-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label htmlFor="ag-name" className="block font-semibold text-slate-700 mb-1">
                  Nom complet *
                </label>
                <input
                  id="ag-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex. : Jean-Luc Kabongo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ag-email" className="block font-semibold text-slate-700 mb-1">
                    Adresse e-mail professionnelle *
                  </label>
                  <input
                    id="ag-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent4.demo@pd145t.test"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ag-phone" className="block font-semibold text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    id="ag-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 99 123 4567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ag-fn" className="block font-semibold text-slate-700 mb-1">
                    Fonction
                  </label>
                  <input
                    id="ag-fn"
                    type="text"
                    value={functionTitle}
                    onChange={(e) => setFunctionTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="ag-prov" className="block font-semibold text-slate-700 mb-1">
                    Province d’intervention
                  </label>
                  <select
                    id="ag-prov"
                    value={provinceScope}
                    onChange={(e) => setProvinceScope(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    {DRC_PROVINCES.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ag-pwd" className="block font-semibold text-slate-700 mb-1">
                  Mot de passe initial (Adaptateur Démo uniquement)
                </label>
                <input
                  id="ag-pwd"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md disabled:opacity-50"
              >
                {busy ? 'Création…' : 'Créer le compte agent'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#0F2544] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Modifier le profil agent</h3>
              <button
                type="button"
                onClick={() => setEditingAgent(null)}
                aria-label="Fermer"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] -mr-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label htmlFor="ed-name" className="block font-semibold text-slate-700 mb-1">
                  Nom complet
                </label>
                <input
                  id="ed-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="ed-phone" className="block font-semibold text-slate-700 mb-1">
                  Téléphone
                </label>
                <input
                  id="ed-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label htmlFor="ed-fn" className="block font-semibold text-slate-700 mb-1">
                  Fonction
                </label>
                <input
                  id="ed-fn"
                  type="text"
                  value={editFunction}
                  onChange={(e) => setEditFunction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="ed-prov" className="block font-semibold text-slate-700 mb-1">
                  Province d’intervention
                </label>
                <input
                  id="ed-prov"
                  type="text"
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAgent(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md disabled:opacity-50"
              >
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
