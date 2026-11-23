import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC<{ label?: string }> = ({
  label = 'Məlumatlar yüklənir...',
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
    <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
    <p className="text-sm font-medium">{label}</p>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-white rounded-2xl border border-dashed border-slate-300">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
      {icon}
    </div>
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
