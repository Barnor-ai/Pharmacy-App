import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Sliders,
  Calendar,
  Clock,
  CreditCard,
  AlertTriangle,
  Receipt,
  Save,
  CheckCircle2,
  Coins,
  ShieldCheck
} from 'lucide-react';
import { updateOrganizationSettingsInSupabase } from '../lib/supabaseService';

export const PreferencesPage: React.FC = () => {
  const { settings, updateSettings, addAuditLog, organizationId, currentUser } = usePharmacy();

  const isOwnerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';

  const [currencyCode, setCurrencyCode] = useState(settings.currency || 'USD');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '$');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('12-hour');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('Cash');
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold || 10);
  const [expiryWarningDays, setExpiryWarningDays] = useState(settings.expiryWarningDays || 90);
  const [enablePrescriptionAlert, setEnablePrescriptionAlert] = useState(settings.enablePrescriptionAlert ?? true);
  const [enableLoyaltyProgram, setEnableLoyaltyProgram] = useState(settings.enableLoyaltyProgram ?? true);

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();

    if (organizationId && isOwnerOrAdmin) {
      try {
        await updateOrganizationSettingsInSupabase(organizationId, {
          currency: currencyCode
        });
      } catch (err) {
        console.warn('Failed to sync currency preference to organization:', err);
      }
    }

    updateSettings({
      currency: currencyCode,
      currencySymbol,
      lowStockThreshold: Number(lowStockThreshold),
      expiryWarningDays: Number(expiryWarningDays),
      enablePrescriptionAlert,
      enableLoyaltyProgram
    });

    addAuditLog('Updated Application Preferences', 'Preferences', `Modified currency (${currencyCode}) & regional thresholds`);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Application & Regional Preferences</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize display formatting, POS checkout defaults, inventory thresholds, and alert schedules
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Application preferences saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Regional & Financial Preferences */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Coins className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Regional & Formatting Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Display Currency
              </label>
              <select
                value={`${currencyCode}:${currencySymbol}`}
                onChange={(e) => {
                  const [code, symbol] = e.target.value.split(':');
                  setCurrencyCode(code);
                  setCurrencySymbol(symbol);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
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
                Date Format
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-24)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (24/08/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (08/24/2026)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (24-Aug-2026)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Time Format
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="12-hour">12-Hour (03:30 PM)</option>
                  <option value="24-hour">24-Hour (15:30)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* POS & Checkout Preferences */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              POS & Payment Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Default POS Payment Method
              </label>
              <select
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Cash">Cash (Physical Currency)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Mobile Payment">Mobile Payment (M-Pesa / MoMo / Apple Pay)</option>
                <option value="Insurance">Insurance Policy Claim</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Patient Features
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLoyaltyProgram}
                    onChange={(e) => setEnableLoyaltyProgram(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Enable Patient Loyalty Rewards (Points per Purchase)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePrescriptionAlert}
                    onChange={(e) => setEnablePrescriptionAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Require Prescription verification for Rx Scheduled medicines</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Threshold Rules */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Inventory Alerts & Expiry Thresholds
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Global Low-Stock Warning Threshold (Units)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Medicines at or below this count will trigger amber Low Stock alerts.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expiry Alert Horizon (Days in Advance)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={expiryWarningDays}
                onChange={(e) => setExpiryWarningDays(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Batches expiring within this number of days will be flagged for disposal.
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
