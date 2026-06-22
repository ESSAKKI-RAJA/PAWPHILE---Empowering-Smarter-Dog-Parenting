import { getSupabaseClient } from './supabaseClientWithClerk';

export interface HealthLog {
  id?: string;
  dog_id: string;
  profile_id: string;
  log_type: string;
  value: string;
  notes?: string;
  logged_at?: string;
}

export async function addHealthLog(clerkToken: string, logData: HealthLog): Promise<HealthLog | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('dog_health_logs')
      .insert({
        ...logData,
        logged_at: logData.logged_at || new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding health log:', error);
    return null;
  }
}

export async function getHealthLogs(clerkToken: string, dogId: string): Promise<HealthLog[]> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('dog_health_logs')
      .select('*')
      .eq('dog_id', dogId)
      .order('logged_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching health logs:', error);
    return [];
  }
}
