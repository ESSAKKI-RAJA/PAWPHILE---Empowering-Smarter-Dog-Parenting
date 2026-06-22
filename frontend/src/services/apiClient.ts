/**
 * apiClient.ts
 * Centralized API client for PAWPHILE frontend.
 * - Attaches Clerk JWT to all protected requests.
 * - Uses VITE_API_BASE_URL env var.
 * - Never exposes Cloudinary or backend secrets.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

// ─── Token Provider ─────────────────────────────────────────────────────────
// We use a lazy token getter so this module works even before ClerkProvider mounts.
let _getToken: (() => Promise<string | null>) | null = null;

export function registerTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!_getToken) return {};
  const token = await _getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ─── Core Fetch Wrapper ──────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  protected_: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (protected_) {
    const authHeaders = await getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function apiFetchForm<T>(path: string, formData: FormData): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────
export async function healthCheck() {
  return apiFetch<{ status: string }>('/health', {}, false);
}

// ─── User Sync ────────────────────────────────────────────────────────────────
export async function syncUser(email?: string) {
  return apiFetch('/api/users/sync', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ─── Dogs ────────────────────────────────────────────────────────────────────
export async function getDogs() {
  return apiFetch<any[]>('/api/dogs');
}

export async function createDog(data: Record<string, any>) {
  return apiFetch<any>('/api/dogs', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateDog(dogId: string, data: Record<string, any>) {
  return apiFetch<any>(`/api/dogs/${dogId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteDog(dogId: string) {
  return apiFetch<void>(`/api/dogs/${dogId}`, { method: 'DELETE' });
}

// ─── Vaccines ────────────────────────────────────────────────────────────────
export async function getVaccines(dogId: string) {
  return apiFetch<any[]>(`/api/dogs/${dogId}/vaccines`);
}

export async function createVaccine(dogId: string, data: Record<string, any>) {
  return apiFetch<any>(`/api/dogs/${dogId}/vaccines`, { method: 'POST', body: JSON.stringify(data) });
}

// ─── Medical History ─────────────────────────────────────────────────────────
export async function getMedicalHistory(dogId: string) {
  return apiFetch<any[]>(`/api/dogs/${dogId}/medical-history`);
}

export async function createMedicalHistory(dogId: string, data: Record<string, any>) {
  return apiFetch<any>(`/api/dogs/${dogId}/medical-history`, { method: 'POST', body: JSON.stringify(data) });
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
export async function uploadDogImage(file: File, dogId?: string): Promise<{ secure_url: string; public_id: string }> {
  const formData = new FormData();
  formData.append('image', file);
  if (dogId) formData.append('dog_id', dogId);
  return apiFetchForm('/api/uploads/image', formData);
}

// ─── Vision Scan ─────────────────────────────────────────────────────────────
export async function runVisionScan(dogId: string, scanType: string, imageFile: File) {
  const formData = new FormData();
  formData.append('dog_id', dogId);
  formData.append('scan_type', scanType);
  formData.append('image', imageFile);
  return apiFetchForm<any>('/api/vision/scan', formData);
}

export async function getVisionScans(dogId: string) {
  return apiFetch<any[]>(`/api/vision/scans/${dogId}`);
}

export async function pawAiChat(data: Record<string, any>) {
  return apiFetch<any>('/api/paw-ai/chat', { method: 'POST', body: JSON.stringify(data) });
}

export async function pawAiStreamChat(data: Record<string, any>, onToken: (token: string) => void, onComplete: (fullText: string) => void, onError: (err: Error) => void) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/paw-ai/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Streaming failed: ${res.status}`);
    }
    
    if (!res.body) {
      throw new Error('No readable stream in response.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.token) {
              fullText += parsed.token;
              onToken(parsed.token);
            }
          } catch (e) {
            // Might be a full fallback object dumped as JSON if guardrails tripped
            try {
              const fullObj = JSON.parse(chunk);
              if (fullObj.summary && fullObj.risk_level) {
                // Return stringified guardrail object for the UI to parse at the end
                onComplete(JSON.stringify(fullObj));
                return;
              }
            } catch (_err2) { /* ignore */ }
          }
        }
      }
    }
    onComplete(fullText);
  } catch (err: any) {
    onError(err);
  }
}

export async function pawAiTriage(data: Record<string, any>) {
  return apiFetch<any>('/api/paw-ai/triage', { method: 'POST', body: JSON.stringify(data) });
}

export async function pawAiFoodSafety(data: Record<string, any>) {
  return apiFetch<any>('/api/paw-ai/food-safety', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export async function saveReminderPreferences(data: Record<string, any>) {
  return apiFetch<any>('/api/reminders/save-preferences', { method: 'POST', body: JSON.stringify(data) });
}

export async function testReminderEmail(data: Record<string, any>) {
  return apiFetch<any>('/api/reminders/test-email', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export async function uploadPdfReport(userId: string, dogId: string, file: File) {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('dog_id', dogId);
  formData.append('file', file);
  return apiFetchForm<any>('/api/reports/upload', formData);
}

export async function generatePdfReport(data: Record<string, any>) {
  return apiFetch<any>('/api/reports/generate-pdf', { method: 'POST', body: JSON.stringify(data) });
}

// ─── PAWNEWS ─────────────────────────────────────────────────────────────────
export async function getPawNewsFeed(feed: 'local' | 'global' | 'guide', zone: string = 'global') {
  return apiFetch<any>(`/api/pawnews/feed?feed=${feed}&zone=${zone}`, {}, false); // Public feed
}

// ─── VET LOCATOR ─────────────────────────────────────────────────────────────
export async function searchVetClinics(lat: number, lng: number, radius_km: number = 10.0) {
  return apiFetch<any>(`/api/vet-clinics/search?lat=${lat}&lng=${lng}&radius_km=${radius_km}`, {}, false);
}

// ─── WEATHER ALERT ───────────────────────────────────────────
export async function getWeatherAlert(lat: number, lng: number) {
  return apiFetch<any>(`/api/weather/alert?lat=${lat}&lng=${lng}`, {}, false);
}
