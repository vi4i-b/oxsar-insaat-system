import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Copy,
  MessageCircle,
  Edit3,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Package,
  Layers,
  Plus,
  Shield,
  KeyRound,
  Printer,
  Wrench,
  Clock,
  Droplets,
} from 'lucide-react';
import { projectsService } from '../api/projectsService';
import { materialsService } from '../api/materialsService';
import { analyticsService } from '../api/analyticsService';
import type {
  ApiError,
  DailyLog,
  ProjectDetail,
  ProjectStatus,
  SupplyType,
} from '../types/api';
import {
  buildWhatsAppProposalUrl,
  formatAZN,
  formatDateAZ,
  formatDateTimeAZ,
  formatM2,
  formatPercent,
} from '../utils/formatters';
import { ProjectStatusBadge, SupplyTypeBadge } from '../components/ui/StatusBadge';
import { EmptyState, PageLoader } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

type DetailTab = 'stages' | 'logs' | 'materials';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('stages');

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ProjectStatus>('AKTIV');
  const [pauseReason, setPauseReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    client_name: '',
    client_phone: '',
    supply_type: 'MATERIALLI' as SupplyType,
    material_brand: '',
    price_per_m2: '50',
    warranty_years: '5',
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Material modal
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [matForm, setMatForm] = useState({ item_name: '', quantity: '', unit_cost: '' });
  const [matSaving, setMatSaving] = useState(false);

  // Daily log override modal
  const [overrideLog, setOverrideLog] = useState<DailyLog | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    done_m2: '',
    material_note: '',
    is_below_norm: false,
    admin_correction_reason: '',
  });
  const [overrideSaving, setOverrideSaving] = useState(false);

  // Photo lightbox
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await projectsService.getById(id);
      setProject(res.data);
    } catch {
      toast.error('Layihə detalları tapılmadı.');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const openStatusModal = () => {
    if (!project) return;
    setNewStatus(project.status);
    setPauseReason(project.pause_reason || '');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (newStatus === 'DAYANDIRILIB' && !pauseReason.trim()) {
      toast.error('Layihə dayandırıldıqda mütləq səbəb qeyd olunmalıdır.');
      return;
    }

    setStatusSaving(true);
    try {
      const res = await projectsService.changeStatus(project.id, {
        status: newStatus,
        pause_reason: newStatus === 'DAYANDIRILIB' ? pauseReason.trim() : null,
      });
      toast.success(res.message);
      setStatusModalOpen(false);
      await fetchDetail();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Status dəyişdirilə bilmədi.');
    } finally {
      setStatusSaving(false);
    }
  };

  const openEditModal = () => {
    if (!project) return;
    setEditForm({
      name: project.name,
      address: project.address,
      client_name: project.client_name,
      client_phone: project.client_phone,
      supply_type: project.supply_type,
      material_brand: project.material_brand || '',
      price_per_m2: String(project.price_per_m2),
      warranty_years: String(project.warranty_years),
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setEditSaving(true);
    try {
      const res = await projectsService.update(project.id, {
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        client_name: editForm.client_name.trim(),
        client_phone: editForm.client_phone.trim(),
        supply_type: editForm.supply_type,
        material_brand:
          editForm.supply_type === 'MATERIALLI' ? editForm.material_brand.trim() || null : null,
        price_per_m2: Number(editForm.price_per_m2),
        warranty_years: Number(editForm.warranty_years),
      });
      toast.success(res.message);
      setEditModalOpen(false);
      await fetchDetail();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Yeniləmə zamanı xəta baş verdi.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      const res = await projectsService.deleteOrArchive(project.id);
      toast.success(res.message);
      setDeleteModalOpen(false);
      if (res.data.deleted) {
        navigate('/admin/projects');
      } else {
        await fetchDetail();
      }
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Əməliyyat zamanı xəta baş verdi.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setMatSaving(true);
    try {
      const res = await materialsService.add(project.id, {
        item_name: matForm.item_name.trim(),
        quantity: Number(matForm.quantity),
        unit_cost: Number(matForm.unit_cost),
      });
      toast.success(res.message);
      setMatForm({ item_name: '', quantity: '', unit_cost: '' });
      setMatModalOpen(false);
      await fetchDetail();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Material əlavə edilə bilmədi.');
    } finally {
      setMatSaving(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string, itemName: string) => {
    if (!window.confirm(`"${itemName}" material qeydini silmək istədiyinizə əminsiniz?`)) {
      return;
    }
    try {
      const res = await materialsService.remove(materialId);
      toast.success(res.message);
      await fetchDetail();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Material silinə bilmədi.');
    }
  };

  const openOverrideModal = (log: DailyLog) => {
    setOverrideLog(log);
    setOverrideForm({
      done_m2: String(log.done_m2),
      material_note: log.material_note || '',
      is_below_norm: log.is_below_norm,
      admin_correction_reason: '',
    });
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideLog) return;
    if (overrideForm.admin_correction_reason.trim().length < 10) {
      toast.error('Düzəliş səbəbi ən azı 10 simvol olmalıdır.');
      return;
    }

    setOverrideSaving(true);
    try {
      const res = await analyticsService.overrideDailyLog(overrideLog.id, {
        done_m2: Number(overrideForm.done_m2),
        material_note: overrideForm.material_note.trim(),
        is_below_norm: overrideForm.is_below_norm,
        admin_correction_reason: overrideForm.admin_correction_reason.trim(),
      });
      toast.success(res.message);
      setOverrideLog(null);
      await fetchDetail();
    } catch (err) {
      toast.error((err as ApiError)?.message || 'Hesabat düzəldilə bilmədi.');
    } finally {
      setOverrideSaving(false);
    }
  };

  if (loading || !project) {
    return <PageLoader label="Layihə profili yüklənir..." />;
  }

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı!`);
  };

  const materialLiveTotal =
    (Number(matForm.quantity) || 0) * (Number(matForm.unit_cost) || 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 no-print">
        <div>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Layihələr siyahısına qayıt
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
            <SupplyTypeBadge supplyType={project.supply_type} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {project.address}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {project.client_name} (
              {project.client_phone})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> {project.warranty_years} il zəmanət
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openStatusModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Statusu Dəyiş
          </button>
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold"
          >
            <Edit3 className="w-3.5 h-3.5" /> Redaktə Et
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold"
          >
            <Printer className="w-3.5 h-3.5" /> PDF Təklif
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" /> Sil / Arxivlə
          </button>
        </div>
      </div>

      {/* Pause Reason Banner */}
      {project.status === 'DAYANDIRILIB' && project.pause_reason && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 no-print">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-rose-900">
              Layihə müvəqqəti dayandırılıb
            </div>
            <p className="text-xs text-rose-800 mt-0.5">{project.pause_reason}</p>
          </div>
        </div>
      )}

      {/* Magic-Link & OTP Share Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
            Müştəri Magic-Link Portalı
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs sm:text-sm font-mono bg-slate-800 px-3 py-1.5 rounded-lg text-sky-200 truncate max-w-full">
              {project.magic_link_url}
            </code>
            <button
              type="button"
              onClick={() => copyText(project.magic_link_url, 'Magic-Link')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Kopyala
            </button>
            <a
              href={buildWhatsAppProposalUrl({
                clientPhone: project.client_phone,
                clientName: project.client_name,
                projectName: project.name,
                totalAmount: project.total_amount,
                magicLinkUrl: project.magic_link_url,
                warrantyYears: project.warranty_years,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp-da Paylaş
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-xl shrink-0">
          <KeyRound className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Təhvil OTP Kodu
            </div>
            <div className="font-mono text-lg font-extrabold tracking-widest text-amber-300">
              {project.otp_code}
            </div>
          </div>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 no-print">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold uppercase text-slate-500">Razılaşma Məbləği</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
            {formatAZN(project.financials.agreed_amount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatAZN(project.price_per_m2)} / m²
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold uppercase text-slate-500">Material Xərci</div>
          <div className="text-xl font-extrabold text-indigo-700 tabular-nums mt-1">
            {formatAZN(project.financials.materials_cost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {project.materials.length} alış qeydi
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-bold uppercase text-slate-500">İşçilik Xərci</div>
          <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-1">
            {formatAZN(project.financials.labor_cost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {project.progress.worked_days_so_far} iş günü qeydə alınıb
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
          <div className="text-[11px] font-bold uppercase text-emerald-800">Xalis Mənfəət</div>
          <div className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">
            {formatAZN(project.financials.net_profit)}
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">
            Marja: {formatPercent(project.financials.profit_margin_percent)}
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-sky-50 rounded-2xl border border-sky-200 p-4">
          <div className="text-[11px] font-bold uppercase text-sky-800">Ümumi İcra</div>
          <div className="text-xl font-extrabold text-sky-700 tabular-nums mt-1">
            {formatPercent(project.progress.percentage)}
          </div>
          <div className="text-[11px] text-sky-800 mt-1 tabular-nums">
            {formatM2(project.progress.total_completed_m2)} /{' '}
            {formatM2(project.progress.total_target_m2)}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => setActiveTab('stages')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'stages'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Mərhələlər ({project.stages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          Gündəlik Kamera Hesabatları ({project.daily_logs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'materials'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Obyekt Materialları ({project.materials.length})
        </button>
      </div>

      {/* TAB 1: Stages */}
      {activeTab === 'stages' && (
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-900">Ümumi Layihə Proqresi</h3>
                <p className="text-xs text-slate-500">
                  Təxmini plan müddəti: {project.progress.estimated_days_total} iş günü •
                  Material brendi: {project.material_brand || 'Yalnız işçilik'}
                </p>
              </div>
              <div className="text-lg font-extrabold text-sky-700 tabular-nums">
                {formatPercent(project.progress.percentage)}
              </div>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all"
                style={{ width: `${Math.min(100, project.progress.percentage)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {project.stages.map((stg, index) => {
              const pct =
                stg.progress_percent ??
                (stg.target_m2 > 0 ? (stg.completed_m2 / stg.target_m2) * 100 : 0);
              return (
                <div
                  key={stg.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-slate-900">{stg.stage_name}</h4>
                      {stg.is_completed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Bitib
                        </span>
                      )}
                    </div>
                    {stg.work_type_name && (
                      <div className="text-xs text-slate-500 pl-8">
                        İş növü: <span className="font-medium text-slate-700">{stg.work_type_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:w-72 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-600 tabular-nums">
                        {formatM2(stg.completed_m2)} / {formatM2(stg.target_m2)}
                      </span>
                      <span className="font-extrabold text-slate-900 tabular-nums">
                        {formatPercent(pct)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-emerald-500' : 'bg-sky-600'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Daily Logs + Manual Admin Override (PATCH /daily-logs/:id) */}
      {activeTab === 'logs' && (
        <div className="space-y-4 no-print">
          {project.daily_logs.length === 0 ? (
            <EmptyState
              icon={<Camera className="w-6 h-6" />}
              title="Hələ gündəlik hesabat yoxdur"
              description="Usta briqadası bu obyekt üzrə səhər və axşam canlı kamera çekini etdikdə hesabatlar burada görünəcək."
            />
          ) : (
            project.daily_logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-extrabold text-base text-slate-900">
                        {formatDateAZ(log.work_date)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold tabular-nums">
                        {formatM2(log.done_m2)} icra edilib
                      </span>
                      {log.is_below_norm && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Normadan aşağı icra
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{log.stage_name}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openOverrideModal(log)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold self-start sm:self-center"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Müdir Düzəlişi (m²)
                  </button>
                </div>

                {/* Crew & Notes */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-semibold">
                    Usta: {log.usta.full_name}
                  </span>
                  {log.helpers.map((h) => (
                    <span
                      key={h.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                    >
                      Fəhlə: {h.full_name}
                    </span>
                  ))}
                </div>

                {log.material_note && (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200/70">
                    <span className="font-bold text-slate-900">Qeyd: </span>
                    {log.material_note}
                  </p>
                )}

                {/* Morning & Evening Live Camera Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxImage({
                        url: log.morning_media_url,
                        title: `${formatDateAZ(log.work_date)} — Səhər Çekini (${log.morning_time})`,
                      })
                    }
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-left"
                  >
                    <img
                      src={log.morning_media_url}
                      alt="Səhər çekini"
                      className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform"
                    />
                    <div className="p-2.5 bg-white flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Səhər Çekini</span>
                      <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                        <Clock className="w-3 h-3" /> {log.morning_time}
                      </span>
                    </div>
                  </button>

                  {log.evening_media_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          url: log.evening_media_url!,
                          title: `${formatDateAZ(log.work_date)} — Axşam Hesabatı (${log.evening_time})`,
                        })
                      }
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-left"
                    >
                      <img
                        src={log.evening_media_url}
                        alt="Axşam hesabatı"
                        className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform"
                      />
                      <div className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">Axşam Hesabatı</span>
                        <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                          <Clock className="w-3 h-3" /> {log.evening_time}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Project Materials (MODUL 5) */}
      {activeTab === 'materials' && (
        <div className="space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900">
                Obyektə Göndərilmiş Materiallar və Maya Dəyəri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cəmi material xərci:{' '}
                <strong className="text-indigo-700 tabular-nums">
                  {formatAZN(project.financials.materials_cost)}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" /> Yeni Material Xərci Əlavə Et
            </button>
          </div>

          {project.materials.length === 0 ? (
            <EmptyState
              icon={<Package className="w-6 h-6" />}
              title="Material qeydi yoxdur"
              description="Bu obyektə göndərilən praymer, mastika, tol rulonları və digər alışları əlavə edərək real mənfəəti izləyin."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-5">Material Adı</th>
                      <th className="py-3.5 px-4 text-right">Miqdar</th>
                      <th className="py-3.5 px-4 text-right">Vahid Qiyməti</th>
                      <th className="py-3.5 px-4 text-right">Cəmi Məbləğ</th>
                      <th className="py-3.5 px-4">Tarix</th>
                      <th className="py-3.5 px-5 text-right">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {project.materials.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-5 font-bold text-slate-900">{m.item_name}</td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                          {m.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                          {formatAZN(m.unit_cost)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-indigo-700 tabular-nums">
                          {formatAZN(m.total_cost)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {formatDateTimeAZ(m.added_at)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(m.id, m.item_name)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Material qeydini sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Hidden Printable Official Proposal Section (visible only on window.print()) */}
      <div id="printable-proposal" className="hidden print:block bg-white p-8 space-y-6">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 text-sky-600" />
            <div>
              <div className="font-display font-extrabold text-2xl text-slate-900">
                OXŞAR İNŞAAT
              </div>
              <div className="text-xs text-slate-600">
                Hidroizolyasiya və Dam Örtükləri • Rəsmi Təklif və İş Sənədi
              </div>
            </div>
          </div>
          <div className="text-right text-xs">
            <div>Tarix: {formatDateAZ(project.created_at)}</div>
            <div className="font-mono font-bold">Ref: {project.magic_token}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Sifarişçi:</strong> {project.client_name} ({project.client_phone})
          </div>
          <div>
            <strong>Obyekt:</strong> {project.name} — {project.address}
          </div>
        </div>
        <table className="w-full text-sm border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 text-left border-b">Mərhələ</th>
              <th className="p-2 text-right border-b">Hədəf m²</th>
              <th className="p-2 text-right border-b">İcra m²</th>
            </tr>
          </thead>
          <tbody>
            {project.stages.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-2">{s.stage_name}</td>
                <td className="p-2 text-right">{formatM2(s.target_m2)}</td>
                <td className="p-2 text-right">{formatM2(s.completed_m2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between text-base font-bold pt-2">
          <span>Zəmanət: {project.warranty_years} il • 1 m²: {formatAZN(project.price_per_m2)}</span>
          <span>Yekun Məbləğ: {formatAZN(project.total_amount)}</span>
        </div>
      </div>

      {/* MODAL: Change Status (PATCH /projects/:id/status) */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Layihə Statusunu Dəyiş"
        subtitle="AKTIV statusda layihə ustaların mobil ekranına avtomatik düşür"
        size="sm"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Yeni Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold"
            >
              <option value="GOZLEMEDE">Gözləmədə (Təklif verilib)</option>
              <option value="AKTIV">Aktiv (İcra gedir — ustalara görünür)</option>
              <option value="DAYANDIRILIB">Müvəqqəti Dayandırılıb</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
              <option value="PASSIV">Passiv (Arxiv)</option>
            </select>
          </div>

          {newStatus === 'DAYANDIRILIB' && (
            <div>
              <label className="block text-xs font-bold uppercase text-rose-700 mb-1.5">
                Dayandırılma Səbəbi (Məcburi) *
              </label>
              <textarea
                rows={3}
                required
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Məs: Güclü yağış səbəbindən dam örtüyünün quruması gözlənilir."
                className="w-full rounded-xl border border-rose-300 px-3.5 py-2.5 text-sm focus:border-rose-500 outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={statusSaving}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {statusSaving ? 'Yadda saxlanır...' : 'Statusu Təsdiqlə'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Project (PUT /projects/:id) */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Layihə Məlumatlarını Redaktə Et"
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Obyektin Adı</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Ünvan</label>
              <input
                type="text"
                required
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Müştəri Adı</label>
              <input
                type="text"
                required
                value={editForm.client_name}
                onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Müştəri Telefonu</label>
              <input
                type="tel"
                required
                value={editForm.client_phone}
                onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Təchizat Növü</label>
              <select
                value={editForm.supply_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, supply_type: e.target.value as SupplyType })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="MATERIALLI">Materiallı</option>
                <option value="ISCILIK">Yalnız İşçilik</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Material Brendi</label>
              <input
                type="text"
                disabled={editForm.supply_type !== 'MATERIALLI'}
                value={editForm.material_brand}
                onChange={(e) => setEditForm({ ...editForm, material_brand: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1 m² Qiyməti (₼)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={editForm.price_per_m2}
                onChange={(e) => setEditForm({ ...editForm, price_per_m2: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zəmanət (İl)</label>
              <input
                type="number"
                min="0"
                required
                value={editForm.warranty_years}
                onChange={(e) => setEditForm({ ...editForm, warranty_years: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {editSaving ? 'Yenilənir...' : 'Yadda Saxla'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Delete / Archive Confirmation */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Layihəni Sil / Arxivlə"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>"{project.name}"</strong> layihəsini silmək istədiyinizə əminsiniz?
            <br />
            <span className="text-xs text-slate-500">
              Qeyd: Əgər layihəyə bağlı usta hesabatları və ya material alışları varsa, maliyyə
              tarixçəsini qorumaq üçün layihə fiziki silinməyəcək, avtomatik{' '}
              <strong>PASSIV (Arxiv)</strong> ediləcək.
            </span>
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {deleting ? 'İcra edilir...' : 'Təsdiqlə'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Add Material (POST /projects/:projectId/materials) */}
      <Modal
        open={matModalOpen}
        onClose={() => setMatModalOpen(false)}
        title="Obyektə Yeni Material Xərci Əlavə Et"
        subtitle="Cəm məbləğ avtomatik hesablanıb layihə maya dəyərinə əlavə olunur"
        size="sm"
      >
        <form onSubmit={handleAddMaterial} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Materialın Adı və Qablaşdırma *
            </label>
            <input
              type="text"
              required
              value={matForm.item_name}
              onChange={(e) => setMatForm({ ...matForm, item_name: e.target.value })}
              placeholder="Məs: Texnoelast EPP Tol (Rulon 10m²)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Miqdar *</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                value={matForm.quantity}
                onChange={(e) => setMatForm({ ...matForm, quantity: e.target.value })}
                placeholder="30"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vahid Qiyməti (₼) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                value={matForm.unit_cost}
                onChange={(e) => setMatForm({ ...matForm, unit_cost: e.target.value })}
                placeholder="65.00"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-900">Hesablanan cəm xərc:</span>
            <span className="font-extrabold text-indigo-700 text-base tabular-nums">
              {formatAZN(materialLiveTotal)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setMatModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={matSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60"
            >
              {matSaving ? 'Əlavə edilir...' : 'Materialı Qeyd Et'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Manual Admin Override Daily Log (PATCH /daily-logs/:id) */}
      <Modal
        open={Boolean(overrideLog)}
        onClose={() => setOverrideLog(null)}
        title="Gündəlik Loqa Müdir Düzəlişi"
        subtitle="Bu düzəliş mərhələ faizini yeniləyir və Audit Jurnalına yazılır"
        size="md"
      >
        {overrideLog && (
          <form onSubmit={handleOverrideSubmit} className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex justify-between">
              <span>
                Tarix: <strong className="text-slate-900">{formatDateAZ(overrideLog.work_date)}</strong>
              </span>
              <span>
                Cari qeyd: <strong className="text-slate-900">{formatM2(overrideLog.done_m2)}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Düzəldilmiş Real Kvadratmetr (m²) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={overrideForm.done_m2}
                onChange={(e) => setOverrideForm({ ...overrideForm, done_m2: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material / Sahə Qeydi
              </label>
              <textarea
                rows={2}
                value={overrideForm.material_note}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, material_note: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideForm.is_below_norm}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, is_below_norm: e.target.checked })
                }
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              Normadan aşağı icra bayrağını işarələ
            </label>

            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">
                Düzəliş Səbəbi (Audit üçün məcburi, min. 10 simvol) *
              </label>
              <textarea
                rows={3}
                required
                minLength={10}
                value={overrideForm.admin_correction_reason}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, admin_correction_reason: e.target.value })
                }
                placeholder="Məs: Usta texniki səhv edərək 150 m² artıq yazmışdı, kamera fotosu ilə tutuşduruldu..."
                className="w-full rounded-xl border border-amber-300 px-3.5 py-2 text-sm focus:border-amber-500 outline-none"
              />
              <div className="text-[11px] text-slate-500 mt-1 text-right">
                {overrideForm.admin_correction_reason.trim().length} / 10 simvol
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideLog(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={overrideSaving}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60"
              >
                {overrideSaving ? 'Yenilənir...' : 'Düzəlişi Təsdiqlə'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Lightbox Modal for Camera Photos */}
      <Modal
        open={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        title={lightboxImage?.title || 'Sahə Fotosu'}
        size="xl"
      >
        {lightboxImage && (
          <img
            src={lightboxImage.url}
            alt={lightboxImage.title}
            className="w-full rounded-xl border border-slate-200"
          />
        )}
      </Modal>
    </div>
  );
};
