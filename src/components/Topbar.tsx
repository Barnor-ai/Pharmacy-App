import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { NavigationTab } from '../types';
import { DownloadAppModal } from './DownloadAppModal';
import { SupabaseSyncModal } from './SupabaseSyncModal';
import {
  Sun,
  Moon,
  Search,
  ShoppingCart,
  Bell,
  AlertTriangle,
  Clock,
  Sparkles,
  Building2,
  Cross,
  Download,
  Laptop,
  Database
} from 'lucide-react';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed }) => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    getLowStockCount,
    getExpiringSoonCount,
    getExpiredCount,
    settings,
    updateSettings,
    currentUser,
    supabaseStatus
  } = usePharmacy();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // PWA & Desktop App Download States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { choiceResult } = await deferredPrompt.userChoice || {};
      if (choiceResult === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowDownloadModal(true);
    }
  };

  const lowStock = getLowStockCount();
  const expiringSoon = getExpiringSoonCount();
  const expired = getExpiredCount();
  const totalAlerts = lowStock + expiringSoon + expired;

  const tabTitles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard & Overview', subtitle: 'Live sales, financial metrics & stock alerts' },
    pos: { title: 'Point of Sale (POS)', subtitle: 'Fast checkout, receipt printing & instant stock deduction' },
    inventory: { title: 'Medicine Inventory', subtitle: 'Catalog, stock levels, batch numbers & expiry dates' },
    sales: { title: 'Sales History', subtitle: 'Invoice records, receipts & transaction details' },
    prescriptions: { title: 'Prescription Orders', subtitle: 'Patient Rx verification, doctor notes & dispensing' },
    purchases: { title: 'Purchases & Stock-In', subtitle: 'Supplier purchase orders & inventory receiving' },
    suppliers: { title: 'Supplier Directory', subtitle: 'Vendor contacts, balances & payment terms' },
    customers: { title: 'Patient Profiles', subtitle: 'Customer history, allergies & loyalty rewards' },
    reports: { title: 'Reports & Analytics', subtitle: 'Revenue, profit margins & inventory valuation' },
    'ai-assistant': { title: 'PharmaAI Operations Assistant', subtitle: 'Instant answers on sales, stock & pharmacy advice' },
    users: { title: 'Staff & User Roles', subtitle: 'Access permissions & user accounts' },
    'audit-logs': { title: 'Audit Trail', subtitle: 'System activity & security event logs' },
    settings: { title: 'System Settings', subtitle: 'Pharmacy profile, currency & tax configuration' },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'Pharmacy System', subtitle: 'Operations' };

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between px-4 md:px-6 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {currentTabInfo.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Clock, Quick POS, Alert Dropdown, Theme Toggle */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} •{' '}
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Quick POS Shortcut */}
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">New POS Sale</span>
          </button>
        )}

        {/* AI Assistant Shortcut */}
        {activeTab !== 'ai-assistant' && (
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden md:inline">PharmaAI</span>
          </button>
        )}

        {/* Alert Notifications Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className={`p-2 rounded-xl transition relative border ${
              totalAlerts > 0
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Inventory Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Alerts Popup Menu */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Stock & Expiry Alerts
                </h4>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {totalAlerts} Issues
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                  <span className="font-medium text-amber-900 dark:text-amber-200">Low Stock Medicines</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{lowStock}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900">
                  <span className="font-medium text-orange-900 dark:text-orange-200">Expiring in &lt;90 days</span>
                  <span className="font-bold text-orange-700 dark:text-orange-300">{expiringSoon}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                  <span className="font-medium text-rose-900 dark:text-rose-200">Expired Medicines</span>
                  <span className="font-bold text-rose-700 dark:text-rose-300">{expired}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAlertsDropdown(false);
                  setActiveTab('inventory');
                }}
                className="w-full mt-3 py-2 text-xs font-bold text-center text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/50 rounded-xl"
              >
                View in Medicine Catalog &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Quick Currency Selector Dropdown */}
        <div className="relative">
          <select
            value={`${settings.currency}:${settings.currencySymbol}`}
            onChange={(e) => {
              const [code, symbol] = e.target.value.split(':');
              updateSettings({ currency: code, currencySymbol: symbol });
            }}
            className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            title="Change Currency"
          >
            <option value="USD:$">USD ($)</option>
            <option value="EUR:€">EUR (€)</option>
            <option value="GBP:£">GBP (£)</option>
            <option value="GHS:GH₵">GHS (GH₵)</option>
            <option value="GHS:Ghs">GHS (Ghs)</option>
            <option value="NGN:₦">NGN (₦)</option>
            <option value="KES:KSh">KES (KSh)</option>
            <option value="ZAR:R">ZAR (R)</option>
            <option value="INR:₹">INR (₹)</option>
            <option value="CAD:$">CAD ($)</option>
            <option value="AUD:$">AUD ($)</option>
            <option value="AED:AED">AED (AED)</option>
            <option value="SAR:SAR">SAR (SAR)</option>
            <option value="JPY:¥">JPY (¥)</option>
            <option value="CNY:¥">CNY (¥)</option>
            <option value="BRL:R$">BRL (R$)</option>
            <option value="MXN:$">MXN ($)</option>
            <option value="EGP:E£">EGP (E£)</option>
            <option value="PKR:Rs">PKR (Rs)</option>
            <option value="BDT:৳">BDT (৳)</option>
            <option value="PHP:₱">PHP (₱)</option>
          </select>
        </div>

        {/* System Online / Cloud Sync Status Button */}
        <button
          onClick={() => setShowSupabaseModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition shadow-sm"
          title="Cloud Sync Status & Realtime Health"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">System Online</span>
        </button>

        {/* Install App Button */}
        {!isInstalled && (
          <button
            onClick={handleTriggerInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition group relative"
            title="Install Pharmacy App"
          >
            <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">Install App</span>
            {deferredPrompt && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>

      {/* Download App PC Modal */}
      <DownloadAppModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
        isAlreadyInstalled={isInstalled}
      />

      {/* Supabase Backend Sync Modal */}
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />
    </header>
  );
};
