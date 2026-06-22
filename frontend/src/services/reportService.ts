import { getSupabaseClient } from './supabaseClientWithClerk';

export interface ReportMetadata {
  id?: string;
  dog_id: string;
  profile_id: string;
  report_type: string;
  file_path: string;
  file_size?: number;
  included_sections?: string[];
  upload_status?: string;
  created_at?: string;
  updated_at?: string;
}

export async function uploadPdfReportToStorage(
  clerkToken: string,
  profileId: string,
  dogId: string,
  file: File
): Promise<{ path: string; publicUrl: string } | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const reportId = crypto.randomUUID();
    const filePath = `reports/${profileId}/${dogId}/${reportId}.pdf`;

    const { error } = await supabase.storage
      .from('reports')
      .upload(filePath, file, { contentType: 'application/pdf', upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(filePath);

    return { path: filePath, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading PDF to storage:', error);
    return null;
  }
}

export async function saveReportMetadata(clerkToken: string, reportData: ReportMetadata): Promise<ReportMetadata | null> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('reports')
      .insert({
        ...reportData,
        upload_status: reportData.upload_status || 'completed',
        created_at: reportData.created_at || now,
        updated_at: now
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving report metadata:', error);
    return null;
  }
}

export async function getReports(clerkToken: string, dogId: string): Promise<ReportMetadata[]> {
  try {
    const supabase = getSupabaseClient(clerkToken);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('dog_id', dogId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}
