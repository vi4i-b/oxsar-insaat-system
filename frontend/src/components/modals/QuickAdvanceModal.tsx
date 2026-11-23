import React, { useEffect, useState } from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { workersService } from '../../api/workersService';
import type { ApiError, Worker } from '../../types/api';
import { formatAZN, getBakuToday } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

interface QuickAdvanceModalProps {
  open: boolean;
  onClose: () => void;
  defaultWorkerId?: string;
  workers?: Worker[];
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [20, 25, 50, 100];

export const QuickAdvanceModal: React.FC<QuickAdvanceModalProps> = ({
  open,
  onClose,
  defaultWorkerId,
  workers: passedWorkers,
  onSuccess,
}) => {
  const toast = useToast();
  const [workers, setWorkers] = useState<Worker[]>(passedWorkers || []);
  const [workerId, setWorkerId] = useState(defaultWorkerId || '');
  const [amount, setAmount] = useState('25');
  const [givenDate, setGivenDate] = useState(getBakuToday());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGivenDate(getBakuToday());
    setNote('');
    setAmount('25');

    if (passedWorkers && passedWorkers.length > 0) {
      setWorkers(passedWorkers);
      setWorkerId(defaultWorkerId || passedWorkers.find((w) => w.is_active)?.id || passedWorkers[0].id);
    } else {
      void workersService.list({ is_active: true }).then((res) => {
        setWorkers(res.data);
        setWorkerId(defaultWorkerId || res.data[0]?.id || '');
      });
    }
  }, [open, defaultWorkerId, passedWorkers]);

  const selectedWorker = workers.find((w) => w.id === workerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = Number(amount);
    if (!workerId) {
      setError('Zəhmət olmasa işçi seçin.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Avans məbləği sıfırdan böyük olmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await workersService.createAdvance({
        worker_id: workerId,
        amount: numAmount,
        given_date: givenDate,
        note: note.trim() || undefined,
      });
      toast.success(res.message);
      onSuccess?.();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Avans qeydə alınarkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sürətli Avans Ver"
      subtitle="İşçiyə əlbəəl verilən məbləğ dərhal cari balansından çıxılır"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
            İşçi (Usta / Fəhlə)
          </label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
          >
            <option value="">İşçi seçin...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name} ({w.role === 'USTA' ? 'Usta' : 'Fəhlə'})
              </option>
            ))}
          </select>
        </div>

        {selectedWorker && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600">Cari xalis balans:</span>
            <span className="font-bold text-slate-900 tabular-nums text-sm">
              {formatAZN(selectedWorker.current_period.net_balance)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
            Məbləğ (AZN)
          </label>
          <div className="flex gap-2 mb-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  Number(amount) === val
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {val} ₼
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.5"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold tabular-nums text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
            placeholder="25.00"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
            Verilmə Tarixi
          </label>
          <input
            type="date"
            value={givenDate}
            onChange={(e) => setGivenDate(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
            Qeyd (İstəyə bağlı)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Məs: Badamdar obyektində günorta yeməyi və yol xərci"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Ləğv et
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors"
          >
            {submitting ? (
              <Banknote className="w-4 h-4 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {submitting ? 'Qeyd edilir...' : 'Avansı Təsdiqlə'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
