import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Building2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Coins,
  Percent,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Languages,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import {
  WORLD_COUNTRIES_AND_LANGUAGES,
  CountryLanguageOption,
  findCountryOption
} from '../data/countriesLanguages';
import {
  fetchOrganizationSettingsFromSupabase,
  updateOrganizationSettingsInSupabase,
  uploadOrganizationLogoToSupabase
} from '../lib/supabaseService';

export const PharmacySettings: React.FC = () => {
  const { settings, updateSettings, organizationId, currentUser, addAuditLog } = usePharmacy();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    pharmacyName: settings.pharmacyName || '',
    licenseNumber: settings.licenseNumber || '',
    phone: settings.phone || '',
    email: settings.email || '',
    website: settings.website || '',
    address: settings.address || '',
    taxNumber: settings.vatNumber || '',
    country: settings.country || 'United States',
    countryCode: settings.countryCode || 'US',
    language: settings.language || 'English (US)',
    languageCode: settings.languageCode || 'en-US',
    currency: settings.currency || 'USD',
    currencySymbol: settings.currencySymbol || '$',
    timezone: settings.timezone || 'UTC',
    vatRate: settings.vatRate ?? 5.0,
    invoicePrefix: settings.invoicePrefix || 'INV',
    receiptHeaderNotice: settings.receiptHeaderNotice || 'Thank you for choosing our pharmacy!',
    receiptFooterNotice: settings.receiptFooterNotice || 'Medicines sold are non-refundable after 48h. Valid prescription required for Rx items.',
    logoUrl: settings.logoUrl || ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwnerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';

  // Load authoritative organization settings directly from PostgreSQL
  useEffect(() => {
    let mounted = true;

    async function loadOrgSettings() {
      if (!organizationId) return;
      setIsLoading(true);
      try {
        const orgData = await fetchOrganizationSettingsFromSupabase(organizationId);
        if (orgData && mounted) {
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

          setForm({
            pharmacyName: orgData.name || '',
            licenseNumber: orgData.license_number || '',
            phone: orgData.phone || '',
            email: orgData.email || '',
            website: orgData.website || '',
            address: orgData.address || '',
            taxNumber: orgData.vat_number || '',
            country: settings.country || 'United States',
            countryCode: settings.countryCode || 'US',
            language: settings.language || 'English (US)',
            languageCode: settings.languageCode || 'en-US',
            currency: currCode,
            currencySymbol: currencySymbols[currCode] || '$',
            timezone: orgData.timezone || 'UTC',
            vatRate: orgData.tax_rate !== null && orgData.tax_rate !== undefined ? Number(orgData.tax_rate) : 5.0,
            invoicePrefix: orgData.invoice_prefix || 'INV',
            receiptHeaderNotice: orgData.receipt_header_notice || 'Thank you for choosing our pharmacy!',
            receiptFooterNotice: orgData.receipt_footer_notice || 'Medicines sold are non-refundable after 48h. Valid prescription required for Rx items.',
            logoUrl: orgData.logo_url || ''
          });
        }
      } catch (err: any) {
        console.warn('Error loading organization settings:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadOrgSettings();

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isOwnerOrAdmin) {
      setErrorMsg('Only Organization Owners and Admins can upload a pharmacy logo.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Logo file size must be less than 3MB.');
      return;
    }

    setIsUploadingLogo(true);
    setErrorMsg(null);

    try {
      const orgKey = organizationId || 'default-org';
      const uploadRes = await uploadOrganizationLogoToSupabase(orgKey, file);

      if (uploadRes.success && uploadRes.url) {
        setForm(prev => ({ ...prev, logoUrl: uploadRes.url! }));
        
        // If organization exists, persist logo URL immediately
        if (organizationId) {
          await updateOrganizationSettingsInSupabase(organizationId, {
            logo_url: uploadRes.url
          });
        }

        updateSettings({ logoUrl: uploadRes.url });
        addAuditLog('Updated Organization Logo', 'Pharmacy Settings', 'Uploaded new pharmacy branding logo');
        setSuccessMsg('Pharmacy logo uploaded and updated successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(uploadRes.error || 'Failed to upload logo.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error processing logo upload.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!isOwnerOrAdmin) return;
    setForm(prev => ({ ...prev, logoUrl: '' }));
    if (organizationId) {
      await updateOrganizationSettingsInSupabase(organizationId, {
        logo_url: null
      });
    }
    updateSettings({ logoUrl: '' });
    addAuditLog('Removed Organization Logo', 'Pharmacy Settings', 'Cleared pharmacy branding logo');
  };

  const handleLoadSampleData = () => {
    if (!isOwnerOrAdmin) return;
    setForm({
      pharmacyName: 'St. Jude International Pharmacy & Clinic',
      licenseNumber: 'RX-INTL-9042-2025',
      phone: '+1 (555) 742-8900',
      email: 'care@stjudepharmacy.com',
      website: 'https://www.stjudepharmacy.com',
      taxNumber: 'VAT-992384-US',
      address: '742 Healthcare Boulevard, Suite 100, Metro City, NY 10001',
      country: 'United States',
      countryCode: 'US',
      language: 'English (US)',
      languageCode: 'en-US',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
      vatRate: '7.5',
      invoicePrefix: 'INV',
      receiptHeaderNotice: 'Thank you for choosing St. Jude International Pharmacy! Quality Healthcare You Can Trust.',
      receiptFooterNotice: 'Keep medicines out of reach of children. Valid Rx required for all controlled prescription items. Emergency Helpline: +1 (555) 742-8900.',
      logoUrl: form.logoUrl || ''
    });
    setSuccessMsg('Populated form with complete sample pharmacy company data! Click "Save Settings" below to persist.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleClearToDefaults = () => {
    if (!isOwnerOrAdmin) return;
    setForm({
      pharmacyName: '',
      licenseNumber: '',
      phone: '',
      email: '',
      website: '',
      taxNumber: '',
      address: '',
      country: 'United States',
      countryCode: 'US',
      language: 'English (US)',
      languageCode: 'en-US',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'UTC',
      vatRate: '0',
      invoicePrefix: 'INV',
      receiptHeaderNotice: '',
      receiptFooterNotice: '',
      logoUrl: ''
    });
    setSuccessMsg('Reset form fields to blank defaults.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrAdmin) {
      setErrorMsg('Only Organization Owners and Admins have permission to modify Pharmacy settings.');
      return;
    }

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Direct PostgreSQL Persistence to public.organizations
      if (organizationId) {
        const updateResult = await updateOrganizationSettingsInSupabase(organizationId, {
          name: form.pharmacyName,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          website: form.website || null,
          license_number: form.licenseNumber || null,
          vat_number: form.taxNumber || null,
          currency: form.currency,
          timezone: form.timezone,
          invoice_prefix: form.invoicePrefix || 'INV',
          receipt_header_notice: form.receiptHeaderNotice || null,
          receipt_footer_notice: form.receiptFooterNotice || null,
          logo_url: form.logoUrl || null,
          tax_rate: Number(form.vatRate)
        });

        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to persist organization settings to database.');
        }
      }

      // 2. Synchronize in-memory app state and context
      updateSettings({
        pharmacyName: form.pharmacyName,
        licenseNumber: form.licenseNumber,
        phone: form.phone,
        email: form.email,
        website: form.website,
        vatNumber: form.taxNumber,
        address: form.address,
        country: form.country,
        countryCode: form.countryCode,
        language: form.language,
        languageCode: form.languageCode,
        vatRate: Number(form.vatRate),
        currency: form.currency,
        currencySymbol: form.currencySymbol,
        timezone: form.timezone,
        invoicePrefix: form.invoicePrefix,
        receiptHeaderNotice: form.receiptHeaderNotice,
        receiptFooterNotice: form.receiptFooterNotice,
        logoUrl: form.logoUrl,
        isCompanyConfigured: true
      });

      addAuditLog(
        'Updated Organization Settings',
        'Pharmacy Settings',
        `Persisted settings for ${form.pharmacyName} (Currency: ${form.currency}, Tax: ${form.vatRate}%)`
      );

      setSuccessMsg('Pharmacy organization settings saved and persisted to database!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save pharmacy settings:', err);
      setErrorMsg(err?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Pharmacy & Organization Settings</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure pharmacy entity details, legal license, tax rules, currency, and receipt formats
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwnerOrAdmin && (
            <>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                title="Fill in all fields with realistic sample pharmacy data"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Fill Sample Pharmacy Info</span>
              </button>

              <button
                type="button"
                onClick={handleClearToDefaults}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition"
                title="Clear inputs to blank defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            </>
          )}

          {organizationId && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
              Tenant ID: {organizationId.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Permissions notice for non-admins */}
      {!isOwnerOrAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Read-Only Access</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Your active role ({currentUser.role}) has view-only permissions. Only Organization Owners and Store Managers can update official pharmacy configurations.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading organization settings from database...</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pharmacy Branding & Logo Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Pharmacy Branding & Logo
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner shrink-0 relative group">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Pharmacy Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/*"
                  className="hidden"
                  disabled={!isOwnerOrAdmin || isUploadingLogo}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOwnerOrAdmin || isUploadingLogo}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>Uploading Logo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Upload Store Logo</span>
                    </>
                  )}
                </button>

                {form.logoUrl && isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs transition"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Recommended dimensions: 256x256px or transparent PNG. Used on POS receipts and reports.
              </p>
            </div>
          </div>
        </div>

        {/* Business Entity Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Pharmacy Identity & Legal License
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pharmacy / Business Name *
              </label>
              <input
                type="text"
                required
                disabled={!isOwnerOrAdmin}
                value={form.pharmacyName}
                onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
                placeholder="e.g. Apex Health Pharmacy"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pharmacy Operating License No. *
              </label>
              <input
                type="text"
                required
                disabled={!isOwnerOrAdmin}
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                placeholder="e.g. PHARM-LIC-2026-9901"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tax / VAT Registration Number
              </label>
              <input
                type="text"
                disabled={!isOwnerOrAdmin}
                value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                placeholder="e.g. VAT-99201488"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  disabled={!isOwnerOrAdmin}
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Location Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Contact & Location Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  disabled={!isOwnerOrAdmin}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Business Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled={!isOwnerOrAdmin}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@pharmacy.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Physical Pharmacy Address
              </label>
              <input
                type="text"
                disabled={!isOwnerOrAdmin}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Suite 104, Medical Center Blvd, City, Country"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Country, Language & Internationalization Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Country of Operation & Operational Language
              </h3>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Internationalization
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Select your country of operation and primary language. Selecting your country automatically adapts your default currency, currency symbol, tax conventions, and system timezone.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Country of Operation</span>
                <span className="text-[11px] text-slate-400 font-normal">World Countries ({WORLD_COUNTRIES_AND_LANGUAGES.length})</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  disabled={!isOwnerOrAdmin}
                  value={form.countryCode || 'US'}
                  onChange={(e) => {
                    const selectedCode = e.target.value;
                    const matched = WORLD_COUNTRIES_AND_LANGUAGES.find(c => c.code === selectedCode);
                    if (matched) {
                      setForm({
                        ...form,
                        country: matched.country,
                        countryCode: matched.code,
                        language: matched.language,
                        languageCode: matched.langCode,
                        currency: matched.currency,
                        currencySymbol: matched.currencySymbol,
                        timezone: matched.timezone || form.timezone
                      });
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                >
                  {WORLD_COUNTRIES_AND_LANGUAGES.map(item => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.country} ({item.code}) — {item.currency} ({item.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Primary Operational Language</span>
                <span className="text-[11px] text-slate-400 font-normal">Active: {form.language}</span>
              </label>
              <div className="relative">
                <Languages className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  disabled={!isOwnerOrAdmin}
                  value={form.languageCode || 'en-US'}
                  onChange={(e) => {
                    const selectedLangCode = e.target.value;
                    const matched = WORLD_COUNTRIES_AND_LANGUAGES.find(c => c.langCode === selectedLangCode)
                      || WORLD_COUNTRIES_AND_LANGUAGES.find(c => c.language === selectedLangCode);
                    if (matched) {
                      setForm({
                        ...form,
                        language: matched.language,
                        languageCode: matched.langCode
                      });
                    } else {
                      setForm({
                        ...form,
                        languageCode: selectedLangCode
                      });
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                >
                  {WORLD_COUNTRIES_AND_LANGUAGES.map(item => (
                    <option key={`${item.code}-${item.langCode}`} value={item.langCode}>
                      {item.flag} {item.language} — {item.country} ({item.nativeLang})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Localized Summary Pill */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">{findCountryOption(form.countryCode || form.country)?.flag || '🌐'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {form.country || 'United States'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                {form.language || 'English (US)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Currency: {form.currency} ({form.currencySymbol}) | Timezone: {form.timezone}
            </div>
          </div>
        </div>

        {/* Currency & Financial Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Coins className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Currency, Timezone & Regional Tax
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Currency Preset
              </label>
              <select
                disabled={!isOwnerOrAdmin}
                value={`${form.currency}:${form.currencySymbol}`}
                onChange={(e) => {
                  const [code, symbol] = e.target.value.split(':');
                  setForm({ ...form, currency: code, currencySymbol: symbol });
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              >
                <option value="USD:$">USD ($) - US Dollar</option>
                <option value="EUR:€">EUR (€) - Euro</option>
                <option value="GBP:£">GBP (£) - British Pound</option>
                <option value="GHS:GH₵">GHS (GH₵) - Ghana Cedi</option>
                <option value="NGN:₦">NGN (₦) - Nigerian Naira</option>
                <option value="KES:KSh">KES (KSh) - Kenyan Shilling</option>
                <option value="ZAR:R">ZAR (R) - South African Rand</option>
                <option value="INR:₹">INR (₹) - Indian Rupee</option>
                <option value="CAD:$">CAD ($) - Canadian Dollar</option>
                <option value="AUD:$">AUD ($) - Australian Dollar</option>
                <option value="AED:AED">AED (AED) - UAE Dirham</option>
                <option value="SAR:SAR">SAR (SAR) - Saudi Riyal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tax / VAT Rate (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={!isOwnerOrAdmin}
                  value={form.vatRate}
                  onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Timezone
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  disabled={!isOwnerOrAdmin}
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                  <option value="Africa/Accra">Africa/Accra (GMT)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt & Invoice Format Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              POS Invoices & Thermal Receipt Customization
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                disabled={!isOwnerOrAdmin}
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                placeholder="INV"
                className="w-full sm:w-48 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Receipt Header Notice
              </label>
              <input
                type="text"
                disabled={!isOwnerOrAdmin}
                value={form.receiptHeaderNotice}
                onChange={(e) => setForm({ ...form, receiptHeaderNotice: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Receipt Footer Notice / Disclaimers
              </label>
              <textarea
                rows={2}
                disabled={!isOwnerOrAdmin}
                value={form.receiptFooterNotice}
                onChange={(e) => setForm({ ...form, receiptFooterNotice: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        {isOwnerOrAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Persisting Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Pharmacy Settings</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
