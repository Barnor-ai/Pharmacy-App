import React, { useState, useEffect } from 'react';
import {
  subscribeToSyncStatus,
  getCurrentSyncStatus,
  getPendingQueueCount,
  getOfflineQueue,
  processOfflineSyncQueue,
  OfflineSyncStatus
} from '../lib/offlineSyncService';
import { usePharmacy } from '../context/PharmacyContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';

export const SyncStatusIndicator: React.FC = () => {
  const { organizationId } = usePharmacy();
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>(getCurrentSyncStatus());
  const [pendingCount, setPendingCount] = useState<number>(getPendingQueueCount());
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await processOfflineSyncQueue(organizationId || undefined);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const queue = getOfflineQueue();

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'OFFLINE':
        return (
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition shadow-sm animate-pulse"
            title="Application is running offline. Transactions are queued locally."
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>OFFLINE</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
        );

      case 'SYNCING':
        return (
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-sm"
            title="Uploading queued offline transactions to database..."
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SYNCING</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
        );

      case 'SYNC COMPLETE':
        return (
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
            title="All offline transactions synchronized successfully!"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SYNC COMPLETE</span>
          </button>
        );

      case 'SYNC ERROR':
        return (
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition shadow-sm"
            title="Some transactions could not sync. Click to review and retry."
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>SYNC ERROR</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
        );

      case 'ONLINE':
      default:
        return (
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition shadow-sm"
            title="Connected to network. Cloud synchronization active."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>ONLINE</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                {pendingCount}
              </span>
            )}
          </button>
        );
    }
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        {getStatusBadge()}
      </div>

      {/* Sync Queue Details Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Offline Synchronization Manager
                  </h3>
                  <p className="text-xs text-slate-500">
                    Status: <strong className="uppercase">{syncStatus}</strong> • {pendingCount} pending records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Mode explanation banner */}
            {syncStatus === 'OFFLINE' && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <WifiOff className="w-4 h-4 text-amber-600" /> Currently Operating in Offline Mode
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  You can continue ringing up POS sales, adding customers, and logging expenses. All data is securely encrypted in device storage and will automatically upload when network connectivity returns.
                </p>
              </div>
            )}

            {/* Queue List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Queued Transactions ({queue.length})
              </h4>

              {queue.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  All transactions are synchronized with the cloud database.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {queue.slice().reverse().map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white capitalize">
                            {item.type} {item.action}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase ${
                              item.status === 'synced'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.status === 'syncing'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                                : item.status === 'failed'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {item.id.substring(0, 8)}... • By: {item.userName} • {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                        {item.errorMessage && (
                          <p className="text-[10px] text-rose-500 font-semibold mt-1">
                            Error: {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Auto-sync on reconnect active
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing || !navigator.onLine}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
