import { getSupabaseClient } from './supabaseClientWithClerk';

export type SyncState = 'local only' | 'syncing' | 'synced' | 'sync failed' | 'offline mode' | 'conflict found';

/**
 * Service to sync local Pawphile data to Supabase.
 * Gracefully degrades if offline or no token is provided.
 */
export class SyncService {
  private clerkToken: string | null = null;
  private clerkUserId: string | null = null;
  private onStateChange: ((state: SyncState) => void) | null = null;
  private currentProfileId: string | null = null;

  constructor(token: string | null, userId: string | null, onStateChange?: (state: SyncState) => void) {
    this.clerkToken = token;
    this.clerkUserId = userId;
    if (onStateChange) this.onStateChange = onStateChange;
  }

  private setState(state: SyncState) {
    if (this.onStateChange) this.onStateChange(state);
  }

  private async shouldUpsert(supabase: any, table: string, id: string, localUpdatedAtStr?: string): Promise<boolean> {
    try {
      if (!localUpdatedAtStr) return true;
      const { data, error } = await supabase
        .from(table)
        .select('updated_at, created_at, logged_at')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return true;

      const cloudTimeStr = data.updated_at || data.created_at || data.logged_at;
      if (!cloudTimeStr) return true;

      const cloudTime = new Date(cloudTimeStr).getTime();
      const localTime = new Date(localUpdatedAtStr).getTime();

      // If cloud is newer, do not overwrite
      if (cloudTime > localTime) {
        console.log(`[Sync Conflict] Skipped upsert for ${table}/${id}. Cloud is newer.`);
        this.setState('conflict found');
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  public async syncAll(localData: any): Promise<void> {
    if (!this.clerkToken || !this.clerkUserId) {
      this.setState('local only');
      return;
    }
    
    if (!navigator.onLine) {
      this.setState('offline mode');
      return;
    }

    this.setState('syncing');

    try {
      const supabase = getSupabaseClient(this.clerkToken);

      // 1. Upsert Profile
      // Check if profile exists and if it is newer
      const localProfileTime = new Date().toISOString();
      let allowProfileSync = true;
      
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, updated_at')
        .eq('clerk_user_id', this.clerkUserId)
        .maybeSingle();

      if (existingProfile && existingProfile.updated_at) {
        // Assume local is newer since we are executing a sync from local changes, but check if user profile has an explicit updated_at
        const localTime = localData.userProfile?.updatedAt ? new Date(localData.userProfile.updatedAt).getTime() : 0;
        const cloudTime = new Date(existingProfile.updated_at).getTime();
        if (cloudTime > localTime) {
          allowProfileSync = false;
        }
      }

      if (allowProfileSync) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .upsert(
            {
              clerk_user_id: this.clerkUserId,
              name: localData.userProfile?.name || 'User',
              phone: localData.userProfile?.phone,
              email: localData.userProfile?.email,
              city: localData.userProfile?.city,
              address: localData.userProfile?.address,
              updated_at: localProfileTime
            },
            { onConflict: 'clerk_user_id' }
          )
          .select('id')
          .single();

        if (profileErr) throw profileErr;
        this.currentProfileId = profile?.id;
      } else {
        this.currentProfileId = existingProfile?.id;
      }

      // 2. Upsert Dog
      const dogIdToSync = localData.selectedDog?.id;
      if (this.currentProfileId && localData.selectedDog) {
        const localDogTime = localData.selectedDog.updatedAt || localData.selectedDog.updated_at || new Date().toISOString();
        const ok = await this.shouldUpsert(supabase, 'dogs', dogIdToSync, localDogTime);
        if (ok) {
          const { error: dogErr } = await supabase
            .from('dogs')
            .upsert(
              {
                id: localData.selectedDog.id,
                profile_id: this.currentProfileId,
                name: localData.selectedDog.name,
                breed: localData.selectedDog.breed,
                dob: localData.selectedDog.dateOfBirth || localData.selectedDog.dob,
                gender: localData.selectedDog.sex || localData.selectedDog.gender,
                weight_kg: localData.selectedDog.weightKg || localData.selectedDog.weight,
                neutered: localData.selectedDog.neutered,
                allergies: localData.selectedDog.allergies,
                past_illnesses: localData.selectedDog.pastIllnesses,
                updated_at: localDogTime
              },
              { onConflict: 'id' }
            );
            
          if (dogErr) console.warn('Dog sync error:', dogErr);
        }
      }

      // 3. Sync Preventive Care (Vaccines, Deworming)
      if (this.currentProfileId && dogIdToSync) {
        for (const vac of localData.vaccineRecords || []) {
           const localTime = vac.updatedAt || vac.createdAt || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'preventive_care_records', vac.id, localTime);
           if (ok) {
             await supabase.from('preventive_care_records').upsert({
                id: vac.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                care_type: 'vaccine',
                name: vac.vaccineName,
                administered_date: vac.dateGiven,
                next_due_date: vac.nextDueDate,
                created_at: vac.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }
        for (const dew of localData.dewormingRecords || []) {
           const localTime = dew.updatedAt || dew.createdAt || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'preventive_care_records', dew.id, localTime);
           if (ok) {
             await supabase.from('preventive_care_records').upsert({
                id: dew.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                care_type: 'deworming',
                name: dew.productName,
                administered_date: dew.dateGiven,
                next_due_date: dew.nextDueDate,
                created_at: dew.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }
        
        // 4. Sync Triage Events
        for (const triage of localData.triageResults || []) {
           const localTime = triage.createdAt || triage.created_at || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'triage_events', triage.id, localTime);
           if (ok) {
             await supabase.from('triage_events').upsert({
                id: triage.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                symptoms: triage.symptoms || [],
                duration: triage.duration,
                calculated_risk_level: triage.riskLevel,
                ai_assessment: triage.assessment,
                recommended_action: triage.action,
                created_at: triage.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }
        
        // 5. Sync Dog Health Logs (vet visits)
        for (const visit of localData.vetVisits || []) {
           const localTime = visit.visitDate || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'dog_health_logs', visit.id, localTime);
           if (ok) {
             await supabase.from('dog_health_logs').upsert({
                id: visit.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                log_type: 'vet_visit',
                value: visit.reasonForVisit,
                notes: visit.diagnosisAsEntered || visit.medicinesPrescribed,
                logged_at: visit.visitDate || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }

        // 6. Sync Vision Scans
        for (const scan of localData.imageScans || []) {
           const localTime = scan.date || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'vision_scans', scan.id, localTime);
           if (ok) {
             await supabase.from('vision_scans').upsert({
                id: scan.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                image_url: scan.imageUrl || 'local_blob',
                body_area: scan.areaId,
                concern_type: scan.concernType,
                ai_findings: scan.result ? JSON.stringify(scan.result) : null,
                created_at: scan.date || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }

        // 7. Sync Nutrition Logs
        for (const nut of localData.nutritionLogs || []) {
           const localTime = nut.createdAt || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'nutrition_logs', nut.id, localTime);
           if (ok) {
             await supabase.from('nutrition_logs').upsert({
                id: nut.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                food_name: nut.foodName,
                calories_kcal: nut.caloriesCal,
                amount_grams: nut.amountGrams || null,
                logged_at: nut.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }

        // 8. Sync Behavior Logs
        for (const beh of localData.behaviorLogs || []) {
           const localTime = beh.createdAt || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'behavior_logs', beh.id, localTime);
           if (ok) {
              await supabase.from('behavior_logs').upsert({
                id: beh.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                mood: beh.mood,
                appetite_level: beh.appetiteLevel,
                activity_level: beh.activityLevel,
                notes: beh.notes,
                logged_at: beh.createdAt || new Date().toISOString()
             }, { onConflict: 'id' });
           }
        }

        // 10. Sync Reports
        for (const rep of localData.reports || []) {
           const localTime = rep.updatedAt || rep.created_at || new Date().toISOString();
           const ok = await this.shouldUpsert(supabase, 'reports', rep.id, localTime);
           if (ok) {
             await supabase.from('reports').upsert({
                id: rep.id,
                profile_id: this.currentProfileId,
                dog_id: dogIdToSync,
                report_type: rep.report_type || 'health_summary',
                file_path: rep.file_path,
                file_size: rep.file_size || null,
                included_sections: rep.included_sections || [],
                upload_status: rep.upload_status || 'completed',
                created_at: rep.created_at || new Date().toISOString(),
                updated_at: localTime
             }, { onConflict: 'id' });
           }
        }
      }

      // 11. Sync Reminder Preferences
      if (this.currentProfileId && localData.ownerProfile?.notificationPreferences) {
         const prefs = localData.ownerProfile.notificationPreferences;
         const localTime = localData.ownerProfile.updatedAt || new Date().toISOString();
         
         let allowPrefsSync = true;
         const { data: existingPrefs } = await supabase
           .from('reminder_preferences')
           .select('updated_at')
           .eq('profile_id', this.currentProfileId)
           .maybeSingle();

         if (existingPrefs && existingPrefs.updated_at) {
           const cloudTime = new Date(existingPrefs.updated_at).getTime();
           if (cloudTime > new Date(localTime).getTime()) {
             allowPrefsSync = false;
           }
         }

         if (allowPrefsSync) {
           await supabase.from('reminder_preferences').upsert({
              profile_id: this.currentProfileId,
              walks_enabled: prefs.walks || false,
              vaccines_enabled: prefs.vaccines !== false,
              vet_visits_enabled: prefs.vetVisits !== false,
              nutrition_enabled: prefs.nutrition || false,
              email_address: prefs.reminderEmail || localData.ownerProfile.email,
              updated_at: localTime
           }, { onConflict: 'profile_id' });
         }
      }

      this.setState('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      this.setState('sync failed');
    }
  }
}
