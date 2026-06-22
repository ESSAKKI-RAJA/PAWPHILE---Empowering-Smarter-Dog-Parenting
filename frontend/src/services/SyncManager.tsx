import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { usePawphileData } from '../context/PawphileDataContext';
import { SyncService, SyncState } from './syncService';
import { StorageKeys, loadFromStorageAsync, saveToStorageAsync } from '../lib/storage';

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
      if (e.detail?.pendingCount !== undefined) setPendingCount(e.detail.pendingCount);
      if (e.detail?.lastSyncedAt) setLastSyncedAt(e.detail.lastSyncedAt);
    };
    window.addEventListener('pawphile:sync-update', handleUpdate);
    
    // Init queue count
    const initQ = async () => {
      try {
        const q = await loadFromStorageAsync<any[]>(StorageKeys.SYNC_QUEUE, []);
        setPendingCount(q.length);
      } catch {}
    };
    initQ();

    return () => window.removeEventListener('pawphile:sync-update', handleUpdate);
  }, []);

  return { syncState, pendingCount, lastSyncedAt };
}

export default function SyncManager() {
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();
  const localData = usePawphileData();
  
  const isSyncing = useRef(false);

  // 1. Optimistic Updates -> Persist to IDB Queue
  useEffect(() => {
    // We queue a timestamp marker to signify a change happened
    const updateQueue = async () => {
      try {
        const q = await loadFromStorageAsync<any[]>(StorageKeys.SYNC_QUEUE, []);
        q.push({
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        await saveToStorageAsync(StorageKeys.SYNC_QUEUE, q);
        
        window.dispatchEvent(new CustomEvent('pawphile:sync-update', { 
          detail: { pendingCount: q.length } 
        }));
        
        // Request Background Sync if supported
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((reg: any) => {
            return reg.sync.register('pawphile-sync');
          }).catch(console.error);
        }
        
        processQueue();
      } catch (err) {
        console.error("Queue persist error:", err);
      }
    };
    updateQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData]);

  const processQueue = async () => {
    if (!isSignedIn || !user || isSyncing.current || !navigator.onLine) {
      return;
    }
    
    let q: any[] = [];
    try {
      q = await loadFromStorageAsync<any[]>(StorageKeys.SYNC_QUEUE, []);
    } catch {}

    if (q.length === 0) return;

    isSyncing.current = true;
    let attempt = 0;
    const maxAttempts = 3;

    const trySync = async (): Promise<void> => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No token available");
        
        console.log('[Analytics] sync_queue_pending', { count: q.length });

        const syncService = new SyncService(token, user.id, (state) => {
          window.dispatchEvent(new CustomEvent('pawphile:sync-update', { 
            detail: { state } 
          }));
        });

        // 2. Comprehensive Sync Upsert (which uses updated_at natively)
        await syncService.syncAll(localData);

        // Success -> Clear queue and update lastSynced
        isSyncing.current = false;
        await saveToStorageAsync(StorageKeys.SYNC_QUEUE, []);
        const now = new Date().toISOString();
        localStorage.setItem('pawphile_last_synced', now); // kept synchronous for instant read
        
        window.dispatchEvent(new CustomEvent('pawphile:sync-update', { 
          detail: { pendingCount: 0, lastSyncedAt: now, state: 'synced' } 
        }));

      } catch (err) {
        attempt++;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          setTimeout(trySync, delay);
        } else {
          console.error("Sync repeatedly failed. Queue preserved.");
          isSyncing.current = false;
          window.dispatchEvent(new CustomEvent('pawphile:sync-update', { 
            detail: { state: 'sync failed' } 
          }));
        }
      }
    };
    
    trySync();
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
