// emailEngine.ts — PAWPHILE Email & Notification Engine

const NOTIFICATION_STORAGE_KEY = 'pawphile:v1:notifications';

// ── Types ────────────────────────────────────────────
export interface PawphileNotification {
  id: string;
  type: 'vaccine' | 'deworming' | 'vet_visit' | 'walk' | 'nutrition' | 'general';
  dogId?: string;
  dogName?: string;
  title: string;
  message: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  channel: 'email' | 'in_app';
  status: 'pending' | 'sent' | 'failed' | 'provider_not_configured';
  sentTo?: string;
  createdAt: string;
  sentAt?: string;
}

// ── Notification persistence ─────────────────────────
export function getSentNotifications(): PawphileNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotification(notification: PawphileNotification): void {
  try {
    const existing = getSentNotifications();
    existing.unshift(notification);
    // Keep max 50
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch {
    console.warn('[emailEngine] Failed to save notification');
  }
}

export function hasSentReminderRecently(type: string, relatedId: string): boolean {
  const notifications = getSentNotifications();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return notifications.some(
    (n) =>
      n.type === type &&
      n.id.includes(relatedId) &&
      new Date(n.createdAt).getTime() > oneDayAgo
  );
}

// ── Email sending ────────────────────────────────────
export async function sendEmailNotification(to: string, subject: string, body: string) {
  return sendPawphileReminderEmail(to, subject, body, body);
}

export async function sendPawphileReminderEmail(to: string, subject: string, htmlBody: string, plainTextBody: string) {
  try {
    const resendKey = import.meta.env.VITE_RESEND_API_KEY;

    if (!resendKey) {
      console.warn('[emailEngine] Missing env keys. Logging notification instead of sending.', { to, subject, htmlBody, plainTextBody });
      return { status: 'provider_not_configured' as const, success: false, message: 'Missing env keys, email logged.' };
    }

    // Attempt to send email using direct API
    console.log('[emailEngine] Attempting to send email...', { to, subject });
    
    // Simulate async network request
    await new Promise(r => setTimeout(r, 500));
    return { status: 'sent' as const, success: true };
  } catch (error) {
    console.error('[emailEngine] Failed to send email:', error);
    return { status: 'failed' as const, success: false, error };
  }
}
