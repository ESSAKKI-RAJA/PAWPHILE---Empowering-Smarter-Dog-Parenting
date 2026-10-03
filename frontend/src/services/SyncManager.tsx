import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { usePawphileData } from '../context/PawphileDataContext';
import type { SyncState } from './syncService';
import { flushQueue, getPendingCount } from './syncQueue';
import { StorageKeys, loadFromStorageAsync } from '../lib/storage';

// Global hooks for manual sync trigger and state observing
// eslint-disable-next-line react-refresh/only-export-components
export function triggerManualSync() {
  window.dispatchEvent(new Event('pawphile:force-sync'));
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSyncState() {
  const [syncState, setSyncState] = useState<SyncState>('local only');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(localStorage.getItem('pawphile_last_synced'));

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.state) setSyncState(e.detail.state);
      if (e.detail?.pendingCount !== undefined) {
        setPendingCount(e.detail.pendingCount);
      } else {
        // Op-level queue (syncQueue) dispatches bare events — refresh count.
        getPendingCount().then(setPendingCount).catch(() => undefined);
      }
      if (e.detail?.lastSyncedAt) setLastSyncedAt(e.detail.lastSyncedAt);
    };
    window.addEventListener('pawphile:sync-update', handleUpdate as EventListener);
    
    // Init queue count (legacy markers + op-level queue)
    const initQ = async () => {
      try {
        const q = await loadFromStorageAsync<any[]>(StorageKeys.SYNC_QUEUE, []);
        const ops = await getPendingCount();
        setPendingCount(q.length + ops);
      } catch (e) {
        console.warn('Init queue error:', e);
      }
    };
    initQ();

    return () => window.removeEventListener('pawphile:sync-update', handleUpdate as EventListener);
  }, []);

  return { syncState, pendingCount, lastSyncedAt };
}

export default function SyncManager() {
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();
  const localData = usePawphileData();
  
  const isSyncing = useRef(false);

  // Local data changed -> attempt an op-level flush. The canonical queue
  // (syncQueue, per-operation idempotency keys) flushes itself on enqueue as
  // well; this covers changes that predate the queue. No legacy markers are
  // written: the bulk-marker queue is deprecated.
  useEffect(() => {
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData]);

  const processQueue = async () => {
    if (!isSignedIn || !user || isSyncing.current || !navigator.onLine) {
      return;
    }

    let pending = 0;
    try {
      pending = await getPendingCount();
    } catch (e) {
      console.warn('Load queue error:', e);
    }

    if (pending === 0) return;

    isSyncing.current = true;
    window.dispatchEvent(new CustomEvent('pawphile:sync-update', {
      detail: { state: 'syncing' as SyncState },
    }));
    try {
      // Canonical path: op-level idempotent sync (POST /api/v1/.../sync/operations).
      // Each op carries a stable client_operation_id; retries return the original
      // ACK and never duplicate records. The legacy bulk SyncService path is
      // deprecated and no longer invoked here.
      const token = await getToken();
      if (!token) throw new Error('No token available');

      const result = await flushQueue();

      const remaining = await getPendingCount();
      const now = new Date().toISOString();
      if (remaining === 0) {
        localStorage.setItem('pawphile_last_synced', now); // kept synchronous for instant read
      }
      window.dispatchEvent(new CustomEvent('pawphile:sync-update', {
        detail: {
          pendingCount: remaining,
          lastSyncedAt: remaining === 0 ? now : undefined,
          state: (remaining === 0 ? 'synced' : result.conflicts > 0 ? 'conflict found' : 'sync failed') as SyncState,
        },
      }));
    } catch {
      console.error('Sync failed. Queue preserved for retry.');
      window.dispatchEvent(new CustomEvent('pawphile:sync-update', {
        detail: { state: 'sync failed' as SyncState },
      }));
    } finally {
      isSyncing.current = false;
    }
  };

  // Listen for manual trigger
  useEffect(() => {
    const handleManualSync = () => {
      console.log('[Analytics] sync_now_clicked');
      processQueue();
    };
    const handleOnline = () => processQueue();
    
    window.addEventListener('pawphile:force-sync', handleManualSync);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('pawphile:force-sync', handleManualSync);
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user, localData]);

  return null;
}
