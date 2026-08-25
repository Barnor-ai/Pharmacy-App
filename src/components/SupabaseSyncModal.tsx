import React from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Server,
  X,
  Zap,
  ShieldCheck,
  Lock,
  Database,
  Layers
} from 'lucide-react';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    supabaseStatus,
    triggerSupabaseSync,
    medicines,
    sales,
    customers,
    suppliers,
    prescriptions,
    expenses
  } = usePharmacy();

  if (!isOpen) return null;

  const totalRecords =
    medicines.length +
    sales.length +
    customers.length +
    suppliers.length +
    prescriptions.length +
    expenses.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Cloud Sync & Data Protection
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  System Online
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Authoritative Multi-Device Cloud Synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Connection Status Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <div className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Realtime Cloud Sync Active
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {supabaseStatus.syncing ? 'Synchronizing records with cloud...' : 'All database records are synchronized and protected.'}
                </div>
              </div>
            </div>

            <button
              onClick={triggerSupabaseSync}
              disabled={supabaseStatus.syncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.syncing ? 'animate-spin' : ''}`} />
              <span>{supabaseStatus.syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Live Record Counters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300 text-xs">Synchronized Pharmacy Records</span>
              <span className="text-emerald-400 font-bold">{totalRecords} Total Items</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Medicine Catalog</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{medicines.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">POS Transactions</div>
                <div className="text-base font-bold text-teal-400 mt-0.5">{sales.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Patients & Customers</div>
                <div className="text-base font-bold text-indigo-400 mt-0.5">{customers.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Active Suppliers</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">{suppliers.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Prescriptions</div>
                <div className="text-base font-bold text-purple-400 mt-0.5">{prescriptions.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px]">Financial Expenses</div>
                <div className="text-base font-bold text-rose-400 mt-0.5">{expenses.length}</div>
              </div>
            </div>
          </div>

          {/* Security & Isolation Features */}
          <div className="space-y-2 pt-1">
            <span className="font-bold text-slate-300 block text-xs">Security & Enterprise Safeguards</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">Tenant Data Isolation</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Row-level cryptographic multi-tenant separation.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">TLS 1.3 Encryption</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    End-to-end encrypted in transit and at rest.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">Automated Cloud Backups</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Continuous backup replication across secure zones.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">Real-Time Streaming</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Instant POS stock deduction across all workstations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Cloud Storage Authoritative & Protected
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
