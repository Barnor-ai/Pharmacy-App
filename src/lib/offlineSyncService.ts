import { OfflineTransaction, OfflineSyncStatus } from '../types';
export type { OfflineTransaction, OfflineSyncStatus };
import {
  syncSaleToSupabase,
  syncCustomerToSupabase,
  syncExpenseToSupabase,
  syncSupplierToSupabase,
  syncMedicineToSupabase,
  syncPrescriptionToSupabase,
  ensureUUID
} from './supabaseService';

const QUEUE_STORAGE_KEY = 'pharma_offline_sync_queue';
const SYNC_STATUS_EVENT = 'pharma_sync_status_change';

type SyncListener = (status: OfflineSyncStatus, pendingCount: number) => void;
const listeners = new Set<SyncListener>();

let currentStatus: OfflineSyncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ONLINE';
let isSyncing = false;

// Load queue from localStorage
export function getOfflineQueue(): OfflineTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to parse offline sync queue:', err);
    return [];
  }
}

// Save queue to localStorage
export function saveOfflineQueue(queue: OfflineTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (err) {
    console.error('Failed to save offline sync queue:', err);
  }
}

export function getPendingQueueCount(): number {
  return getOfflineQueue().filter(item => item.status === 'pending' || item.status === 'failed').length;
}

export function getCurrentSyncStatus(): OfflineSyncStatus {
  return currentStatus;
}

function notifyListeners(): void {
  const pendingCount = getPendingQueueCount();
  listeners.forEach(fn => {
    try {
      fn(currentStatus, pendingCount);
    } catch (err) {
      console.error('Error in sync listener:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, {
      detail: { status: currentStatus, pendingCount }
    }));
  }
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus, getPendingQueueCount());
  return () => {
    listeners.delete(listener);
  };
}

export function setSyncStatus(status: OfflineSyncStatus): void {
  currentStatus = status;
  notifyListeners();
}

/**
 * Enqueue an offline or optimistic transaction
 */
export function enqueueOfflineTransaction(params: {
  id?: string;
  type: OfflineTransaction['type'];
  action: OfflineTransaction['action'];
  payload: any;
  userId?: string;
  userName?: string;
}): OfflineTransaction {
  const queue = getOfflineQueue();
  const txId = params.id ? ensureUUID(params.id) : ensureUUID();

  // Deduplicate if already queued with same ID and type
  const existingIdx = queue.findIndex(item => item.id === txId && item.type === params.type);

  const tx: OfflineTransaction = {
    id: txId,
    type: params.type,
    action: params.action,
    payload: params.payload,
    timestamp: new Date().toISOString(),
    userId: params.userId || 'usr-local',
    userName: params.userName || 'Offline User',
    status: 'pending',
    retryCount: 0
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = tx;
  } else {
    queue.push(tx);
  }

  saveOfflineQueue(queue);

  // If online, immediately trigger background synchronization
  if (navigator.onLine && !isSyncing) {
    processOfflineSyncQueue().catch(console.warn);
  }

  return tx;
}

/**
 * Process all pending offline transactions with conflict-safe idempotent upserts
 */
export async function processOfflineSyncQueue(organizationId?: string): Promise<{
  successCount: number;
  failedCount: number;
  totalPending: number;
}> {
  if (isSyncing) {
    return { successCount: 0, failedCount: 0, totalPending: getPendingQueueCount() };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncStatus('OFFLINE');
    return { successCount: 0, failedCount: 0, totalPending: getPendingQueueCount() };
  }

  const queue = getOfflineQueue();
  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

  if (pendingItems.length === 0) {
    setSyncStatus('ONLINE');
    return { successCount: 0, failedCount: 0, totalPending: 0 };
  }

  isSyncing = true;
  setSyncStatus('SYNCING');

  let successCount = 0;
  let failedCount = 0;

  for (const item of pendingItems) {
    try {
      item.status = 'syncing';
      saveOfflineQueue(queue);

      let syncResult: { error: any } = { error: null };

      switch (item.type) {
        case 'sale':
          syncResult = await syncSaleToSupabase(item.payload, organizationId, item.userId);
          break;
        case 'customer':
          syncResult = await syncCustomerToSupabase(item.payload, organizationId);
          break;
        case 'expense':
          syncResult = await syncExpenseToSupabase(item.payload, organizationId, item.userId);
          break;
        case 'supplier':
          syncResult = await syncSupplierToSupabase(item.payload, organizationId);
          break;
        case 'medicine':
          syncResult = await syncMedicineToSupabase(item.payload, organizationId);
          break;
        case 'prescription':
          syncResult = await syncPrescriptionToSupabase(item.payload, organizationId);
          break;
        default:
          syncResult = { error: null };
          break;
      }

      if (syncResult.error) {
        item.status = 'failed';
        item.retryCount = (item.retryCount || 0) + 1;
        item.errorMessage = syncResult.error.message || String(syncResult.error);
        failedCount++;
      } else {
        item.status = 'synced';
        item.errorMessage = undefined;
        successCount++;
      }
    } catch (err: any) {
      item.status = 'failed';
      item.retryCount = (item.retryCount || 0) + 1;
      item.errorMessage = err?.message || 'Sync execution error';
      failedCount++;
    }
  }

  // Prune synced records older than 24 hours to keep localStorage lean
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
  const prunedQueue = queue.filter(item => {
    if (item.status === 'synced') {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime > cutoffTime;
    }
    return true;
  });

  saveOfflineQueue(prunedQueue);
  isSyncing = false;

  const remainingPending = prunedQueue.filter(i => i.status === 'pending' || i.status === 'failed').length;

  if (remainingPending > 0) {
    setSyncStatus('SYNC ERROR');
  } else {
    setSyncStatus('SYNC COMPLETE');
    // Return to ONLINE indicator after 4 seconds
    setTimeout(() => {
      if (currentStatus === 'SYNC COMPLETE' && navigator.onLine) {
        setSyncStatus('ONLINE');
      }
    }, 4000);
  }

  return { successCount, failedCount, totalPending: remainingPending };
}

// Global network listener registration
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setSyncStatus('SYNCING');
    processOfflineSyncQueue().catch(() => setSyncStatus('SYNC ERROR'));
  });

  window.addEventListener('offline', () => {
    setSyncStatus('OFFLINE');
  });
}
