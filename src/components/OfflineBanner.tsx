import React, { useState, useEffect } from 'react';
import {
  subscribeToSyncStatus,
  getCurrentSyncStatus,
  getPendingQueueCount,
  OfflineSyncStatus
} from '../lib/offlineSyncService';
import { WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>(getCurrentSyncStatus());
  const [pendingCount, setPendingCount] = useState<number>(getPendingQueueCount());

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  if (syncStatus !== 'OFFLINE' && syncStatus !== 'SYNCING' && syncStatus !== 'SYNC ERROR') {
    return null;
  }

  return (
    <div
      className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm transition-all ${
        syncStatus === 'OFFLINE'
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : syncStatus === 'SYNCING'
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {syncStatus === 'OFFLINE' ? (
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : syncStatus === 'SYNCING' ? (
          <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        )}

        <span>
          {syncStatus === 'OFFLINE' && (
            <>
              <strong className="font-bold">Offline Mode:</strong> Internet connection is currently unavailable. All sales, customers & expenses are securely saved locally.
            </>
          )}
          {syncStatus === 'SYNCING' && (
            <>
              <strong className="font-bold">Reconnected:</strong> Synchronizing {pendingCount} offline transaction{pendingCount !== 1 ? 's' : ''} with the main database...
            </>
          )}
          {syncStatus === 'SYNC ERROR' && (
            <>
              <strong className="font-bold">Sync Alert:</strong> Some offline records could not upload. The system will automatically retry.
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 font-bold border border-current/20">
          {pendingCount} Pending Sync
        </span>
      </div>
    </div>
  );
};
