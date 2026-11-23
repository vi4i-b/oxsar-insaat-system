import type { ProjectStatus, StaffRole, SupplyType } from '../types/api';

export function formatAZN(value: number | undefined | null): string {
  const num = Number(value ?? 0);
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₼`;
}

export function formatM2(value: number | undefined | null): string {
  const num = Number(value ?? 0);
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} m²`;
}

export function formatPercent(value: number | undefined | null): string {
  const num = Number(value ?? 0);
  return `${num.toFixed(1)}%`;
}

export function getBakuToday(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function getBakuIsoNow(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+04:00`;
}

export function formatDateAZ(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00+04:00`;
  const date = new Date(clean);
  if (Number.isNaN(date.getTime())) return dateStr;

  const months = [
    'Yan',
    'Fev',
    'Mar',
    'Apr',
    'May',
    'İyn',
    'İyl',
    'Avq',
    'Sen',
    'Okt',
    'Noy',
    'Dek',
  ];
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baku',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const monthIdx = Number(parts.find((p) => p.type === 'month')?.value ?? '1') - 1;
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day} ${months[monthIdx] ?? ''} ${year}`;
}

export function formatDateTimeAZ(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return isoStr;

  const datePart = formatDateAZ(isoStr);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baku',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${datePart}, ${timePart}`;
}

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  GOZLEMEDE: {
    label: 'Gözləmədə',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  AKTIV: {
    label: 'Aktiv',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    dot: 'bg-sky-500',
    border: 'border-sky-200',
  },
  DAYANDIRILIB: {
    label: 'Dayandırılıb',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
  },
  TAMAMLANDI: {
    label: 'Tamamlandı',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  PASSIV: {
    label: 'Passiv (Arxiv)',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
};

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  MATERIALLI: 'Materiallı',
  ISCILIK: 'Yalnız İşçilik',
};

export const WORKER_ROLE_LABELS: Record<StaffRole, string> = {
  USTA: 'Usta',
  FEHLE: 'Fəhlə',
};

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  projects: 'Layihələr',
  daily_logs: 'Gündəlik Hesabatlar',
  advances: 'Avanslar',
  workers: 'İşçilər',
  project_materials: 'Materiallar',
};

export function buildWhatsAppProposalUrl(params: {
  clientPhone: string;
  clientName: string;
  projectName: string;
  totalAmount: number;
  magicLinkUrl: string;
  warrantyYears: number;
}): string {
  const digits = params.clientPhone.replace(/[^\d]/g, '');
  const text = [
    `Salam hörmətli ${params.clientName}!`,
    `"Oxşar İnşaat" tərəfindən "${params.projectName}" obyekti üçün rəsmi təklif və canlı izləmə sənədi hazırdır.`,
    `• Ümumi məbləğ: ${formatAZN(params.totalAmount)}`,
    `• Rəsmi zəmanət: ${params.warrantyYears} il`,
    `Təkliflə tanış olmaq və təsdiqləmək üçün linkə keçid edin:`,
    params.magicLinkUrl,
  ].join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
