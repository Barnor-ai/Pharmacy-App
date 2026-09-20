import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { NavigationTab } from '../types';
import { DownloadAppModal } from './DownloadAppModal';
import { SupabaseSyncModal } from './SupabaseSyncModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { uploadAvatarToSupabase, updateUserProfileInSupabase } from '../lib/supabaseService';
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
  Database,
  User,
  Settings,
  KeyRound,
  LogOut,
  Camera,
  ChevronDown,
  Loader2,
  Check,
  Trash2
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
    setCurrentUser,
    logout,
    addAuditLog,
    supabaseStatus
  } = usePharmacy();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // User Profile Dropdown & Photo Upload States
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // PWA & Desktop App Download States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const uploadRes = await uploadAvatarToSupabase(currentUser.id, file);
      if (uploadRes.success && uploadRes.url) {
        // Immediately persist to Supabase & context
        await updateUserProfileInSupabase(currentUser.id, currentUser.name, uploadRes.url);
        setCurrentUser({ ...currentUser, avatar: uploadRes.url });
        addAuditLog('Updated Profile Photo', 'User Profile', `Updated photo from topbar for ${currentUser.email}`);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        alert(uploadRes.error || 'Failed to upload photo.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error uploading photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsRemovingPhoto(true);
    try {
      const res = await updateUserProfileInSupabase(currentUser.id, currentUser.name, null);
      if (res.success) {
        setCurrentUser({ ...currentUser, avatar: undefined });
        addAuditLog('Removed Profile Photo', 'User Profile', `Removed photo from topbar for ${currentUser.email}`);
      } else {
        alert(res.error || 'Failed to remove photo.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error removing photo.');
    } finally {
      setIsRemovingPhoto(false);
    }
  };

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

        {/* Far Top Right Corner: User Profile Photo & Dropdown Menu */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800" ref={profileMenuRef}>
          {/* Hidden File Input for User Photo Upload */}
          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />

          {/* User Photo Trigger Button */}
          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            title="User Account & Settings"
            aria-expanded={showProfileMenu}
          >
            <div className="relative">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-400 dark:border-emerald-600 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="hidden xl:block text-left text-xs leading-tight pr-0.5">
              <p className="font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                {currentUser.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentUser.role || 'Staff'}
              </p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-200 hidden sm:block ${
                showProfileMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="relative group">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-11 h-11 rounded-full object-cover border border-emerald-300 dark:border-emerald-700 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Fast upload icon over photo */}
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Upload new photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email || 'No email attached'}
                  </p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {/* Upload & Remove Photo Buttons in Menu */}
              <div className="px-2 pt-2 pb-1 space-y-1">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto || isRemovingPhoto}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : uploadSuccess ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-xs">
                      {isUploadingPhoto ? 'Uploading Photo...' : uploadSuccess ? 'Photo Updated!' : currentUser.avatar ? 'Change Photo' : 'Upload Photo'}
                    </p>
                    <p className="text-[10px] text-slate-400">PNG, JPG up to 5MB</p>
                  </div>
                </button>

                {currentUser.avatar && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto || isRemovingPhoto}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      {isRemovingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-xs text-rose-600 dark:text-rose-400">
                        {isRemovingPhoto ? 'Removing...' : 'Remove Photo'}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              {/* Menu Options: Settings, Change Password, Logout */}
              <div className="px-2 space-y-0.5">
                {/* 1. Settings */}
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </button>

                {/* 2. Change Password */}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  <span>Change Password</span>
                </button>
              </div>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              {/* 3. Log Out */}
              <div className="px-2 pt-0.5">
                <button
                  onClick={async () => {
                    setShowProfileMenu(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

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
