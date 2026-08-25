import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  Lock,
  Loader2,
  Edit2,
  CreditCard,
  AlertTriangle,
  Send,
  Copy,
  ExternalLink,
  MailCheck,
  Check,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  fetchOrganizationMembersFromSupabase,
  updateMemberRoleInSupabase,
  updateMemberStatusInSupabase,
  removeMemberFromSupabase,
  fetchRolesFromSupabase,
  OrganizationMemberDetail
} from '../lib/supabaseService';
import {
  triggerStaffInviteEmail,
  generateStaffInviteContent,
  StaffInviteEmailResponse
} from '../lib/edgeFunctions';
import { UserRole } from '../types';

export const StaffManagement: React.FC = () => {
  const { organizationId, currentUser, users, settings, addUser, updateUserStatus, deleteUser, addAuditLog, setActiveTab } = usePharmacy();
  const { plan, limits, canAddUser, isExpired, isTrial } = useSubscription();
  const [members, setMembers] = useState<OrganizationMemberDetail[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('TempPass123!');
  const [inviteRole, setInviteRole] = useState<UserRole>('Pharmacist');
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [customEmailNote, setCustomEmailNote] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Email Notification & Summary Modals
  const [inviteEmailSuccessDetails, setInviteEmailSuccessDetails] = useState<StaffInviteEmailResponse | null>(null);
  const [activeEmailTarget, setActiveEmailTarget] = useState<{
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
    customNote: string;
  } | null>(null);
  const [isSendingDirectEmail, setIsSendingDirectEmail] = useState(false);
  const [emailModalResult, setEmailModalResult] = useState<StaffInviteEmailResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Role Modal
  const [editingMember, setEditingMember] = useState<OrganizationMemberDetail | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // View Profile Modal
  const [viewingMember, setViewingMember] = useState<OrganizationMemberDetail | null>(null);

  // Delete Target Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'member' | 'user';
    id: string;
    name: string;
    email?: string;
    role?: string;
    isOwner?: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwnerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const loadStaffData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedMembers] = await Promise.all([
        fetchRolesFromSupabase(organizationId || undefined),
        organizationId ? fetchOrganizationMembersFromSupabase(organizationId) : Promise.resolve([])
      ]);

      setAvailableRoles(fetchedRoles);
      setMembers(fetchedMembers);
    } catch (err) {
      console.warn('Error loading staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, [organizationId]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrAdmin) {
      setErrorMsg('You do not have permission to invite staff members.');
      return;
    }

    if (isExpired) {
      setErrorMsg('Your subscription is expired. Please upgrade your plan to add new staff members.');
      return;
    }

    if (!canAddUser) {
      setErrorMsg(`Plan seat limit reached (${limits.currentUsers}/${limits.maxUsers} users). Upgrade to Professional or Business to add more team members.`);
      return;
    }

    setIsSubmittingInvite(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Create user in context / user catalog
      addUser({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        status: 'Active'
      });

      addAuditLog('Staff Member Added', 'Staff Management', `Invited ${inviteName} (${inviteEmail}) as ${inviteRole}`);

      let emailResult: StaffInviteEmailResponse | null = null;

      // 2. Dispatch email notification if enabled
      if (sendEmailInvite) {
        try {
          emailResult = await triggerStaffInviteEmail({
            staffName: inviteName,
            recipientEmail: inviteEmail,
            role: inviteRole,
            temporaryPassword: invitePassword,
            organizationName: settings?.name || 'PharmaCore Pharmacy',
            senderName: currentUser.name || 'Administrator',
            customMessage: customEmailNote
          });

          if (emailResult.success) {
            addAuditLog('Staff Invitation Email Sent', 'Staff Management', `Dispatched invitation email notification to ${inviteEmail}`);
          }
        } catch (emailErr) {
          console.warn('Failed to send email notification:', emailErr);
        }
      }

      setShowInviteModal(false);

      if (emailResult && emailResult.success) {
        setInviteEmailSuccessDetails(emailResult);
      } else {
        setSuccessMsg(`Staff member ${inviteName} successfully created!`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }

      // Reset form
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('TempPass123!');
      setCustomEmailNote('');
      
      // Reload members
      await loadStaffData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add staff member.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleSendDirectEmailNotification = async () => {
    if (!activeEmailTarget) return;

    setIsSendingDirectEmail(true);
    setEmailModalResult(null);

    try {
      const res = await triggerStaffInviteEmail({
        staffName: activeEmailTarget.name,
        recipientEmail: activeEmailTarget.email,
        role: activeEmailTarget.role,
        temporaryPassword: activeEmailTarget.temporaryPassword,
        organizationName: settings?.name || 'PharmaCore Pharmacy',
        senderName: currentUser.name || 'Administrator',
        customMessage: activeEmailTarget.customNote
      });

      setEmailModalResult(res);
      if (res.success) {
        addAuditLog('Staff Notification Dispatched', 'Staff Management', `Invitation notification email sent to ${activeEmailTarget.email}`);
      }
    } catch (err: any) {
      setEmailModalResult({
        success: false,
        message: err?.message || 'Failed to send email notification.',
        recipient: activeEmailTarget.email,
        emailStatus: 'failed',
        subject: '',
        body: '',
        mailtoUrl: '',
        loginUrl: '',
        error: err?.message
      });
    } finally {
      setIsSendingDirectEmail(false);
    }
  };

  const openEmailModalForStaff = (staff: { name: string; email: string; role: string }) => {
    setActiveEmailTarget({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      temporaryPassword: 'TempPass123!',
      customNote: ''
    });
    setEmailModalResult(null);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !selectedRoleId) return;

    if (!isOwnerOrAdmin) {
      setErrorMsg('You do not have permission to alter staff roles.');
      return;
    }

    // Prevent non-superadmins from promoting themselves or demoting owners
    if (editingMember.role?.name === 'Owner' && currentUser.role !== 'Super Admin') {
      setErrorMsg('Cannot alter Owner role.');
      return;
    }

    setIsUpdatingRole(true);
    try {
      const res = await updateMemberRoleInSupabase(editingMember.id, selectedRoleId);
      if (res.success) {
        addAuditLog(
          'Staff Role Changed',
          'Staff Management',
          `Changed role for ${editingMember.profile?.full_name || editingMember.profile?.email}`
        );
        setSuccessMsg('Staff member role updated successfully!');
        setEditingMember(null);
        await loadStaffData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(res.error || 'Failed to update role.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to change role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleToggleActive = async (member: OrganizationMemberDetail) => {
    if (!isOwnerOrAdmin) return;
    try {
      const newStatus = !member.is_active;
      await updateMemberStatusInSupabase(member.id, newStatus);
      addAuditLog(
        'Staff Status Changed',
        'Staff Management',
        `${member.profile?.full_name || member.profile?.email} set to ${newStatus ? 'Active' : 'Inactive'}`
      );
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: newStatus } : m));
      setSuccessMsg(`Member status updated to ${newStatus ? 'Active' : 'Inactive'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to toggle member status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (!isOwnerOrAdmin) {
      setErrorMsg('You do not have permission to remove team members.');
      setDeleteTarget(null);
      return;
    }

    if (deleteTarget.isOwner) {
      setErrorMsg('Cannot remove the organization owner.');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      if (deleteTarget.type === 'member') {
        await removeMemberFromSupabase(deleteTarget.id);
        addAuditLog(
          'Staff Removed',
          'Staff Management',
          `Removed ${deleteTarget.name} (${deleteTarget.email || ''}) from organization`
        );
        setMembers(prev => prev.filter(m => m.id !== deleteTarget.id));
      } else {
        deleteUser(deleteTarget.id);
        addAuditLog(
          'Staff Removed',
          'Staff Management',
          `Removed staff member ${deleteTarget.name} (${deleteTarget.email || ''})`
        );
      }

      setSuccessMsg(`Staff member ${deleteTarget.name} was successfully removed.`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove staff member.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Staff & Team Management</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage authorized pharmacy employees, RBAC permissions, and team credentials
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Plan Seats Counter */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <span className="text-slate-500">Plan Seats:</span>
            <span className={limits.currentUsers >= limits.maxUsers ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {limits.currentUsers} / {limits.maxUsers}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold">
              {plan.name}
            </span>
          </div>

          {isOwnerOrAdmin && (
            <button
              onClick={() => {
                if (isExpired) {
                  setErrorMsg('Subscription expired. Upgrade your plan to invite more staff members.');
                  return;
                }
                if (!canAddUser) {
                  setErrorMsg(`Seat limit reached (${limits.currentUsers}/${limits.maxUsers} users). Upgrade to add more seats.`);
                  return;
                }
                setShowInviteModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Usage / Upgrade Notice */}
      {!canAddUser && !isExpired && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Staff Seat Limit Reached ({limits.currentUsers} of {limits.maxUsers} max users allocated)
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Upgrade your subscription plan to invite additional pharmacists, cashiers, and store managers.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('subscription')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Pharmacy Personnel</h3>
            <p className="text-xs text-slate-500">Authorized login credentials and assigned operational roles</p>
          </div>
          <div className="text-xs text-slate-500">
            Total Staff: <span className="font-bold text-slate-900 dark:text-white">{members.length > 0 ? members.length : users.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3">Staff Member</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : members.length > 0 ? (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden">
                        {m.profile?.avatar_url ? (
                          <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (m.profile?.full_name || m.profile?.email || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div>{m.profile?.full_name || 'Staff Member'}</div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {m.profile?.email}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {m.role?.name || 'Pharmacist'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => openEmailModalForStaff({
                          name: m.profile?.full_name || 'Staff Member',
                          email: m.profile?.email || '',
                          role: m.role?.name || 'Pharmacist'
                        })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800 transition cursor-pointer inline-flex items-center gap-1"
                        title="Send / Resend Email Notification"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email Invite</span>
                      </button>

                      <button
                        onClick={() => setViewingMember(m)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer"
                        title="View Full Profile"
                      >
                        Profile
                      </button>
                      {isOwnerOrAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setSelectedRoleId(m.role_id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-[11px] border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition cursor-pointer"
                          >
                            Role
                          </button>
                          <button
                            onClick={() => handleToggleActive(m)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px] hover:bg-slate-200 transition cursor-pointer"
                          >
                            {m.is_active ? 'Disable' : 'Enable'}
                          </button>
                          {m.role?.name !== 'Owner' && (
                            <button
                              onClick={() => setDeleteTarget({
                                type: 'member',
                                id: m.id,
                                name: m.profile?.full_name || m.profile?.email || 'Staff Member',
                                email: m.profile?.email,
                                role: m.role?.name,
                                isOwner: m.role?.name === 'Owner'
                              })}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold text-[11px] border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                              title={`Remove ${m.profile?.full_name || 'Staff Member'}`}
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                // Local Users Fallback view
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div>{u.name}</div>
                        {u.phone && <div className="text-[10px] text-slate-400 font-normal">{u.phone}</div>}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Active'}</td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => openEmailModalForStaff({
                          name: u.name,
                          email: u.email,
                          role: u.role
                        })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800 transition cursor-pointer inline-flex items-center gap-1"
                        title="Send / Resend Email Notification"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email Invite</span>
                      </button>

                      {isOwnerOrAdmin && (
                        <>
                          <button
                            onClick={() => {
                              const nextStatus = u.status === 'Active' ? 'Inactive' : 'Active';
                              updateUserStatus(u.id, nextStatus);
                              setSuccessMsg(`${u.name} set to ${nextStatus}.`);
                              setTimeout(() => setSuccessMsg(null), 3000);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer"
                          >
                            {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => setDeleteTarget({
                                type: 'user',
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role
                              })}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold text-[11px] border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                              title={`Remove ${u.name}`}
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Invite New Staff Member</span>
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Dr. Jennifer Smith"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jennifer@pharmacy.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Assigned Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Pharmacist">Pharmacist (Clinical, Rx & POS)</option>
                    <option value="Cashier">Cashier (POS Checkout & Customers)</option>
                    <option value="Store Manager">Store Manager (Purchases & Reports)</option>
                    <option value="Super Admin">Super Admin (Full Administrative Authority)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Initial Temporary Password *</label>
                  <input
                    type="text"
                    required
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Email Notification Option */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                <label className="flex items-center gap-2 font-bold text-slate-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailInvite}
                    onChange={(e) => setSendEmailInvite(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Send automated email notification with login credentials</span>
                  </div>
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                  The recipient will receive an invitation email containing the portal URL, assigned role, and login password.
                </p>

                {sendEmailInvite && (
                  <div className="pl-6 pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Optional Welcome Note:
                    </label>
                    <textarea
                      rows={2}
                      value={customEmailNote}
                      onChange={(e) => setCustomEmailNote(e.target.value)}
                      placeholder="e.g. Welcome to the pharmacy team! Please report to shift lead on your first day."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Invitation...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{sendEmailInvite ? 'Send Invitation & Email' : 'Create Staff Member'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct / Resend Email Notification Modal */}
      {activeEmailTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Staff Email Notification</h3>
                  <p className="text-slate-500 text-[11px]">Send or resend team access credentials and login link</p>
                </div>
              </div>
              <button onClick={() => setActiveEmailTarget(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeEmailTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{activeEmailTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{activeEmailTarget.role}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Temporary Login Password</label>
                <input
                  type="text"
                  value={activeEmailTarget.temporaryPassword}
                  onChange={(e) => setActiveEmailTarget({ ...activeEmailTarget, temporaryPassword: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Custom Note (Optional)</label>
                <textarea
                  rows={2}
                  value={activeEmailTarget.customNote}
                  onChange={(e) => setActiveEmailTarget({ ...activeEmailTarget, customNote: e.target.value })}
                  placeholder="e.g. Please log in before tomorrow morning to review clinical SOPs."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-500 font-semibold mb-1">
                  <span>Email Content Preview</span>
                  <button
                    type="button"
                    onClick={() => {
                      const content = generateStaffInviteContent({
                        staffName: activeEmailTarget.name,
                        recipientEmail: activeEmailTarget.email,
                        role: activeEmailTarget.role,
                        temporaryPassword: activeEmailTarget.temporaryPassword,
                        organizationName: settings?.name,
                        senderName: currentUser.name,
                        customMessage: activeEmailTarget.customNote
                      });
                      copyToClipboard(content.body, 'preview');
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'preview' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'preview' ? 'Copied!' : 'Copy Template'}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed max-h-32 overflow-y-auto p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {generateStaffInviteContent({
                    staffName: activeEmailTarget.name,
                    recipientEmail: activeEmailTarget.email,
                    role: activeEmailTarget.role,
                    temporaryPassword: activeEmailTarget.temporaryPassword,
                    organizationName: settings?.name,
                    senderName: currentUser.name,
                    customMessage: activeEmailTarget.customNote
                  }).body}
                </pre>
              </div>

              {/* Status Message */}
              {emailModalResult && (
                <div className={`p-3 rounded-xl flex items-start gap-2.5 ${emailModalResult.success ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}>
                  {emailModalResult.success ? (
                    <MailCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{emailModalResult.success ? 'Email Notification Dispatched' : 'Failed to Dispatch'}</p>
                    <p className="text-[11px] mt-0.5">{emailModalResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <a
                href={generateStaffInviteContent({
                  staffName: activeEmailTarget.name,
                  recipientEmail: activeEmailTarget.email,
                  role: activeEmailTarget.role,
                  temporaryPassword: activeEmailTarget.temporaryPassword,
                  organizationName: settings?.name,
                  senderName: currentUser.name,
                  customMessage: activeEmailTarget.customNote
                }).mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition text-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open in Email App</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveEmailTarget(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendDirectEmailNotification}
                  disabled={isSendingDirectEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSendingDirectEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Email Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Successful Invitation & Email Notification Modal */}
      {inviteEmailSuccessDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                <MailCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Invitation Email Dispatched</h3>
                <p className="text-slate-500 text-xs">Credentials and access link delivered</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-900 dark:text-emerald-200 font-bold">Delivery Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                  {inviteEmailSuccessDetails.emailStatus}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 text-xs space-y-1">
                <p>An automated onboarding notification was dispatched to <span className="font-mono font-bold text-slate-900 dark:text-white">{inviteEmailSuccessDetails.recipient}</span>.</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(inviteEmailSuccessDetails.body, 'inviteBody')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer text-xs"
              >
                {copiedKey === 'inviteBody' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedKey === 'inviteBody' ? 'Copied Invitation!' : 'Copy Invitation Text'}</span>
              </button>

              <a
                href={inviteEmailSuccessDetails.mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer text-xs"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <span>Open Mail Client</span>
              </a>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInviteEmailSuccessDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold shadow transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Change Staff Role</h3>
              <button onClick={() => setEditingMember(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                Update role for <span className="font-bold text-slate-900 dark:text-white">{editingMember.profile?.full_name || editingMember.profile?.email}</span>:
              </p>

              <div>
                <label className="font-semibold block mb-1">Select New Role</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description || 'System Role'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isUpdatingRole ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Staff Member Details</h3>
              <button onClick={() => setViewingMember(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xl overflow-hidden shadow-md">
                {viewingMember.profile?.avatar_url ? (
                  <img src={viewingMember.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (viewingMember.profile?.full_name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {viewingMember.profile?.full_name || 'Staff Member'}
                </h4>
                <p className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {viewingMember.profile?.email}
                </p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {viewingMember.role?.name || 'Member'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Organization Status:</span>
                <span className="font-bold text-emerald-600">{viewingMember.is_active ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date Joined:</span>
                <span className="font-mono">{new Date(viewingMember.joined_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role Description:</span>
                <span>{viewingMember.role?.description || 'Standard Access'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingMember(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Staff Member Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Remove Staff Member</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Revoke access and remove credentials</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{deleteTarget.name}</span>?
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                {deleteTarget.email && (
                  <p>📧 Email: <span className="font-mono text-slate-700 dark:text-slate-300">{deleteTarget.email}</span></p>
                )}
                {deleteTarget.role && (
                  <p>🛡️ Assigned Role: <span className="font-semibold text-slate-700 dark:text-slate-300">{deleteTarget.role}</span></p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              ⚠️ This user will no longer be able to log in, process sales, or access pharmacy management features.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
