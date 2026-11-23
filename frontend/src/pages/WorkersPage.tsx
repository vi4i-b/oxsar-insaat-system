import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Banknote,
  History,
  CheckCircle2,
  Edit3,
  Power,
  Archive,
  Phone,
  KeyRound,
  Wallet,
} from 'lucide-react';
import { workersService } from '../api/workersService';
import type {
  ApiError,
  SalarySettlementItem,
  StaffRole,
  Worker,
  WorkerAdvancesHistoryData,
} from '../types/api';
import {
  formatAZN,
  formatDateAZ,
  formatDateTimeAZ,
  getBakuToday,
} from '../utils/formatters';
import { WorkerRoleBadge } from '../components/ui/StatusBadge';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { QuickAdvanceModal } from '../components/modals/QuickAdvanceModal';
import { useToast } from '../context/ToastContext';

type WorkersTab = 'active' | 'archive';

export const WorkersPage: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState<WorkersTab>('active');

  // Workers state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  // Settlements archive state
  const [settlements, setSettlements] = useState<SalarySettlementItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveWorkerId, setArchiveWorkerId] = useState('');
  const [archiveMonth, setArchiveMonth] = useState('');

  // Quick Advance modal
  const [advanceWorkerId, setAdvanceWorkerId] = useState<string | null>(null);

  // Create / Edit Worker modal
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerForm, setWorkerForm] = useState({
    full_name: '',
    role: 'USTA' as StaffRole,
    phone: '+994',
    daily_wage: '50',
    pin: '',
  });
  const [workerSaving, setWorkerSaving] = useState(false);

  // Advances History modal
  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null);
  const [historyData, setHistoryData] = useState<WorkerAdvancesHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  // Settle Payroll modal
  const [settleWorker, setSettleWorker] = useState<Worker | null>(null);
  const [settleForm, setSettleForm] = useState({
    period_start: '',
    period_end: getBakuToday(),
    note: '',
  });
  const [settling, setSettling] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workersService.list({
        role: roleFilter || undefined,
        is_active:
          activeFilter === 'all' ? undefined : activeFilter === 'true',
      });
      setWorkers(res.data);
    } catch (err) {
      toast.error((err as ApiError)?.message || 'İşçi siyahısı yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, toast]);

  const fetchSettlements = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const res = await workersService.getSettlements({
        worker_id: archiveWorkerId || undefined,
        month: archiveMonth || undefined,
      });
      setSettlements(res.data);
    } catch {
      toast.error('Maaş arxivi yüklənə bilmədi.');
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveWorkerId, archiveMonth, toast]);

  useEffect(() => {
    void fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (tab === 'archive') {
      void fetchSettlements();
    }
  }, [tab, fetchSettlements]);

  // Fetch worker advances history when modal opens or filter changes
  const fetchWorkerAdvances = useCallback(
    async (wId: string, fromDate: string, toDate: string) => {
      setHistoryLoading(true);
      try {
        const res = await workersService.getWorkerAdvances(wId, {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        });
        setHistoryData(res.data);
      } catch {
        toast.error('Avans tarixçəsi yüklənə bilmədi.');
      } finally {
        setHistoryLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (historyWorker) {
      void fetchWorkerAdvances(historyWorker.id, historyFrom, historyTo);
    }
  }, [historyWorker, historyFrom, historyTo, fetchWorkerAdvances]);

  const openCreateWorker = () => {
    setEditingWorker(null);
    setWorkerForm({
      full_name: '',
      role: 'USTA',
      phone: '',
      daily_wage: '50',
      pin: '',
    });
    setWorkerModalOpen(true);
  };

  const openEditWorker = (w: Worker) => {
    setEditingWorker(w);
    setWorkerForm({
      full_name: w.full_name,
      role: w.role,
      phone: w.phone,
      daily_wage: String(w.daily_wage),
      pin: '',
    });
    setWorkerModalOpen(true);
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker && workerForm.role === 'USTA' && !/^\d{4}$/.test(workerForm.pin)) {
      toast.error('Usta üçün dəqiq 4 rəqəmli PIN kod daxil edilməlidir.');
      return;
    }
    if (editingWorker && workerForm.pin && !/^\d{4}$/.test(workerForm.pin)) {
      toast.error('Yeni PIN kod dəqiq 4 rəqəmdən ibarət olmalıdır.');
      return;
    }

    setWorkerSaving(true);
    try {
      if (editingWorker) {
        const res = await workersService.update(editingWorker.id, {
          full_name: workerForm.full_name.trim(),
          phone: workerForm.phone.trim(),
          daily_wage: Number(workerForm.daily_wage),
          pin: workerForm.pin ? workerForm.pin : null,
        });
        toast.success(res.message);
      } else {
        const res = await workersService.create({
          full_name: workerForm.full_name.trim(),
          role: workerForm.role,
          phone: workerForm.phone.trim(),
          daily_wage: Number(workerForm.daily_wage),
          pin: workerForm.role === 'USTA' ? workerForm.pin : undefined,
        });
        toast.success(res.message);
      }
      setWorkerModalOpen(false);
      await fetchWorkers();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Əməliyyat zamanı xəta baş verdi.');
    } finally {
      setWorkerSaving(false);
    }
  };

  const handleToggleActive = async (w: Worker) => {
    try {
      const res = await workersService.toggleActive(w.id);
      toast.success(res.message);
      await fetchWorkers();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Status dəyişdirilə bilmədi.');
    }
  };

  const openSettleModal = (w: Worker) => {
    setSettleWorker(w);
    setSettleForm({
      period_start: w.current_period.period_start,
      period_end: getBakuToday(),
      note: '',
    });
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleWorker) return;
    setSettling(true);
    try {
      const res = await workersService.settlePayroll(settleWorker.id, {
        period_start: settleForm.period_start,
        period_end: settleForm.period_end,
        note: settleForm.note.trim() || undefined,
      });
      toast.success(res.message);
      setSettleWorker(null);
      await fetchWorkers();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Hesablaşma bağlana bilmədi.');
    } finally {
      setSettling(false);
    }
  };

  // Totals across displayed workers
  const totalGross = workers.reduce((acc, w) => acc + w.current_period.gross_salary, 0);
  const totalAdvances = workers.reduce((acc, w) => acc + w.current_period.total_advances, 0);
  const totalNet = workers.reduce((acc, w) => acc + w.current_period.net_balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            İşçilər, Avans və Maaş Hesablaşması
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Usta və fəhlələrin canlı maaş balansı, əlbəəl avans uçotu və rəsmi dövr bağlanışı.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAdvanceWorkerId(workers[0]?.id || 'OPEN')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm"
          >
            <Banknote className="w-4 h-4" /> + Avans Ver
          </button>
          <button
            type="button"
            onClick={openCreateWorker}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Yeni İşçi
          </button>
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          İşçi Heyəti və Canlı Balans
        </button>
        <button
          type="button"
          onClick={() => setTab('archive')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'archive'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="w-4 h-4" />
          Keçmiş Maaş Ödənişləri Arxivi
        </button>
      </div>

      {tab === 'active' ? (
        <div className="space-y-5">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">
                Cari Dövr Hesablanmış Maaş
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                {formatAZN(totalGross)}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-bold uppercase text-amber-700">
                Götürülmüş Avanslar Cəmi
              </div>
              <div className="text-2xl font-extrabold text-amber-600 tabular-nums mt-1">
                -{formatAZN(totalAdvances)}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
              <div className="text-xs font-bold uppercase text-emerald-800">
                Ödəniləcək Xalis Qalıq
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
                {formatAZN(totalNet)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['', 'USTA', 'FEHLE'] as const).map((r) => (
                <button
                  key={r || 'ALL'}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === '' ? 'Bütün Vəzifələr' : r === 'USTA' ? 'Ustalar' : 'Fəhlələr'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { value: 'all', label: 'Hamısı' },
                  { value: 'true', label: 'Yalnız Aktiv' },
                  { value: 'false', label: 'Deaktiv' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveFilter(item.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    activeFilter === item.value
                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Workers List */}
          {loading ? (
            <PageLoader label="İşçilər və canlı balanslar yüklənir..." />
          ) : workers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="İşçi tapılmadı"
              description="Seçilmiş filtr üzrə qeydiyyatlı usta və ya fəhlə yoxdur."
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {workers.map((w) => {
                const cp = w.current_period;
                const canSettle = cp.worked_days > 0 || cp.gross_salary > 0 || cp.total_advances > 0;
                return (
                  <div
                    key={w.id}
                    className={`bg-white rounded-2xl border p-5 space-y-4 transition-all ${
                      w.is_active ? 'border-slate-200' : 'border-slate-200 opacity-70 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-extrabold text-base text-slate-900">
                            {w.full_name}
                          </h3>
                          <WorkerRoleBadge role={w.role} />
                          {!w.is_active && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-bold">
                              Deaktiv
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5" /> {w.phone}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700 tabular-nums">
                            Günlük maaş: {formatAZN(w.daily_wage)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditWorker(w)}
                          title="Redaktə et"
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(w)}
                          title={w.is_active ? 'Deaktiv et' : 'Aktiv et'}
                          className={`p-2 rounded-lg transition-colors ${
                            w.is_active
                              ? 'text-emerald-600 hover:bg-rose-50 hover:text-rose-600'
                              : 'text-rose-500 hover:bg-emerald-50 hover:text-emerald-600'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Live Period Balance Grid */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          İş Günü
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm tabular-nums mt-0.5">
                          {cp.worked_days} gün
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          Ümumi Maaş
                        </div>
                        <div className="font-bold text-slate-900 text-sm tabular-nums mt-0.5">
                          {formatAZN(cp.gross_salary)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-2.5">
                        <div className="text-[10px] font-bold uppercase text-amber-800">
                          Avanslar
                        </div>
                        <div className="font-bold text-amber-700 text-sm tabular-nums mt-0.5">
                          -{formatAZN(cp.total_advances)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2.5">
                        <div className="text-[10px] font-bold uppercase text-emerald-800">
                          Xalis Qalıq
                        </div>
                        <div className="font-extrabold text-emerald-700 text-sm tabular-nums mt-0.5">
                          {formatAZN(cp.net_balance)}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500">
                        Dövr: {formatDateAZ(cp.period_start)} — bu gün
                        {cp.last_worked_date && ` • Son iş: ${formatDateAZ(cp.last_worked_date)}`}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryFrom('');
                            setHistoryTo('');
                            setHistoryWorker(w);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                        >
                          <History className="w-3.5 h-3.5" /> Tarixçə
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceWorkerId(w.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold"
                        >
                          <Banknote className="w-3.5 h-3.5" /> + Avans
                        </button>
                        <button
                          type="button"
                          disabled={!canSettle}
                          onClick={() => openSettleModal(w)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold"
                        >
                          <Wallet className="w-3.5 h-3.5" /> Ödə və Bağla
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ARCHIVE TAB (GET /api/admin/salary-settlements) */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
            <select
              value={archiveWorkerId}
              onChange={(e) => setArchiveWorkerId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800"
            >
              <option value="">Bütün işçilər</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={archiveMonth}
              onChange={(e) => setArchiveMonth(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800"
            />
            {(archiveWorkerId || archiveMonth) && (
              <button
                type="button"
                onClick={() => {
                  setArchiveWorkerId('');
                  setArchiveMonth('');
                }}
                className="text-xs font-bold text-sky-600 hover:underline px-2"
              >
                Filtri təmizlə
              </button>
            )}
          </div>

          {archiveLoading ? (
            <PageLoader label="Maaş arxivi yüklənir..." />
          ) : settlements.length === 0 ? (
            <EmptyState
              icon={<Archive className="w-6 h-6" />}
              title="Hesablaşma qeydi tapılmadı"
              description="Seçilmiş filtr üzrə bağlanmış maaş dövrü yoxdur."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-5">İşçi</th>
                      <th className="py-3.5 px-4">Dövr</th>
                      <th className="py-3.5 px-4 text-right">İş Günü</th>
                      <th className="py-3.5 px-4 text-right">Ümumi Maaş</th>
                      <th className="py-3.5 px-4 text-right">Avanslar</th>
                      <th className="py-3.5 px-4 text-right">Ödənilən Xalis</th>
                      <th className="py-3.5 px-5">Bağlanma Tarixi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900">{s.worker_name}</div>
                          <div className="mt-0.5">
                            <WorkerRoleBadge role={s.worker_role} />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                          {formatDateAZ(s.period_start)} — {formatDateAZ(s.period_end)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                          {s.worked_days} gün
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                          {formatAZN(s.gross_salary)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-amber-700">
                          -{formatAZN(s.total_advances)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 tabular-nums">
                          {formatAZN(s.net_paid)}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-500">
                          {formatDateTimeAZ(s.paid_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Advance Modal */}
      <QuickAdvanceModal
        open={Boolean(advanceWorkerId)}
        onClose={() => setAdvanceWorkerId(null)}
        defaultWorkerId={advanceWorkerId === 'OPEN' ? undefined : advanceWorkerId || undefined}
        workers={workers}
        onSuccess={() => void fetchWorkers()}
      />

      {/* Create / Edit Worker Modal */}
      <Modal
        open={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        title={editingWorker ? 'İşçi Məlumatlarını Redaktə Et' : 'Yeni İşçi Qeydiyyatı'}
        subtitle={
          editingWorker
            ? 'Günlük maaşı və ya ustanın mobil giriş PIN kodunu yeniləyə bilərsiniz'
            : 'Usta üçün 4 rəqəmli mobil PIN məcburidir, fəhlə üçün tələb olunmur'
        }
        size="sm"
      >
        <form onSubmit={handleWorkerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ad, Soyad, Ata adı *
            </label>
            <input
              type="text"
              required
              value={workerForm.full_name}
              onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
              placeholder="Məs: Şirinov Rüstəm Qəzənfər oğlu"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          {!editingWorker && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vəzifə *</label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['USTA', 'FEHLE'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      setWorkerForm({
                        ...workerForm,
                        role: r,
                        daily_wage: r === 'USTA' ? '50' : '30',
                        pin: r === 'USTA' ? workerForm.pin : '',
                      })
                    }
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      workerForm.role === r
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {r === 'USTA' ? 'Usta (Mobil PIN-li)' : 'Fəhlə (PIN-siz)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
              <input
                type="tel"
                required
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                placeholder="+994507776655"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Günlük Maaş (₼) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={workerForm.daily_wage}
                onChange={(e) => setWorkerForm({ ...workerForm, daily_wage: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>
          </div>

          {(workerForm.role === 'USTA' || editingWorker?.role === 'USTA') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                  {editingWorker ? 'Yeni 4 Rəqəmli PIN (istəyə bağlı)' : '4 Rəqəmli Mobil PIN *'}
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required={!editingWorker}
                value={workerForm.pin}
                onChange={(e) =>
                  setWorkerForm({ ...workerForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
                placeholder="Məs: 4821"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-widest font-bold"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setWorkerModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={workerSaving}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {workerSaving ? 'Saxlanır...' : editingWorker ? 'Yenilə' : 'Qeydiyyata Al'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Worker Advances History Modal */}
      <Modal
        open={Boolean(historyWorker)}
        onClose={() => setHistoryWorker(null)}
        title={`Avans Tarixçəsi — ${historyWorker?.full_name || ''}`}
        subtitle="Tarix aralığına görə bütün əlbəəl avans ödənişləri"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
            />
            {(historyFrom || historyTo) && (
              <button
                type="button"
                onClick={() => {
                  setHistoryFrom('');
                  setHistoryTo('');
                }}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Sıfırla
              </button>
            )}
          </div>

          {historyLoading ? (
            <PageLoader label="Avanslar yüklənir..." />
          ) : !historyData || historyData.advances.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Bu dövr üzrə qeydə alınmış avans yoxdur.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900">Göstərilən avansların cəmi:</span>
                <span className="font-extrabold text-amber-800 text-base tabular-nums">
                  {formatAZN(historyData.total_advances_sum)}
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {historyData.advances.map((a) => (
                  <div key={a.id} className="p-3.5 bg-white flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatDateAZ(a.given_date)}
                      </div>
                      {a.note && <p className="text-xs text-slate-600 mt-0.5">{a.note}</p>}
                      <div className="text-[11px] text-slate-400 mt-1">
                        {a.created_by_name} • {formatDateTimeAZ(a.created_at)}
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-amber-700 tabular-nums shrink-0">
                      -{formatAZN(a.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Settle Payroll Modal (POST /workers/:id/settle) */}
      <Modal
        open={Boolean(settleWorker)}
        onClose={() => setSettleWorker(null)}
        title="Maaş Ödənişi və Dövrü Bağla"
        subtitle="Ödəniş arxivlənəcək və işçinin yeni hesabat dövrü 0 balansla açılacaq"
        size="sm"
      >
        {settleWorker && (
          <form onSubmit={handleSettleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-2 text-xs">
              <div className="font-bold text-sm text-white">{settleWorker.full_name}</div>
              <div className="flex justify-between text-slate-300">
                <span>İşlənmiş günlər:</span>
                <strong className="tabular-nums">
                  {settleWorker.current_period.worked_days} gün × {formatAZN(settleWorker.daily_wage)}
                </strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Hesablanmış ümumi maaş:</span>
                <strong className="tabular-nums">
                  {formatAZN(settleWorker.current_period.gross_salary)}
                </strong>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Götürülmüş avanslar:</span>
                <strong className="tabular-nums">
                  -{formatAZN(settleWorker.current_period.total_advances)}
                </strong>
              </div>
              <div className="flex justify-between text-emerald-400 text-base font-extrabold pt-2 border-t border-slate-700">
                <span>Əlbəəl Ödəniləcək Xalis:</span>
                <span className="tabular-nums">
                  {formatAZN(settleWorker.current_period.net_balance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dövr Başlanğıcı</label>
                <input
                  type="date"
                  required
                  value={settleForm.period_start}
                  onChange={(e) => setSettleForm({ ...settleForm, period_start: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dövr Sonu</label>
                <input
                  type="date"
                  required
                  value={settleForm.period_end}
                  onChange={(e) => setSettleForm({ ...settleForm, period_end: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Qeyd (İstəyə bağlı)
              </label>
              <textarea
                rows={2}
                value={settleForm.note}
                onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                placeholder="Məs: Noyabr ayının 1-ci yarısı üzrə tam hesablaşma nağd ödənildi."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettleWorker(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={settling}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                {settling ? 'Bağlanır...' : 'Ödənildi və Dövrü Bağla'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
