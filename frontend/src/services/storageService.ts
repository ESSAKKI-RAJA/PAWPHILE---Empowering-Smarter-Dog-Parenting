import { getSupabaseClient } from './supabaseClientWithClerk';

/**
 * Supabase Storage Planning & Placeholders
 * 
 * Bucket Definitions:
 * 1. 'dog-photos': Publicly readable, restricted write. 
 *    Path: `dog-photos/{profile_id}/{dog_id}/profile.jpg`
 * 
 * 2. 'vision-scans': Private, RLS restricted to owner. 
 *    Path: `vision-scans/{profile_id}/{dog_id}/{scan_id}.jpg`
 * 
 * 3. 'reports': Private, RLS restricted to owner.
 *    Path: `reports/{profile_id}/{dog_id}/{report_id}.pdf`
 */

export async function uploadDogPhoto(clerkToken: string, profileId: string, dogId: string, file: File): Promise<string | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const path = `dog-photos/${profileId}/${dogId}/profile.jpg`;
    
    const { error } = await supabase.storage
      .from('dog-photos')
      .upload(path, file, { upsert: true });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error('Failed to upload dog photo', e);
    return null;
  }
}

export async function uploadVisionScan(clerkToken: string, profileId: string, dogId: string, scanId: string, file: File): Promise<string | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const path = `vision-scans/${profileId}/${dogId}/${scanId}.jpg`;
    
    const { error } = await supabase.storage
      .from('vision-scans')
      .upload(path, file, { upsert: true });
      
    if (error) throw error;
    
    // Scans are private, so we might need signed URLs or direct download
    return path;
  } catch (e) {
    console.error('Failed to upload vision scan', e);
    return null;
  }
}

export async function uploadPdfReport(clerkToken: string, profileId: string, dogId: string, reportId: string, file: File): Promise<string | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const path = `reports/${profileId}/${dogId}/${reportId}.pdf`;
    
    const { error } = await supabase.storage
      .from('reports')
      .upload(path, file, { upsert: true });
      
    if (error) throw error;
    return path;
  } catch (e) {
    console.error('Failed to upload report', e);
    return null;
  }
}
