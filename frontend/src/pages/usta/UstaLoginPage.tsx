import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Delete, ArrowRight, HardHat, Droplets, ShieldCheck } from 'lucide-react';
import { useUstaAuth } from '../../context/UstaAuthContext';
import { useToast } from '../../context/ToastContext';
import type { ApiError } from '../../types/api';

const LAST_USTA_PHONE_KEY = 'oxsar_usta_last_phone';
const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const UstaLoginPage: React.FC = () => {
  const { login } = useUstaAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState<string>(
    () => localStorage.getItem(LAST_USTA_PHONE_KEY) || ''
  );
  const [pin, setPin] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendDigit = (digit: string) => {
    if (pin.length >= 4 || submitting) return;
    setError(null);
    setPin((prev) => `${prev}${digit}`);
  };

  const removeLastDigit = () => {
    if (submitting) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanedPhone = phone.trim();
    if (!cleanedPhone) {
      setError('Telefon nömrənizi daxil edin.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('4 rəqəmli PIN kodu tam daxil edin.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ phone: cleanedPhone, pin });
      localStorage.setItem(LAST_USTA_PHONE_KEY, cleanedPhone);
      toast.success('Sahə portalına uğurla daxil oldunuz.');
      navigate('/usta', { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setPin('');
      setError(
        apiErr?.message ||
          'Telefon nömrəsi və ya PIN kod yanlışdır. Yenidən yoxlayın.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm mx-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg shadow-sky-900/50">
            <Droplets className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
              OXŞAR İNŞAAT
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-xs font-bold mt-1.5">
              <HardHat className="w-3.5 h-3.5" />
              İşçi (Usta) Sahə Portalı
            </div>
          </div>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Phone Input */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Telefon Nömrəniz
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="0507776655 və ya +994507776655"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none"
              />
            </div>
          </div>

          {/* 4-Digit PIN Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                4 Rəqəmli PIN Kod
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {pin.length} / 4
              </span>
            </div>

            {/* Hidden keyboard input for physical keyboard convenience */}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              aria-label="4 rəqəmli PIN kod"
              className="sr-only"
            />

            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < pin.length;
                return (
                  <div
                    key={idx}
                    className={`h-13 rounded-2xl border-2 flex items-center justify-center text-2xl font-extrabold transition-all ${
                      filled
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                    }`}
                  >
                    {filled ? '•' : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tactile On-Screen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {KEYPAD_DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendDigit(digit)}
                className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-sky-600 active:text-white text-slate-900 font-display text-xl font-extrabold transition-colors select-none"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPin('')}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-extrabold uppercase transition-colors select-none"
            >
              Təmizlə
            </button>

            <button
              type="button"
              onClick={() => appendDigit('0')}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-sky-600 active:text-white text-slate-900 font-display text-xl font-extrabold transition-colors select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={removeLastDigit}
              aria-label="Son rəqəmi sil"
              className="h-13 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || pin.length !== 4 || !phone.trim()}
            className="w-full py-3.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-45 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all"
          >
            <span>{submitting ? 'Yoxlanılır...' : 'Daxil Ol'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Link */}
      <div className="w-full max-w-sm mx-auto pt-6 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
          Yalnız qeydiyyatlı ustalar üçün • Fəhlələrə giriş tələb olunmur
        </div>
        <div>
          <Link
            to="/admin/login"
            className="text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
          >
            Müdir Portalına keçid →
          </Link>
        </div>
      </div>
    </div>
  );
};
