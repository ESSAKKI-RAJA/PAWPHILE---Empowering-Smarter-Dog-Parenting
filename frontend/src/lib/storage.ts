import localforage from 'localforage';

// Initialize localforage DB
localforage.config({
  name: 'PawphileDB',
  version: 1.0,
  storeName: 'pawphile_clinical_data', // Alphanumeric with underscores
  description: 'Offline-first storage for PAWPHILE app'
});

export const StorageKeys = {
  DOG_PROFILE: 'dogProfile',
  TRIAGE_EVENTS: 'triageEvents',
  EMERGENCY_MARKS: 'emergencyMarks',
  REPORT_DRAFTS: 'reportDrafts',
  REMINDERS: 'reminders',
  PAW_AI_SESSIONS: 'pawAiSessions',
  UPLOADED_IMAGE_BLOBS: 'uploadedImageBlobs',
  PAWNEWS_INTERACTIONS: 'pawNewsInteractions',
  SYNC_QUEUE: 'pawphile_sync_queue'
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

/**
 * Adapter-first offline architecture dual-reading old localStorage.
 * Prevents data loss during migration.
 */
export async function loadFromStorageAsync<T>(key: StorageKey | string, fallback: T): Promise<T> {
  try {
    // 1. Try IndexedDB first
    const value = await localforage.getItem<T>(key);
    if (value !== null && value !== undefined) {
      return value;
    }
    
    // 2. Fallback to localStorage if missing in IDB (safe migration)
    const localValue = localStorage.getItem(key);
    if (localValue) {
      const parsed = JSON.parse(localValue) as T;
      // Immediately migrate to IDB
      await localforage.setItem(key, parsed);
      return parsed;
    }
    return fallback;
  } catch (err) {
    console.error(`[Storage] loadFromStorageAsync error for ${key}:`, err);
    return fallback;
  }
}

export async function saveToStorageAsync<T>(key: StorageKey | string, data: T): Promise<void> {
  try {
    // Write new clinical/offline data to IndexedDB
    await localforage.setItem(key, data);
    
    // Write fallback to localStorage (for critical sync queues on low-end devices)
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (lsErr) {
      console.warn(`[Storage] localStorage fallback write failed for ${key} (quota issue?):`, lsErr);
    }
  } catch (err) {
    console.error(`[Storage] saveToStorageAsync error for ${key}:`, err);
  }
}

export async function deleteFromStorageAsync(key: StorageKey | string): Promise<void> {
  try {
    await localforage.removeItem(key);
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`[Storage] deleteFromStorageAsync error for ${key}:`, err);
  }
}

/**
 * Legacy synchronous versions kept alive for components that strictly need
 * immediate return during first render. Avoid using these for large blobs.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.warn(`[Storage] Failed to parse key "${key}", using fallback.`, error);
  }
  return fallback;
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[Storage] Failed to stringify data for key "${key}".`, error);
  }
}

export function deleteFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to remove key "${key}".`, error);
  }
}

export function migrateStorage(): void {
  // Dual-read migration is now handled implicitly inside loadFromStorageAsync
  console.log('[Storage] Migration adapter configured successfully.');
}
