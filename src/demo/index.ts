import {
  demoPharmacySettings,
  demoUsers,
  demoSuppliers,
  demoCategories
} from './demoDataPart1';
import { demoMedicines } from './demoDataMedicines';
import { demoCustomers } from './demoDataCustomers';
import { demoSales } from './demoDataSales';
import { demoPurchases } from './demoDataPurchases';
import { demoExpenses } from './demoDataExpenses';
import { demoPrescriptions } from './demoDataPrescriptions';
import { demoAuditLogs } from './demoDataAuditLogs';
import {
  DEMO_MODE_ENABLED,
  DEMO_STORAGE_PREFIX,
  DEMO_MODE_STORAGE_KEY,
  DEMO_TENANT_ID,
  isDemoModeActive,
  setDemoModeActive
} from './demoConfig';

export {
  demoPharmacySettings,
  demoUsers,
  demoSuppliers,
  demoCategories,
  demoMedicines,
  demoCustomers,
  demoSales,
  demoPurchases,
  demoExpenses,
  demoPrescriptions,
  demoAuditLogs,
  DEMO_MODE_ENABLED,
  DEMO_STORAGE_PREFIX,
  DEMO_MODE_STORAGE_KEY,
  DEMO_TENANT_ID,
  isDemoModeActive,
  setDemoModeActive
};

/**
 * Resets all demo tables in localStorage to pristine fictional presentation state.
 */
export const resetDemoStorage = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'settings', JSON.stringify(demoPharmacySettings));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'categories', JSON.stringify(demoCategories));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'suppliers', JSON.stringify(demoSuppliers));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'customers', JSON.stringify(demoCustomers));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'medicines', JSON.stringify(demoMedicines));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'sales', JSON.stringify(demoSales));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'purchases', JSON.stringify(demoPurchases));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'prescriptions', JSON.stringify(demoPrescriptions));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'expenses', JSON.stringify(demoExpenses));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'users', JSON.stringify(demoUsers));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'auditLogs', JSON.stringify(demoAuditLogs));
    localStorage.setItem(DEMO_STORAGE_PREFIX + 'currentUser', JSON.stringify(demoUsers[0])); // John Mensah (Owner)
  } catch (e) {
    console.error('Error resetting demo storage:', e);
  }
};

/**
 * Completely purges all demo keys from storage (for commercial launch or disabling demo mode).
 */
export const purgeDemoStorage = (): void => {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(DEMO_STORAGE_PREFIX) || key === DEMO_MODE_STORAGE_KEY)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
};
