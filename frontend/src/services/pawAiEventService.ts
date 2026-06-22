import { getSupabaseClient } from './supabaseClientWithClerk';

export interface PawAiEventData {
  dog_id: string;
  query_intent: string;
  risk_level: string;
  confidence_score: number;
  guardrail_triggered: boolean;
  source_context_used: string[];
}

/**
 * Saves safe metadata from PAW AI interactions to Supabase.
 * Strictly avoids storing raw user chat text unless explicitly opted-in elsewhere.
 */
export async function logPawAiEvent(clerkToken: string, profileId: string, eventData: PawAiEventData): Promise<void> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    
    const { error } = await supabase
      .from('paw_ai_events')
      .insert({
        profile_id: profileId,
        dog_id: eventData.dog_id,
        query_intent: eventData.query_intent,
        risk_level: eventData.risk_level,
        confidence_score: eventData.confidence_score,
        guardrail_triggered: eventData.guardrail_triggered,
        source_context_used: eventData.source_context_used,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to log PAW AI event metadata', e);
  }
}
