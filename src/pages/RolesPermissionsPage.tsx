import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Check,
  X,
  Info,
  Layers,
  Sparkles,
  AlertTriangle,
  Loader2,
  Users
} from 'lucide-react';
import {
  fetchRolesFromSupabase,
  fetchPermissionsFromSupabase,
  fetchRolePermissionsFromSupabase
} from '../lib/supabaseService';

export const RolesPermissionsPage: React.FC = () => {
  const { organizationId, currentUser } = usePharmacy();
  const [roles, setRoles] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [permissions, setPermissions] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{ role_id: string; permission_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Standard permissions catalog matrix definition
  const permissionCategories = [
    {
      name: 'Medicines & Inventory',
      permissions: ['medicines.create', 'medicines.read', 'medicines.update', 'medicines.delete']
    },
    {
      name: 'Sales & Checkout (POS)',
      permissions: ['sales.create', 'sales.read']
    },
    {
      name: 'Patients & Customers',
      permissions: ['customers.create', 'customers.read', 'customers.update', 'customers.delete']
    },
    {
      name: 'Suppliers & Wholesalers',
      permissions: ['suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete']
    },
    {
      name: 'Prescriptions & Rx Dispensing',
      permissions: ['prescriptions.create', 'prescriptions.read', 'prescriptions.update']
    },
    {
      name: 'Financials & Expenses',
      permissions: ['expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete']
    },
    {
      name: 'System Governance & RBAC',
      permissions: ['roles.manage', 'members.manage', 'audit.read']
    }
  ];

  // Predefined role assignments for fallback / visualization
  const roleDefaultMap: Record<string, string[]> = {
    Owner: [
      'medicines.create', 'medicines.read', 'medicines.update', 'medicines.delete',
      'sales.create', 'sales.read',
      'customers.create', 'customers.read', 'customers.update', 'customers.delete',
      'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
      'prescriptions.create', 'prescriptions.read', 'prescriptions.update',
      'expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete',
      'roles.manage', 'members.manage', 'audit.read'
    ],
    Admin: [
      'medicines.create', 'medicines.read', 'medicines.update', 'medicines.delete',
      'sales.create', 'sales.read',
      'customers.create', 'customers.read', 'customers.update', 'customers.delete',
      'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
      'prescriptions.create', 'prescriptions.read', 'prescriptions.update',
      'expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete',
      'roles.manage', 'members.manage', 'audit.read'
    ],
    Pharmacist: [
      'medicines.create', 'medicines.read', 'medicines.update',
      'sales.create', 'sales.read',
      'customers.create', 'customers.read', 'customers.update',
      'prescriptions.create', 'prescriptions.read', 'prescriptions.update',
      'suppliers.read'
    ],
    Cashier: [
      'medicines.read',
      'sales.create', 'sales.read',
      'customers.create', 'customers.read',
      'prescriptions.read'
    ]
  };

  useEffect(() => {
    async function loadRBACMatrix() {
      setLoading(true);
      try {
        const [fetchedRoles, fetchedPerms, fetchedRolePerms] = await Promise.all([
          fetchRolesFromSupabase(organizationId || undefined),
          fetchPermissionsFromSupabase(),
          fetchRolePermissionsFromSupabase()
        ]);

        if (fetchedRoles.length > 0) setRoles(fetchedRoles);
        if (fetchedPerms.length > 0) setPermissions(fetchedPerms);
        if (fetchedRolePerms.length > 0) setRolePermissions(fetchedRolePerms);
      } catch (err) {
        console.warn('Error loading RBAC matrix:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRBACMatrix();
  }, [organizationId]);

  const targetRoles = ['Owner', 'Admin', 'Pharmacist', 'Cashier'];

  const hasPermission = (roleName: string, permName: string): boolean => {
    // If we have live role_permissions matched to role ID & perm ID
    const roleObj = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    const permObj = permissions.find(p => p.name === permName);

    if (roleObj && permObj) {
      const match = rolePermissions.some(rp => rp.role_id === roleObj.id && rp.permission_id === permObj.id);
      if (match) return true;
    }

    // Default RBAC catalog mapping fallback
    return (roleDefaultMap[roleName] || []).includes(permName);
  };

  const isAdmin =
    currentUser.role === 'Super Admin' ||
    currentUser.role === 'Pharmacy Owner' ||
    currentUser.role === 'Administrator';

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Access Restricted: Administrator Privileges Required</h2>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Inspection and configuration of system-wide role permissions and security policies is restricted to Pharmacy Administrators.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <p><strong>Signed in as:</strong> {currentUser.name} ({currentUser.email})</p>
            <p><strong>Current Role:</strong> <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">{currentUser.role}</span></p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your active role does not include governance authority over roles and permissions. Non-admin users are restricted from viewing or altering security policies to preserve tenant integrity. If you require role adjustments, contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Roles & Access Permissions Matrix</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Inspect granular permissions and security enforcement across all pharmacy staff roles
        </p>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Primary Role
            </span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Owner</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Full authority over the organization, billing, data deletion, and tenant governance.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Management
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Admin</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Store operations manager authorized for staff management, expenses, reports & catalog.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Clinical
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pharmacist</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Authorized for medicine inventory batch tracking, prescription verification & POS sales.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Front Desk
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cashier</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Operates point-of-sale checkout, customer patient creation, and receipts printing.
          </p>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Permission Enforcement Grid
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Enforced by PostgreSQL Row-Level Security
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
            <span className="text-xs mt-2 block">Loading RBAC permissions catalog...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Module & System Permission</th>
                  {targetRoles.map(role => (
                    <th key={role} className="p-3 text-center">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissionCategories.map(cat => (
                  <React.Fragment key={cat.name}>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                      <td
                        colSpan={5}
                        className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider"
                      >
                        {cat.name}
                      </td>
                    </tr>
                    {cat.permissions.map(perm => (
                      <tr key={perm} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {perm}
                        </td>
                        {targetRoles.map(role => {
                          const allowed = hasPermission(role, perm);
                          return (
                            <td key={role} className="p-3 text-center">
                              {allowed ? (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
