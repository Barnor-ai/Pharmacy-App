import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useSubscription } from '../context/SubscriptionContext';
import { NavigationTab, UserRole, FinancialsSubTab } from '../types';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  ReceiptText,
  FileText,
  PackageCheck,
  Truck,
  Users,
  BarChart3,
  DollarSign,
  ChevronDown,
  Bot,
  UserCheck,
  History,
  Settings,
  ShieldCheck,
  PlusCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Cross,
  LogOut,
  Download,
  Laptop,
  CreditCard,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const {
    activeTab,
    setActiveTab,
    financialsSubTab,
    setFinancialsSubTab,
    currentUser,
    settings,
    getLowStockCount,
    getExpiringSoonCount,
    getExpiredCount,
    isDemoMode,
    logout
  } = usePharmacy();
  const { plan, isTrial, trialDaysRemaining, isExpired } = useSubscription();
  const [financialsDropdownOpen, setFinancialsDropdownOpen] = useState(true);

  const financialSections: { id: FinancialsSubTab; label: string }[] = [
    { id: 'income-sales', label: '1. Income / Sales' },
    { id: 'expenses', label: '2. Expenses' },
    { id: 'payables', label: '3. Payables' },
    { id: 'profit-loss', label: '4. Profit & Loss' },
    { id: 'financial-reports', label: '5. Financial Reports' },
  ];

  const totalAlerts = getLowStockCount() + getExpiringSoonCount() + getExpiredCount();

  const navItems: { id: NavigationTab; label: string; icon: React.ElementType; badge?: number; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Pharmacist', 'Cashier', 'Store Manager'] },
    { id: 'inventory', label: 'Medicine Catalog', icon: Pill, badge: totalAlerts, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Pharmacist', 'Store Manager'] },
    { id: 'sales', label: 'Sales History', icon: ReceiptText },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Pharmacist'] },
    { id: 'purchases', label: 'Purchases & Stock-In', icon: PackageCheck, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Store Manager', 'Accountant'] },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Store Manager', 'Accountant', 'Pharmacist'] },
    { id: 'customers', label: 'Customers & Patients', icon: Users, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Pharmacist', 'Cashier', 'Store Manager'] },
    { id: 'financials', label: 'FINANCIALS', icon: DollarSign, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Store Manager', 'Accountant'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Store Manager', 'Accountant'] },
    { id: 'ai-assistant', label: 'PharmaAI Assistant', icon: Bot },
    { id: 'users', label: 'Staff Management', icon: UserCheck, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator'] },
    { id: 'audit-logs', label: 'Audit Trail', icon: History, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Super Admin', 'Pharmacy Owner', 'Administrator', 'Store Manager'] },
  ];

  const allowedItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(currentUser.role);
  });

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0 overflow-hidden">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Cross className="w-5 h-5" />
                )}
              </div>
              <div className="truncate">
                <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                  {settings.pharmacyName}
                </h1>
                {isDemoMode ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    DEMO DATA • GH₵ (Ghana)
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block truncate">
                    Pharmacy Management System
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 overflow-hidden relative" title={isDemoMode ? "DEMO MODE • HealthPlus Pharmacy" : settings.pharmacyName}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Cross className="w-6 h-6" />
              )}
              {isDemoMode && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900"></span>
              )}
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Verified User Role Indicator (Authoritative Database Role) */}
        {!collapsed && (
          <div className="p-3 mx-2 my-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Verified Role
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {currentUser.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.id === 'financials') {
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveTab('financials');
                      if (!collapsed) {
                        setFinancialsDropdownOpen(!financialsDropdownOpen);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      {!collapsed && <span className="truncate font-bold tracking-wide">{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          financialsDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {!collapsed && financialsDropdownOpen && (
                    <div className="pl-6 pr-1 py-1 space-y-1">
                      {financialSections.map(sec => {
                        const isSubActive = isActive && financialsSubTab === sec.id;
                        return (
                          <button
                            key={sec.id}
                            onClick={() => {
                              setActiveTab('financials');
                              setFinancialsSubTab(sec.id);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                              isSubActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className="truncate">{sec.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if present */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer User Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-300 dark:border-emerald-800 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border border-emerald-300 dark:border-emerald-800 shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-9 h-9 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border border-emerald-300 dark:border-emerald-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 transition overflow-hidden"
            title={`Sign Out (${currentUser.name})`}
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0)
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
