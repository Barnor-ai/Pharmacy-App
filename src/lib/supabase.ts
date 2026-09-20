import { createClient } from '@supabase/supabase-js';
import { isRecoveryModeActive, markRecoveryMode } from './recoveryState';

const metaEnv = (import.meta as any).env || {};

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip surrounding quotes if present
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  // Strip any trailing PostgREST or Auth path fragments and trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/auth\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const RAW_SUPABASE_URL =
  metaEnv.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://oenzgttwkhepavbkcacj.supabase.co';

const SUPABASE_URL = sanitizeSupabaseUrl(RAW_SUPABASE_URL) || 'https://oenzgttwkhepavbkcacj.supabase.co';

const SUPABASE_ANON_KEY =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbnpndHR3a2hlcGF2YmtjYWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDg3MTIsImV4cCI6MjEwMjIyNDcxMn0.kcKn419KctlwijIJ0CeLcVKWYnM8dy0ec1cDsvSUByQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Synchronously register an early auth listener so events like PASSWORD_RECOVERY
// dispatched during GoTrueClient's initialize() are never dropped
supabase.auth.onAuthStateChange((event, session) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentHref = typeof window !== 'undefined' ? window.location.href : '';
  console.log('[Supabase Auth Early Core Event]:', {
    event,
    userId: session?.user?.id,
    email: session?.user?.email,
    currentPath,
    currentHref,
    recoveryModeActive: isRecoveryModeActive()
  });

  if (event === 'PASSWORD_RECOVERY') {
    console.log('[Supabase Auth] PASSWORD_RECOVERY event received! Activating recovery mode.');
    markRecoveryMode(true);
    if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
      window.history.replaceState(null, '', '/reset-password');
    }
  }
});

export async function checkSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Try fetching from a dummy or health endpoint
    const { data, error } = await supabase.from('medicines').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      // 42P01 is table does not exist yet in postgres, which is fine
      console.warn('Supabase ping check warning:', error);
      return { success: true, message: `Connected to Supabase (${SUPABASE_URL}). Table check: ${error.message}` };
    }
    return { success: true, message: 'Connected seamlessly to Supabase REST API!' };
  } catch (err: any) {
    console.error('Supabase connection error:', err);
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}
