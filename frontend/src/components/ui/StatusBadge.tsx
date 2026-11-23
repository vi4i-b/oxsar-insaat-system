import React from 'react';
import type { ProjectStatus, StaffRole, SupplyType } from '../../types/api';
import {
  PROJECT_STATUS_META,
  SUPPLY_TYPE_LABELS,
  WORKER_ROLE_LABELS,
} from '../../utils/formatters';

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const meta = PROJECT_STATUS_META[status] ?? PROJECT_STATUS_META.GOZLEMEDE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export const WorkerRoleBadge: React.FC<{ role: StaffRole }> = ({ role }) => {
  const styles =
    role === 'USTA'
      ? 'bg-sky-50 text-sky-800 border-sky-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${styles}`}
    >
      {WORKER_ROLE_LABELS[role]}
    </span>
  );
};

export const SupplyTypeBadge: React.FC<{ supplyType: SupplyType }> = ({ supplyType }) => {
  const styles =
    supplyType === 'MATERIALLI'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styles}`}
    >
      {SUPPLY_TYPE_LABELS[supplyType]}
    </span>
  );
};
