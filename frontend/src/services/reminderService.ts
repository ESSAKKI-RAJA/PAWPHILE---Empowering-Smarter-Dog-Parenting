import { getSupabaseClient } from './supabaseClientWithClerk';

export interface ReminderPreferences {
  profile_id: string;
  walks_enabled?: boolean;
  vaccines_enabled?: boolean;
  vet_visits_enabled?: boolean;
  nutrition_enabled?: boolean;
  email_address?: string;
  timezone?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export async function getReminderPreferences(clerkToken: string, profileId: string): Promise<ReminderPreferences | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('reminder_preferences')
      .select('*')
      .eq('profile_id', profileId)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // ignore not found
    return data;
  } catch (error) {
    console.error('Error fetching reminder preferences:', error);
    return null;
  }
}

export async function saveReminderPreferences(clerkToken: string, prefs: ReminderPreferences): Promise<ReminderPreferences | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('reminder_preferences')
      .upsert({
        ...prefs,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving reminder preferences:', error);
    return null;
  }
}
