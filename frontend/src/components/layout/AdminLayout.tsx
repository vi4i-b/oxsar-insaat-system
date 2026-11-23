import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Layers,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Banknote,
  Plus,
  Droplets,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QuickAdvanceModal } from '../modals/QuickAdvanceModal';

const NAV_ITEMS = [
  { to: '/admin', label: 'Analitika & Xülasə', shortLabel: 'Analitika', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Layihələr və Təkliflər', shortLabel: 'Layihələr', icon: Building2, end: false },
  { to: '/admin/workers', label: 'İşçilər, Avans və Maaş', shortLabel: 'İşçilər', icon: Users, end: false },
  { to: '/admin/work-types', label: 'İş Növləri & Normalar', shortLabel: 'Normalar', icon: Layers, end: false },
  { to: '/admin/audit-logs', label: 'Audit Jurnalı', shortLabel: 'Audit', icon: ShieldCheck, end: false },
];

export const AdminLayout: React.FC = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-900/50">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-extrabold text-base tracking-tight text-white leading-tight">
              OXŞAR İNŞAAT
            </div>
            <div className="text-[11px] font-medium text-sky-400">
              Müdir Portalı • /admin
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          İdarəetmə Bölmələri
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Quick Actions inside sidebar */}
        <div className="pt-5 mt-5 border-t border-slate-800/80 space-y-2">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Sürətli Əməliyyatlar
          </div>
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              setAdvanceModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-sm font-semibold transition-colors"
          >
            <Banknote className="w-4 h-4" />
            + Avans Ver (20–25 ₼)
          </button>
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate('/admin/projects?new=1');
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Yeni Təklif Yarat
          </button>
        </div>
      </nav>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {admin?.full_name || 'Müdir'}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {admin?.phone || ''}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Çıxış"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-68 shrink-0 sticky top-0 h-screen border-r border-slate-800 no-print">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Menyu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 hidden sm:block">
                {admin?.company?.field || 'Hidroizolyasiya və Dam Örtükləri'} •{' '}
                {admin?.company?.timezone || 'Asia/Baku'}
              </div>
              <div className="text-sm font-bold text-slate-900 truncate sm:hidden">
                Oxşar İnşaat
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs sm:text-sm font-bold transition-colors"
            >
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>+ Avans Ver</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/projects?new=1')}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Təklif</span>
              <span className="sm:hidden">Təklif</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Quick Nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-5 gap-1 no-print">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-sky-600 bg-sky-50' : 'text-slate-500'
                  }`
                }
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-full px-1">{item.shortLabel}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <QuickAdvanceModal
        open={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
      />
    </div>
  );
};
