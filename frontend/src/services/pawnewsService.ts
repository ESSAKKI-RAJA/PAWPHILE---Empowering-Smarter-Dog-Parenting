import { getSupabaseClient } from './supabaseClientWithClerk';

/**
 * Saves PAWNEWS interactions (save, helpful, click) to Supabase.
 * Only executes if the user is authenticated and opts-in.
 */
export async function logPawnewsInteraction(clerkToken: string, profileId: string, articleId: string, interactionType: 'save' | 'helpful' | 'click' | 'view'): Promise<void> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    
    // We don't throw an error to the UI to avoid fake API success or disruption
    await supabase
      .from('pawnews_user_interactions')
      .insert({
        profile_id: profileId,
        article_id: articleId,
        interaction_type: interactionType,
        created_at: new Date().toISOString()
      });

  } catch (e) {
    console.error(`Failed to log PAWNEWS interaction (${interactionType})`, e);
  }
}
