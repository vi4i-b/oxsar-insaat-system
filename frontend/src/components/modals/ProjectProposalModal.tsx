import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Copy,
  MessageCircle,
  Printer,
  ExternalLink,
  Droplets,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { projectsService } from '../../api/projectsService';
import { workTypesService } from '../../api/workTypesService';
import type {
  ApiError,
  CreateProjectResponseData,
  SupplyType,
  WorkType,
} from '../../types/api';
import {
  buildWhatsAppProposalUrl,
  formatAZN,
  formatDateAZ,
  formatM2,
} from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

interface StageDraft {
  uid: string;
  work_type_id: string;
  stage_name: string;
  target_m2: string;
}

interface ProjectProposalModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: CreateProjectResponseData) => void;
}

export const ProjectProposalModal: React.FC<ProjectProposalModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [createdProject, setCreatedProject] = useState<CreateProjectResponseData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+994');
  const [supplyType, setSupplyType] = useState<SupplyType>('MATERIALLI');
  const [materialBrand, setMaterialBrand] = useState('TechnoNICOL Premium');
  const [pricePerM2, setPricePerM2] = useState('50');
  const [warrantyYears, setWarrantyYears] = useState('5');
  const [stages, setStages] = useState<StageDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setCreatedProject(null);
    setError(null);
    setName('');
    setAddress('');
    setClientName('');
    setClientPhone('+994');
    setSupplyType('MATERIALLI');
    setMaterialBrand('TechnoNICOL Premium');
    setPricePerM2('50');
    setWarrantyYears('5');

    void workTypesService.list().then((res) => {
      setWorkTypes(res.data);
      const firstWt = res.data[0];
      setStages([
        {
          uid: `stg-${Date.now()}`,
          work_type_id: firstWt?.id || '',
          stage_name: firstWt ? `Mərhələ 1: ${firstWt.name}` : 'Mərhələ 1',
          target_m2: '600',
        },
      ]);
    });
  }, [open]);

  const addStage = () => {
    const nextIdx = stages.length + 1;
    const wt = workTypes[Math.min(stages.length, workTypes.length - 1)] || workTypes[0];
    setStages((prev) => [
      ...prev,
      {
        uid: `stg-${Date.now()}-${nextIdx}`,
        work_type_id: wt?.id || '',
        stage_name: wt ? `Mərhələ ${nextIdx}: ${wt.name}` : `Mərhələ ${nextIdx}`,
        target_m2: prev[prev.length - 1]?.target_m2 || '600',
      },
    ]);
  };

  const updateStage = (uid: string, patch: Partial<StageDraft>) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.uid !== uid) return s;
        const next = { ...s, ...patch };
        if (patch.work_type_id) {
          const wt = workTypes.find((w) => w.id === patch.work_type_id);
          const idx = prev.findIndex((item) => item.uid === uid) + 1;
          if (wt) next.stage_name = `Mərhələ ${idx}: ${wt.name}`;
        }
        return next;
      })
    );
  };

  const removeStage = (uid: string) => {
    setStages((prev) => (prev.length > 1 ? prev.filter((s) => s.uid !== uid) : prev));
  };

  const liveCalc = useMemo(() => {
    const totalM2 = stages.reduce((sum, s) => sum + Math.max(0, Number(s.target_m2) || 0), 0);
    const price = Math.max(0, Number(pricePerM2) || 0);
    const totalAmount = totalM2 * price;

    const estimatedDays = stages.reduce((sum, s) => {
      const m2 = Math.max(0, Number(s.target_m2) || 0);
      const wt = workTypes.find((w) => w.id === s.work_type_id);
      const norm = wt?.daily_norm_m2 || 300;
      return sum + m2 / norm;
    }, 0);

    // Rough internal labor estimate (1 usta 50 + 1 fehle 30 = 80 AZN/day)
    const estimatedLabor = Math.ceil(estimatedDays) * 80;

    return {
      totalM2,
      totalAmount,
      estimatedDays: Number(estimatedDays.toFixed(1)),
      estimatedLabor,
    };
  }, [stages, pricePerM2, workTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (stages.some((s) => !s.work_type_id || !s.stage_name.trim() || Number(s.target_m2) <= 0)) {
      setError('Bütün mərhələlərdə iş növü, ad və müsbət m² həcmi doldurulmalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await projectsService.create({
        name: name.trim(),
        address: address.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        supply_type: supplyType,
        material_brand: supplyType === 'MATERIALLI' ? materialBrand.trim() || undefined : undefined,
        price_per_m2: Number(pricePerM2),
        warranty_years: Number(warrantyYears),
        stages: stages.map((s) => ({
          work_type_id: s.work_type_id,
          stage_name: s.stage_name.trim(),
          target_m2: Number(s.target_m2),
        })),
      });

      setCreatedProject(res.data);
      toast.success(res.message);
      onCreated(res.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Layihə yaradılarkən xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdProject) return;
    await navigator.clipboard.writeText(createdProject.magic_link_url);
    toast.success('Müştəri Magic-Link ünvanı buferə kopyalandı!');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={createdProject ? 'Təklif Sənədi Hazırdır!' : 'Yeni Təklif və Layihə Generatoru'}
      subtitle={
        createdProject
          ? 'Müştəriyə WhatsApp ilə göndərin və ya rəsmi PDF kimi çap edin'
          : 'Mərhələlərə əsasən m², təxmini iş günü, ümumi məbləğ və Magic-Link avtomatik hesablanır'
      }
      size="xl"
    >
      {createdProject ? (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-900">
                "{createdProject.name}" təklifi yaradıldı (Status: Gözləmədə)
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Unikal müştəri linki və 4 rəqəmli təhvil OTP kodu avtomatik generasiya olundu.
              </p>
            </div>
          </div>

          {/* Magic Link & OTP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Müştəri Magic-Link Ünvanı
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={createdProject.magic_link_url}
                  className="flex-1 bg-white rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-sky-700"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  <Copy className="w-3.5 h-3.5" /> Kopyala
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col justify-center">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Təhvil OTP Kodu
              </div>
              <div className="text-2xl font-mono font-extrabold text-amber-900 tracking-widest mt-1">
                {createdProject.otp_code}
              </div>
            </div>
          </div>

          {/* Official Printable Proposal Preview */}
          <div
            id="printable-proposal"
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-lg text-slate-900">
                    OXŞAR İNŞAAT
                  </div>
                  <div className="text-xs text-slate-500">
                    Hidroizolyasiya və Dam Örtükləri • Rəsmi Təklif Sənədi
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Tarix: {formatDateAZ(createdProject.created_at)}</div>
                <div className="font-mono font-bold text-slate-700 mt-0.5">
                  Ref: {createdProject.magic_token}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Sifarişçi</div>
                <div className="font-bold text-slate-900">{createdProject.client_name}</div>
                <div className="text-xs text-slate-600">{createdProject.client_phone}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Obyekt</div>
                <div className="font-bold text-slate-900">{createdProject.name}</div>
                <div className="text-xs text-slate-600">{createdProject.address}</div>
              </div>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <th className="py-2 px-3 text-left">İş Mərhələsi</th>
                  <th className="py-2 px-3 text-right">Həcm (m²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {createdProject.stages.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 px-3 font-medium text-slate-800">{s.stage_name}</td>
                    <td className="py-2 px-3 text-right font-semibold tabular-nums">
                      {formatM2(s.target_m2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <div className="text-slate-500">Ümumi Həcm</div>
                <div className="font-bold text-slate-900 text-sm tabular-nums">
                  {formatM2(createdProject.calculated_total_m2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">1 m² Qiyməti</div>
                <div className="font-bold text-slate-900 text-sm tabular-nums">
                  {formatAZN(createdProject.price_per_m2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Təxmini Müddət / Zəmanət</div>
                <div className="font-bold text-slate-900 text-sm">
                  ~{createdProject.estimated_working_days} iş günü • {createdProject.warranty_years} il
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Yekun Məbləğ</div>
                <div className="font-extrabold text-sky-700 text-base tabular-nums">
                  {formatAZN(createdProject.total_amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold"
            >
              <Printer className="w-4 h-4" />
              PDF / Çap Et
            </button>

            <div className="flex items-center gap-2.5">
              <a
                href={buildWhatsAppProposalUrl({
                  clientPhone: createdProject.client_phone,
                  clientName: createdProject.client_name,
                  projectName: createdProject.name,
                  totalAmount: createdProject.total_amount,
                  magicLinkUrl: createdProject.magic_link_url,
                  warrantyYears: createdProject.warranty_years,
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp-da Göndər
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Client & Object */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Obyektin Adı *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Məs: Badamdar Villa"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Sifarişçinin Adı və Soyadı *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="Məs: Rüstəm Şirinov"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Ünvan *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="Bakı şəhəri, Səbail rayonu..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Müştəri WhatsApp Nömrəsi *
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                placeholder="+994503332211"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Supply */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Təchizat Növü *
              </label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value as SupplyType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 outline-none"
              >
                <option value="MATERIALLI">Materiallı</option>
                <option value="ISCILIK">Yalnız İşçilik</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Material Markası
              </label>
              <input
                type="text"
                disabled={supplyType !== 'MATERIALLI'}
                value={supplyType === 'MATERIALLI' ? materialBrand : ''}
                onChange={(e) => setMaterialBrand(e.target.value)}
                placeholder={supplyType === 'MATERIALLI' ? 'TechnoNICOL Premium' : 'Müştəri təmin edir'}
                className="w-full rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 px-3 py-2.5 text-sm focus:border-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                1 m² Satış Qiyməti (₼) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={pricePerM2}
                onChange={(e) => setPricePerM2(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold tabular-nums focus:border-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Rəsmi Zəmanət (İl) *
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={warrantyYears}
                onChange={(e) => setWarrantyYears(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold tabular-nums focus:border-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Section 3: Stages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Layihə Mərhələləri (m²)</h3>
                <p className="text-xs text-slate-500">
                  Hər mərhələ üçün iş növü seçin; sistem gündəlik normalara görə müddəti hesablayır
                </p>
              </div>
              <button
                type="button"
                onClick={addStage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Mərhələ Əlavə Et
              </button>
            </div>

            <div className="space-y-2.5">
              {stages.map((stg, idx) => (
                <div
                  key={stg.uid}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-3 rounded-xl border border-slate-200 bg-white items-center"
                >
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      İş Növü #{idx + 1}
                    </label>
                    <select
                      value={stg.work_type_id}
                      onChange={(e) => updateStage(stg.uid, { work_type_id: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium bg-white"
                    >
                      {workTypes.map((wt) => (
                        <option key={wt.id} value={wt.id}>
                          {wt.name} (norma: {wt.daily_norm_m2} m²/gün)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Mərhələ Adı
                    </label>
                    <input
                      type="text"
                      value={stg.stage_name}
                      onChange={(e) => updateStage(stg.uid, { stage_name: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Hədəf m²
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={stg.target_m2}
                      onChange={(e) => updateStage(stg.uid, { target_m2: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-bold tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={stages.length <= 1}
                      onClick={() => removeStage(stg.uid)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      title="Mərhələni sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Calculator Preview */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">
                  Canlı Təklif Kalkulyatoru
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Təxmini müddət: <strong className="text-white">{liveCalc.estimatedDays} iş günü</strong>{' '}
                  • Təxmini işçilik xərci:{' '}
                  <strong className="text-amber-300 tabular-nums">
                    ~{formatAZN(liveCalc.estimatedLabor)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:text-right">
              <div>
                <div className="text-[11px] text-slate-400">Ümumi Həcm</div>
                <div className="text-base font-extrabold tabular-nums">
                  {formatM2(liveCalc.totalM2)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-sky-300">Yekun Satış Məbləği</div>
                <div className="text-xl font-extrabold text-emerald-400 tabular-nums">
                  {formatAZN(liveCalc.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm"
            >
              {submitting ? 'Yaradılır...' : 'Təklifi Yarat və Magic-Link Al'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
