import { supabase } from './supabase';
import { User, UserRole } from '../types';
import { isRecoveryModeActive, markRecoveryMode, getInitialRecoveryDetails } from './recoveryState';

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User | null;
}

/**
 * Format a Supabase Auth User into the Pharmacy App User model
 */
export function mapSupabaseUserToAppUser(sbUser: any): User {
  const metadata = sbUser.user_metadata || {};
  const email = sbUser.email || '';
  const name = metadata.name || metadata.full_name || email.split('@')[0] || 'User';
  const role: UserRole = (metadata.role as UserRole) || 'Super Admin';
  const phone = metadata.phone || sbUser.phone || '';

  return {
    id: sbUser.id,
    name,
    email,
    role,
    phone,
    status: 'Active',
    lastLogin: sbUser.last_sign_in_at || new Date().toISOString()
  };
}

/**
 * Sign in with email and password via Supabase Auth
 */
export async function signInWithSupabase(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Your email has not been confirmed yet. Please check your inbox for the confirmation link.';
      }
      return { success: false, message: friendlyMessage };
    }

    if (data?.user) {
      return {
        success: true,
        user: mapSupabaseUserToAppUser(data.user)
      };
    }

    return { success: false, message: 'Login failed. Please try again.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred during login.' };
  }
}

/**
 * Sign in with Google OAuth provider via Supabase Auth
 */
export async function signInWithGoogleOAuth(): Promise<{ success: boolean; message?: string }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin ? `${origin}/` : undefined
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to initialize Google authentication.' };
  }
}

/**
 * Sign up a new user with email, password, and metadata via Supabase Auth
 */
export async function signUpWithSupabase(
  email: string,
  password: string,
  name: string,
  phone?: string,
  role: UserRole = 'Super Admin'
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim(),
          phone: phone ? phone.trim() : '',
          role
        }
      }
    });

    if (error) {
      let friendlyMessage = error.message;
      if (error.message.includes('already registered')) {
        friendlyMessage = 'An account with this email address already exists. Please sign in instead.';
      } else if (error.message.includes('Password should be at least')) {
        friendlyMessage = 'Password must be at least 6 characters long.';
      }
      return { success: false, message: friendlyMessage };
    }

    if (data?.user) {
      return {
        success: true,
        user: mapSupabaseUserToAppUser(data.user),
        message: data.session ? 'Registration successful!' : 'Registration successful! Please check your email to confirm your account if required.'
      };
    }

    return { success: false, message: 'Sign up failed. Please try again.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error occurred during sign up.' };
  }
}

/**
 * Determine the accurate, non-hardcoded redirect URL for Supabase password recovery
 */
export function getResetPasswordRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/reset-password`;
  }
  return 'https://pharmacymgtsys.netlify.app/reset-password';
}

/**
 * Parse URL hash and search query parameters to detect Supabase Auth recovery tokens or error states
 */
export function parseRecoveryUrlParams(): {
  isRecovery: boolean;
  hasError: boolean;
  errorCode: string | null;
  errorDescription: string | null;
  accessToken: string | null;
  type: string | null;
} {
  const initial = getInitialRecoveryDetails();
  if (initial.isRecovery || initial.hasError) {
    return initial;
  }

  if (typeof window === 'undefined') {
    return initial;
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const search = window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search;

  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(search);

  const type = hashParams.get('type') || searchParams.get('type');
  const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
  const error = hashParams.get('error') || searchParams.get('error');
  const rawErrorDesc = hashParams.get('error_description') || searchParams.get('error_description');
  const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
  const code = hashParams.get('code') || searchParams.get('code');
  const token = hashParams.get('token') || searchParams.get('token');

  let errorDescription: string | null = null;
  if (rawErrorDesc) {
    try {
      errorDescription = decodeURIComponent(rawErrorDesc.replace(/\+/g, ' '));
    } catch {
      errorDescription = rawErrorDesc;
    }
  }

  const isRecovery =
    isRecoveryModeActive() ||
    type === 'recovery' ||
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    window.location.pathname === '/reset-password' ||
    (Boolean(code || token) && (window.location.pathname.includes('reset') || window.location.pathname.includes('recovery')));

  const hasError = !!(errorCode || error || errorDescription);

  return {
    isRecovery,
    hasError,
    errorCode: errorCode || error,
    errorDescription,
    accessToken,
    type
  };
}

export function getCachedRecoveryIntent() {
  const details = getInitialRecoveryDetails();
  return {
    isRecovery: details.isRecovery || isRecoveryModeActive(),
    hasError: details.hasError,
    errorCode: details.errorCode,
    errorDescription: details.errorDescription
  };
}

export function setCachedRecoveryIntent(isRecovery: boolean, hasError = false, errorDescription: string | null = null) {
  markRecoveryMode(isRecovery, { hasError, errorDescription });
}

/**
 * Send password reset email via Supabase Auth
 */
export async function sendPasswordResetEmail(email: string): Promise<AuthResponse> {
  try {
    const redirectUrl = getResetPasswordRedirectUrl();
    console.log('[Supabase Auth] Dispatching resetPasswordForEmail with redirectTo:', redirectUrl);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl
    });

    if (error) {
      let friendlyMsg = error.message;
      if (error.message.includes('rate limit')) {
        friendlyMsg = 'Too many password reset requests. Please wait a few minutes before trying again.';
      }
      return { success: false, message: friendlyMsg };
    }

    return {
      success: true,
      message: 'Password reset link sent! Please check your email inbox for instructions.'
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send password reset email.' };
  }
}

/**
 * Update the user password (e.g. during recovery / reset flow)
 */
export async function updateSupabasePassword(newPassword: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      let friendlyMsg = error.message;
      if (error.message.includes('same as the old password') || error.message.includes('different from the old')) {
        friendlyMsg = 'New password should be different from your previous password.';
      } else if (error.message.includes('Password should be at least')) {
        friendlyMsg = 'Password must be at least 8 characters in length.';
      }
      return { success: false, message: friendlyMsg };
    }

    return {
      success: true,
      user: data?.user ? mapSupabaseUserToAppUser(data.user) : null,
      message: 'Your password has been updated successfully.'
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update password.' };
  }
}

/**
 * Sign out the currently authenticated user
 */
export async function signOutSupabase(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to sign out.' };
  }
}
