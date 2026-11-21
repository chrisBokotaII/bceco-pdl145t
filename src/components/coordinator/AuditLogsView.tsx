import React, { useMemo, useState } from 'react';
import { Cloud, Database, Lock, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AUDIT_ACTION_LABELS, USER_ROLE_LABELS } from '../../domain/constants';
import { formatDateTimeFr } from '../../domain/formatters';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, syncLogs, authMode, firestoreReachable } = useApp();
  const [search, setSearch] = useState('');

  const filteredAuditLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...auditLogs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((log) => {
        if (!q) return true;
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entityType.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q)
        );
      });
  }, [auditLogs, search]);

  const sortedSyncLogs = useMemo(
    () => [...syncLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [syncLogs]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Journal d’Audit, Synchronisation &amp; Sécurité RBAC
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Traçabilité immuable des opérations administratives, des validations de fiches et des synchronisations hors ligne.
        </p>
      </div>

      {/* Security & Persistence Architecture Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2544]">
            <Lock className="w-4 h-4 text-blue-700" />
            <span>Contrôle d’accès serveur (RBAC)</span>
          </div>
          <p className="text-xs text-slate-600">
            Strictement deux rôles (Coordonnateur, Agent de Terrain). Chaque requête vérifie côté serveur le rôle et l’affectation active sur l’ouvrage avant lecture ou écriture.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2544]">
            <Database className="w-4 h-4 text-emerald-700" />
            <span>Couche de persistance active</span>
          </div>
          <p className="text-xs text-slate-600">
            Session en cours :{' '}
            <strong className="text-slate-900">
              {authMode === 'FIREBASE_AUTH'
                ? 'Firebase Auth + Cloud Firestore (règles déployées)'
                : 'Adaptateur Démo isolé (Express API + HMAC)'}
            </strong>
            . Cloud Firestore : {firestoreReachable ? 'accessible' : 'hors ligne'}.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2544]">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Intégrité des données contractuelles</span>
          </div>
          <p className="text-xs text-slate-600">
            Les 9 colonnes d’identification contractuelle de la Matrice Unique ne peuvent jamais être modifiées par les agents. Les validations n’actualisent que l’état terrain consolidé.
          </p>
        </div>
      </section>

      {/* Immutable Audit Trail Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Journal d’audit opérationnel ({filteredAuditLogs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Affectations, validations, retours, créations de comptes et exports de rapports
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher acteur, action, entité…"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-semibold">Horodatage</th>
                <th className="py-2.5 px-3 font-semibold">Acteur &amp; Rôle</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Entité</th>
                <th className="py-2.5 px-4 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {formatDateTimeFr(log.createdAt)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{log.actorName}</span>
                    <span className="block text-[11px] text-slate-500">
                      {USER_ROLE_LABELS[log.actorRole]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#0F2544] whitespace-nowrap">
                    {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {log.entityType} · {log.entityId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 max-w-md">{log.details}</td>
                </tr>
              ))}
              {filteredAuditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucune entrée d’audit correspondante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sync Logs Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#0F2544]" />
          <h3 className="text-sm font-bold text-slate-900">
            Historique des synchronisations terrain ({sortedSyncLogs.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Agent ID</th>
                <th className="py-2.5 px-3 font-semibold text-right">Confirmées</th>
                <th className="py-2.5 px-3 font-semibold text-right">Conflits</th>
                <th className="py-2.5 px-3 font-semibold text-right">Échecs</th>
                <th className="py-2.5 px-4 font-semibold">Résumé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSyncLogs.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {formatDateTimeFr(s.createdAt)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-blue-700" />
                      {s.userId}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                    {s.syncedCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                    {s.conflictCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-red-700">
                    {s.failedCount}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{s.summary}</td>
                </tr>
              ))}
              {sortedSyncLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Aucun événement de synchronisation enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
