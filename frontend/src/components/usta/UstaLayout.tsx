import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HardHat, Wallet, LogOut, Droplets } from 'lucide-react';
import { useUstaAuth } from '../../context/UstaAuthContext';
import { formatDateAZ, getBakuToday } from '../../utils/formatters';

export const UstaLayout: React.FC = () => {
  const { usta, logout } = useUstaAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/usta/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shrink-0 shadow-inner">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-sm tracking-tight text-white truncate">
                {usta?.full_name || 'Oxşar İnşaat — Usta'}
              </div>
              <div className="text-[11px] font-medium text-sky-400">
                Sahə Portalı • {formatDateAZ(getBakuToday())}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Hesabdan çıx"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/90 text-slate-200 hover:text-white text-xs font-bold transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıxış</span>
          </button>
        </div>
      </header>

      {/* Main Mobile Viewport Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-5 pb-24">
        <Outlet />
      </main>

      {/* Bottom 2-Button Field Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="max-w-lg mx-auto px-3 py-2 grid grid-cols-2 gap-2">
          <NavLink
            to="/usta"
            end
            className={({ isActive }) =>
              `flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <HardHat className="w-5 h-5" />
            <span>Sahə İcrası</span>
          </NavLink>

          <NavLink
            to="/usta/wallet"
            className={({ isActive }) =>
              `flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Wallet className="w-5 h-5" />
            <span>Mənim Hesabım</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
