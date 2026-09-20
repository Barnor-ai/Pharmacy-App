import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  TenantExportEngine,
  EXPORTABLE_DATASETS,
  ExportDatasetKey,
  DatasetInfo
} from '../lib/exportService';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Archive,
  Database,
  ShieldCheck,
  AlertTriangle,
  Server,
  Lock,
  Clock,
  CheckCircle2,
  Package,
  Users,
  Building2,
  Receipt,
  FileText,
  DollarSign,
  Layers,
  History,
  Info,
  ShieldAlert,
  Loader2,
  Check
} from 'lucide-react';

export const DataExportPage: React.FC = () => {
  const { currentUser, settings, organizationId, addAuditLog } = usePharmacy();
  const { plan } = useSubscription();

  // Access control checks
  const isOwnerOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Store Manager';
  const hasNoAccess = !isOwnerOrAdmin;

  // State
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [exportPercentage, setExportPercentage] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastExportStatus, setLastExportStatus] = useState<{
    message: string;
    timestamp: string;
    isError?: boolean;
  } | null>(null);

  // Group datasets by Category
  const categories = [
    'Inventory & Catalog',
    'Commerce & Sales',
    'Clinical & Rx',
    'Financial & Operations',
    'Administration'
  ] as const;

  const getDatasetIcon = (key: ExportDatasetKey) => {
    switch (key) {
      case 'medicines':
        return Package;
      case 'customers':
        return Users;
      case 'suppliers':
        return Building2;
      case 'sales':
        return Receipt;
      case 'sale_items':
        return FileText;
      case 'prescriptions':
        return FileSpreadsheet;
      case 'expenses':
        return DollarSign;
      case 'audit_logs':
        return History;
      case 'staff':
        return Users;
      case 'organization':
        return Building2;
      case 'subscription':
        return Layers;
      case 'subscription_payments':
        return DollarSign;
      default:
        return Database;
    }
  };

  const handleDownloadSingle = async (key: ExportDatasetKey, format: 'csv' | 'json') => {
    if (!organizationId) {
      setLastExportStatus({
        message: 'Cannot export: No active tenant organization resolved.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
      return;
    }

    const downloadId = `${key}-${format}`;
    setDownloadingKey(downloadId);
    addAuditLog('Initiated Data Export', 'Data Export', `Dataset: ${key}, Format: ${format.toUpperCase()}`);

    try {
      const result = await TenantExportEngine.downloadSingleDataset(
        key,
        format,
        settings.pharmacyName || 'Pharmacy',
        organizationId
      );

      if (result.success) {
        setLastExportStatus({
          message: `Successfully exported ${key.toUpperCase()} (${result.recordCount} records) as ${format.toUpperCase()}.`,
          timestamp: new Date().toLocaleTimeString()
        });
        addAuditLog(
          'Completed Data Export',
          'Data Export',
          `Dataset: ${key} (${result.recordCount} records), Format: ${format.toUpperCase()}`
        );
      } else {
        setLastExportStatus({
          message: `Export failed: ${result.error}`,
          timestamp: new Date().toLocaleTimeString(),
          isError: true
        });
        addAuditLog('Data Export Failed', 'Data Export', `Dataset: ${key}, Error: ${result.error}`);
      }
    } catch (err: any) {
      const errMessage = err?.message || 'Unknown error';
      setLastExportStatus({
        message: `Export error: ${errMessage}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
      addAuditLog('Data Export Failed', 'Data Export', `Dataset: ${key}, Error: ${errMessage}`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!organizationId) {
      setLastExportStatus({
        message: 'Cannot export: No active tenant organization resolved.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
      setShowConfirmModal(false);
      return;
    }

    setShowConfirmModal(false);
    setIsExportingAll(true);
    setExportProgressText('Preparing tenant export package...');
    setExportPercentage(5);
    addAuditLog('Initiated Full Tenant Backup Export', 'Data Export', 'Format: ZIP Package Archive (12 Datasets)');

    try {
      const result = await TenantExportEngine.downloadAllDataZip(
        settings.pharmacyName || 'Pharmacy',
        organizationId,
        (progressText, percentage) => {
          setExportProgressText(progressText);
          setExportPercentage(percentage);
        }
      );

      if (result.success) {
        setLastExportStatus({
          message: `Export package completed (${result.totalRecords} total records across 12 datasets).`,
          timestamp: new Date().toLocaleTimeString()
        });
        addAuditLog(
          'Completed Full Tenant Backup Export',
          'Data Export',
          `ZIP Package generated (${result.totalRecords} records across 12 datasets)`
        );
      } else {
        setLastExportStatus({
          message: `Export failed: ${result.error}`,
          timestamp: new Date().toLocaleTimeString(),
          isError: true
        });
        addAuditLog('Full Tenant Backup Export Failed', 'Data Export', `Error: ${result.error}`);
      }
    } catch (err: any) {
      const errMessage = err?.message || 'Unknown error';
      setLastExportStatus({
        message: `Export error: ${errMessage}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
      addAuditLog('Full Tenant Backup Export Failed', 'Data Export', `Error: ${errMessage}`);
    } finally {
      setIsExportingAll(false);
      setExportProgressText('');
      setExportPercentage(0);
    }
  };

  // RBAC Access Restriction Gate
  if (hasNoAccess) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Access Restricted</h3>
          <p className="text-xs text-slate-400">
            Tenant Data Export & Backup downloads are restricted to Pharmacy Owners, Store Managers, and System Administrators.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
          Current Role: <span className="font-bold text-white">{currentUser.role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header & Export All Action Hero */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Row-Level Security (RLS) Protected
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Tenant ID: {organizationId ? organizationId.substring(0, 8) + '...' : 'Active'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Data Export & Backup
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Export and download all pharmacy operational records, inventory, sales, prescriptions metadata, and audit logs.
              <strong className="text-emerald-300 ml-1">Exports contain only data belonging to your organization.</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={isExportingAll}
              className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 transition shadow-lg shadow-emerald-950/80 active:scale-[0.98]"
            >
              {isExportingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{exportProgressText || 'Extracting All Datasets...'}</span>
                </>
              ) : (
                <>
                  <Archive className="w-5 h-5" />
                  <span>Export All Data (ZIP Package)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar when exporting all */}
        {isExportingAll && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>{exportProgressText}</span>
              <span className="font-mono text-emerald-400">{exportPercentage}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${exportPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Status notification toast */}
        {lastExportStatus && !isExportingAll && (
          <div
            className={`mt-6 p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              lastExportStatus.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {lastExportStatus.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{lastExportStatus.message}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{lastExportStatus.timestamp}</span>
          </div>
        )}
      </div>

      {/* Dataset Sections Categorized */}
      <div className="space-y-8">
        {categories.map((category) => {
          const categoryDatasets = EXPORTABLE_DATASETS.filter((ds) => ds.category === category);
          if (categoryDatasets.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                  {category}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryDatasets.map((ds) => {
                  const Icon = getDatasetIcon(ds.key);
                  const isCsvLoading = downloadingKey === `${ds.key}-csv`;
                  const isJsonLoading = downloadingKey === `${ds.key}-json`;

                  return (
                    <div
                      key={ds.key}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-emerald-400 shrink-0">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {ds.label}
                              </h4>
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                                {ds.key}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {ds.description}
                        </p>

                        {ds.sensitiveNotice && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{ds.sensitiveNotice}</span>
                          </div>
                        )}
                      </div>

                      {/* Download Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(ds.key, 'csv')}
                          disabled={Boolean(downloadingKey) || isExportingAll}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
                        >
                          {isCsvLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                          ) : (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span>Export CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(ds.key, 'json')}
                          disabled={Boolean(downloadingKey) || isExportingAll}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 dark:border-slate-700"
                        >
                          {isJsonLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )}
                          <span>Export JSON</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* DISASTER RECOVERY & BACKUP KNOWLEDGE ARCHITECTURE SECTION */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Backup & Recovery Guidelines</h3>
            <p className="text-xs text-slate-400">
              Understanding enterprise tenant data exports versus provider-level database disaster recovery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Database className="w-4 h-4" />
              <span>Supabase PostgreSQL Storage</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              All live application records, sales, inventory mutations, and financial logs are securely stored in the Supabase PostgreSQL database under multi-tenant Row-Level Security (RLS).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <Archive className="w-4 h-4" />
              <span>Tenant-Controlled Business Exports</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Data exports allow authorized pharmacy administrators to extract offline business copies in standard open formats (CSV / JSON) for reporting, accounting, tax filing, and archival storage.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-400">
              <Lock className="w-4 h-4" />
              <span>Clinical Prescription Privacy</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Physical prescription scan documents remain protected in private cloud storage buckets with time-limited signed URLs and are not packaged into flat raw text exports to comply with healthcare security standards.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Disaster Recovery Distinction</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Downloading CSV/JSON files is a client-side business export and is not a substitute for provider-level database backups (such as Point-in-Time Recovery or automated daily WAL archiving).
            </p>
          </div>
        </div>

        {/* Clear Notice Mandatory in Instructions */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 text-xs text-amber-200/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Note:</strong> Provider-level database backup configuration is not managed by this application. Automated PostgreSQL continuous archiving is handled by your Supabase infrastructure.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">PostgreSQL 15 / Supabase</span>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR "EXPORT ALL DATA" */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Confirm Full Organization Export</h3>
                <p className="text-xs text-slate-400">You are about to export your organization's business data.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Pharmacy:</span>
                <span className="font-bold text-white">{settings.pharmacyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Organization Tenant ID:</span>
                <span className="font-mono text-emerald-400">{organizationId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Export Package Format:</span>
                <span className="font-semibold text-slate-200">ZIP Archive (Structured CSV & JSON files)</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Included Datasets (12):</span>
              <div className="flex flex-wrap gap-1.5">
                {EXPORTABLE_DATASETS.map((ds) => (
                  <span
                    key={ds.key}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-200 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    {ds.label}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Export generation compiles all datasets directly in memory using authenticated Row-Level Security. No unapproved server webhooks or third-party storage links are generated.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadAll}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950"
              >
                <Download className="w-4 h-4" />
                <span>Continue Export</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
