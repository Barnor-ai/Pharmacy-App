import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  ShieldAlert,
  Lock,
  LogOut,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Globe,
  Loader2,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const SecuritySettings: React.FC = () => {
  const { currentUser, updatePassword, logout, organizationId, addAuditLog } = usePharmacy();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Session metadata
  const [sessionInfo, setSessionInfo] = useState<{
    email?: string;
    userId?: string;
    createdAt?: string;
    lastSignInAt?: string;
    authProvider?: string;
    sessionExpiresAt?: string;
  }>({});

  useEffect(() => {
    async function loadSessionInfo() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionInfo({
            email: session.user.email,
            userId: session.user.id,
            createdAt: session.user.created_at,
            lastSignInAt: session.user.last_sign_in_at,
            authProvider: session.user.app_metadata?.provider || 'email/password',
            sessionExpiresAt: session.expires_at
              ? new Date(session.expires_at * 1000).toLocaleString()
              : undefined
          });
        }
      } catch (err) {
        console.warn('Error reading session data:', err);
      }
    }
    loadSessionInfo();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        addAuditLog('Password Changed', 'Security', `User ${currentUser.email} updated account password`);
        setTimeout(() => setPasswordSuccess(null), 4000);
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOutCurrent = async () => {
    await logout();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Security & Authentication Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your account credentials, active sessions, and multi-tenant authorization security
        </p>
      </div>

      {/* Password Management Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Change Account Password
          </h3>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Active Session & Device Security Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Current Session & Authentication Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authenticated Email</span>
            </div>
            <p className="font-mono font-bold text-slate-900 dark:text-white truncate">
              {currentUser.email || sessionInfo.email || 'guest@pharmacy.local'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authentication Provider</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white">
              {sessionInfo.authProvider || 'Cloud Authentication (JWT)'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Last Signed In</span>
            </div>
            <p className="font-mono text-slate-900 dark:text-white">
              {sessionInfo.lastSignInAt
                ? new Date(sessionInfo.lastSignInAt).toLocaleString()
                : 'Active Session'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span>Session Expiration</span>
            </div>
            <p className="font-mono text-slate-900 dark:text-white">
              {sessionInfo.sessionExpiresAt || 'Auto-refreshed securely via Cloud Session'}
            </p>
          </div>
        </div>

        {/* Sign Out Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Sign Out from Session</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Terminates your active JWT token and clears credentials
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOutCurrent}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 font-bold text-xs flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Current Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
