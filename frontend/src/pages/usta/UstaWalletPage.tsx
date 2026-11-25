import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  Lock,
  Calendar,
  Banknote,
  ClipboardCheck,
  Archive,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { ustaService } from '../../api/ustaService';
import type { ApiError } from '../../types/api';
import type { UstaWalletData } from '../../types/usta';
import { formatAZN, formatDateAZ, formatDateTimeAZ, formatM2 } from '../../utils/formatters';
import { PageLoader } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';

type WalletSection = 'advances' | 'logs' | 'settlements';

export const UstaWalletPage: React.FC = () => {
  const toast = useToast();
  const [data, setData] = useState<UstaWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<WalletSection>('advances');

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ustaService.getWallet();
      setData(res.data);
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Şəxsi balans məlumatları yüklənə bilmədi.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  if (loading && !data) {
    return <PageLoader label="Şəxsi maaş və avans balansı hesablanır..." />;
  }

  const cp = data?.current_period;
  const worker = data?.worker;

  return (
    <div className="space-y-5">
      {/* Header & Read-Only Lock Notice */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-extrabold text-slate-900">
            Mənim Hesabım
          </h1>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mt-0.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Yalnız oxuma rejimi • Şəffaf maaş balansı</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchWallet()}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 shadow-2xs"
          title="Yenilə"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Net Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-5 shadow-lg shadow-emerald-900/15 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
            Alınacaq Xalis Qalıq Maaş
          </span>
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
          {formatAZN(cp?.net_balance)}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/15 text-xs text-emerald-50">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Dövr başlanğıcı:{' '}
            <strong>{formatDateAZ(cp?.period_start)}</strong>
          </span>
          <span className="font-bold tabular-nums">
            Günlük maaş: {formatAZN(worker?.daily_wage)}
          </span>
        </div>
      </div>

      {/* 3-Card Period Math Breakdown */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="text-[10px] font-bold uppercase text-slate-500">İş Günü</div>
          <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-1">
            {cp?.worked_days ?? 0} gün
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
          <div className="text-[10px] font-bold uppercase text-slate-500">Ümumi Maaş</div>
          <div className="text-base font-extrabold text-slate-900 tabular-nums mt-1">
            {formatAZN(cp?.gross_salary)}
          </div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-3.5">
          <div className="text-[10px] font-bold uppercase text-amber-800">Avanslar</div>
          <div className="text-base font-extrabold text-amber-700 tabular-nums mt-1">
            -{formatAZN(cp?.total_advances)}
          </div>
        </div>
      </div>

      {/* History Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-200/80">
        <button
          type="button"
          onClick={() => setSection('advances')}
          className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            section === 'advances'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Avanslar ({data?.advances.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('logs')}
          className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            section === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Günlərim ({data?.recent_logs.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('settlements')}
          className={`py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            section === 'settlements'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Arxiv ({data?.settlements.length ?? 0})</span>
        </button>
      </div>

      {/* Section 1: Advances */}
      {section === 'advances' && (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {!data || data.advances.length === 0 ? (
            <p className="py-10 px-4 text-center text-sm text-slate-500">
              Cari dövr üzrə götürülmüş avans yoxdur.
            </p>
          ) : (
            data.advances.map((adv) => (
              <div key={adv.id} className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {formatDateAZ(adv.given_date)}
                  </div>
                  {adv.note && (
                    <p className="text-xs text-slate-600 mt-0.5">{adv.note}</p>
                  )}
                  <div className="text-[11px] text-slate-400 mt-1">
                    {formatDateTimeAZ(adv.created_at)}
                  </div>
                </div>
                <span className="font-extrabold text-sm text-amber-700 tabular-nums shrink-0">
                  -{formatAZN(adv.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Section 2: Recent Worked Days */}
      {section === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {!data || data.recent_logs.length === 0 ? (
            <p className="py-10 px-4 text-center text-sm text-slate-500">
              Hələ bağlanmış iş günü qeydi yoxdur.
            </p>
          ) : (
            data.recent_logs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    {formatDateAZ(log.work_date)} — {log.project_name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-xs font-extrabold tabular-nums">
                    {formatM2(log.done_m2)}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{log.stage_name}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">
                    {log.morning_time} → {log.evening_time || 'Açıq'}
                  </span>
                  {log.is_below_norm && (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Normadan aşağı
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Section 3: Past Closed Settlements */}
      {section === 'settlements' && (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {!data || data.settlements.length === 0 ? (
            <p className="py-10 px-4 text-center text-sm text-slate-500">
              Keçmiş dövrlər üzrə bağlanmış maaş ödənişi yoxdur.
            </p>
          ) : (
            data.settlements.map((s) => (
              <div key={s.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {formatDateAZ(s.period_start)} — {formatDateAZ(s.period_end)}
                  </span>
                  <span className="font-extrabold text-sm text-emerald-700 tabular-nums">
                    {formatAZN(s.net_paid)} ödənilib
                  </span>
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {s.worked_days} gün ({formatAZN(s.gross_salary)}) • Avans çıxılıb: -
                  {formatAZN(s.total_advances)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Ödəniş tarixi: {formatDateTimeAZ(s.paid_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
