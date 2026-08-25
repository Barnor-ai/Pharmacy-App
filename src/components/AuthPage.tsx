import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Cross, CheckCircle2, Lock } from 'lucide-react';
import { LoginPage } from './auth/LoginPage';
import { SignUpPage } from './auth/SignUpPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { ResetPasswordPage } from './auth/ResetPasswordPage';

export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export const AuthPage: React.FC = () => {
  const { isPasswordRecovery } = usePharmacy();
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('reset-password');
    }
  }, [isPasswordRecovery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Side: Brand Hero & Value Highlights */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-950 p-8 flex flex-col justify-between text-white relative">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-500/30 shrink-0">
                <Cross className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-tight">
                  Pharmacy Enterprise Management System
                </h1>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-2xl font-extrabold leading-snug">
                Professional Pharmacy Management & POS
              </h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Securely manage your drug catalog, POS checkout, patient prescriptions, supplier orders, and financial analytics.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {[
                'Encrypted Email & Password Security',
                'Real-Time POS Barcode Sales & Invoicing',
                'Patient Allergy Alerts & Prescription Verification',
                'Drug Expiry & Low Stock Warning Trackers',
                'Multi-Currency Financial Ledger & Reports'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-emerald-800/60 mt-8 flex items-center justify-between text-[11px] text-emerald-300/70">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enterprise Cloud Protected</span>
            </span>
            <span>© {new Date().getFullYear()} Pharmacy Enterprise Management System</span>
          </div>
        </div>

        {/* Right Side: Form Subcomponents */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-slate-900">
          {/* Top Switcher Tabs for Login / Sign Up */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex rounded-xl bg-slate-800/80 p-1 mb-6 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Render Active Auth Subcomponent */}
          {mode === 'login' && (
            <LoginPage
              onSwitchToSignUp={() => setMode('signup')}
              onSwitchToForgotPassword={() => setMode('forgot-password')}
            />
          )}

          {mode === 'signup' && (
            <SignUpPage onSwitchToLogin={() => setMode('login')} />
          )}

          {mode === 'forgot-password' && (
            <ForgotPasswordPage onSwitchToLogin={() => setMode('login')} />
          )}

          {mode === 'reset-password' && <ResetPasswordPage />}
        </div>
      </div>
    </div>
  );
};
