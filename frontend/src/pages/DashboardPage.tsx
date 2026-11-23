import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Wallet,
  Package,
  HardHat,
  Building2,
  Clock,
  PauseCircle,
  CheckCircle2,
  Users,
  Calendar,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { analyticsService } from '../api/analyticsService';
import type { AnalyticsSummaryData } from '../types/api';
import { formatAZN, formatPercent } from '../utils/formatters';
import { ProjectStatusBadge } from '../components/ui/StatusBadge';
import { PageLoader } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const DashboardPage: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<AnalyticsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setData(res.data);
    } catch {
      toast.error('Analitika məlumatları yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  if (loading && !data) {
    return <PageLoader label="İdarəetmə statistikası hesablanır..." />;
  }

  const kpis = data?.kpis;
  const projects = data?.projects_comparison || [];

  const chartData = projects.map((p) => ({
    name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
    Dövriyyə: p.total_amount,
    Material: p.material_cost,
    İşçilik: p.labor_cost,
    'Xalis Mənfəət': p.net_profit,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            İdarəetmə və Mənfəət Analitikası
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aktiv obyektlər, ümumi dövriyyə, material-işçilik maya dəyəri və xalis mənfəət balansı.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Dövr:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Başlanğıc tarixi"
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:border-sky-500 outline-none"
          />
          <span className="text-slate-400 text-xs">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Bitmə tarixi"
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:border-sky-500 outline-none"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Filtri sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ümumi Dövriyyə
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatAZN(kpis?.total_revenue)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Cəmi xərclər:{' '}
            <span className="font-semibold text-slate-700 tabular-nums">
              {formatAZN(kpis?.total_expenses)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Material Maya Dəyəri
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatAZN(kpis?.total_material_cost)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Ümumi xərclərdə payı:{' '}
            <span className="font-semibold text-indigo-700 tabular-nums">
              {kpis && kpis.total_expenses > 0
                ? formatPercent((kpis.total_material_cost / kpis.total_expenses) * 100)
                : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              İşçilik Xərci (Maaş)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HardHat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatAZN(kpis?.total_labor_cost)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Aktiv heyət:{' '}
            <span className="font-semibold text-slate-700">
              {kpis?.total_active_workers ?? 0} nəfər
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md shadow-emerald-900/15">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Xalis Mənfəət
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold tabular-nums">
            {formatAZN(kpis?.net_profit)}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-bold tabular-nums">
            Orta marja: {formatPercent(kpis?.average_profit_margin_percent)}
          </div>
        </div>
      </div>

      {/* Operational Counts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          to="/admin/projects?status=AKTIV"
          className="bg-white hover:border-sky-300 transition-colors rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.active_projects_count ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Aktiv Obyekt</div>
          </div>
        </Link>

        <Link
          to="/admin/projects?status=GOZLEMEDE"
          className="bg-white hover:border-amber-300 transition-colors rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.pending_proposals_count ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Gözləyən Təklif</div>
          </div>
        </Link>

        <Link
          to="/admin/projects?status=DAYANDIRILIB"
          className="bg-white hover:border-rose-300 transition-colors rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.paused_projects_count ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Dayandırılıb</div>
          </div>
        </Link>

        <Link
          to="/admin/projects?status=TAMAMLANDI"
          className="bg-white hover:border-emerald-300 transition-colors rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.completed_projects_count ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Tamamlandı</div>
          </div>
        </Link>

        <Link
          to="/admin/workers"
          className="col-span-2 sm:col-span-1 bg-white hover:border-slate-300 transition-colors rounded-2xl p-4 border border-slate-200 flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.total_active_workers ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Aktiv İşçi</div>
          </div>
        </Link>
      </div>

      {/* Profitability Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Layihələr üzrə Dövriyyə, Xərc və Mənfəət Müqayisəsi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bütün məbləğlər AZN (₼) ilə göstərilir
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatAZN(value)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Dövriyyə" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Material" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="İşçilik" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Xalis Mənfəət" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Projects Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Layihələrin Rentabellik Cədvəli
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detallı baxış və material/hesabat idarəetməsi üçün layihənin adına klikləyin
            </p>
          </div>
          <Link
            to="/admin/projects"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
          >
            Bütün layihələr <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Obyekt Adı</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">İcra %</th>
                <th className="py-3.5 px-4 text-right">Razılaşma</th>
                <th className="py-3.5 px-4 text-right">Material</th>
                <th className="py-3.5 px-4 text-right">İşçilik</th>
                <th className="py-3.5 px-4 text-right">Xalis Mənfəət</th>
                <th className="py-3.5 px-6 text-right">Marja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {projects.map((p) => (
                <tr key={p.project_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-slate-900">
                    <Link
                      to={`/admin/projects/${p.project_id}`}
                      className="hover:text-sky-600 transition-colors inline-flex items-center gap-1.5"
                    >
                      {p.name}
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td className="py-3.5 px-4 min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-600 transition-all"
                          style={{ width: `${Math.min(100, p.progress_percent)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums w-10 text-right">
                        {formatPercent(p.progress_percent)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                    {formatAZN(p.total_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums">
                    {formatAZN(p.material_cost)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums">
                    {formatAZN(p.labor_cost)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 tabular-nums">
                    {formatAZN(p.net_profit)}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                        p.profit_margin_percent >= 50
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.profit_margin_percent >= 30
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {formatPercent(p.profit_margin_percent)}
                    </span>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-sm">
                    Seçilmiş dövr üzrə layihə tapılmadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
