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
  Server,
  CreditCard,
  Activity
} from 'lucide-react';
import { Profile } from './Profile';
import { PharmacySettings } from './PharmacySettings';
import { SecuritySettings } from './SecuritySettings';
import { StaffManagement } from './StaffManagement';
import { RolesPermissionsPage } from './RolesPermissionsPage';
import { PreferencesPage } from './PreferencesPage';
import { SubscriptionPage } from './SubscriptionPage';
import { SystemHealthPage } from './SystemHealthPage';
import { DataExportPage } from './DataExportPage';

export type SettingsSubTab =
  | 'profile'
  | 'pharmacy'
  | 'subscription'
  | 'system-health'
  | 'data-export'
  | 'security'
  | 'staff'
  | 'roles'
  | 'preferences';

export const SettingsPage: React.FC = () => {
  const { currentUser } = usePharmacy();
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('profile');

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
        {activeSubTab === 'system-health' && <SystemHealthPage />}
        {activeSubTab === 'data-export' && <DataExportPage />}
        {activeSubTab === 'security' && <SecuritySettings />}
        {activeSubTab === 'staff' && <StaffManagement />}
        {activeSubTab === 'roles' && <RolesPermissionsPage />}
        {activeSubTab === 'preferences' && <PreferencesPage />}
      </div>
    </div>
  );
};
