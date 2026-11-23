import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ApiError } from '../types/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ phone: phone.trim(), password });
      toast.success('Sistemə uğurla daxil oldunuz.');
      navigate('/admin', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr?.message ||
          'Serverlə əlaqə yaradıla bilmədi. Zəhmət olmasa yenidən cəhd edin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 p-8 sm:p-12 lg:p-16 flex flex-col justify-between text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-900/40">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-display font-extrabold text-xl tracking-tight">
              OXŞAR İNŞAAT
            </div>
            <div className="text-xs font-medium text-sky-300">
              Hidroizolyasiya və Dam Örtükləri
            </div>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/25 text-sky-300 text-xs font-semibold mb-5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Müdir Portalı — Komanda Mərkəzi
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            Hər layihə, hər m² və hər manat canlı nəzarətdə.
          </h1>
          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-lg leading-relaxed">
            5 dəqiqəlik avtomatik təklif və Magic-Link generatoru, usta briqadalarının
            gündəlik canlı kamera hesabatları, avans pulqabısı və real vaxtlı xalis mənfəət
            analitikası.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800/80 max-w-lg">
            <div>
              <div className="text-xl font-extrabold text-sky-400 tabular-nums">3 Portal</div>
              <div className="text-xs text-slate-400 mt-0.5">Müdir • Usta • Müştəri</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-emerald-400 tabular-nums">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Foto-video audit izi</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-amber-400 tabular-nums">UTC+4</div>
              <div className="text-xs text-slate-400 mt-0.5">Asia/Baku sinxron</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © 2026 Oxşar İnşaat • Müdir Portalı
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-7 sm:p-9">
          <div className="mb-7">
            <h2 className="font-display text-2xl font-extrabold text-slate-900">
              Müdir Girişi
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              İdarəetmə panelinə daxil olmaq üçün telefon nömrəsi və şifrənizi yazın.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Telefon Nömrəsi
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="0500000000 və ya +994501234567"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Şifrə
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-11 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Şifrəni göstər"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-sky-600/25 transition-all"
            >
              <span>{submitting ? 'Yoxlanılır...' : 'Müdir Panelinə Daxil Ol'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
