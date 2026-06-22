import { getSupabaseClient } from './supabaseClientWithClerk';

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  app_language?: string;
  subscription_status?: string;
  cloud_backup_enabled?: boolean;
  consent_for_ai?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getProfile(clerkToken: string): Promise<UserProfile | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function upsertProfile(clerkToken: string, clerkUserId: string, profileData: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        clerk_user_id: clerkUserId,
        ...profileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'clerk_user_id' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting profile:', error);
    return null;
  }
}
