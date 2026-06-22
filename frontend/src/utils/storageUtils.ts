/**
 * storageUtils.ts
 * Safe localStorage read/write helpers for PAWPHILE.
 */

const KEYS = {
  OWNER_PROFILE: 'pawphile_owner',
  CLOUD_BACKUP: 'pawphile_cloud_backup',
  PAWAI_CHATS: 'pawphile_pawai_chats',
  HEALTH_LOGS: 'pawphile_health_logs',
  SETTINGS: 'pawphile_settings',
  PROFILE: 'pawphile_dog_profile',
};

/** Safe JSON parse — never throws */
function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** Read a value from localStorage safely */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

/** Write a value to localStorage safely */
export function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[PAWPHILE] Could not write "${key}" to localStorage:`, e);
  }
}

/** Remove a key from localStorage safely */
export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

// ─── Owner Profile ────────────────────────────────────────────────────────────

import type { OwnerProfile } from '../types/pawphile';
import { DEFAULT_OWNER_PROFILE } from '../types/pawphile';

export function loadOwnerProfile(): OwnerProfile {
  return readLocal<OwnerProfile>(KEYS.OWNER_PROFILE, DEFAULT_OWNER_PROFILE);
}

export function saveOwnerProfile(profile: OwnerProfile): void {
  writeLocal(KEYS.OWNER_PROFILE, profile);
}

// ─── Cloud Backup ─────────────────────────────────────────────────────────────

import type { CloudBackupState } from '../types/pawphile';
import { DEFAULT_CLOUD_BACKUP } from '../types/pawphile';

export function loadCloudBackup(): CloudBackupState {
  return readLocal<CloudBackupState>(KEYS.CLOUD_BACKUP, DEFAULT_CLOUD_BACKUP);
}

export function saveCloudBackup(state: CloudBackupState): void {
  writeLocal(KEYS.CLOUD_BACKUP, state);
}

// ─── PAWAI Chat History ────────────────────────────────────────────────────────

export function clearPawaiChats(): void {
  removeLocal(KEYS.PAWAI_CHATS);
}

// ─── Health Logs ──────────────────────────────────────────────────────────────

export function clearHealthLogs(): void {
  removeLocal(KEYS.HEALTH_LOGS);
}

// ─── Export all data as JSON ─────────────────────────────────────────────────

export function exportAllDataAsJson(): void {
  const exportKeys = [
    'pawphile_dog_profile',
    'pawphile_owner',
    'pawphile_vaccines',          // from useStore
    'pawphile_nutrition',         // from useStore
    'pawphile_walks',             // from useStore
    'pawphile_behavior',          // from useStore
    'pawphile_settings',          // from useStore
    'pawphile_triage_history',    // from triage engine
    'pawphile_latest_triage',
    'pawphile_cloud_backup',
  ];

  const data: Record<string, unknown> = {};
  exportKeys.forEach((k) => {
    try {
      const raw = localStorage.getItem(k);
      data[k] = raw ? JSON.parse(raw) : null;
    } catch {
      data[k] = null;
    }
  });

  const dogName = (data['pawphile_dog_profile'] as any)?.name ?? 'Dog';
  const dateStr = new Date().toISOString().split('T')[0];

  const exportPayload = {
    generatedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    dataReferences: [
      'AAHA', 'WSAVA', 'MSD/Merck Veterinary Manual',
      'AVMA', 'ASPCA', 'FDA/openFDA', 'AAFCO', 'FEDIAF',
      'OMIA', 'IPFD/DogWellNet', 'OFA/CHIC',
    ],
    sourceCategories: [
      'nutrition', 'bcs', 'triage', 'emergency',
      'vaccination', 'breedRisk', 'foodSafety', 'reports'
    ],
    engineSourceMap: {
      bcs: ["WSAVA", "AAHA", "MSD/Merck Veterinary Manual"],
      nutrition: ["MSD/Merck Veterinary Manual", "WSAVA", "AAFCO", "FEDIAF"],
      triage: ["MSD/Merck Veterinary Manual", "AAHA", "WSAVA", "AVMA", "ASPCA"],
      emergency: ["MSD/Merck Veterinary Manual", "AVMA", "ASPCA"],
      vaccination: ["AAHA", "WSAVA"],
      breedRisk: ["OMIA", "IPFD/DogWellNet", "OFA/CHIC"],
      foodSafety: ["AAFCO", "FEDIAF", "FDA/openFDA"]
    },
    disclaimer: 'PAWPHILE provides educational and preventive health support. It does not diagnose, treat, or replace a licensed veterinarian. Emergency signs require immediate veterinary care.',
    data,
  };

  const blob = new Blob(
    [JSON.stringify(exportPayload, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dogName}_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Storage Usage ────────────────────────────────────────────────────────────

export function estimateStorageKb(): number {
  let totalChars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? '';
      if (key.startsWith('pawphile_')) {
        totalChars += (localStorage.getItem(key) ?? '').length;
      }
    }
  } catch {
    /* no-op */
  }
  return Math.round(totalChars / 1024);
}
