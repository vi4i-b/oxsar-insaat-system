import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Users,
  PlayCircle,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Lock,
  KeyRound,
  Layers,
  Clock,
} from 'lucide-react';
import { ustaService } from '../../api/ustaService';
import type { ApiError } from '../../types/api';
import type {
  UstaActiveProject,
  UstaHelperOption,
  UstaTodayLogsData,
} from '../../types/usta';
import {
  formatDateAZ,
  formatM2,
  formatPercent,
  SUPPLY_TYPE_LABELS,
} from '../../utils/formatters';
import { LiveCameraCapture } from '../../components/usta/LiveCameraCapture';
import { EmptyState, PageLoader } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';

export const UstaFieldPage: React.FC = () => {
  const toast = useToast();

  const [projects, setProjects] = useState<UstaActiveProject[]>([]);
  const [helpers, setHelpers] = useState<UstaHelperOption[]>([]);
  const [todayData, setTodayData] = useState<UstaTodayLogsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Morning Check-in form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);
  const [morningMedia, setMorningMedia] = useState<File | null>(null);
  const [morningSubmitting, setMorningSubmitting] = useState(false);

  // Evening Check-out form state
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [doneM2, setDoneM2] = useState<string>('');
  const [materialNote, setMaterialNote] = useState<string>('');
  const [eveningMedia, setEveningMedia] = useState<File | null>(null);
  const [eveningSubmitting, setEveningSubmitting] = useState(false);

  // Client 4-digit OTP handover modal state
  const [otpProject, setOtpProject] = useState<UstaActiveProject | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  const loadFieldData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, helpRes, todayRes] = await Promise.all([
        ustaService.getActiveProjects(),
        ustaService.getHelpers(),
        ustaService.getTodayLogs(),
      ]);

      setProjects(projRes.data);
      setHelpers(helpRes.data);
      setTodayData(todayRes.data);

      if (projRes.data.length > 0) {
        setSelectedProjectId((prev) =>
          projRes.data.some((p) => p.id === prev) ? prev : projRes.data[0].id
        );
      }

      if (todayRes.data.open_log) {
        const openProj = projRes.data.find(
          (p) => p.id === todayRes.data.open_log?.project_id
        );
        const firstIncomplete =
          openProj?.stages.find((s) => !s.is_completed && s.remaining_m2 > 0) ||
          openProj?.stages[0];
        if (firstIncomplete) {
          setSelectedStageId(firstIncomplete.id);
        }
      }
    } catch (err) {
      toast.error(
        (err as ApiError)?.message || 'Sahə məlumatları yüklənərkən xəta baş verdi.'
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadFieldData();
  }, [loadFieldData]);

  const openLog = todayData?.open_log || null;

  const selectedMorningProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const openLogProject = useMemo(
    () => (openLog ? projects.find((p) => p.id === openLog.project_id) || null : null),
    [projects, openLog]
  );

  const selectedEveningStage = useMemo(
    () => openLogProject?.stages.find((s) => s.id === selectedStageId) || null,
    [openLogProject, selectedStageId]
  );

  const parsedDoneM2 = Number(doneM2);
  const exceedsRemainingM2 =
    Boolean(selectedEveningStage) &&
    parsedDoneM2 > (selectedEveningStage?.remaining_m2 ?? Infinity);
  const isBelowDailyNorm =
    Boolean(selectedEveningStage) &&
    parsedDoneM2 > 0 &&
    !exceedsRemainingM2 &&
    parsedDoneM2 < (selectedEveningStage?.daily_norm_m2 ?? 0);

  const toggleHelper = (id: string) => {
    setSelectedHelperIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // STEP 1: Morning Check-in Submit
  const handleMorningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !morningMedia) {
      toast.error('Obyekt seçilməli və canlı kamera fotosu/videosu çəkilməlidir.');
      return;
    }

    setMorningSubmitting(true);
    try {
      const res = await ustaService.morningCheckIn({
        project_id: selectedProjectId,
        helper_ids: selectedHelperIds,
        media: morningMedia,
      });
      toast.success(res.message);
      setMorningMedia(null);
      setSelectedHelperIds([]);
      await loadFieldData();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Səhər çekini göndərilə bilmədi.');
    } finally {
      setMorningSubmitting(false);
    }
  };

  // STEP 2: Evening Check-out Submit
  const handleEveningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openLog) return;
    if (!selectedStageId) {
      toast.error('İşlədiyiniz mərhələni seçin.');
      return;
    }
    if (!parsedDoneM2 || parsedDoneM2 <= 0) {
      toast.error('Görülən m² rəqəmini düzgün daxil edin.');
      return;
    }
    if (exceedsRemainingM2) {
      toast.error('Daxil edilən m² mərhələnin qalıq həcmindən çox ola bilməz!');
      return;
    }
    if (!eveningMedia) {
      toast.error('Görülmüş işin canlı kamera fotosu/videosu mütləq çəkilməlidir.');
      return;
    }

    setEveningSubmitting(true);
    try {
      const res = await ustaService.eveningCheckOut(openLog.id, {
        stage_id: selectedStageId,
        done_m2: parsedDoneM2,
        material_note: materialNote,
        media: eveningMedia,
      });
      toast.success(res.message);
      setDoneM2('');
      setMaterialNote('');
      setEveningMedia(null);
      await loadFieldData();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Axşam hesabatı göndərilə bilmədi.');
    } finally {
      setEveningSubmitting(false);
    }
  };

  // Client 4-digit OTP Project Completion
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpProject || !/^\d{4}$/.test(otpCode)) {
      toast.error('Müştəridən aldığınız 4 rəqəmli OTP kodu tam daxil edin.');
      return;
    }

    setOtpSubmitting(true);
    try {
      const res = await ustaService.completeProjectWithOtp(otpProject.id, otpCode);
      toast.success(res.message);
      setOtpProject(null);
      setOtpCode('');
      await loadFieldData();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'OTP kod yanlışdır.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  if (loading && !todayData) {
    return <PageLoader label="Aktiv obyektlər və növbə yoxlanılır..." />;
  }

  return (
    <div className="space-y-5">
      {/* Top Status Strip */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-slate-900">
            Gündəlik Sahə İcrası
          </h1>
          <p className="text-xs text-slate-500">
            {openLog
              ? 'Açıq növbəniz var — axşam işi bitirdikdə hesabatı bağlayın'
              : 'Getdiyiniz aktiv obyekti seçib səhər çekinini başladın'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFieldData()}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-sky-600 shadow-2xs"
          title="Yenilə"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* =================================================================== */}
      {/* MODE A: ACTIVE OPEN SHIFT -> EVENING CHECK-OUT ("İŞ GÜNÜNÜ BİTİR") */}
      {/* =================================================================== */}
      {openLog ? (
        <div className="space-y-4">
          {/* Open Shift Info Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-sky-950 text-white p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                İŞ GÜNÜ AÇIQDIR
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-sky-300">
                <Clock className="w-3.5 h-3.5" /> Səhər: {openLog.morning_time}
              </span>
            </div>

            <div>
              <h2 className="font-display text-xl font-extrabold">{openLog.project_name}</h2>
              {openLog.project_address && (
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  {openLog.project_address}
                </p>
              )}
            </div>

            {openLog.helpers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400">Briqada:</span>
                {openLog.helpers.map((h) => (
                  <span
                    key={h.id}
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 text-xs font-semibold"
                  >
                    {h.full_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Evening Check-out Form */}
          <form
            onSubmit={handleEveningSubmit}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <StopCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Addım 2: Axşam Çekini (İş Gününü Bitir)
                </h3>
                <p className="text-xs text-slate-500">
                  Mərhələni, görülən m²-i və canlı kamera çəkilişini daxil edin
                </p>
              </div>
            </div>

            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                1. İşlədiyiniz Mərhələni Seçin *
              </label>
              <div className="space-y-2">
                {(openLogProject?.stages || []).map((stg) => {
                  const selected = stg.id === selectedStageId;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      disabled={stg.is_completed || stg.remaining_m2 <= 0}
                      onClick={() => setSelectedStageId(stg.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all ${
                        stg.is_completed
                          ? 'border-slate-100 bg-slate-50 opacity-55 cursor-not-allowed'
                          : selected
                          ? 'border-sky-600 bg-sky-50/70'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {stg.stage_name}
                        </span>
                        <span className="text-xs font-extrabold text-sky-700 tabular-nums shrink-0">
                          Qalıq: {formatM2(stg.remaining_m2)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          Hazır: {formatM2(stg.completed_m2)} / {formatM2(stg.target_m2)} (
                          {formatPercent(stg.progress_percent)})
                        </span>
                        <span>Norma: {formatM2(stg.daily_norm_m2)}/gün</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done m2 Input with Anomaly / Remaining Lock */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                2. Bu Gün Görülən Həcm (m²) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0.5"
                max={selectedEveningStage?.remaining_m2}
                value={doneM2}
                onChange={(e) => setDoneM2(e.target.value)}
                required
                placeholder={
                  selectedEveningStage
                    ? `Maksimum qalıq: ${selectedEveningStage.remaining_m2} m²`
                    : 'Məs: 300'
                }
                className={`w-full rounded-2xl border-2 px-4 py-3.5 text-lg font-extrabold tabular-nums outline-none ${
                  exceedsRemainingM2
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : 'border-slate-300 text-slate-900 focus:border-sky-600'
                }`}
              />

              {/* HARD ERROR LOCK: Exceeds Stage Remaining m2 */}
              {exceedsRemainingM2 && selectedEveningStage && (
                <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-xs text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Səhv rəqəm kilidi: Bu mərhələnin qalığı cəmi{' '}
                    {formatM2(selectedEveningStage.remaining_m2)}-dir. Artıq rəqəm qəbul edilmir!
                  </span>
                </div>
              )}

              {/* SOFT ANOMALY WARNING: Below Daily Norm */}
              {isBelowDailyNorm && selectedEveningStage && (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Gündəlik norma ({formatM2(selectedEveningStage.daily_norm_m2)})-dən aşağıdır.
                    Müdir panelinə "Normadan aşağı icra" qeydi düşəcək — səbəbini aşağıda qeyd edə bilərsiniz.
                  </span>
                </div>
              )}
            </div>

            {/* Optional Material / Field Note */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                3. İşlənən Material və ya Qeyd (İstəyə bağlı)
              </label>
              <textarea
                rows={2}
                value={materialNote}
                onChange={(e) => setMaterialNote(e.target.value)}
                placeholder="Məs: 6 vedrə sürmə mastika vuruldu, səth tam qurudu."
                className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 outline-none resize-none"
              />
            </div>

            {/* Live Camera Audit Lock */}
            <LiveCameraCapture
              label="4. Görülmüş İşin Canlı Fotosu / Videosu"
              watermarkTitle={`${openLog.project_name} • Axşam (${doneM2 || 0} m²)`}
              value={eveningMedia}
              onChange={setEveningMedia}
            />

            {/* Submit Lock Button */}
            <button
              type="submit"
              disabled={
                eveningSubmitting ||
                !selectedStageId ||
                !parsedDoneM2 ||
                parsedDoneM2 <= 0 ||
                exceedsRemainingM2 ||
                !eveningMedia
              }
              className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {eveningSubmitting ? 'Göndərilir...' : 'TƏSDİQLƏ VƏ İŞ GÜNÜNÜ BİTİR'}
              </span>
            </button>
          </form>
        </div>
      ) : (
        /* ================================================================= */
        /* MODE B: NO OPEN SHIFT -> MORNING CHECK-IN ("İŞƏ BAŞLADIM")        */
        /* ================================================================= */
        <div className="space-y-4">
          {projects.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-6 h-6" />}
              title="Hazırda aktiv obyekt yoxdur"
              description="Müdir tərəfindən layihə 'Aktiv' statusuna keçirildikdə dərhal bu siyahıda görünəcək."
            />
          ) : (
            <form
              onSubmit={handleMorningSubmit}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-5"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-900">
                    Addım 1: Səhər Çekini (İşə Başladım)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Obyekti və briqadanı seçib işdən əvvəlki canlı fotonu çəkin
                  </p>
                </div>
              </div>

              {/* 1. Select Active Project */}
              <div className="space-y-2.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Bu Gün Getdiyiniz Aktiv Obyekt *
                </label>

                {projects.map((proj) => {
                  const selected = proj.id === selectedProjectId;
                  const readyOtp =
                    proj.is_ready_for_otp ||
                    (proj.total_target_m2 > 0 &&
                      proj.total_completed_m2 >= proj.total_target_m2);

                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all space-y-2.5 ${
                        selected
                          ? 'border-sky-600 bg-sky-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display font-extrabold text-base text-slate-900">
                            {proj.name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>{proj.address}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-extrabold tabular-nums shrink-0">
                          {formatPercent(proj.progress_percent)}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-600 transition-all"
                          style={{ width: `${Math.min(100, proj.progress_percent)}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {proj.stages.length} mərhələ •{' '}
                          {SUPPLY_TYPE_LABELS[proj.supply_type]}
                          {proj.material_brand ? ` (${proj.material_brand})` : ''}
                        </span>
                        <span className="font-bold tabular-nums">
                          {formatM2(proj.total_completed_m2)} / {formatM2(proj.total_target_m2)}
                        </span>
                      </div>

                      {readyOtp && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setOtpCode('');
                            setOtpProject(proj);
                          }}
                          className="w-full mt-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <KeyRound className="w-4 h-4" />
                          100% Bitib — Müştəri OTP Kodu ilə Təhvil Ver
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Select Helpers / Crew */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                  2. Yanınızda İşləyən Fəhlə / Usta ({selectedHelperIds.length} seçilib)
                </label>
                {helpers.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    Qeydiyyatda əlavə aktiv köməkçi yoxdur — tək başlaya bilərsiniz.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {helpers.map((h) => {
                      const checked = selectedHelperIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleHelper(h.id)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-2xl border-2 text-left transition-all ${
                            checked
                              ? 'border-sky-600 bg-sky-50 text-sky-950'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Users
                              className={`w-4 h-4 ${
                                checked ? 'text-sky-600' : 'text-slate-400'
                              }`}
                            />
                            <div>
                              <div className="text-sm font-bold">{h.full_name}</div>
                              <div className="text-[11px] text-slate-500">
                                {h.role === 'FEHLE' ? 'Fəhlə' : 'Usta'} • {h.phone}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              checked
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Live Camera Capture */}
              <LiveCameraCapture
                label="3. İşdən Əvvəlki Canlı Kamera Fotosu / Videosu"
                watermarkTitle={`${selectedMorningProject?.name || 'Obyekt'} • Səhər Çekini`}
                value={morningMedia}
                onChange={setMorningMedia}
              />

              {/* 4. Start Workday Button */}
              <button
                type="submit"
                disabled={morningSubmitting || !selectedProjectId || !morningMedia}
                className="w-full py-4 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all"
              >
                <PlayCircle className="w-5 h-5" />
                <span>{morningSubmitting ? 'Başladılır...' : 'İŞƏ BAŞLADIM'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* READ-ONLY CLOSED REPORTS TODAY (Immutable Audit Rule)               */}
      {/* =================================================================== */}
      {todayData && todayData.closed_logs_today.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Bu Gün Bağlanmış Hesabatlar ({formatDateAZ(todayData.today_date)})
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Lock className="w-3 h-3" /> Kilidlənib
            </span>
          </div>

          <div className="space-y-2.5">
            {todayData.closed_logs_today.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">{log.project_name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold tabular-nums">
                    +{formatM2(log.done_m2)}
                  </span>
                </div>
                {log.stage_name && (
                  <div className="text-xs text-slate-600">{log.stage_name}</div>
                )}
                <div className="text-[11px] text-slate-500 font-mono">
                  Səhər: {log.morning_time} • Axşam: {log.evening_time || '—'}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Audit qaydası: Göndərilmiş foto-video və m² rəqəmi usta tərəfindən silinə və ya
            dəyişdirilə bilməz. Texniki səhv olarsa Müdirə müraciət edin.
          </p>
        </div>
      )}

      {/* Client 4-Digit OTP Handover Modal */}
      <Modal
        open={Boolean(otpProject)}
        onClose={() => setOtpProject(null)}
        title="Müştəri OTP Təhvil Təsdiqi"
        subtitle="Müştərinin öz Magic-Link səhifəsində gördüyü 4 rəqəmli təhvil kodunu daxil edin"
        size="sm"
      >
        {otpProject && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <strong>{otpProject.name}</strong> obyekti üzrə bütün mərhələlər 100% icra olunub.
              Müştəri kodu təsdiqlədikdə layihə rəsmən <strong>Tamamlandı</strong> olacaq.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                4 Rəqəmli Müştəri OTP Kodu *
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="8492"
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-[0.4em] text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOtpProject(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={otpSubmitting || otpCode.length !== 4}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold"
              >
                {otpSubmitting ? 'Yoxlanılır...' : 'Təhvili Təsdiqlə'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
