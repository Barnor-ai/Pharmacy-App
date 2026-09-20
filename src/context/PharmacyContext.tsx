import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Medicine,
  Category,
  Supplier,
  Customer,
  Sale,
  Purchase,
  Prescription,
  Expense,
  User,
  AuditLog,
  PharmacySettings,
  NavigationTab,
  UserRole
} from '../types';
import {
  initialSettings,
  initialCategories,
  initialSuppliers,
  initialMedicines,
  initialCustomers,
  initialPrescriptions,
  initialSales,
  initialPurchases,
  initialExpenses,
  initialUsers,
  initialAuditLogs
} from '../data/initialData';
import {
  verifySupabaseConnection,
  resolveUserOrganization,
  ensureUUID,
  fetchMedicinesFromSupabase,
  fetchMedicineByIdFromSupabase,
  fetchCustomersFromSupabase,
  fetchSuppliersFromSupabase,
  fetchSalesFromSupabase,
  fetchSaleByIdFromSupabase,
  fetchPrescriptionsFromSupabase,
  fetchPrescriptionByIdFromSupabase,
  fetchExpensesFromSupabase,
  fetchAuditLogsFromSupabase,
  fetchOrganizationSettingsFromSupabase,
  mapSupabaseMedicine,
  mapSupabaseCustomer,
  mapSupabaseSupplier,
  mapSupabasePrescription,
  mapSupabaseExpense,
  mapSupabaseAuditLog,
  syncMedicineToSupabase,
  deleteMedicineFromSupabase,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  syncSupplierToSupabase,
  deleteSupplierFromSupabase,
  syncSaleToSupabase,
  syncPrescriptionToSupabase,
  syncExpenseToSupabase,
  deleteExpenseFromSupabase,
  syncAuditLogToSupabase,
  syncFullStateToSupabase,
  executeAtomicSaleTransaction,
  fetchVerifiedUserRole,
  SupabaseSyncStatus
} from '../lib/supabaseService';
import { supabase } from '../lib/supabase';
import { isRecoveryModeActive, markRecoveryMode, subscribeToRecoveryState } from '../lib/recoveryState';
import {
  signInWithSupabase,
  signUpWithSupabase,
  signOutSupabase,
  sendPasswordResetEmail,
  updateSupabasePassword,
  mapSupabaseUserToAppUser,
  parseRecoveryUrlParams,
  getCachedRecoveryIntent,
  setCachedRecoveryIntent
} from '../lib/authService';

interface PharmacyContextType {
  // Navigation & Route State
  currentRoute: string;
  navigate: (path: string, replace?: boolean) => void;

  // Supabase Backend Sync Status & Tenant
  supabaseStatus: SupabaseSyncStatus;
  organizationId: string | null;
  triggerSupabaseSync: () => Promise<void>;
  refreshFromSupabase: () => Promise<void>;

  // Theme & Navigation
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  
  // Supabase Authentication State & Actions
  isAuthenticated: boolean;
  authLoading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (isRecovery: boolean) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    role?: UserRole
  ) => Promise<{ success: boolean; message?: string; user?: User | null }>;
  logout: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;

  // Data Collections
  settings: PharmacySettings;
  updateSettings: (newSettings: Partial<PharmacySettings>) => void;
  
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'totalPurchased' | 'balanceOwed'>) => void;
  updateSupplier: (id: string, updated: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent'>) => void;
  updateCustomer: (id: string, updated: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  medicines: Medicine[];
  addMedicine: (medicine: Omit<Medicine, 'id' | 'status'>) => void;
  updateMedicine: (id: string, updated: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  adjustStock: (id: string, quantityDelta: number, reason: string) => void;

  sales: Sale[];
  completeSale: (saleData: Omit<Sale, 'id' | 'invoiceNo' | 'createdAt' | 'status'>) => Promise<Sale>;
  refundSale: (saleId: string) => void;

  purchases: Purchase[];
  addPurchaseOrder: (po: Omit<Purchase, 'id' | 'purchaseOrderNo' | 'deliveryStatus'>) => void;
  receivePurchaseOrder: (poId: string) => void;

  prescriptions: Prescription[];
  addPrescription: (rx: Omit<Prescription, 'id' | 'prescriptionNo' | 'createdAt' | 'status'>) => void;
  updatePrescriptionStatus: (id: string, status: Prescription['status'], notes?: string) => void;

  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUserStatus: (id: string, status: 'Active' | 'Inactive') => void;
  updateUserPassword: (id: string, newPassword: string) => void;
  deleteUser: (id: string) => void;
  resetDataStartAfresh: () => void;
  clearAllData: () => void;
  loadStarterCatalog: () => void;

  auditLogs: AuditLog[];
  addAuditLog: (action: string, module: string, details: string) => void;

  // Helpers
  getMedicineById: (id: string) => Medicine | undefined;
  getLowStockCount: () => number;
  getExpiringSoonCount: () => number;
  getExpiredCount: () => number;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const STORAGE_PREFIX = 'pharmasys_v1_';

export const PharmacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem(STORAGE_PREFIX + 'theme') as 'light' | 'dark') || 'light';
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Load persisted states or fall back to defaults
  const [settings, setSettings] = useState<PharmacySettings>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'categories');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'suppliers');
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'medicines');
    return saved ? JSON.parse(saved) : initialMedicines;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'sales');
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'purchases');
    return saved ? JSON.parse(saved) : initialPurchases;
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'prescriptions');
    return saved ? JSON.parse(saved) : initialPrescriptions;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'auditLogs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  // Route Navigation State
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (isRecoveryModeActive()) {
        return '/reset-password';
      }
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigate = useCallback((path: string, replace = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
      window.dispatchEvent(new Event('app-route-change'));
    }
    const clean = path.split('#')[0].split('?')[0] || '/';
    setCurrentRoute(clean);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      if (typeof window !== 'undefined') {
        setCurrentRoute(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('app-route-change', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('app-route-change', handleRouteChange);
    };
  }, []);

  // Supabase Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    return isRecoveryModeActive();
  });
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Sync with global recovery state emitter
  useEffect(() => {
    const unsub = subscribeToRecoveryState((active) => {
      setIsPasswordRecovery(active);
      if (active) {
        setIsAuthenticated(false);
        setCurrentRoute('/reset-password');
      }
    });
    return unsub;
  }, []);

  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-guest',
    name: 'Pharmacy Admin',
    email: '',
    role: 'Super Admin',
    status: 'Active'
  });

  // Supabase Backend Integration State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus>({
    connected: false,
    message: 'Initializing Supabase backend connection...',
    lastSyncedAt: null,
    syncing: false,
    organizationId: null
  });

  // Refresh authoritative data from Supabase for current tenant
  const loadTenantData = useCallback(async (orgId: string) => {
    try {
      const [dbMeds, dbCusts, dbSups, dbSales, dbRxs, dbExps, dbLogs, orgData] = await Promise.all([
        fetchMedicinesFromSupabase(orgId),
        fetchCustomersFromSupabase(orgId),
        fetchSuppliersFromSupabase(orgId),
        fetchSalesFromSupabase(orgId),
        fetchPrescriptionsFromSupabase(orgId),
        fetchExpensesFromSupabase(orgId),
        fetchAuditLogsFromSupabase(orgId),
        fetchOrganizationSettingsFromSupabase(orgId)
      ]);

      // Supabase PostgreSQL is the authoritative source of truth for the active tenant
      setMedicines(dbMeds);
      setCustomers(dbCusts);
      setSuppliers(dbSups);
      setSales(dbSales);
      setPrescriptions(dbRxs);
      setExpenses(dbExps);
      if (dbLogs.length > 0) {
        setAuditLogs(dbLogs);
      }

      if (orgData) {
        const currencySymbols: Record<string, string> = {
          USD: '$',
          EUR: '€',
          GBP: '£',
          GHS: 'GH₵',
          NGN: '₦',
          KES: 'KSh',
          ZAR: 'R',
          INR: '₹',
          CAD: '$',
          AUD: '$',
          AED: 'AED',
          SAR: 'SAR'
        };
        const currCode = orgData.currency || 'USD';
        setSettings(prev => ({
          ...prev,
          pharmacyName: orgData.name || prev.pharmacyName,
          phone: orgData.phone || prev.phone,
          email: orgData.email || prev.email,
          address: orgData.address || prev.address,
          website: orgData.website || prev.website,
          licenseNumber: orgData.license_number || prev.licenseNumber,
          vatNumber: orgData.vat_number || prev.vatNumber,
          currency: currCode,
          currencySymbol: currencySymbols[currCode] || prev.currencySymbol,
          timezone: orgData.timezone || prev.timezone,
          invoicePrefix: orgData.invoice_prefix || prev.invoicePrefix,
          receiptHeaderNotice: orgData.receipt_header_notice || prev.receiptHeaderNotice,
          receiptFooterNotice: orgData.receipt_footer_notice || prev.receiptFooterNotice,
          logoUrl: orgData.logo_url || prev.logoUrl,
          vatRate: orgData.tax_rate !== null && orgData.tax_rate !== undefined ? Number(orgData.tax_rate) : prev.vatRate,
          isCompanyConfigured: true
        }));
      }

      setSupabaseStatus(prev => ({
        ...prev,
        connected: true,
        organizationId: orgId,
        lastSyncedAt: new Date().toLocaleTimeString(),
        message: 'Authoritative data loaded from Supabase'
      }));
    } catch (err: any) {
      console.warn('Error loading tenant data from Supabase:', err);
    }
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    if (!organizationId) {
      const { orgId } = await resolveUserOrganization();
      if (orgId) {
        setOrganizationId(orgId);
        await loadTenantData(orgId);
      }
      return;
    }
    await loadTenantData(organizationId);
  }, [organizationId, loadTenantData]);

  // Initialize and listen to Supabase Authentication
  useEffect(() => {
    let mounted = true;

    // 1. REGISTER THE GLOBAL onAuthStateChange LISTENER FIRST!
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const currentHref = typeof window !== 'undefined' ? window.location.href : '';

      console.log('[PharmacyContext Auth DEBUG]:', {
        event,
        userId: session?.user?.id,
        email: session?.user?.email,
        currentPath,
        currentHref,
        recoveryActive: isRecoveryModeActive()
      });

      // CRITICAL: Supabase Password Recovery detection
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[PharmacyContext Auth] Received PASSWORD_RECOVERY event!');
        markRecoveryMode(true);
        setCachedRecoveryIntent(true, false, null);
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        setAuthLoading(false);
        navigate('/reset-password', true);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsPasswordRecovery(false);
        markRecoveryMode(false);
        setOrganizationId(null);
        setCurrentUser({
          id: 'usr-guest',
          name: 'Pharmacy Admin',
          email: '',
          role: 'Super Admin',
          status: 'Active'
        });
        setAuthLoading(false);
        return;
      }

      // If user is currently in password recovery (or on /reset-password),
      // DO NOT let SIGNED_IN or INITIAL_SESSION auto-authenticate to dashboard!
      if (isRecoveryModeActive() || isPasswordRecovery || currentPath === '/reset-password') {
        console.log('[PharmacyContext Auth] Recovery active; holding session for password update. Suppressing dashboard redirect.');
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        setAuthLoading(false);
        if (currentPath !== '/reset-password') {
          navigate('/reset-password', true);
        }
        return;
      }

      if (session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        const { orgId } = await resolveUserOrganization();

        let verifiedRole = appUser.role;
        if (orgId) {
          verifiedRole = await fetchVerifiedUserRole(session.user.id, orgId);
        }

        if (mounted) {
          setCurrentUser({ ...appUser, role: verifiedRole });
          setIsAuthenticated(true);
          setIsPasswordRecovery(false);
          if (orgId) {
            setOrganizationId(orgId);
            await loadTenantData(orgId);
          }
        }
      } else {
        if (mounted) {
          setIsAuthenticated(false);
          setIsPasswordRecovery(false);
        }
      }

      if (mounted) setAuthLoading(false);
    });

    // 2. RUN INITIAL AUTH CHECK AFTER LISTENER IS SUBSCRIBED
    const initAuth = async () => {
      try {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const recoveryActive = isRecoveryModeActive() || currentPath === '/reset-password';

        if (recoveryActive) {
          console.log('[initAuth] Recovery active on start - routing to /reset-password');
          markRecoveryMode(true);
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
          if (currentPath !== '/reset-password') {
            navigate('/reset-password', true);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        // If recovery was detected, keep user in recovery flow and DO NOT auto-redirect to dashboard
        if (isRecoveryModeActive() || recoveryActive || isPasswordRecovery) {
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
          setAuthLoading(false);
          return;
        }

        if (session?.user) {
          const appUser = mapSupabaseUserToAppUser(session.user);
          const { orgId } = await resolveUserOrganization();

          let verifiedRole = appUser.role;
          if (orgId) {
            verifiedRole = await fetchVerifiedUserRole(session.user.id, orgId);
          }

          if (mounted) {
            setCurrentUser({ ...appUser, role: verifiedRole });
            setIsAuthenticated(true);
            setIsPasswordRecovery(false);
            if (orgId) {
              setOrganizationId(orgId);
              await loadTenantData(orgId);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Supabase auth init warning:', err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [loadTenantData, navigate]);

  // Multi-Tenant Supabase Realtime Subscription Lifecycle
  useEffect(() => {
    if (!isAuthenticated || !organizationId) {
      return;
    }

    const currentOrgId = organizationId;
    const channelName = `pharmacy-tenant-${currentOrgId}`;

    // Create tenant-isolated Realtime channel
    const channel = supabase
      .channel(channelName)
      // 1. Medicines Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medicines',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMed = mapSupabaseMedicine(payload.new);
            setMedicines(prev => {
              const exists = prev.some(m => m.id === newMed.id);
              if (exists) {
                return prev.map(m => m.id === newMed.id ? { ...m, ...newMed } : m);
              }
              return [newMed, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMed = mapSupabaseMedicine(payload.new);
            setMedicines(prev => prev.map(m => m.id === updatedMed.id ? { ...m, ...updatedMed } : m));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setMedicines(prev => prev.filter(m => m.id !== deletedId));
            }
          }
        }
      )
      // 2. Sales Realtime Synchronization (POS & Order History)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `organization_id=eq.${currentOrgId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const saleId = (payload.new as any)?.id;
            if (saleId) {
              const fullSale = await fetchSaleByIdFromSupabase(saleId, currentOrgId);
              if (fullSale) {
                setSales(prev => {
                  const exists = prev.some(s => s.id === fullSale.id);
                  if (exists) {
                    return prev.map(s => s.id === fullSale.id ? fullSale : s);
                  }
                  return [fullSale, ...prev];
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setSales(prev => prev.filter(s => s.id !== deletedId));
            }
          }
        }
      )
      // 3. Customers Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCust = mapSupabaseCustomer(payload.new);
            setCustomers(prev => {
              const exists = prev.some(c => c.id === newCust.id);
              if (exists) {
                return prev.map(c => c.id === newCust.id ? { ...c, ...newCust } : c);
              }
              return [newCust, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCust = mapSupabaseCustomer(payload.new);
            setCustomers(prev => prev.map(c => c.id === updatedCust.id ? { ...c, ...updatedCust } : c));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setCustomers(prev => prev.filter(c => c.id !== deletedId));
            }
          }
        }
      )
      // 4. Suppliers Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSup = mapSupabaseSupplier(payload.new);
            setSuppliers(prev => {
              const exists = prev.some(s => s.id === newSup.id);
              if (exists) {
                return prev.map(s => s.id === newSup.id ? { ...s, ...newSup } : s);
              }
              return [newSup, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSup = mapSupabaseSupplier(payload.new);
            setSuppliers(prev => prev.map(s => s.id === updatedSup.id ? { ...s, ...updatedSup } : s));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setSuppliers(prev => prev.filter(s => s.id !== deletedId));
            }
          }
        }
      )
      // 5. Prescriptions Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `organization_id=eq.${currentOrgId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const rxId = (payload.new as any)?.id;
            if (rxId) {
              const fullRx = await fetchPrescriptionByIdFromSupabase(rxId, currentOrgId);
              if (fullRx) {
                setPrescriptions(prev => {
                  const exists = prev.some(r => r.id === fullRx.id);
                  if (exists) {
                    return prev.map(r => r.id === fullRx.id ? fullRx : r);
                  }
                  return [fullRx, ...prev];
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setPrescriptions(prev => prev.filter(r => r.id !== deletedId));
            }
          }
        }
      )
      // 6. Expenses Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newExp = mapSupabaseExpense(payload.new);
            setExpenses(prev => {
              const exists = prev.some(e => e.id === newExp.id);
              if (exists) {
                return prev.map(e => e.id === newExp.id ? { ...e, ...newExp } : e);
              }
              return [newExp, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedExp = mapSupabaseExpense(payload.new);
            setExpenses(prev => prev.map(e => e.id === updatedExp.id ? { ...e, ...updatedExp } : e));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setExpenses(prev => prev.filter(e => e.id !== deletedId));
            }
          }
        }
      )
      // 7. Audit Logs Realtime Synchronization
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `organization_id=eq.${currentOrgId}`
        },
        (payload) => {
          const newLog = mapSupabaseAuditLog(payload.new);
          setAuditLogs(prev => {
            if (prev.some(l => l.id === newLog.id)) return prev;
            return [newLog, ...prev.slice(0, 99)];
          });
        }
      )
      // Subscription connection status & auto-reconnect handling
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseStatus(prev => ({
            ...prev,
            connected: true,
            organizationId: currentOrgId,
            message: 'Realtime multi-user synchronization active',
            lastSyncedAt: new Date().toLocaleTimeString()
          }));
        } else if (status === 'CLOSED') {
          setSupabaseStatus(prev => ({
            ...prev,
            message: 'Realtime disconnected. Reconnecting...'
          }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime channel notice:', err?.message || status);
          setSupabaseStatus(prev => ({
            ...prev,
            message: 'Realtime connection issue. Standard REST sync active.'
          }));
        }
      });

    // Cleanup: unsubscribe and remove channel to prevent memory leaks or duplicate listeners
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, organizationId]);

  useEffect(() => {
    verifySupabaseConnection().then(status => {
      setSupabaseStatus(status);
      if (status.organizationId) {
        setOrganizationId(status.organizationId);
      }
    });
  }, []);

  const triggerSupabaseSync = async () => {
    setSupabaseStatus(prev => ({ ...prev, syncing: true, message: 'Syncing database records with Supabase...' }));
    try {
      const res = await syncFullStateToSupabase({
        medicines,
        sales,
        customers,
        suppliers,
        prescriptions,
        expenses
      });
      setSupabaseStatus({
        connected: true,
        message: `Synced ${res.syncedItemsCount} records with Supabase successfully!`,
        lastSyncedAt: res.timestamp,
        syncing: false,
        organizationId
      });
    } catch (err: any) {
      setSupabaseStatus(prev => ({
        ...prev,
        syncing: false,
        message: `Sync warning: ${err?.message || 'Check Supabase table schemas.'}`
      }));
    }
  };

  // Sync to local storage for UI caching
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'medicines', JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'prescriptions', JSON.stringify(prescriptions));
  }, [prescriptions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const switchRole = (_role: UserRole) => {
    // SECURITY: Client-side role switching is prohibited.
    // User roles are strictly derived from verified Supabase organization_members + roles records.
    console.warn('[Security Guard] Manual role modification rejected. Role is authoritatively enforced by PostgreSQL RBAC.');
  };

  // Supabase Auth Email/Password Sign In
  const login = async (emailInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> => {
    const res = await signInWithSupabase(emailInput, passwordInput);
    if (res.success && res.user) {
      const { orgId } = await resolveUserOrganization();
      let verifiedRole = res.user.role;
      if (orgId) {
        verifiedRole = await fetchVerifiedUserRole(res.user.id, orgId);
        setOrganizationId(orgId);
        await loadTenantData(orgId);
      }
      const verifiedUser = { ...res.user, role: verifiedRole };
      setCurrentUser(verifiedUser);
      setIsAuthenticated(true);
      addAuditLog('User Login', 'Authentication', `User ${verifiedUser.name} (${verifiedUser.email}) logged in with verified role: ${verifiedRole}.`);
      return { success: true };
    }
    return { success: false, message: res.message || 'Invalid email or password.' };
  };

  // Supabase Auth Sign Up
  const signup = async (
    emailInput: string,
    passwordInput: string,
    nameInput: string,
    phoneInput?: string,
    roleInput: UserRole = 'Super Admin'
  ): Promise<{ success: boolean; message?: string; user?: User | null }> => {
    const res = await signUpWithSupabase(emailInput, passwordInput, nameInput, phoneInput, roleInput);
    if (res.success) {
      if (res.user) {
        const { orgId } = await resolveUserOrganization();
        let verifiedRole = res.user.role;
        if (orgId) {
          verifiedRole = await fetchVerifiedUserRole(res.user.id, orgId);
          setOrganizationId(orgId);
          await loadTenantData(orgId);
        }
        const verifiedUser = { ...res.user, role: verifiedRole };
        setCurrentUser(verifiedUser);
        setIsAuthenticated(true);
        setUsers(prev => {
          if (prev.some(u => u.email.toLowerCase() === verifiedUser.email.toLowerCase())) return prev;
          return [...prev, verifiedUser];
        });
      }
      addAuditLog('User Registration', 'Authentication', `New user registered: ${nameInput} (${emailInput})`);
      return { success: true, message: res.message, user: res.user };
    }
    return { success: false, message: res.message || 'Registration failed.' };
  };

  // Supabase Password Reset Email
  const resetPasswordForEmail = async (emailInput: string): Promise<{ success: boolean; message?: string }> => {
    const res = await sendPasswordResetEmail(emailInput);
    if (res.success) {
      addAuditLog('Password Reset Requested', 'Authentication', `Password reset email dispatched to: ${emailInput}`);
    }
    return res;
  };

  // Supabase Password Update (Recovery & In-App flow)
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const res = await updateSupabasePassword(newPassword);
    if (res.success) {
      if (res.user && isAuthenticated) {
        setCurrentUser(res.user);
      }
      addAuditLog('Password Updated', 'Authentication', 'User successfully changed their password.');
    }
    return res;
  };

  // Supabase Auth Sign Out
  const logout = async (): Promise<void> => {
    const userName = currentUser?.name || 'User';
    markRecoveryMode(false);
    await signOutSupabase();
    setIsAuthenticated(false);
    setIsPasswordRecovery(false);
    setOrganizationId(null);
    setCurrentUser({
      id: 'usr-guest',
      name: 'Pharmacy Admin',
      email: '',
      role: 'Super Admin',
      status: 'Active'
    });
    addAuditLog('User Logout', 'Authentication', `User ${userName} logged out.`);
  };

  const resetDataStartAfresh = () => {
    setSales([]);
    setPrescriptions([]);
    setPurchases([]);
    setExpenses([]);
    setCustomers([]);
    setAuditLogs([]);
    setSettings(prev => ({ ...prev, isCompanyConfigured: true }));
    addAuditLog('Reset Data & Start Afresh', 'System', 'Cleared all transaction history and initialized clean company state.');
  };

  const clearAllData = () => {
    setMedicines([]);
    setSales([]);
    setPrescriptions([]);
    setPurchases([]);
    setExpenses([]);
    setCustomers([]);
    setSuppliers([]);
    setAuditLogs([]);
    setSettings(prev => ({
      ...prev,
      pharmacyName: 'My Pharmacy Store',
      licenseNumber: '',
      email: '',
      phone: '',
      address: '',
      isCompanyConfigured: false
    }));
    addAuditLog('Clear All Data', 'System', 'Cleared all catalog, transactions, and customer records for fresh custom setup.');
  };

  const loadStarterCatalog = () => {
    setMedicines(initialMedicines);
    setCategories(initialCategories);
    setSuppliers(initialSuppliers);
    addAuditLog('Loaded Starter Catalog', 'Inventory', 'Imported standard pharmaceutical medicine & supplier templates.');
  };

  const updateUserPassword = (id: string, newPassword: string) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, password: newPassword } : u)));
    addAuditLog('Updated User Password', 'User Management', `Password reset for user ID: ${id}`);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('Deleted User Account', 'User Management', `User ID: ${id}`);
  };

  const addAuditLog = (action: string, module: string, details: string) => {
    const newLog: AuditLog = {
      id: ensureUUID(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: currentUser ? currentUser.name : 'System',
      role: currentUser ? currentUser.role : 'Super Admin',
      action,
      module,
      details,
      ipAddress: '127.0.0.1'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    syncAuditLogToSupabase(newLog, organizationId || undefined, currentUser.id !== 'usr-guest' ? currentUser.id : undefined);
  };

  // Status helper function
  const computeMedicineStatus = (stockQuantity: number, minReorder: number, expiryDateStr: string): Medicine['status'] => {
    const today = new Date();
    const expiryDate = new Date(expiryDateStr);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays <= settings.expiryWarningDays) return 'Expiring Soon';
    if (stockQuantity <= 0) return 'Out of Stock';
    if (stockQuantity <= minReorder) return 'Low Stock';
    return 'In Stock';
  };

  const updateSettings = (newSettings: Partial<PharmacySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      addAuditLog('Updated Pharmacy Settings', 'Settings', 'Modified store information and rules');
      return updated;
    });
  };

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      id: ensureUUID(),
      ...categoryData,
      itemCount: 0
    };
    setCategories(prev => [...prev, newCat]);
    addAuditLog(`Added New Category: ${newCat.name}`, 'Inventory', `Category created.`);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    addAuditLog(`Deleted Category`, 'Inventory', `Category ID: ${id}`);
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'totalPurchased' | 'balanceOwed'>) => {
    const newSupplier: Supplier = {
      id: ensureUUID(),
      ...supplierData,
      totalPurchased: 0,
      balanceOwed: 0
    };
    setSuppliers(prev => [...prev, newSupplier]);
    syncSupplierToSupabase(newSupplier, organizationId || undefined);
    addAuditLog(`Added New Supplier: ${newSupplier.name}`, 'Suppliers', `Contact person: ${newSupplier.contactPerson}`);
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => {
      if (s.id === id) {
        const result = { ...s, ...updated };
        syncSupplierToSupabase(result, organizationId || undefined);
        return result;
      }
      return s;
    }));
    addAuditLog(`Updated Supplier details`, 'Suppliers', `Supplier ID: ${id}`);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteSupplierFromSupabase(id, organizationId || undefined);
    addAuditLog(`Deleted Supplier`, 'Suppliers', `Supplier ID: ${id}`);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent'>) => {
    const newCust: Customer = {
      id: ensureUUID(),
      ...customerData,
      loyaltyPoints: 0,
      totalSpent: 0,
      lastVisit: new Date().toISOString().split('T')[0]
    };
    setCustomers(prev => [...prev, newCust]);
    syncCustomerToSupabase(newCust, organizationId || undefined);
    addAuditLog(`Registered New Customer: ${newCust.name}`, 'Customers', `Phone: ${newCust.phone}`);
  };

  const updateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const result = { ...c, ...updated };
        syncCustomerToSupabase(result, organizationId || undefined);
        return result;
      }
      return c;
    }));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteCustomerFromSupabase(id, organizationId || undefined);
    addAuditLog(`Deleted Customer`, 'Customers', `Customer ID: ${id}`);
  };

  const addMedicine = (medData: Omit<Medicine, 'id' | 'status'>) => {
    const status = computeMedicineStatus(medData.stockQuantity, medData.minReorderLevel, medData.expiryDate);
    const newMed: Medicine = {
      id: ensureUUID(),
      ...medData,
      status
    };
    setMedicines(prev => [newMed, ...prev]);
    syncMedicineToSupabase(newMed, organizationId || undefined);
    addAuditLog(`Added New Medicine: ${newMed.name}`, 'Inventory', `Barcode: ${newMed.barcode}, Stock: ${newMed.stockQuantity}`);
  };

  const updateMedicine = (id: string, updated: Partial<Medicine>) => {
    setMedicines(prev => prev.map(m => {
      if (m.id !== id) return m;
      const combined = { ...m, ...updated };
      combined.status = computeMedicineStatus(combined.stockQuantity, combined.minReorderLevel, combined.expiryDate);
      syncMedicineToSupabase(combined, organizationId || undefined);
      return combined;
    }));
    addAuditLog(`Updated Medicine details`, 'Inventory', `Medicine ID: ${id}`);
  };

  const deleteMedicine = (id: string) => {
    const med = medicines.find(m => m.id === id);
    setMedicines(prev => prev.filter(m => m.id !== id));
    deleteMedicineFromSupabase(id, organizationId || undefined);
    addAuditLog(`Deleted Medicine: ${med?.name || id}`, 'Inventory', `Removed from catalog`);
  };

  const adjustStock = (id: string, quantityDelta: number, reason: string) => {
    setMedicines(prev => prev.map(m => {
      if (m.id !== id) return m;
      const newQty = Math.max(0, m.stockQuantity + quantityDelta);
      const status = computeMedicineStatus(newQty, m.minReorderLevel, m.expiryDate);
      const updated = { ...m, stockQuantity: newQty, status };
      syncMedicineToSupabase(updated, organizationId || undefined);
      return updated;
    }));
    addAuditLog(`Adjusted Stock (${quantityDelta > 0 ? '+' : ''}${quantityDelta})`, 'Inventory', `Reason: ${reason}`);
  };

  const completeSale = async (saleData: Omit<Sale, 'id' | 'invoiceNo' | 'createdAt' | 'status'>): Promise<Sale> => {
    // 1. Validate requested items
    if (!saleData.items || saleData.items.length === 0) {
      throw new Error('Cart is empty. Please add items to checkout.');
    }

    for (const item of saleData.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.name}. Quantity must be at least 1.`);
      }
    }

    // 2. If authenticated with Supabase session and organization, execute atomic RPC
    if (isAuthenticated && organizationId) {
      const { data, error } = await executeAtomicSaleTransaction({
        items: saleData.items,
        customerId: saleData.customerId,
        paymentMethod: saleData.paymentMethod
      });

      if (error || !data || !data.success) {
        // Refresh catalog in background so UI displays current true stock
        refreshFromSupabase().catch(() => {});
        const errorMsg = error?.message || 'Sale transaction failed on server.';
        throw new Error(errorMsg);
      }

      // Build authoritative Sale object using PostgreSQL database returned values
      const authoritativeSale: Sale = {
        id: data.sale_id,
        invoiceNo: data.invoice_no,
        customerId: data.customer_id || saleData.customerId,
        customerName: data.customer_name || saleData.customerName,
        customerPhone: data.customer_phone || saleData.customerPhone,
        items: saleData.items,
        subtotal: saleData.subtotal,
        taxAmount: saleData.taxAmount,
        discountAmount: saleData.discountAmount,
        grandTotal: data.total_amount || saleData.grandTotal,
        paymentMethod: (data.payment_method as any) || saleData.paymentMethod,
        amountPaid: saleData.amountPaid,
        changeGiven: saleData.changeGiven,
        status: 'Completed',
        cashierName: saleData.cashierName || currentUser.name,
        prescriptionNo: saleData.prescriptionNo,
        createdAt: data.created_at || new Date().toISOString()
      };

      // Add to sales state
      setSales(prev => [authoritativeSale, ...prev]);

      // Deduct inventory quantities locally to match database state
      setMedicines(prevMeds => prevMeds.map(m => {
        const itemSold = saleData.items.find(i => i.medicineId === m.id);
        if (itemSold) {
          const newQty = Math.max(0, m.stockQuantity - itemSold.quantity);
          const status = computeMedicineStatus(newQty, m.minReorderLevel, m.expiryDate);
          return { ...m, stockQuantity: newQty, status };
        }
        return m;
      }));

      // Update customer loyalty points and total spent if assigned
      if (saleData.customerId) {
        setCustomers(prevCust => prevCust.map(c => {
          if (c.id === saleData.customerId) {
            const addedPoints = Math.floor(saleData.grandTotal);
            return {
              ...c,
              totalSpent: c.totalSpent + saleData.grandTotal,
              loyaltyPoints: c.loyaltyPoints + addedPoints,
              lastVisit: new Date().toISOString().split('T')[0]
            };
          }
          return c;
        }));
      }

      // Add local audit entry for UI tracking
      const newLog: AuditLog = {
        id: ensureUUID(),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userName: currentUser ? currentUser.name : 'System',
        role: currentUser ? currentUser.role : 'Super Admin',
        action: `Completed POS Sale ${data.invoice_no}`,
        module: 'POS',
        details: `Grand Total: ${settings.currencySymbol}${authoritativeSale.grandTotal.toFixed(2)}, Items: ${authoritativeSale.items.length}`,
        ipAddress: '127.0.0.1'
      };
      setAuditLogs(prev => [newLog, ...prev]);

      return authoritativeSale;
    }

    // 3. Fallback for unauthenticated/demo mode: Strict in-memory stock verification and atomic deduction
    for (const item of saleData.items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (!med) {
        throw new Error(`Medicine not found: ${item.name}`);
      }
      if (med.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${med.name}. Available: ${med.stockQuantity}, Requested: ${item.quantity}.`);
      }
    }

    const invoiceNo = `INV-${new Date().getFullYear()}-${String(sales.length + 401).padStart(5, '0')}`;
    const newSale: Sale = {
      id: ensureUUID(),
      invoiceNo,
      ...saleData,
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    setSales(prev => [newSale, ...prev]);

    // Deduct inventory quantities
    setMedicines(prevMeds => prevMeds.map(m => {
      const itemSold = saleData.items.find(i => i.medicineId === m.id);
      if (itemSold) {
        const newQty = Math.max(0, m.stockQuantity - itemSold.quantity);
        const status = computeMedicineStatus(newQty, m.minReorderLevel, m.expiryDate);
        return { ...m, stockQuantity: newQty, status };
      }
      return m;
    }));

    // Update customer spending and loyalty points if assigned
    if (saleData.customerId) {
      setCustomers(prevCust => prevCust.map(c => {
        if (c.id === saleData.customerId) {
          const addedPoints = Math.floor(saleData.grandTotal);
          return {
            ...c,
            totalSpent: c.totalSpent + saleData.grandTotal,
            loyaltyPoints: c.loyaltyPoints + addedPoints,
            lastVisit: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      }));
    }

    addAuditLog(`Completed POS Sale ${invoiceNo}`, 'POS', `Grand Total: ${settings.currencySymbol}${saleData.grandTotal.toFixed(2)}, Items: ${saleData.items.length}`);
    return newSale;
  };

  const refundSale = (saleId: string) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    setSales(prev => prev.map(s => (s.id === saleId ? { ...s, status: 'Refunded' } : s)));

    // Restock items
    setMedicines(prevMeds => prevMeds.map(m => {
      const itemRefunded = targetSale.items.find(i => i.medicineId === m.id);
      if (itemRefunded) {
        const newQty = m.stockQuantity + itemRefunded.quantity;
        const status = computeMedicineStatus(newQty, m.minReorderLevel, m.expiryDate);
        const updated = { ...m, stockQuantity: newQty, status };
        syncMedicineToSupabase(updated, organizationId || undefined);
        return updated;
      }
      return m;
    }));

    addAuditLog(`Refunded Invoice ${targetSale.invoiceNo}`, 'Sales', `Restocked items into inventory.`);
  };

  const addPurchaseOrder = (poData: Omit<Purchase, 'id' | 'purchaseOrderNo' | 'deliveryStatus'>) => {
    const poNo = `PO-${new Date().getFullYear()}-${String(purchases.length + 101).padStart(3, '0')}`;
    const newPO: Purchase = {
      id: ensureUUID(),
      purchaseOrderNo: poNo,
      ...poData,
      deliveryStatus: 'Pending'
    };

    setPurchases(prev => [newPO, ...prev]);

    // Update supplier balance if pending
    if (poData.paymentStatus === 'Pending' || poData.paymentStatus === 'Partial') {
      setSuppliers(prev => prev.map(s => {
        if (s.id === poData.supplierId) {
          const updated = {
            ...s,
            balanceOwed: s.balanceOwed + poData.totalAmount,
            totalPurchased: s.totalPurchased + poData.totalAmount
          };
          syncSupplierToSupabase(updated, organizationId || undefined);
          return updated;
        }
        return s;
      }));
    }

    addAuditLog(`Created Purchase Order ${poNo}`, 'Purchases', `Supplier: ${poData.supplierName}, Amount: ${settings.currencySymbol}${poData.totalAmount}`);
  };

  const receivePurchaseOrder = (poId: string) => {
    const po = purchases.find(p => p.id === poId);
    if (!po) return;

    setPurchases(prev => prev.map(p => (p.id === poId ? { ...p, deliveryStatus: 'Received', receivedDate: new Date().toISOString().split('T')[0] } : p)));

    // Increase stock quantities in inventory
    setMedicines(prevMeds => prevMeds.map(m => {
      const itemReceived = po.items.find(i => i.medicineId === m.id);
      if (itemReceived) {
        const newQty = m.stockQuantity + itemReceived.quantityOrdered;
        const status = computeMedicineStatus(newQty, m.minReorderLevel, itemReceived.expiryDate || m.expiryDate);
        const updated = {
          ...m,
          stockQuantity: newQty,
          batchNumber: itemReceived.batchNumber || m.batchNumber,
          expiryDate: itemReceived.expiryDate || m.expiryDate,
          purchasePrice: itemReceived.unitCost || m.purchasePrice,
          status
        };
        syncMedicineToSupabase(updated, organizationId || undefined);
        return updated;
      }
      return m;
    }));

    addAuditLog(`Received Stock for Purchase Order ${po.purchaseOrderNo}`, 'Purchases', `Inventory updated.`);
  };

  const addPrescription = (rxData: Omit<Prescription, 'id' | 'prescriptionNo' | 'createdAt' | 'status'>) => {
    const rxNo = `RX-${new Date().getFullYear()}-${String(prescriptions.length + 893).padStart(4, '0')}`;
    const newRx: Prescription = {
      id: ensureUUID(),
      prescriptionNo: rxNo,
      ...rxData,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    setPrescriptions(prev => [newRx, ...prev]);
    syncPrescriptionToSupabase(newRx, organizationId || undefined);
    addAuditLog(`Added New Prescription ${rxNo}`, 'Prescriptions', `Patient: ${rxData.customerName}, Doctor: ${rxData.doctorName}`);
  };

  const updatePrescriptionStatus = (id: string, status: Prescription['status'], notes?: string) => {
    setPrescriptions(prev => prev.map(rx => {
      if (rx.id !== id) return rx;
      const updatedRx = {
        ...rx,
        status,
        dispensedAt: status === 'Dispensed' ? new Date().toISOString() : rx.dispensedAt,
        dispensedBy: status === 'Dispensed' ? currentUser.name : rx.dispensedBy,
        notes: notes || rx.notes
      };
      syncPrescriptionToSupabase(updatedRx, organizationId || undefined);
      return updatedRx;
    }));
    addAuditLog(`Updated Prescription status to ${status}`, 'Prescriptions', `Prescription ID: ${id}`);
  };

  const addExpense = (expData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      id: ensureUUID(),
      ...expData
    };
    setExpenses(prev => [newExp, ...prev]);
    syncExpenseToSupabase(
      newExp,
      organizationId || undefined,
      currentUser.id !== 'usr-guest' ? currentUser.id : undefined
    );
    addAuditLog(`Recorded Expense: ${newExp.description}`, 'Expenses', `Amount: ${settings.currencySymbol}${newExp.amount}`);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    deleteExpenseFromSupabase(id, organizationId || undefined);
    addAuditLog(`Deleted Expense`, 'Expenses', `Expense ID: ${id}`);
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      id: ensureUUID(),
      ...userData
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog(`Added New Staff Member: ${newUser.name}`, 'User Management', `Role: ${newUser.role}`);
  };

  const updateUserStatus = (id: string, status: 'Active' | 'Inactive') => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, status } : u)));
    addAuditLog(`Changed User Status to ${status}`, 'User Management', `User ID: ${id}`);
  };

  const getMedicineById = (id: string) => medicines.find(m => m.id === id);

  const getLowStockCount = () => medicines.filter(m => m.status === 'Low Stock').length;
  const getExpiringSoonCount = () => medicines.filter(m => m.status === 'Expiring Soon').length;
  const getExpiredCount = () => medicines.filter(m => m.status === 'Expired').length;

  return (
    <PharmacyContext.Provider
      value={{
        currentRoute,
        navigate,
        supabaseStatus,
        organizationId,
        triggerSupabaseSync,
        refreshFromSupabase,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab,
        isAuthenticated,
        authLoading,
        isPasswordRecovery,
        setIsPasswordRecovery,
        currentUser,
        setCurrentUser,
        switchRole,
        login,
        signup,
        logout,
        resetPasswordForEmail,
        updatePassword,
        settings,
        updateSettings,
        categories,
        addCategory,
        deleteCategory,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        medicines,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        adjustStock,
        sales,
        completeSale,
        refundSale,
        purchases,
        addPurchaseOrder,
        receivePurchaseOrder,
        prescriptions,
        addPrescription,
        updatePrescriptionStatus,
        expenses,
        addExpense,
        deleteExpense,
        users,
        addUser,
        updateUserStatus,
        updateUserPassword,
        deleteUser,
        resetDataStartAfresh,
        clearAllData,
        loadStarterCatalog,
        auditLogs,
        addAuditLog,
        getMedicineById,
        getLowStockCount,
        getExpiringSoonCount,
        getExpiredCount
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
