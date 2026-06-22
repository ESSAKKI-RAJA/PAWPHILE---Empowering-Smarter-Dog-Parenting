/**
 * emergencyEventsService.ts
 * Handles all emergency event persistence.
 * Currently uses localStorage (local-first). Backend-ready pattern.
 */

import { loadFromStorage, saveToStorage } from '../lib/storage';
import { generateId } from '../lib/ids';

export type EmergencySeverity =
  | 'red_emergency'
  | 'orange_urgent'
  | 'green_monitor'
  | 'manual_emergency';

export type EmergencyStatus =
  | 'active'
  | 'resolved'
  | 'vet_visited'
  | 'false_alarm';

export interface EmergencyEvent {
  id: string;
  user_id: string;
  dog_id: string;
  triage_id?: string;
  triage_result_id?: string;
  emergency_type?: string;
  severity: EmergencySeverity;
  confidence_score?: number;
  symptoms: string[];
  ai_summary?: string;
  recommended_action?: string;
  reason_for_result?: string;
  data_analyzed?: Record<string, unknown>;
  owner_notes?: string;
  status: EmergencyStatus;
  marked_by: 'owner';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface CreateEmergencyEventPayload {
  dog_id: string;
  user_id: string;
  triage_id?: string;
  triage_result_id?: string;
  emergency_type?: string;
  severity: EmergencySeverity;
  confidence_score?: number;
  symptoms: string[];
  ai_summary?: string;
  recommended_action?: string;
  reason_for_result?: string;
  data_analyzed?: Record<string, unknown>;
  owner_notes?: string;
}

const STORAGE_KEY = 'pawphile:v1:emergencyEvents';

// ── Map triage severity label to EmergencySeverity ────────────────────────────
export function mapTriageSeverityToEmergency(
  severity: string,
  manual = false
): EmergencySeverity {
  if (manual) return 'manual_emergency';
  const s = severity.toLowerCase();
  if (s === 'red') return 'red_emergency';
  if (s === 'yellow' || s === 'orange') return 'orange_urgent';
  if (s === 'green') return 'green_monitor';
  return 'manual_emergency';
}

// ── Load all events ───────────────────────────────────────────────────────────
export function loadEmergencyEvents(): EmergencyEvent[] {
  return loadFromStorage<EmergencyEvent[]>(STORAGE_KEY, []);
}

// ── Get events for a specific dog ─────────────────────────────────────────────
export function getEmergencyEventsForDog(dogId: string): EmergencyEvent[] {
  return loadEmergencyEvents().filter(e => e.dog_id === dogId);
}

// ── Duplicate guard: check if triage result already saved ────────────────────
export function isTriageAlreadySaved(triageId: string, dogId: string): boolean {
  const events = loadEmergencyEvents();
  return events.some(e => e.triage_id === triageId && e.dog_id === dogId);
}

// ── Create a new emergency event ──────────────────────────────────────────────
export async function createEmergencyEvent(
  payload: CreateEmergencyEventPayload
): Promise<EmergencyEvent> {
  // Duplicate guard
  if (payload.triage_id && isTriageAlreadySaved(payload.triage_id, payload.dog_id)) {
    throw new Error('DUPLICATE_SAVE: This triage result has already been saved as an emergency record.');
  }

  const now = new Date().toISOString();
  const event: EmergencyEvent = {
    id: generateId(),
    ...payload,
    status: 'active',
    marked_by: 'owner',
    created_at: now,
    updated_at: now,
  };

  // Try backend first; fall back to localStorage
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
    const res = await fetch(`${baseUrl}/api/emergency-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const saved = await res.json();
      // Also persist locally for offline access
      _saveLocally(saved);
      return saved;
    }
  } catch {
    // Backend unavailable — use localStorage only
    console.info('[EmergencyEventsService] Backend unavailable, saving locally.');
  }

  _saveLocally(event);
  return event;
}

// ── Update event status ───────────────────────────────────────────────────────
export function updateEmergencyEventStatus(
  id: string,
  status: EmergencyStatus
): void {
  const events = loadEmergencyEvents();
  const updated = events.map(e =>
    e.id === id
      ? { ...e, status, updated_at: new Date().toISOString(), resolved_at: status !== 'active' ? new Date().toISOString() : e.resolved_at }
      : e
  );
  saveToStorage(STORAGE_KEY, updated);
}

// ── Emergency report stats ────────────────────────────────────────────────────
export interface EmergencyReportStats {
  total: number;
  redCount: number;
  orangeCount: number;
  manualCount: number;
  greenCount: number;
  latestDate?: string;
  mostCommonType?: string;
}

export function getEmergencyReportStats(dogId: string): EmergencyReportStats {
  const events = getEmergencyEventsForDog(dogId);
  const redCount = events.filter(e => e.severity === 'red_emergency').length;
  const orangeCount = events.filter(e => e.severity === 'orange_urgent').length;
  const manualCount = events.filter(e => e.severity === 'manual_emergency').length;
  const greenCount = events.filter(e => e.severity === 'green_monitor').length;

  const latest = events.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  // Find most common emergency type
  const typeCount: Record<string, number> = {};
  events.forEach(e => {
    if (e.emergency_type) {
      typeCount[e.emergency_type] = (typeCount[e.emergency_type] || 0) + 1;
    }
  });
  const mostCommonType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    total: events.length,
    redCount,
    orangeCount,
    manualCount,
    greenCount,
    latestDate: latest?.created_at,
    mostCommonType,
  };
}

// ── Private: save event to localStorage ──────────────────────────────────────
function _saveLocally(event: EmergencyEvent): void {
  const existing = loadEmergencyEvents();
  // Replace if same id already exists
  const idx = existing.findIndex(e => e.id === event.id);
  const updated = idx >= 0
    ? existing.map((e, i) => i === idx ? event : e)
    : [...existing, event];
  saveToStorage(STORAGE_KEY, updated);
}
