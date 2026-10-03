/**
 * foundationApi.ts — BIN1 canonical API client.
 * Server (PostgreSQL) is authoritative; UI must wait for server acknowledgement
 * before showing "saved". Never display local-only writes as synced.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

let _getToken: (() => Promise<string | null>) | null = null;

export function registerFoundationTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) return {};
  const t = await _getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export type SyncState = 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict' | 'offline';

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
    ...(await authHeaders()),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(body.detail || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const foundationApi = {
  // health events / timeline
  createHealthEvent: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/health-events`, { method: 'POST', body: JSON.stringify(data) }),
  listHealthEvents: (petId: string, params = '') =>
    req(`/api/v1/pets/${petId}/health-events${params}`),
  getTimeline: (petId: string, params = '') =>
    req<{ items: Array<{ id: string; event_type: string; effective_at: string | null; title: string | null; summary: string | null; source: string }>; total_envelope_events: number }>(
      `/api/v1/pets/${petId}/timeline${params}`,
    ),

  // symptoms / medications
  createSymptom: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/symptoms`, { method: 'POST', body: JSON.stringify(data) }),
  listSymptoms: (petId: string) => req(`/api/v1/pets/${petId}/symptoms`),
  createMedication: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/medications`, { method: 'POST', body: JSON.stringify(data) }),
  listMedications: (petId: string) => req(`/api/v1/pets/${petId}/medications`),

  // visits / measurements
  createVisit: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/visits`, { method: 'POST', body: JSON.stringify(data) }),
  listVisits: (petId: string) => req(`/api/v1/pets/${petId}/visits`),
  createWeight: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/measurements/weight`, { method: 'POST', body: JSON.stringify(data) }),
  listWeights: (petId: string) => req(`/api/v1/pets/${petId}/measurements/weight`),

  // files / reports / sharing
  registerFile: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/files`, { method: 'POST', body: JSON.stringify(data) }),
  listFiles: (petId: string) => req(`/api/v1/pets/${petId}/files`),
  createReport: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/reports`, { method: 'POST', body: JSON.stringify(data) }),
  listReports: (petId: string) => req(`/api/v1/pets/${petId}/reports`),
  getReport: (petId: string, reportId: string) =>
    req(`/api/v1/pets/${petId}/reports/${reportId}`),
  generateReport: (petId: string, reportId: string) =>
    req(`/api/v1/pets/${petId}/reports/${reportId}/generate`, { method: 'POST' }),
  createShare: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/shares`, { method: 'POST', body: JSON.stringify(data) }),
  listShares: (petId: string) => req(`/api/v1/pets/${petId}/shares`),
  revokeShare: (petId: string, shareId: string) =>
    req(`/api/v1/pets/${petId}/shares/${shareId}/revoke`, { method: 'POST' }),

  // reminders / consent / export / completeness
  createReminder: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/reminders`, { method: 'POST', body: JSON.stringify(data) }),
  listReminders: (petId: string) => req(`/api/v1/pets/${petId}/reminders`),
  updateReminder: (petId: string, reminderId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/reminders/${reminderId}`, { method: 'PUT', body: JSON.stringify(data) }),
  processDue: () => req(`/api/v1/reminders/process-due`, { method: 'POST' }),
  listConsent: () => req('/api/v1/consent'),
  saveConsent: (data: Record<string, unknown>) =>
    req('/api/v1/consent', { method: 'POST', body: JSON.stringify(data) }),
  exportPet: (petId: string) => req(`/api/v1/pets/${petId}/export`),
  getCompleteness: (petId: string) => req(`/api/v1/pets/${petId}/completeness`),
  getAudit: (petId: string) => req(`/api/v1/pets/${petId}/audit`),

  // ── BIN2 longitudinal intelligence (consent-gated, descriptive, non-diagnostic) ──
  analyticsOverview: (petId: string) => req(`/api/v1/pets/${petId}/analytics/overview`),
  analyticsWeight: (petId: string) => req(`/api/v1/pets/${petId}/analytics/weight`),
  analyticsActivity: (petId: string) => req(`/api/v1/pets/${petId}/analytics/activity`),
  analyticsNutrition: (petId: string) => req(`/api/v1/pets/${petId}/analytics/nutrition`),
  analyticsBehavior: (petId: string) => req(`/api/v1/pets/${petId}/analytics/behavior`),
  analyticsSymptoms: (petId: string) => req(`/api/v1/pets/${petId}/analytics/symptoms`),
  analyticsMedications: (petId: string) => req(`/api/v1/pets/${petId}/analytics/medications`),
  analyticsPreventive: (petId: string) => req(`/api/v1/pets/${petId}/analytics/preventive`),
  analyticsBaselines: (petId: string) => req(`/api/v1/pets/${petId}/analytics/baselines`),
  analyticsChanges: (petId: string) => req(`/api/v1/pets/${petId}/analytics/changes`),
  analyticsCompleteness: (petId: string) => req(`/api/v1/pets/${petId}/analytics/completeness`),
  analyticsFreshness: (petId: string) => req(`/api/v1/pets/${petId}/analytics/freshness`),
  intelligenceAnalyze: (petId: string) =>
    req(`/api/v1/pets/${petId}/intelligence/analyze`, { method: 'POST' }),
  intelligenceHistory: (petId: string) => req(`/api/v1/pets/${petId}/intelligence/history`),
  intelligenceVetSummary: (petId: string) => req(`/api/v1/pets/${petId}/intelligence/vet-summary`),
  supervisorCapabilities: () => req(`/api/v1/supervisor/capabilities`),
  supervisorAsk: (petId: string, question: string, session_id?: string) =>
    req(`/api/v1/pets/${petId}/supervisor/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, session_id }),
    }),
  supervisorSessions: (petId: string) => req(`/api/v1/pets/${petId}/supervisor/sessions`),
  supervisorSession: (petId: string, sessionId: string) =>
    req(`/api/v1/pets/${petId}/supervisor/sessions/${sessionId}`),
  supervisorFeedback: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/supervisor/feedback`, { method: 'POST', body: JSON.stringify(data) }),

  // idempotent sync — caller supplies a stable client_operation_id
  syncOperation: (petId: string, op: { client_operation_id: string; entity_type: string; entity_id?: string; payload: Record<string, unknown> }) =>
    req(`/api/v1/pets/${petId}/sync/operations`, { method: 'POST', body: JSON.stringify(op) }),

  // ── BIN3 veterinary continuity (owner-controlled collaboration loop) ──
  // Care team (owner, pet-specific)
  careTeamList: (petId: string) => req(`/api/v1/pets/${petId}/care-team`),
  careTeamAdd: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/care-team`, { method: 'POST', body: JSON.stringify(data) }),
  careTeamUpdate: (petId: string, memberId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/care-team/${memberId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  careTeamEnd: (petId: string, memberId: string) =>
    req(`/api/v1/pets/${petId}/care-team/${memberId}/end`, { method: 'POST' }),
  // Vet packages: draft → owner review → approve → share (never auto-shared)
  packageCreate: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/vet-packages`, { method: 'POST', body: JSON.stringify(data) }),
  packageList: (petId: string) => req(`/api/v1/pets/${petId}/vet-packages`),
  packageGet: (petId: string, packageId: string) =>
    req(`/api/v1/pets/${petId}/vet-packages/${packageId}`),
  packageApprove: (petId: string, packageId: string) =>
    req(`/api/v1/pets/${petId}/vet-packages/${packageId}/approve`, { method: 'POST' }),
  packageNewVersion: (petId: string, packageId: string) =>
    req(`/api/v1/pets/${petId}/vet-packages/${packageId}/new-version`, { method: 'POST' }),
  packageShare: (petId: string, packageId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/vet-packages/${packageId}/share`, { method: 'POST', body: JSON.stringify(data) }),
  shareLink: (petId: string, shareId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/shares/${shareId}/link`, { method: 'POST', body: JSON.stringify(data) }),
  shareFile: (shareId: string, fileId: string) =>
    req(`/api/v1/shares/${shareId}/files/${fileId}`),
  accessHistory: (petId: string) => req(`/api/v1/pets/${petId}/collaboration/access-history`),
  // Consultations / questions / notes / follow-ups
  consultCreate: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/consultations`, { method: 'POST', body: JSON.stringify(data) }),
  consultList: (petId: string) => req(`/api/v1/pets/${petId}/consultations`),
  consultGet: (consultId: string) => req(`/api/v1/consultations/${consultId}`),
  consultComplete: (consultId: string) =>
    req(`/api/v1/consultations/${consultId}/complete`, { method: 'POST' }),
  questionCreate: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  questionList: (petId: string) => req(`/api/v1/pets/${petId}/questions`),
  questionUpdate: (questionId: string, data: Record<string, unknown>) =>
    req(`/api/v1/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  questionAnswer: (questionId: string, data: Record<string, unknown>) =>
    req(`/api/v1/questions/${questionId}/answer`, { method: 'POST', body: JSON.stringify(data) }),
  noteCreate: (consultId: string, data: Record<string, unknown>) =>
    req(`/api/v1/consultations/${consultId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  followupCreate: (consultId: string, data: Record<string, unknown>) =>
    req(`/api/v1/consultations/${consultId}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),
  followupList: (petId: string) => req(`/api/v1/pets/${petId}/follow-ups`),
  followupUpdate: (followupId: string, data: Record<string, unknown>) =>
    req(`/api/v1/follow-ups/${followupId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Vet portal (server-authorized, scope-enforced; 404 unknown, 410 expired/revoked)
  vetPets: () => req(`/api/v1/vet/pets`),
  vetPetView: (petId: string) => req(`/api/v1/vet/pets/${petId}`),
  vetPackageView: (packageId: string) => req(`/api/v1/vet/packages/${packageId}`),
  vetConsultations: () => req(`/api/v1/vet/consultations`),

  // ── BIN4 ecosystem & platform ──
  orgCreate: (data: Record<string, unknown>) =>
    req(`/api/v1/orgs`, { method: 'POST', body: JSON.stringify(data) }),
  orgList: () => req(`/api/v1/orgs`),
  orgGet: (orgId: string) => req(`/api/v1/orgs/${orgId}`),
  orgMembers: (orgId: string) => req(`/api/v1/orgs/${orgId}/members`),
  orgMemberAdd: (orgId: string, data: Record<string, unknown>) =>
    req(`/api/v1/orgs/${orgId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  orgMemberUpdate: (orgId: string, memberId: string, data: Record<string, unknown>) =>
    req(`/api/v1/orgs/${orgId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  profCreate: (data: Record<string, unknown>) =>
    req(`/api/v1/professionals`, { method: 'POST', body: JSON.stringify(data) }),
  profList: (orgId?: string) => req(`/api/v1/professionals${orgId ? `?org_id=${orgId}` : ''}`),
  profRequestVerification: (profId: string, data: Record<string, unknown>) =>
    req(`/api/v1/professionals/${profId}/request-verification`, { method: 'POST', body: JSON.stringify(data) }),
  profReview: (profId: string, data: Record<string, unknown>) =>
    req(`/api/v1/professionals/${profId}/review`, { method: 'POST', body: JSON.stringify(data) }),
  profSuspend: (profId: string) =>
    req(`/api/v1/professionals/${profId}/suspend`, { method: 'POST' }),
  relCreate: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/relationships`, { method: 'POST', body: JSON.stringify(data) }),
  relList: (petId: string) => req(`/api/v1/pets/${petId}/relationships`),
  relUpdate: (petId: string, relId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/relationships/${relId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  vetRelationships: () => req(`/api/v1/vet/relationships`),
  connCreate: (petId: string, data: Record<string, unknown>) =>
    req(`/api/v1/pets/${petId}/connections`, { method: 'POST', body: JSON.stringify(data) }),
  connList: (petId: string) => req(`/api/v1/pets/${petId}/connections`),
  connMine: () => req(`/api/v1/connections`),
  connRevoke: (connId: string) => req(`/api/v1/connections/${connId}/revoke`, { method: 'POST' }),
  connHealth: (connId: string) => req(`/api/v1/connections/${connId}/health`),
  connImport: (connId: string, data: Record<string, unknown>) =>
    req(`/api/v1/connections/${connId}/imports`, { method: 'POST', body: JSON.stringify(data) }),
  connImports: (connId: string) => req(`/api/v1/connections/${connId}/imports`),
  labSummary: (petId: string) => req(`/api/v1/pets/${petId}/labs/summary`),
  deviceReadings: (petId: string) => req(`/api/v1/pets/${petId}/devices/readings`),
  emergencyCreate: (petId: string) =>
    req(`/api/v1/pets/${petId}/emergency-packets`, { method: 'POST' }),
  packageExport: (petId: string, packageId: string) =>
    req(`/api/v1/pets/${petId}/vet-packages/${packageId}/export`),
  fhirMap: () => req(`/api/v1/interoperability/fhir-map`),
  ecosystemKpis: () => req(`/api/v1/metrics/ecosystem`),
  webhookSubCreate: (data: Record<string, unknown>) =>
    req(`/api/v1/webhooks/subscriptions`, { method: 'POST', body: JSON.stringify(data) }),
  webhookSubs: () => req(`/api/v1/webhooks/subscriptions`),
  webhookRevoke: (subId: string) =>
    req(`/api/v1/webhooks/subscriptions/${subId}/revoke`, { method: 'POST' }),
};
