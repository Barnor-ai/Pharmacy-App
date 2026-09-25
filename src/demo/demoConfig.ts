/**
 * Commercial Launch Configuration for Demo Mode.
 * To disable or remove demo mode before commercial SaaS launch,
 * set DEMO_MODE_ENABLED to false or remove the demo module.
 */
export const DEMO_MODE_ENABLED = true;

export const DEMO_STORAGE_PREFIX = 'pharmasys_demo_v1_';
export const DEMO_MODE_STORAGE_KEY = 'pharmasys_demo_mode_active';
export const DEMO_TENANT_ID = 'demo-healthplus-ghana-org';

export const isDemoModeActive = (): boolean => {
  if (!DEMO_MODE_ENABLED || typeof window === 'undefined') return false;
  const stored = localStorage.getItem(DEMO_MODE_STORAGE_KEY);
  // Default to true for presentation environment unless explicitly turned off
  return stored !== 'false';
};

export const setDemoModeActive = (active: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_STORAGE_KEY, active ? 'true' : 'false');
};
