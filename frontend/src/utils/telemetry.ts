export type TelemetryEvent = 
  | 'paw_ai_question_submitted'
  | 'triage_completed'
  | 'emergency_marked'
  | 'report_exported'
  | 'news_opened'
  | 'news_saved'
  | 'fallback_mode_triggered'
  | 'api_failure'
  | 'vet_escalation_shown';

export function trackEvent(eventName: TelemetryEvent, properties?: Record<string, any>) {
  // In a production environment, this would send data to Mixpanel, PostHog, Amplitude, etc.
  // For v0.9 Local Demo-Ready, we log to console to prove the telemetry hooks exist.
  console.log(`[Telemetry] 📈 ${eventName}`, properties || {});
}
