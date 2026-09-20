import React, { useState, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  User,
  Mail,
  Phone,
  Camera,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  Sparkles,
  Calendar,
  Building,
  Trash2
} from 'lucide-react';
import { updateUserProfileInSupabase, uploadAvatarToSupabase } from '../lib/supabaseService';

export const Profile: React.FC = () => {
  const { currentUser, setCurrentUser, addAuditLog, updatePassword } = usePharmacy();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentUser.avatar);
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileErrorMsg('Image size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setProfileErrorMsg(null);
    try {
      const uploadRes = await uploadAvatarToSupabase(currentUser.id, file);
      if (uploadRes.success && uploadRes.url) {
        setAvatarUrl(uploadRes.url);
        // Persist immediately to profile
        await updateUserProfileInSupabase(currentUser.id, fullName || currentUser.name, uploadRes.url);
        setCurrentUser({ ...currentUser, avatar: uploadRes.url });
        addAuditLog('Updated Profile Avatar', 'User Profile', `Uploaded new avatar for ${currentUser.email}`);
        setProfileSuccessMsg('Profile photo updated successfully!');
        setTimeout(() => setProfileSuccessMsg(null), 3000);
      } else {
        setProfileErrorMsg(uploadRes.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Error uploading avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setProfileErrorMsg(null);
    try {
      const res = await updateUserProfileInSupabase(currentUser.id, fullName || currentUser.name, null);
      if (res.success) {
        setAvatarUrl(undefined);
        setCurrentUser({ ...currentUser, avatar: undefined });
        addAuditLog('Removed Profile Avatar', 'User Profile', `Removed avatar photo for ${currentUser.email}`);
        setProfileSuccessMsg('Profile photo removed successfully.');
        setTimeout(() => setProfileSuccessMsg(null), 3000);
      } else {
        setProfileErrorMsg(res.error || 'Failed to remove photo.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Error removing photo.');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileErrorMsg('Full Name is required.');
      return;
    }

    setIsSaving(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await updateUserProfileInSupabase(currentUser.id, fullName.trim(), avatarUrl);
      if (res.success) {
        setCurrentUser({
          ...currentUser,
          name: fullName.trim(),
          phone: phone.trim(),
          avatar: avatarUrl
        });
        addAuditLog('Updated Profile Information', 'User Profile', `Updated profile for ${currentUser.email}`);
        setProfileSuccessMsg('Profile information saved successfully!');
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      } else {
        setProfileErrorMsg(res.error || 'Failed to save profile changes.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        setPasswordSuccessMsg('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      } else {
        setPasswordErrorMsg(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordErrorMsg(err?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>My Profile & Account</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, profile avatar, and account credentials
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Profile Notifications */}
        {profileSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        {/* Top Avatar & Overview Row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-3xl shadow-lg shadow-emerald-600/20 overflow-hidden border-2 border-white dark:border-slate-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(fullName || currentUser.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition disabled:opacity-50"
              title="Upload New Profile Photo"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {fullName || currentUser.name || 'Staff Member'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {currentUser.role}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {currentUser.status || 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5" />
              <span>{currentUser.email || 'Authenticated User'}</span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
              Supports secure photo upload. Maximum file size: 5MB.
            </p>

            {/* Profile Photo Actions: Upload & Remove */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isRemovingAvatar}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Remove Profile Photo"
                >
                  {isRemovingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{isRemovingAvatar ? 'Removing...' : 'Remove Photo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Alex Johnson"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Contact
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address (Auth Managed)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email is managed securely by system authentication.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned System Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  disabled
                  value={`${currentUser.role} (Assigned by Organization Owner)`}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Change Account Password
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Update your account password
            </p>
          </div>
        </div>

        {passwordSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccessMsg}</span>
          </div>
        )}

        {passwordErrorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
