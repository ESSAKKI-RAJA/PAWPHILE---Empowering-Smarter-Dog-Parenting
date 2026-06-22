import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loadFromStorage, saveToStorage, deleteFromStorage } from '../lib/storage';
import * as api from '../services/apiClient';
import type {
  DogProfile, OwnerProfile, SymptomLog, TriageResult, VaccineRecord, DewormingRecord,
  VetVisit, FoodCheck, NutritionLog, BehaviorLog, ImageScan, Report, ConsentLog, AuditLog, Medication
} from '../types/pawphile';

interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
}

interface PawphileDataContextType {
  dogProfiles: DogProfile[];
  selectedDog: DogProfile | null;
  setSelectedDog: (id: string) => void;
  ownerProfile: OwnerProfile | null;
  symptomLogs: SymptomLog[];
  triageResults: TriageResult[];
  vaccineRecords: VaccineRecord[];
  dewormingRecords: DewormingRecord[];
  vetVisits: VetVisit[];
  medications: Medication[];
  foodChecks: FoodCheck[];
  nutritionLogs: NutritionLog[];
  behaviorLogs: BehaviorLog[];
  imageScans: ImageScan[];
  reports: Report[];
  consentLogs: ConsentLog[];
  auditLogs: AuditLog[];
  notificationPreferences: Record<string, any>;
  themeSettings: ThemeSettings;

  addDogProfile: (dog: DogProfile) => void;
  updateDogProfile: (id: string, updates: Partial<DogProfile>) => void;
  addSymptomLog: (log: SymptomLog) => void;
  addTriageResult: (result: TriageResult) => void;
  addVaccineRecord: (record: VaccineRecord) => void;
  addDewormingRecord: (record: DewormingRecord) => void;
  addVetVisit: (visit: VetVisit) => void;
  updateVetVisit: (id: string, updates: Partial<VetVisit>) => void;
  deleteVetVisit: (id: string) => void;
  addMedication: (med: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  addFoodCheck: (check: FoodCheck) => void;
  addBehaviorLog: (log: BehaviorLog) => void;
  addConsentLog: (log: ConsentLog) => void;
  addAuditLog: (log: AuditLog) => void;
  addNutritionLog: (log: NutritionLog) => void;
  updateNutritionLog: (id: string, updates: Partial<NutritionLog>) => void;
  deleteNutritionLog: (id: string) => void;
  exportAllData: () => object;
  deleteAllData: () => void;
  setThemeSettings: (theme: ThemeSettings) => void;

  // Legacy fallback aliases for app compatibility while migrating
  state: any;
  dogProfile: DogProfile | null;
  savePetProfile: (dog: any) => void;
  saveOwnerProfile: (owner: any) => void;
  saveVetProfile: (vet: any) => void;
  seedBreedKnowledge: (data: any) => void;
}

const PawphileDataContext = createContext<PawphileDataContextType | undefined>(undefined);

const KEYS = {
  dogs: 'pawphile:v1:dogs',
  selectedDogId: 'pawphile:v1:selectedDogId',
  ownerProfile: 'pawphile:v1:ownerProfile',
  symptomLogs: 'pawphile:v1:symptomLogs',
  triageResults: 'pawphile:v1:triageResults',
  vaccineRecords: 'pawphile:v1:vaccineRecords',
  dewormingRecords: 'pawphile:v1:dewormingRecords',
  vetVisits: 'pawphile:v1:vetVisits',
  medications: 'pawphile:v1:medications',
  foodChecks: 'pawphile:v1:foodChecks',
  nutritionLogs: 'pawphile:v1:nutritionLogs',
  behaviorLogs: 'pawphile:v1:behaviorLogs',
  imageScans: 'pawphile:v1:imageScans',
  reports: 'pawphile:v1:reports',
  consentLogs: 'pawphile:v1:consentLogs',
  auditLogs: 'pawphile:v1:auditLogs',
  settings: 'pawphile:v1:settings',
};

export function PawphileDataProvider({ children }: { children: ReactNode }) {
  const [dogProfiles, setDogProfilesState] = useState<DogProfile[]>([]);
  const [selectedDogId, setSelectedDogIdState] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfileState] = useState<OwnerProfile | null>(null);
  const [symptomLogs, setSymptomLogsState] = useState<SymptomLog[]>([]);
  const [triageResults, setTriageResultsState] = useState<TriageResult[]>([]);
  const [vaccineRecords, setVaccineRecordsState] = useState<VaccineRecord[]>([]);
  const [dewormingRecords, setDewormingRecordsState] = useState<DewormingRecord[]>([]);
  const [vetVisits, setVetVisitsState] = useState<VetVisit[]>([]);
  const [medications, setMedicationsState] = useState<Medication[]>([]);
  const [foodChecks, setFoodChecksState] = useState<FoodCheck[]>([]);
  const [nutritionLogs, setNutritionLogsState] = useState<NutritionLog[]>([]);
  const [behaviorLogs, setBehaviorLogsState] = useState<BehaviorLog[]>([]);
  const [imageScans, setImageScansState] = useState<ImageScan[]>([]);
  const [reports, setReportsState] = useState<Report[]>([]);
  const [consentLogs, setConsentLogsState] = useState<ConsentLog[]>([]);
  const [auditLogs, setAuditLogsState] = useState<AuditLog[]>([]);
  const [notificationPreferences, setNotificationPreferencesState] = useState({});
  const [themeSettings, setThemeSettingsState] = useState<ThemeSettings>({ mode: 'light' });

  // Hydrate on mount
  useEffect(() => {
    setDogProfilesState(loadFromStorage(KEYS.dogs, []));
    setSelectedDogIdState(loadFromStorage(KEYS.selectedDogId, null));
    setOwnerProfileState(loadFromStorage(KEYS.ownerProfile, null));
    setSymptomLogsState(loadFromStorage(KEYS.symptomLogs, []));
    setTriageResultsState(loadFromStorage(KEYS.triageResults, []));
    setVaccineRecordsState(loadFromStorage(KEYS.vaccineRecords, []));
    setDewormingRecordsState(loadFromStorage(KEYS.dewormingRecords, []));
    setVetVisitsState(loadFromStorage(KEYS.vetVisits, []));
    setFoodChecksState(loadFromStorage(KEYS.foodChecks, []));
    setNutritionLogsState(loadFromStorage(KEYS.nutritionLogs, []));
    setBehaviorLogsState(loadFromStorage(KEYS.behaviorLogs, []));
    setImageScansState(loadFromStorage(KEYS.imageScans, []));
    setReportsState(loadFromStorage(KEYS.reports, []));
    setConsentLogsState(loadFromStorage(KEYS.consentLogs, []));
    setAuditLogsState(loadFromStorage(KEYS.auditLogs, []));
    
    const settings: any = loadFromStorage(KEYS.settings, { notifications: {}, theme: { mode: 'light' } });
    setNotificationPreferencesState(settings.notifications || {});
    setThemeSettingsState(settings.theme || { mode: 'light' });
  }, []);

  const saveSettings = (notifs: any, theme: ThemeSettings) => {
    const settings = { notifications: notifs, theme };
    saveToStorage(KEYS.settings, settings);
  };

  const setSelectedDog = useCallback((id: string) => {
    setSelectedDogIdState(id);
    saveToStorage(KEYS.selectedDogId, id);
  }, []);

  const addDogProfile = useCallback(async (dog: DogProfile) => {
    try {
      const savedDog = await api.createDog(dog);
      setDogProfilesState(prev => {
        const next = [...prev, savedDog];
        saveToStorage(KEYS.dogs, next);
        if (!selectedDogId) setSelectedDog(savedDog.id);
        return next;
      });
    } catch (e) {
      console.error('Failed to save dog profile to cloud:', e);
      // Fallback to local
      setDogProfilesState(prev => {
        const next = [...prev, dog];
        saveToStorage(KEYS.dogs, next);
        if (!selectedDogId) setSelectedDog(dog.id);
        return next;
      });
    }
  }, [selectedDogId, setSelectedDog]);

  const updateDogProfile = useCallback(async (id: string, updates: Partial<DogProfile>) => {
    try {
      await api.updateDog(id, updates);
    } catch (e) {
      console.error('Failed to update dog profile in cloud:', e);
    }
    setDogProfilesState(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d);
      saveToStorage(KEYS.dogs, next);
      return next;
    });
  }, []);

  const addSymptomLog = useCallback((log: SymptomLog) => {
    setSymptomLogsState(prev => {
      const next = [...prev, log];
      saveToStorage(KEYS.symptomLogs, next);
      return next;
    });
  }, []);

  const addTriageResult = useCallback((result: TriageResult) => {
    setTriageResultsState(prev => {
      const next = [...prev, result];
      saveToStorage(KEYS.triageResults, next);
      return next;
    });
  }, []);

  const addVaccineRecord = useCallback(async (record: VaccineRecord) => {
    try {
      if (selectedDogId) {
        await api.createVaccine(selectedDogId, record);
      }
    } catch (e) {
      console.error('Failed to save vaccine to cloud:', e);
    }
    setVaccineRecordsState(prev => {
      const next = [...prev, record];
      saveToStorage(KEYS.vaccineRecords, next);
      return next;
    });
  }, [selectedDogId]);

  const addDewormingRecord = useCallback((record: DewormingRecord) => {
    setDewormingRecordsState(prev => {
      const next = [...prev, record];
      saveToStorage(KEYS.dewormingRecords, next);
      return next;
    });
  }, []);

  const addVetVisit = useCallback((visit: VetVisit) => {
    setVetVisitsState(prev => {
      const next = [...prev, visit];
      saveToStorage(KEYS.vetVisits, next);
      return next;
    });
  }, []);

  const updateVetVisit = useCallback((id: string, updates: Partial<VetVisit>) => {
    setVetVisitsState(prev => {
      const next = prev.map(v => v.id === id ? { ...v, ...updates } : v);
      saveToStorage(KEYS.vetVisits, next);
      return next;
    });
  }, []);

  const deleteVetVisit = useCallback((id: string) => {
    setVetVisitsState(prev => {
      const next = prev.filter(v => v.id !== id);
      saveToStorage(KEYS.vetVisits, next);
      return next;
    });
  }, []);

  const addMedication = useCallback((med: Medication) => {
    setMedicationsState(prev => {
      const next = [...prev, med];
      saveToStorage(KEYS.medications, next);
      return next;
    });
  }, []);

  const updateMedication = useCallback((id: string, updates: Partial<Medication>) => {
    setMedicationsState(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      saveToStorage(KEYS.medications, next);
      return next;
    });
  }, []);

  const deleteMedication = useCallback((id: string) => {
    setMedicationsState(prev => {
      const next = prev.filter(m => m.id !== id);
      saveToStorage(KEYS.medications, next);
      return next;
    });
  }, []);

  const addFoodCheck = useCallback((check: FoodCheck) => {
    setFoodChecksState(prev => {
      const next = [...prev, check];
      saveToStorage(KEYS.foodChecks, next);
      return next;
    });
  }, []);

  const addBehaviorLog = useCallback((log: BehaviorLog) => {
    setBehaviorLogsState(prev => {
      const next = [...prev, log];
      saveToStorage(KEYS.behaviorLogs, next);
      return next;
    });
  }, []);

  const addNutritionLog = useCallback((log: NutritionLog) => {
    setNutritionLogsState(prev => {
      const next = [...prev, log];
      saveToStorage(KEYS.nutritionLogs, next);
      return next;
    });
  }, []);

  const updateNutritionLog = useCallback((id: string, updates: Partial<NutritionLog>) => {
    setNutritionLogsState(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updates } : l);
      saveToStorage(KEYS.nutritionLogs, next);
      return next;
    });
  }, []);

  const deleteNutritionLog = useCallback((id: string) => {
    setNutritionLogsState(prev => {
      const next = prev.filter(l => l.id !== id);
      saveToStorage(KEYS.nutritionLogs, next);
      return next;
    });
  }, []);

  const addConsentLog = useCallback((log: ConsentLog) => {
    setConsentLogsState(prev => {
      const next = [...prev, log];
      saveToStorage(KEYS.consentLogs, next);
      return next;
    });
  }, []);

  const addAuditLog = useCallback((log: AuditLog) => {
    setAuditLogsState(prev => {
      const next = [...prev, log];
      saveToStorage(KEYS.auditLogs, next);
      return next;
    });
  }, []);

  const setThemeSettings = useCallback((theme: ThemeSettings) => {
    setThemeSettingsState(theme);
    saveSettings(notificationPreferences, theme);
  }, [notificationPreferences]);

  const exportAllData = useCallback(() => {
    return {
      dogProfiles, ownerProfile, symptomLogs, triageResults, vaccineRecords,
      dewormingRecords, vetVisits, medications, foodChecks, nutritionLogs, behaviorLogs,
      imageScans, reports, consentLogs, auditLogs, notificationPreferences, themeSettings
    };
  }, [dogProfiles, ownerProfile, symptomLogs, triageResults, vaccineRecords, dewormingRecords, vetVisits, medications, foodChecks, nutritionLogs, behaviorLogs, imageScans, reports, consentLogs, auditLogs, notificationPreferences, themeSettings]);

  const deleteAllData = useCallback(() => {
    Object.values(KEYS).forEach(k => deleteFromStorage(k));
    setDogProfilesState([]);
    setSelectedDogIdState(null);
    setOwnerProfileState(null);
    setSymptomLogsState([]);
    setTriageResultsState([]);
    setVaccineRecordsState([]);
    setDewormingRecordsState([]);
    setVetVisitsState([]);
    setMedicationsState([]);
    setFoodChecksState([]);
    setNutritionLogsState([]);
    setBehaviorLogsState([]);
    setImageScansState([]);
    setReportsState([]);
    setConsentLogsState([]);
    setAuditLogsState([]);
    setNotificationPreferencesState({});
    setThemeSettingsState({ mode: 'light' });
  }, []);

  const selectedDog = dogProfiles.find(d => d.id === selectedDogId) || dogProfiles[0] || null;

  return (
    <PawphileDataContext.Provider value={{
      dogProfiles, selectedDog, setSelectedDog, ownerProfile, symptomLogs, triageResults,
      vaccineRecords, dewormingRecords, vetVisits, medications, foodChecks, nutritionLogs, behaviorLogs,
      imageScans, reports, consentLogs, auditLogs, notificationPreferences, themeSettings,
      addDogProfile, updateDogProfile, addSymptomLog, addTriageResult, addVaccineRecord,
      addDewormingRecord, addVetVisit, updateVetVisit, deleteVetVisit,
      addMedication, updateMedication, deleteMedication,
      addFoodCheck, addBehaviorLog, addConsentLog, addAuditLog,
      addNutritionLog, updateNutritionLog, deleteNutritionLog,
      exportAllData, deleteAllData, setThemeSettings,
      state: { petProfile: selectedDog, ownerProfile, vetProfile: null }, // Enhanced state fallback
      dogProfile: selectedDog,
      savePetProfile: (dog: any) => selectedDog ? updateDogProfile(selectedDog.id, dog) : addDogProfile(dog),
      saveOwnerProfile: (owner: any) => setOwnerProfileState(owner),
      saveVetProfile: (vet: any) => console.log('Vet profile save not implemented yet', vet),
      seedBreedKnowledge: (data: any) => console.log('Seed breed knowledge', data)
    }}>
      {children}
    </PawphileDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePawphileData = () => {
  const context = useContext(PawphileDataContext);
  if (context === undefined) {
    throw new Error('usePawphileData must be used within a PawphileDataProvider');
  }
  return context;
};
