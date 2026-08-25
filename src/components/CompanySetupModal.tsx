import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Building2,
  Sparkles,
  CheckCircle2,
  X,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Coins,
  Percent,
  Check,
  Shield,
  Zap,
  Gift
} from 'lucide-react';
import { updateOrganizationSettingsInSupabase } from '../lib/supabaseService';

interface CompanySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySetupModal: React.FC<CompanySetupModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetDataStartAfresh, organizationId, addAuditLog, setActiveTab } = usePharmacy();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 2: Pharmacy Info
    pharmacyName: settings.pharmacyName || 'Apex Health Pharmacy',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    licenseNumber: settings.licenseNumber || '',
    taxNumber: settings.vatNumber || '',
    country: 'United States',
    currency: settings.currency || 'USD',
    currencySymbol: settings.currencySymbol || '$',
    timezone: settings.timezone || 'America/New_York',

    // Step 3: Business Setup
    invoicePrefix: settings.invoicePrefix || 'INV',
    vatRate: settings.vatRate ?? 5.0,
    receiptHeaderNotice: settings.receiptHeaderNotice || 'Thank you for choosing our pharmacy!',
    receiptFooterNotice:
      settings.receiptFooterNotice ||
      'Medicines sold are non-refundable after 48h. Valid prescription required for Rx items.',
    startClean: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (currentStep === 2) {
      if (!formData.pharmacyName.trim()) {
        setErrorMsg('Please enter your pharmacy or business name.');
        return;
      }
      if (!formData.email.trim()) {
        setErrorMsg('Please enter your official business email.');
        return;
      }
    }

    if (currentStep === 3) {
      handleFinalSave();
      return;
    }

    setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleFinalSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (organizationId) {
        await updateOrganizationSettingsInSupabase(organizationId, {
          name: formData.pharmacyName,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          license_number: formData.licenseNumber || null,
          vat_number: formData.taxNumber || null,
          currency: formData.currency,
          timezone: formData.timezone,
          invoice_prefix: formData.invoicePrefix || 'INV',
          receipt_header_notice: formData.receiptHeaderNotice || null,
          receipt_footer_notice: formData.receiptFooterNotice || null,
          tax_rate: Number(formData.vatRate)
        });
      }

      updateSettings({
        pharmacyName: formData.pharmacyName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        licenseNumber: formData.licenseNumber,
        vatNumber: formData.taxNumber,
        currency: formData.currency,
        currencySymbol: formData.currencySymbol,
        timezone: formData.timezone,
        invoicePrefix: formData.invoicePrefix,
        vatRate: Number(formData.vatRate),
        receiptHeaderNotice: formData.receiptHeaderNotice,
        receiptFooterNotice: formData.receiptFooterNotice,
        isCompanyConfigured: true
      });

      if (formData.startClean) {
        resetDataStartAfresh();
      }

      addAuditLog(
        'Completed SaaS Onboarding',
        'Onboarding',
        `Successfully onboarded pharmacy: ${formData.pharmacyName} (${formData.currency})`
      );

      setCurrentStep(4);
    } catch (err: any) {
      console.error('Onboarding setup save error:', err);
      setErrorMsg(err?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishAndRedirect = () => {
    onClose();
    if (setActiveTab) {
      setActiveTab('dashboard');
    }
  };

  const stepTitles = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'Pharmacy Info' },
    { num: 3, label: 'Business Setup' },
    { num: 4, label: 'Finish' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Step Progress Bar Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/20">
                Rx
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Pharmacy SaaS Onboarding
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close Onboarding"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Wizard Indicator */}
          <div className="grid grid-cols-4 gap-2">
            {stepTitles.map((step) => {
              const isPassed = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isPassed
                        ? 'bg-emerald-600'
                        : isCurrent
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isPassed ? <Check className="w-2.5 h-2.5" /> : step.num}
                    </span>
                    <span
                      className={`hidden sm:inline truncate ${
                        isCurrent
                          ? 'text-slate-900 dark:text-white font-black'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* ================= STEP 1: WELCOME ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white mx-auto flex items-center justify-center shadow-xl shadow-emerald-600/30">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome to {settings.pharmacyName || 'PharmaSys'}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Let’s configure your digital pharmacy operations in 3 simple steps. Your account comes with an active 14-day free trial on the Starter plan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">Pharmacy Identity</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">License, contact details, and local currency.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">POS & Invoicing</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Receipt headers, VAT rate, and numbering.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">14-Day Free Trial</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Instant access to POS, stock, and prescriptions.</p>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PHARMACY INFORMATION ================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>Pharmacy Information</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your official business registration and geographic settings
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pharmacy / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HealthBridge Pharmacy Ltd"
                    value={formData.pharmacyName}
                    onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="admin@healthbridge.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pharmacy License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PHARM-LIC-2026-99"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tax / VAT Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VAT-8839201"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Physical Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Suite 104, Medical Center Blvd, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operating Currency
                  </label>
                  <select
                    value={`${formData.currency}:${formData.currencySymbol}`}
                    onChange={(e) => {
                      const [code, symbol] = e.target.value.split(':');
                      setFormData({ ...formData, currency: code, currencySymbol: symbol });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
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
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: BUSINESS SETUP ================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>Business & Invoicing Setup</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure checkout tax calculation and receipt disclaimers
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="INV"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tax / VAT Rate (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.vatRate}
                      onChange={(e) => setFormData({ ...formData, vatRate: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Header Notice
                  </label>
                  <input
                    type="text"
                    value={formData.receiptHeaderNotice}
                    onChange={(e) => setFormData({ ...formData, receiptHeaderNotice: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Footer Notice / Disclaimers
                  </label>
                  <textarea
                    rows={2}
                    value={formData.receiptFooterNotice}
                    onChange={(e) => setFormData({ ...formData, receiptFooterNotice: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>

                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.startClean}
                      onChange={(e) => setFormData({ ...formData, startClean: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Start with clean transaction ledger (recommended for fresh store launch)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: FINISH ================= */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center py-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Your pharmacy is ready.
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All company settings, license records, tax rules, and receipt preferences have been saved directly to your PostgreSQL database.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 max-w-md mx-auto text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Pharmacy Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.pharmacyName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Active Currency:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formData.currency} ({formData.currencySymbol})
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Tax Rate:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formData.vatRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Subscription Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    14-Day Free Trial (Active)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          {currentStep > 1 && currentStep < 4 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>{currentStep === 1 ? 'Get Started' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>{isSaving ? 'Configuring System...' : 'Complete & Launch'}</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={handleFinishAndRedirect}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
