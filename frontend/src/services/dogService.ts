import { getSupabaseClient } from './supabaseClientWithClerk';

export interface Dog {
  id: string;
  profile_id: string;
  name: string;
  photo_url?: string;
  breed: string;
  dob: string;
  gender: string;
  weight_kg?: number;
  diet_type?: string;
  activity_level?: string;
  health_goal?: string;
  neutered?: boolean;
  allergies?: string[];
  past_illnesses?: string[];
  medical_history?: string;
  linked_vet_id?: string;
}

export async function getDogs(clerkToken: string, profileId: string): Promise<Dog[]> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('profile_id', profileId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching dogs:', error);
    return [];
  }
}

export async function upsertDog(clerkToken: string, dogData: Partial<Dog>): Promise<Dog | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('dogs')
      .upsert({
        ...dogData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting dog:', error);
    return null;
  }
}
