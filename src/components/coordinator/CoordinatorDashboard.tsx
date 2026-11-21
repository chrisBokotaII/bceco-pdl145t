import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Filter,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useChartMotion } from '../../hooks/useChartMotion';
import { useChartTheme } from '../../hooks/useChartTheme';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { computeDashboardMetrics, computeMonthlyProvinceTrends } from '../../domain/businessRules';
import { fadeUp, staggerFast } from '../../motion/presets';
import {
  INFRASTRUCTURE_TYPE_LABELS,
  INFRASTRUCTURE_TYPE_SHORT,
  PERIODICITY_LABELS,
  WORK_STATUS_CONCISE,
} from '../../domain/constants';
import {
  formatIntegerFr,
  formatPercentFr,
  formatSignedGapFr,
} from '../../domain/formatters';
import type { DashboardFilters, InfrastructureType, ReportPeriodicity, WorkStatus } from '../../types/domain';
import { WorkStatusText } from '../common/StatusBadge';
import type { CoordinatorSection } from '../layout/CoordinatorLayout';

interface Props {
  onNavigate?: (section: CoordinatorSection) => void;
  onInspectProject?: (projectId: string) => void;
}

const INITIAL_FILTERS: DashboardFilters = {
  province: '',
  territory: '',
  agentId: '',
  contractor: '',
  infrastructureType: '',
  status: '',
  periodicity: '',
};

export const CoordinatorDashboard: React.FC<Props> = ({ onNavigate, onInspectProject }) => {
  const { projects, reports, users } = useApp();
  const chartTheme = useChartTheme();
  const chartMotion = useChartMotion();
  const reduced = usePrefersReducedMotion();
  const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);
  const [chartProvince, setChartProvince] = useState<string>('TOUTES');

  /** Remount charts when filters / theme change so series animate again. */
  const chartAnimKey = useMemo(
    () =>
      [
        chartTheme.navy,
        chartTheme.blue,
        filters.province,
        filters.territory,
        filters.agentId,
        filters.contractor,
        filters.infrastructureType,
        filters.status,
        filters.periodicity,
        chartProvince,
      ].join('|'),
    [chartTheme.navy, chartTheme.blue, filters, chartProvince]
  );

  const metrics = useMemo(
    () => computeDashboardMetrics(projects, reports, users, filters),
    [projects, reports, users, filters]
  );

  const monthlyTrends = useMemo(
    () => computeMonthlyProvinceTrends(reports, projects),
    [reports, projects]
  );

  const chartData = useMemo(() => {
    if (chartProvince === 'TOUTES') {
      const map = new Map<string, { tepSum: number; tefSum: number; count: number }>();
      for (const t of monthlyTrends) {
        const entry = map.get(t.month) ?? { tepSum: 0, tefSum: 0, count: 0 };
        entry.tepSum += t.avgTep * t.reportsCount;
        entry.tefSum += t.avgTef * t.reportsCount;
        entry.count += t.reportsCount;
        map.set(t.month, entry);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, val]) => ({
          month,
          avgTep: Math.round((val.tepSum / val.count) * 10) / 10,
          avgTef: Math.round((val.tefSum / val.count) * 10) / 10,
        }));
    } else {
      return monthlyTrends
        .filter((t) => t.province === chartProvince)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((t) => ({
          month: t.month,
          avgTep: t.avgTep,
          avgTef: t.avgTef,
        }));
    }
  }, [monthlyTrends, chartProvince]);

  // Dynamic filter dropdown options derived from the official register
  const provinces = useMemo(
    () => Array.from(new Set(projects.map((p) => p.province))).sort(),
    [projects]
  );

  const territories = useMemo(() => {
    const scope = filters.province
      ? projects.filter((p) => p.province === filters.province)
      : projects;
    return Array.from(new Set(scope.map((p) => p.territory))).sort();
  }, [projects, filters.province]);

  const contractors = useMemo(
    () => Array.from(new Set(projects.map((p) => p.contractor))).sort(),
    [projects]
  );

  const agents = useMemo(
    () => users.filter((u) => u.role === 'AGENT_TERRAIN').sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const handleProvinceChange = (province: string) => {
    setFilters((prev) => ({
      ...prev,
      province,
      territory: '',
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tableau de bord national — Suivi-Évaluation PDL-145T
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Consolidation dynamique du registre officiel des ouvrages et des fiches de collecte terrain.
          </p>
        </div>

        {onNavigate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('reviews')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2544] rounded-md hover:bg-[#16325B] transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Valider les fiches ({metrics.pendingValidationReports})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reporting')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <span>Moteur de rapports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Multi-Criteria Filter Bar */}
      <section
        aria-label="Filtres analytiques"
        className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Filtres multi-critères</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div>
            <label htmlFor="flt-province" className="block text-[11px] font-medium text-slate-600 mb-1">
              Province
            </label>
            <select
              id="flt-province"
              value={filters.province}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Toutes ({provinces.length})</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-territory" className="block text-[11px] font-medium text-slate-600 mb-1">
              Territoire
            </label>
            <select
              id="flt-territory"
              value={filters.territory}
              onChange={(e) => setFilters((prev) => ({ ...prev, territory: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous ({territories.length})</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-agent" className="block text-[11px] font-medium text-slate-600 mb-1">
              Agent de terrain
            </label>
            <select
              id="flt-agent"
              value={filters.agentId}
              onChange={(e) => setFilters((prev) => ({ ...prev, agentId: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous les agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-contractor" className="block text-[11px] font-medium text-slate-600 mb-1">
              Entreprise (PME/ALE)
            </label>
            <select
              id="flt-contractor"
              value={filters.contractor}
              onChange={(e) => setFilters((prev) => ({ ...prev, contractor: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Toutes</option>
              {contractors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-type" className="block text-[11px] font-medium text-slate-600 mb-1">
              Type d’ouvrage
            </label>
            <select
              id="flt-type"
              value={filters.infrastructureType}
              onChange={(e) => setFilters((prev) => ({ ...prev, infrastructureType: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous les types</option>
              {(Object.keys(INFRASTRUCTURE_TYPE_LABELS) as InfrastructureType[]).map((key) => (
                <option key={key} value={key}>
                  {INFRASTRUCTURE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-status" className="block text-[11px] font-medium text-slate-600 mb-1">
              Statut travaux
            </label>
            <select
              id="flt-status"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Tous les statuts</option>
              {(Object.keys(WORK_STATUS_CONCISE) as WorkStatus[]).map((key) => (
                <option key={key} value={key}>
                  {WORK_STATUS_CONCISE[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-periodicity" className="block text-[11px] font-medium text-slate-600 mb-1">
              Périodicité fiches
            </label>
            <select
              id="flt-periodicity"
              value={filters.periodicity}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodicity: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            >
              <option value="">Toutes</option>
              {(Object.keys(PERIODICITY_LABELS) as ReportPeriodicity[]).map((key) => (
                <option key={key} value={key}>
                  {PERIODICITY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 12 Institutional KPI Cards */}
      <section aria-label="Indicateurs clés de performance">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5"
          variants={staggerFast}
          initial={reduced ? false : 'hidden'}
          animate="show"
        >
          <KpiCard
            label="Ouvrages enregistrés"
            value={formatIntegerFr(metrics.totalProjects)}
            subtext={`${metrics.byProvince.length} prov. · ${metrics.byTerritory.length} terr.`}
            icon={Building2}
            tone="navy"
            onClick={() => onNavigate?.('register')}
          />
          <KpiCard
            label="Agents actifs"
            value={formatIntegerFr(metrics.activeAgents)}
            subtext={`${users.filter((u) => u.role === 'AGENT_TERRAIN').length} comptes agents`}
            icon={Users}
            tone="navy"
            onClick={() => onNavigate?.('agents')}
          />
          <KpiCard
            label="Ouvrages affectés"
            value={formatIntegerFr(metrics.assignedProjects)}
            subtext={
              metrics.totalProjects > 0
                ? `${Math.round((metrics.assignedProjects / metrics.totalProjects) * 100)} % du périmètre`
                : '0 %'
            }
            icon={ClipboardCheck}
            tone="blue"
            onClick={() => onNavigate?.('assignments')}
          />
          <KpiCard
            label="Fiches soumises"
            value={formatIntegerFr(metrics.submittedReports)}
            subtext={`${metrics.validatedReports} val. · ${metrics.returnedReports} ret.`}
            icon={FileText}
            tone="blue"
            onClick={() => onNavigate?.('reviews')}
          />
          <KpiCard
            label="En attente validation"
            value={formatIntegerFr(metrics.pendingValidationReports)}
            subtext="Soumises / En vérif."
            icon={Clock}
            tone={metrics.pendingValidationReports > 0 ? 'amber' : 'neutral'}
            onClick={() => onNavigate?.('reviews')}
          />
          <KpiCard
            label="Ouvrages achevés"
            value={formatIntegerFr(metrics.completedProjects)}
            subtext="Statut 1) Achevé"
            icon={CheckCircle2}
            tone="green"
          />
          <KpiCard
            label="Ouvrages en cours"
            value={formatIntegerFr(metrics.inProgressProjects)}
            subtext="Statut 2) En cours"
            icon={PlayCircle}
            tone="blue"
          />
          <KpiCard
            label="Ouvrages à l’arrêt"
            value={formatIntegerFr(metrics.stoppedProjects)}
            subtext="Statut 3) À l’arrêt"
            icon={AlertOctagon}
            tone={metrics.stoppedProjects > 0 ? 'red' : 'neutral'}
          />
          <KpiCard
            label="Non démarrés"
            value={formatIntegerFr(metrics.notStartedProjects)}
            subtext="Statut 4) Ajourné"
            icon={PauseCircle}
            tone="neutral"
          />
          <KpiCard
            label="TEP moyen"
            value={formatPercentFr(metrics.averageTep)}
            subtext="Exécution physique"
            icon={TrendingUp}
            tone="navy"
          />
          <KpiCard
            label="TEF moyen"
            value={formatPercentFr(metrics.averageTef)}
            subtext={`Écart : ${formatSignedGapFr(Math.round((metrics.averageTep - metrics.averageTef) * 10) / 10)}`}
            icon={TrendingUp}
            tone="blue"
          />
          <KpiCard
            label="Contraintes critiques"
            value={formatIntegerFr(metrics.criticalConstraintsCount)}
            subtext={`${metrics.gapAlertProjects.length} écarts > 10 pts`}
            icon={AlertTriangle}
            tone={metrics.criticalConstraintsCount > 0 ? 'red' : 'neutral'}
          />
        </motion.div>
      </section>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* BarChart: TEP vs TEF and count by Province */}
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Exécution physique (TEP%) et financière (TEF%) par province
              </h3>
              <p className="text-xs text-slate-500">
                Moyennes consolidées des ouvrages filtrés par province
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {metrics.byProvince.length} province(s)
            </span>
          </div>

          {metrics.byProvince.length === 0 ? (
            <EmptyChartNotice />
          ) : (
            <motion.div
              className="h-72 w-full"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`tep-tef-${chartAnimKey}`}
                  data={metrics.byProvince}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis
                    dataKey="province"
                    tick={{ fontSize: 11, fill: chartTheme.tick }}
                    axisLine={{ stroke: chartTheme.tooltipBorder }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: chartTheme.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${Number(value).toFixed(1).replace('.', ',')} %`,
                      String(name),
                    ]}
                    contentStyle={chartTheme.tooltip}
                  />
                  <Legend wrapperStyle={chartTheme.legend} />
                  <Bar
                    dataKey="avgTep"
                    name="TEP moyen (%)"
                    fill={chartTheme.navy}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={34}
                    {...chartMotion.series.primary}
                  />
                  <Bar
                    dataKey="avgTef"
                    name="TEF moyen (%)"
                    fill={chartTheme.blue}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={34}
                    {...chartMotion.series.secondary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </section>

        {/* PieChart: Status Distribution */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Répartition des ouvrages par statut
            </h3>
            <p className="text-xs text-slate-500">
              Nomenclature officielle BCECO / PDL-145T
            </p>
          </div>

          {metrics.totalProjects === 0 ? (
            <EmptyChartNotice />
          ) : (
            <>
              <motion.div
                className="h-56 w-full"
                initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={`status-pie-${chartAnimKey}`}>
                    <Pie
                      data={metrics.statusDistribution.filter((d) => d.count > 0)}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                      {...chartMotion.series.pie}
                    >
                      {metrics.statusDistribution
                        .filter((d) => d.count > 0)
                        .map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [`${value} ouvrage(s)`, String(name)]}
                      contentStyle={chartTheme.tooltip}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
              <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                {metrics.statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-700 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Secondary Charts Row: Reports by Agent & Reports by Period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Fiches terrain par agent enquêteur
            </h3>
            <p className="text-xs text-slate-500">
              Ventilation entre fiches validées, en attente et retournées
            </p>
          </div>
          {metrics.reportsByAgent.length === 0 ? (
            <EmptyChartNotice message="Aucune fiche soumise sur le périmètre filtré." />
          ) : (
            <motion.div
              className="h-64 w-full"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`agent-bars-${chartAnimKey}`}
                  data={metrics.reportsByAgent}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: chartTheme.muted }} />
                  <YAxis
                    type="category"
                    dataKey="agentName"
                    width={105}
                    tick={{ fontSize: 11, fill: chartTheme.tick }}
                  />
                  <Tooltip contentStyle={chartTheme.tooltip} />
                  <Legend wrapperStyle={chartTheme.legend} />
                  <Bar
                    dataKey="valides"
                    stackId="a"
                    name="Validées"
                    fill={chartTheme.success}
                    maxBarSize={24}
                    {...chartMotion.series.primary}
                  />
                  <Bar
                    dataKey="enAttente"
                    stackId="a"
                    name="En attente"
                    fill={chartTheme.warning}
                    maxBarSize={24}
                    {...chartMotion.series.secondary}
                  />
                  <Bar
                    dataKey="retournes"
                    stackId="a"
                    name="Retournées"
                    fill={chartTheme.error}
                    maxBarSize={24}
                    {...chartMotion.series.tertiary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Volume de fiches terrain par période (mois)
            </h3>
            <p className="text-xs text-slate-500">
              Évolution mensuelle des collectes validées vs en cours d’instruction
            </p>
          </div>
          {metrics.reportsByPeriod.length === 0 ? (
            <EmptyChartNotice message="Aucune fiche enregistrée pour les critères sélectionnés." />
          ) : (
            <motion.div
              className="h-64 w-full"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`period-bars-${chartAnimKey}`}
                  data={metrics.reportsByPeriod}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.tick }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTheme.muted }} />
                  <Tooltip contentStyle={chartTheme.tooltip} />
                  <Legend wrapperStyle={chartTheme.legend} />
                  <Bar
                    dataKey="valides"
                    name="Validées Coordonnateur"
                    fill={chartTheme.success}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                    {...chartMotion.series.primary}
                  />
                  <Bar
                    dataKey="soumis"
                    name="Non encore validées"
                    fill={chartTheme.warning}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                    {...chartMotion.series.secondary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </section>
      </div>

      {/* Monthly Evolution of TEP & TEF Rates by Province (Recharts LineChart) */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Évolution mensuelle des taux TEP (physique) et TEF (financier) par province
            </h3>
            <p className="text-xs text-slate-500">
              Suivi chronologique consolidé des taux d’exécution basés sur les fiches terrain
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="chart-province-sel" className="text-xs font-semibold text-slate-700">
              Province :
            </label>
            <select
              id="chart-province-sel"
              value={chartProvince}
              onChange={(e) => setChartProvince(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 font-medium"
            >
              <option value="TOUTES">Toutes les provinces (Consolidé national)</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyChartNotice message="Aucune donnée chronologique TEP/TEF disponible pour cette province." />
        ) : (
          <motion.div
            className="h-72 w-full"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                key={`tep-tef-line-${chartAnimKey}`}
                data={chartData}
                margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.tick }} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: chartTheme.muted }}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `${Number(value).toFixed(1).replace('.', ',')} %`,
                    String(name),
                  ]}
                  contentStyle={chartTheme.tooltip}
                />
                <Legend wrapperStyle={chartTheme.legend} />
                <Line
                  type="monotone"
                  dataKey="avgTep"
                  name="TEP Moyen (%) — Physique"
                  stroke={chartTheme.navy}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTheme.navy }}
                  activeDot={{ r: 6 }}
                  {...chartMotion.series.linePrimary}
                />
                <Line
                  type="monotone"
                  dataKey="avgTef"
                  name="TEF Moyen (%) — Financier"
                  stroke={chartTheme.blue}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTheme.blue }}
                  activeDot={{ r: 6 }}
                  {...chartMotion.series.lineSecondary}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </section>

      {/* Operational Alerts Row: TEP/TEF > 10% and Unresolved Constraints */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gap > 10% Alert Table */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ouvrages avec écart |TEP − TEF| &gt; 10 pts
                </h3>
                <p className="text-xs text-slate-500">
                  Justification obligatoire exigée dans la fiche terrain
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-amber-800">
              {metrics.gapAlertProjects.length} ouvrage(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            {metrics.gapAlertProjects.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">
                Aucun ouvrage ne présente un écart TEP/TEF supérieur à 10 points sur ce périmètre.
              </p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 font-semibold">N° &amp; Ouvrage</th>
                    <th className="py-2.5 px-3 font-semibold">Territoire</th>
                    <th className="py-2.5 px-3 font-semibold text-right">TEP%</th>
                    <th className="py-2.5 px-3 font-semibold text-right">TEF%</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Écart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.gapAlertProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => onInspectProject?.(p.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          <span className="font-mono text-blue-800 mr-1.5">{p.matrixNumber}</span>
                          {p.projectName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {INFRASTRUCTURE_TYPE_SHORT[p.infrastructureType]} · {p.contractor}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {p.territory}
                        <span className="block text-[11px] text-slate-500">{p.province}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatPercentFr(p.currentTep, 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatPercentFr(p.currentTef, 0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-red-700 whitespace-nowrap">
                        {formatSignedGapFr(p.currentGap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Unresolved Constraints Table */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ouvrages avec contraintes non résolues
                </h3>
                <p className="text-xs text-slate-500">
                  Blocages techniques, logistiques, financiers ou sociaux-environnementaux
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-red-700">
              {metrics.unresolvedConstraintProjects.length} ouvrage(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            {metrics.unresolvedConstraintProjects.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">
                Aucune contrainte non résolue signalée sur le périmètre filtré.
              </p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 font-semibold">N° &amp; Ouvrage</th>
                    <th className="py-2.5 px-3 font-semibold">Statut</th>
                    <th className="py-2.5 px-4 font-semibold">Contraintes &amp; Impacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.unresolvedConstraintProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => onInspectProject?.(p.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 align-top">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-blue-800">{p.matrixNumber}</span>
                          {p.hasCriticalConstraint && (
                            <span className="text-[10px] font-bold tracking-wide text-red-700">
                              [Critique]
                            </span>
                          )}
                        </div>
                        <div className="text-slate-800">{p.projectName}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.province} · {p.territory}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <WorkStatusText status={p.currentStatus} />
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <p className="text-slate-800">{p.latestConstraintsSummary || 'Contrainte active'}</p>
                        {p.latestImpactsSummary && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Impact : {p.latestImpactsSummary}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Territorial Coverage Breakdown Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Synthèse par territoire (Couverture nationale RDC)
            </h3>
            <p className="text-xs text-slate-500">
              Nombre d’ouvrages et avancement moyen physique/financier par territoire couvert
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500">
            {metrics.byTerritory.length} territoire(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-semibold">Province</th>
                <th className="py-2.5 px-4 font-semibold">Territoire</th>
                <th className="py-2.5 px-4 font-semibold text-right">Ouvrages</th>
                <th className="py-2.5 px-4 font-semibold text-right">TEP moyen</th>
                <th className="py-2.5 px-4 font-semibold text-right">TEF moyen</th>
                <th className="py-2.5 px-4 font-semibold text-right">Écart moyen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.byTerritory.map((row) => {
                const gap = Math.round((row.avgTep - row.avgTef) * 10) / 10;
                return (
                  <tr key={`${row.province}-${row.territory}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{row.province}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.territory}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {row.total}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formatPercentFr(row.avgTep)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formatPercentFr(row.avgTef)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-semibold tabular-nums ${
                        Math.abs(gap) > 10 ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {formatSignedGapFr(gap)}
                    </td>
                  </tr>
                );
              })}
              {metrics.byTerritory.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Aucun territoire ne correspond aux filtres sélectionnés.
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

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'navy' | 'blue' | 'green' | 'amber' | 'red' | 'neutral';
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtext, icon: Icon, tone, onClick }) => {
  const iconColor =
    tone === 'navy'
      ? 'text-[#0F2544]'
      : tone === 'blue'
      ? 'text-blue-700'
      : tone === 'green'
      ? 'text-emerald-700'
      : tone === 'amber'
      ? 'text-amber-600'
      : tone === 'red'
      ? 'text-red-600'
      : 'text-slate-500';

  const valueColor =
    tone === 'red'
      ? 'text-red-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : tone === 'green'
      ? 'text-emerald-800'
      : 'text-slate-900';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 w-full">
        <span className="text-[11px] font-semibold text-slate-600 leading-tight">{label}</span>
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
      </div>
      <div className="w-full">
        <div className={`text-xl font-bold font-mono tabular-nums leading-tight ${valueColor}`}>
          {value}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 truncate">{subtext}</div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        variants={fadeUp}
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="text-left bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-2 hover:border-blue-300 transition-colors cursor-pointer interactive-lift"
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-2"
    >
      {inner}
    </motion.div>
  );
};

const EmptyChartNotice: React.FC<{ message?: string }> = ({
  message = 'Aucune donnée disponible pour les filtres appliqués.',
}) => (
  <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-md text-xs text-slate-500">
    {message}
  </div>
);
