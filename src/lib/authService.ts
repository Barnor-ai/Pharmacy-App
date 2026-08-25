import { supabase } from './supabase';
import { User, UserRole } from '../types';

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
 * Send password reset email via Supabase Auth
 */
export async function sendPasswordResetEmail(email: string): Promise<AuthResponse> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl
    });

    if (error) {
      return { success: false, message: error.message };
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
      return { success: false, message: error.message };
    }

    return {
      success: true,
      user: data?.user ? mapSupabaseUserToAppUser(data.user) : null,
      message: 'Password updated successfully!'
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
