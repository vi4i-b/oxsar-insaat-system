import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  MapPin,
  Phone,
  Shield,
  Users,
  Layers,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { projectsService } from '../api/projectsService';
import type { PaginationMeta, ProjectListItem, ProjectStatus } from '../types/api';
import {
  formatAZN,
  formatDateAZ,
  formatM2,
  formatPercent,
  PROJECT_STATUS_META,
} from '../utils/formatters';
import { ProjectStatusBadge, SupplyTypeBadge } from '../components/ui/StatusBadge';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { ProjectProposalModal } from '../components/modals/ProjectProposalModal';
import { useToast } from '../context/ToastContext';

const STATUS_TABS: Array<{ value: ProjectStatus | ''; label: string }> = [
  { value: '', label: 'Hamısı' },
  { value: 'AKTIV', label: 'Aktiv' },
  { value: 'GOZLEMEDE', label: 'Gözləmədə' },
  { value: 'DAYANDIRILIB', label: 'Dayandırılıb' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
  { value: 'PASSIV', label: 'Passiv' },
];

export const ProjectsPage: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<ProjectStatus | ''>(
    (searchParams.get('status') as ProjectStatus) || ''
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('new') === '1');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsService.list({
        status: status || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 12,
      });
      setProjects(res.data.projects);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Layihələrin siyahısı yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page, toast]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleStatusTab = (nextStatus: ProjectStatus | '') => {
    setStatus(nextStatus);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set('status', nextStatus);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Layihələr və Təkliflər
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bütün obyektlər, canlı m² proqresi, xərclər və müştəri Magic-Link izləməsi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Təklif / Layihə Yarat
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.value || 'ALL'}
                type="button"
                onClick={() => handleStatusTab(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Obyekt, ünvan, müştəri və ya telefon..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <PageLoader label="Layihələr yüklənir..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title="Layihə tapılmadı"
          description={
            status || debouncedSearch
              ? `"${status ? PROJECT_STATUS_META[status].label : debouncedSearch}" filtri üzrə heç bir layihə mövcud deyil.`
              : 'Hələ heç bir təklif və ya obyekt yaradılmayıb.'
          }
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> İlk Təklifi Yarat
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/admin/projects/${p.id}`}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-400 hover:shadow-lg hover:shadow-slate-200/60 transition-all p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-extrabold text-base text-slate-900 group-hover:text-sky-600 transition-colors truncate flex items-center gap-1.5">
                      {p.name}
                      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{p.address}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </div>

                {/* Pause Reason Alert */}
                {p.status === 'DAYANDIRILIB' && p.pause_reason && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{p.pause_reason}</span>
                  </div>
                )}

                {/* Client & Supply Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.client_name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-[11px]">{p.client_phone}</span>
                  </div>
                  <SupplyTypeBadge supplyType={p.supply_type} />
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      İcra: {formatM2(p.total_completed_m2)} / {formatM2(p.total_target_m2)}
                    </span>
                    <span className="font-extrabold text-sky-700 tabular-nums">
                      {formatPercent(p.progress_percent)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.status === 'TAMAMLANDI'
                          ? 'bg-emerald-500'
                          : p.status === 'DAYANDIRILIB'
                          ? 'bg-rose-400'
                          : 'bg-sky-600'
                      }`}
                      style={{ width: `${Math.min(100, p.progress_percent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Metadata Footer */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">
                      Razılaşma
                    </div>
                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatAZN(p.total_amount)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">
                      Ümumi Xərc
                    </div>
                    <div className="font-bold text-slate-700 tabular-nums mt-0.5">
                      {formatAZN(p.financial_summary.total_cost)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2.5">
                    <div className="text-[10px] font-semibold text-emerald-700 uppercase">
                      Xalis Qazanc
                    </div>
                    <div className="font-extrabold text-emerald-700 tabular-nums mt-0.5">
                      {formatAZN(p.financial_summary.estimated_profit)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> {p.stages_count} mərhələ
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {p.active_workers_count} işçi
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> {p.warranty_years} il
                    </span>
                  </div>
                  <span>{formatDateAZ(p.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-600">
            Cəmi <strong>{pagination.total_items}</strong> layihə • Səhifə{' '}
            <strong>{pagination.current_page}</strong> / {pagination.total_pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ProjectProposalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void fetchProjects();
        }}
      />
    </div>
  );
};
