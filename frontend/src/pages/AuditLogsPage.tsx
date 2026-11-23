import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { analyticsService } from '../api/analyticsService';
import type { AuditLogItem, PaginationMeta } from '../types/api';
import { AUDIT_TABLE_LABELS, formatDateTimeAZ } from '../utils/formatters';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

const TABLE_FILTERS = [
  { value: '', label: 'Bütün Cədvəllər' },
  { value: 'projects', label: 'Layihələr' },
  { value: 'daily_logs', label: 'Gündəlik Hesabatlar' },
  { value: 'advances', label: 'Avanslar' },
  { value: 'workers', label: 'İşçilər' },
  { value: 'project_materials', label: 'Materiallar' },
];

export const AuditLogsPage: React.FC = () => {
  const toast = useToast();
  const [targetTable, setTargetTable] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getAuditLogs({
        target_table: targetTable || undefined,
        page,
        limit: 25,
      });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Audit jurnalı yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [targetTable, page, toast]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Audit Jurnalı və Təhlükəsizlik İzləri
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sistemdəki bütün kritik dəyişikliklər, müdir m² düzəlişləri, avanslar və status
          keçidləri silinməz tarixçədə saxlanır.
        </p>
      </div>

      {/* Filter Pills */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center gap-1.5">
        {TABLE_FILTERS.map((f) => (
          <button
            key={f.value || 'ALL'}
            type="button"
            onClick={() => {
              setTargetTable(f.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              targetTable === f.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Audit qeydləri yüklənir..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-6 h-6" />}
          title="Audit qeydi tapılmadı"
          description="Seçilmiş bölmə üzrə hələ heç bir əməliyyat qeydə alınmayıb."
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                    {log.action}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
                    {AUDIT_TABLE_LABELS[log.target_table] || log.target_table}
                  </span>
                  <span className="text-xs font-mono text-slate-400">#{log.target_id}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTimeAZ(log.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{log.actor.full_name}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                  {log.actor.role}
                </span>
              </div>

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {Object.entries(log.details).map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <span className="font-mono text-[10px] uppercase text-slate-400 block">
                        {k}
                      </span>
                      <span className="font-medium text-slate-800 break-words">
                        {v === null || v === undefined
                          ? '—'
                          : typeof v === 'object'
                          ? JSON.stringify(v)
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-600">
            Cəmi <strong>{pagination.total_items}</strong> qeyd • Səhifə{' '}
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
    </div>
  );
};
