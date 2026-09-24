import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Cross, ShieldCheck } from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { signInWithGoogleOAuth } from '../../lib/authService';

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
}

/**
 * Official Google multi-color "G" icon
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.28 21.44 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.28 2.56 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({
  onSwitchToSignUp,
  onSwitchToForgotPassword
}) => {
  const { login, settings } = usePharmacy();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(trimmedEmail, password);
      if (!res.success) {
        setError(res.message || 'Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogleOAuth();
      if (!res.success) {
        setError(res.message || 'Google sign-in could not be initiated.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-900 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Clean white login panel (~50% width on desktop)              */}
      {/* ========================================================================= */}
      <div className="w-full md:w-1/2 lg:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16">
        
        {/* Top-Left: Pharmacy Application's Existing Logo and Brand Name */}
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-600/25 shrink-0 overflow-hidden">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.pharmacyName || 'Pharmacy Logo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Cross className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-slate-900 text-base leading-snug tracking-tight block truncate">
                {settings?.pharmacyName || 'Pharmacy Management System'}
              </span>
              <span className="text-xs font-semibold text-teal-600 tracking-wide uppercase block">
                Healthcare Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Center: Login Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Header Typography */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-normal">
              Sign in to manage your pharmacy
            </p>
          </div>

          {/* Authentication Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Address Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition shadow-xs bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition shadow-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-md"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs sm:text-sm font-semibold text-teal-600 hover:text-teal-700 transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Login Account Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm sm:text-base shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login account</span>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-1 text-xs sm:text-sm text-slate-500">
              Don&apos;t you have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="font-bold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer transition"
              >
                Sign up
              </button>
            </div>

            {/* OR Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase text-slate-400 tracking-wider">
                <span className="bg-white px-3">OR</span>
              </div>
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition shadow-xs hover:border-slate-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Trust & Compliance Indicator */}
        <div className="w-full pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-teal-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>256-bit Encrypted Healthcare Session</span>
          </div>
          <span>© {new Date().getFullYear()} {settings?.pharmacyName || 'Pharmacy Management System'}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Healthcare/Pharmacy Visual Area (~50% width on desktop)     */}
      {/* ========================================================================= */}
      <div className="hidden md:flex md:w-1/2 lg:w-1/2 relative overflow-hidden bg-slate-900 flex-col justify-between p-8 lg:p-12 xl:p-16">
        {/* High-quality modern pharmacy / pharmacist photograph */}
        <img
          src="https://images.unsplash.com/photo-1631558563363-c5980145078b?auto=format&fit=crop&w=1600&q=85"
          alt="Modern Pharmacy Healthcare Professional"
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
          loading="eager"
          onError={(e) => {
            // High reliability fallback image if primary is unavailable
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1600&q=85';
          }}
        />

        {/* Soft natural gradient overlay to blend seamlessly with page */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-slate-900/10 pointer-events-none" />

        {/* Top-Right Badge: Live Status */}
        <div className="relative z-10 flex justify-end">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-800 text-xs font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Enterprise Pharmacy Cloud</span>
          </div>
        </div>

        {/* Bottom Healthcare Highlight Card */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="bg-slate-900/85 backdrop-blur-md border border-white/15 rounded-2xl p-6 text-white shadow-2xl space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs font-bold text-white ml-2">Certified Clinical Standard</span>
            </div>
            
            <p className="text-sm font-medium text-slate-100 leading-relaxed">
              &ldquo;Intelligent stock tracking, automated patient dosage reminders, and instant POS dispensing engineered for modern healthcare facilities.&rdquo;
            </p>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-white">Trusted by 2,500+ Licensed Clinics</span>
              <span className="text-teal-400 font-medium">HIPAA & GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
