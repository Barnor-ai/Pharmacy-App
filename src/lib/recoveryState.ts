/**
 * recoveryState.ts
 *
 * Captures and coordinates the Supabase Password Recovery state synchronously
 * BEFORE any library (including @supabase/supabase-js) can clear window.location.hash.
 *
 * Ensures that password recovery requests have the absolute highest priority in the
 * application and cannot be bypassed by normal authenticated session redirects.
 */

interface RecoveryDetails {
  isRecovery: boolean;
  hasError: boolean;
  errorCode: string | null;
  errorDescription: string | null;
  accessToken: string | null;
  type: string | null;
}

const STORAGE_KEY = 'sb_password_recovery_active';

let inMemoryRecoveryActive = false;
let recoveryDetails: RecoveryDetails = {
  isRecovery: false,
  hasError: false,
  errorCode: null,
  errorDescription: null,
  accessToken: null,
  type: null
};

const listeners = new Set<(isRecovery: boolean) => void>();

// Synchronously inspect window.location upon script evaluation
if (typeof window !== 'undefined') {
  try {
    const hash = window.location.hash ? (window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash) : '';
    const search = window.location.search ? (window.location.search.startsWith('?') ? window.location.search.slice(1) : window.location.search) : '';
    const pathname = window.location.pathname || '';

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

    const hasExplicitRecovery =
      type === 'recovery' ||
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      pathname === '/reset-password' ||
      (Boolean(code || token) && (pathname.includes('reset') || pathname.includes('recovery')));

    const hasError = Boolean(errorCode || error || errorDescription);
    const storedState = sessionStorage.getItem(STORAGE_KEY) === 'true';

    const isRecovery = hasExplicitRecovery || storedState;

    recoveryDetails = {
      isRecovery,
      hasError,
      errorCode: errorCode || error,
      errorDescription,
      accessToken,
      type
    };

    if (isRecovery) {
      inMemoryRecoveryActive = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {}

      // If the email link landed on '/' or another path, replace URL to '/reset-password'
      // while PRESERVING the hash so Supabase createClient can still process tokens!
      if (pathname !== '/reset-password') {
        const preservedHash = window.location.hash || '';
        const preservedSearch = window.location.search || '';
        window.history.replaceState(null, '', `/reset-password${preservedSearch}${preservedHash}`);
      }
    }
  } catch (err) {
    console.warn('[recoveryState] Error parsing initial recovery state:', err);
  }
}

/**
 * Returns whether password recovery mode is currently active
 */
export function isRecoveryModeActive(): boolean {
  if (inMemoryRecoveryActive) return true;
  if (typeof window !== 'undefined') {
    if (window.location.pathname === '/reset-password') return true;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === 'true') return true;
    } catch {}
  }
  return false;
}

/**
 * Update password recovery active status and notify subscribers
 */
export function markRecoveryMode(active: boolean, details?: Partial<RecoveryDetails>): void {
  inMemoryRecoveryActive = active;
  if (details) {
    recoveryDetails = { ...recoveryDetails, ...details };
  }

  if (typeof window !== 'undefined') {
    try {
      if (active) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  listeners.forEach((fn) => {
    try {
      fn(active);
    } catch (err) {
      console.error('[recoveryState] Listener error:', err);
    }
  });
}

/**
 * Get the initial parsed recovery details
 */
export function getInitialRecoveryDetails(): RecoveryDetails {
  return recoveryDetails;
}

/**
 * Subscribe to recovery mode state changes
 */
export function subscribeToRecoveryState(callback: (isRecovery: boolean) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
