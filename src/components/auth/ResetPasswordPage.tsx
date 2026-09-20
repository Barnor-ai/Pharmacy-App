import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  ArrowLeft,
  Check
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { supabase } from '../../lib/supabase';
import { parseRecoveryUrlParams, signOutSupabase, getCachedRecoveryIntent } from '../../lib/authService';
import { markRecoveryMode } from '../../lib/recoveryState';

interface ResetPasswordPageProps {
  onSwitchToLogin?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSwitchToLogin,
  onSwitchToForgotPassword
}) => {
  const { updatePassword, setIsPasswordRecovery, isPasswordRecovery, navigate } = usePharmacy();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'invalid' | 'success'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Verify Recovery Session & Parse URL errors on mount
  useEffect(() => {
    let mounted = true;

    const verifyRecoverySession = async () => {
      try {
        const cachedIntent = getCachedRecoveryIntent();
        const urlParams = parseRecoveryUrlParams();

        // Check if Supabase returned an explicit error parameter in hash/query (e.g. otp_expired, access_denied)
        if (cachedIntent.hasError || urlParams.hasError) {
          if (mounted) {
            setSessionStatus('invalid');
            setErrorMessage(
              cachedIntent.errorDescription ||
              urlParams.errorDescription ||
              'This password reset link is invalid or has expired. Please request a new password reset link.'
            );
          }
          return;
        }

        // If a PKCE 'code' query parameter is present (Supabase auth code exchange),
        // exchange it for a session so updateUser can execute with auth context
        if (typeof window !== 'undefined' && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const authCode = params.get('code');
          if (authCode) {
            try {
              await supabase.auth.exchangeCodeForSession(authCode);
            } catch (exchangeErr) {
              console.warn('[ResetPasswordPage] Code exchange error (may already be exchanged):', exchangeErr);
            }
          }
        }

        // Check for active Supabase recovery session
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user || isPasswordRecovery || cachedIntent.isRecovery || urlParams.isRecovery) {
          setSessionStatus('valid');
        } else {
          // If no session exists and no recovery tokens are found, mark as invalid
          setSessionStatus('invalid');
          setErrorMessage(
            'This password reset link is invalid or has expired. Please request a new password reset link.'
          );
        }
      } catch (err: any) {
        if (mounted) {
          setSessionStatus('invalid');
          setErrorMessage(err?.message || 'Unable to verify password reset link.');
        }
      }
    };

    verifyRecoverySession();

    return () => {
      mounted = false;
    };
  }, [isPasswordRecovery]);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch && password.trim().length > 0;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      // Direct Supabase password update using established recovery session
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        let friendlyMsg = error.message;
        if (error.message.includes('same as the old password') || error.message.includes('different from the old')) {
          friendlyMsg = 'New password should be different from your previous password.';
        } else if (error.message.includes('Password should be at least')) {
          friendlyMsg = 'Password must be at least 8 characters in length.';
        }
        setErrorMessage(friendlyMsg);
      } else {
        // Clear inputs immediately
        setPassword('');
        setConfirmPassword('');
        setSessionStatus('success');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while updating your password.');
    } finally {
      setLoading(false);
    }
  };

  // Handler to safely finalize recovery and go to login
  const handleContinueToLogin = async () => {
    markRecoveryMode(false);
    try {
      await signOutSupabase();
    } catch {
      // Ignore signout error
    }
    setIsPasswordRecovery(false);

    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else if (navigate) {
      navigate('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Handler to request a new link
  const handleRequestNewLink = async () => {
    markRecoveryMode(false);
    try {
      await signOutSupabase();
    } catch {
      // Ignore
    }
    setIsPasswordRecovery(false);

    if (onSwitchToForgotPassword) {
      onSwitchToForgotPassword();
    } else if (navigate) {
      navigate('/forgot-password');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/forgot-password';
    }
  };

  // ----------------------------------------------------
  // Render State 1: Checking recovery session
  // ----------------------------------------------------
  if (sessionStatus === 'checking') {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">Verifying Recovery Link</h4>
          <p className="text-xs text-slate-400">Authenticating your password recovery session...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render State 2: Success State (Password successfully updated)
  // ----------------------------------------------------
  if (sessionStatus === 'success') {
    return (
      <div className="space-y-6 py-2 animate-in fade-in duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-950/50 shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Password Updated!</h2>
            <p className="text-xs text-emerald-400 font-medium mt-0.5">
              Secure Credentials Saved
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-100 text-xs space-y-2">
          <p className="font-bold text-emerald-300 text-sm">
            Your password has been updated successfully.
          </p>
          <p className="text-emerald-200/80 text-xs leading-relaxed">
            Your account credentials have been updated in Supabase Authentication. Please continue to sign in with your new password to access your pharmacy enterprise workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleContinueToLogin}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
        >
          <span>Continue to Login</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render State 3: Invalid / Expired / Missing Link Error State
  // ----------------------------------------------------
  if (sessionStatus === 'invalid') {
    return (
      <div className="space-y-6 py-2 animate-in fade-in duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shadow-xl shadow-rose-950/50 shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Reset Link Expired</h2>
            <p className="text-xs text-rose-400 font-medium mt-0.5">
              Password Recovery Error
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs space-y-2 leading-relaxed">
          <p className="font-bold text-rose-300 text-xs">
            {errorMessage || 'This password reset link is invalid or has expired. Please request a new password reset link.'}
          </p>
          <p className="text-rose-200/80 text-[11px]">
            Password recovery links can only be used once and expire for security reasons. You can generate a fresh reset link below.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRequestNewLink}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Request New Reset Link</span>
          </button>

          <button
            type="button"
            onClick={handleContinueToLogin}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render State 4: Valid Recovery Session (Active Form)
  // ----------------------------------------------------
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shadow-lg shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Reset Your Password</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter and confirm your new secure pharmacy password below.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 shadow-md animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            New Password <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              autoComplete="new-password"
              placeholder="Enter new password (min. 8 characters)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Confirm New Password <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-medium"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Password Requirements Checklist */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <p className="text-[11px] font-bold text-slate-400">Password Security Requirements:</p>
          <div className="space-y-1.5 text-xs">
            <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hasMinLength ? <Check className="w-3 h-3" /> : '•'}
              </div>
              <span className="text-[11px] font-medium">Minimum 8 characters in length</span>
            </div>

            <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {passwordsMatch ? <Check className="w-3 h-3" /> : '•'}
              </div>
              <span className="text-[11px] font-medium">New password and confirmation must match</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Return to Sign In Option */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleContinueToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel and Return to Sign In</span>
        </button>
      </div>
    </div>
  );
};
