import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Settings,
  User,
  Building2,
  ShieldAlert,
  Users,
  ShieldCheck,
  Sliders,
  Database,
  RefreshCw,
  Server,
  CreditCard
} from 'lucide-react';
import { Profile } from './Profile';
import { PharmacySettings } from './PharmacySettings';
import { SecuritySettings } from './SecuritySettings';
import { StaffManagement } from './StaffManagement';
import { RolesPermissionsPage } from './RolesPermissionsPage';
import { PreferencesPage } from './PreferencesPage';
import { SubscriptionPage } from './SubscriptionPage';
import { SupabaseSyncModal } from '../components/SupabaseSyncModal';

export type SettingsSubTab =
  | 'profile'
  | 'pharmacy'
  | 'security'
  | 'staff'
  | 'roles'
  | 'subscription'
  | 'preferences';

export const SettingsPage: React.FC = () => {
  const { currentUser, supabaseStatus, triggerSupabaseSync } = usePharmacy();
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('profile');
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const isOwnerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';

  const subTabs = [
    { id: 'profile' as const, label: 'My Profile', icon: User, adminOnly: false },
    { id: 'pharmacy' as const, label: 'Pharmacy Settings', icon: Building2, adminOnly: true },
    { id: 'subscription' as const, label: 'Subscription & Billing', icon: CreditCard, adminOnly: true },
    { id: 'security' as const, label: 'Security & Auth', icon: ShieldAlert, adminOnly: false },
    { id: 'staff' as const, label: 'Staff Management', icon: Users, adminOnly: true },
    { id: 'roles' as const, label: 'Roles & Permissions', icon: ShieldCheck, adminOnly: true },
    { id: 'preferences' as const, label: 'Preferences', icon: Sliders, adminOnly: false },
  ];

  const allowedTabs = subTabs.filter(tab => !tab.adminOnly || isOwnerOrAdmin);

  return (
    <div className="space-y-6">
      {/* Top Supabase Infrastructure Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-800/60 text-white shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">PostgreSQL Multi-Tenant Backend</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active RLS & Realtime
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-md">
                https://oenzgttwkhepavbkcacj.supabase.co
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerSupabaseSync}
              disabled={supabaseStatus.syncing}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.syncing ? 'animate-spin' : ''}`} />
              <span>{supabaseStatus.syncing ? 'Syncing...' : 'Sync Database'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSupabaseModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs transition border border-slate-700"
            >
              API Credentials
            </button>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-300">Status:</span>
            <span className="text-slate-300">{supabaseStatus.message}</span>
          </div>
          {supabaseStatus.lastSyncedAt && (
            <span className="text-[11px] text-slate-500">Last Synced: {supabaseStatus.lastSyncedAt}</span>
          )}
        </div>
      </div>

      {/* Modern SaaS Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-x-auto">
        {allowedTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab View Router */}
      <div className="pt-2">
        {activeSubTab === 'profile' && <Profile />}
        {activeSubTab === 'pharmacy' && <PharmacySettings />}
        {activeSubTab === 'subscription' && <SubscriptionPage />}
        {activeSubTab === 'security' && <SecuritySettings />}
        {activeSubTab === 'staff' && <StaffManagement />}
        {activeSubTab === 'roles' && <RolesPermissionsPage />}
        {activeSubTab === 'preferences' && <PreferencesPage />}
      </div>

      {/* Supabase Sync Modal */}
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />
    </div>
  );
};
