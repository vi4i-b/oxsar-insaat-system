import React, { useCallback, useEffect, useState } from 'react';
import { Layers, Plus, Edit3, Gauge, Tag } from 'lucide-react';
import { workTypesService } from '../api/workTypesService';
import type { ApiError, WorkType } from '../types/api';
import { formatAZN, formatM2 } from '../utils/formatters';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

export const WorkTypesPage: React.FC = () => {
  const toast = useToast();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkType | null>(null);
  const [form, setForm] = useState({
    name: '',
    daily_norm_m2: '',
    default_price_m2: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workTypesService.list();
      setWorkTypes(res.data);
    } catch {
      toast.error('İş növləri kataloqu yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', daily_norm_m2: '', default_price_m2: '' });
    setModalOpen(true);
  };

  const openEdit = (wt: WorkType) => {
    setEditing(wt);
    setForm({
      name: wt.name,
      daily_norm_m2: String(wt.daily_norm_m2),
      default_price_m2: String(wt.default_price_m2),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        daily_norm_m2: Number(form.daily_norm_m2),
        default_price_m2: Number(form.default_price_m2),
      };
      const res = editing
        ? await workTypesService.update(editing.id, payload)
        : await workTypesService.create(payload);
      toast.success(res.message);
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Əməliyyat zamanı xəta baş verdi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            İş Növləri və Normativlər Kataloqu
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Təklif kalkulyatoru və gündəlik anomaliya xəbərdarlığı bu m² normalarına əsaslanır.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Yeni İş Növü Əlavə Et
        </button>
      </div>

      {loading ? (
        <PageLoader label="Kataloq yüklənir..." />
      ) : workTypes.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-6 h-6" />}
          title="İş növü əlavə edilməyib"
          description="İlk izolyasiya iş növünü və gündəlik icra normativini əlavə edin."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workTypes.map((wt) => (
            <div
              key={wt.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-sky-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900">
                      {wt.name}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400">{wt.id}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(wt)}
                  className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                  title="Redaktə et"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                    <Gauge className="w-3.5 h-3.5 text-sky-600" /> Gündəlik Norma
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-1">
                    {formatM2(wt.daily_norm_m2)}
                    <span className="text-xs font-medium text-slate-500"> / gün</span>
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-800">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" /> Baza Qiymət
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-1">
                    {formatAZN(wt.default_price_m2)}
                    <span className="text-xs font-medium text-emerald-700/80"> / m²</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'İş Növünü Redaktə Et' : 'Yeni İş Növü Əlavə Et'}
        subtitle="1 briqadanın 1 gündə icra etməli olduğu standart norma və baza satış qiyməti"
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              İş Növünün Adı *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Məs: PVC Membran İzolyasiyası"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gündəlik Norma (m²) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={form.daily_norm_m2}
                onChange={(e) => setForm({ ...form, daily_norm_m2: e.target.value })}
                placeholder="250"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standart Qiymət (₼/m²) *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={form.default_price_m2}
                onChange={(e) => setForm({ ...form, default_price_m2: e.target.value })}
                placeholder="32"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {saving ? 'Saxlanır...' : editing ? 'Yenilə' : 'Əlavə Et'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
