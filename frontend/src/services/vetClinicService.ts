import { getSupabaseClient } from './supabaseClientWithClerk';

export interface VetClinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  emergency_24x7?: boolean;
  latitude?: number;
  longitude?: number;
  verified?: boolean;
}

export async function getVetClinics(clerkToken: string | null, city?: string): Promise<VetClinic[]> {
  try {
    // Vet clinics are public read, so it can work with or without a token
    const supabase = getSupabaseClient(clerkToken);
    let query = supabase.from('vet_clinics').select('*');
    
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching vet clinics:', error);
    return [];
  }
}
