import type { SourceCategory } from '../data/referenceSources';

export type ISODateString = string; // yyyy-mm-dd
export type ISOTimestamp = string; // full ISO timestamp

export type SourceType =
  | 'clinical_guideline'
  | 'breed_reference'
  | 'peer_reviewed'
  | 'government_database'
  | 'industry_standard'
  | 'other';

export type SourceMetadata = {
  sourceName: string;
  sourceUrl?: string;
  sourceType: SourceType;
  lastVerified?: ISODateString;
  confidenceScore: number; // 0-100
  notes?: string;
  sourceCategory?: SourceCategory;
};

export type PetProfile = {
  id: string;
  name: string;
  photoUrl: string;
  breed: string;
  dob: ISODateString | '';
  autoAge: { years: number; months: number } | null;
  gender: 'male' | 'female' | '';
  weightKg: number | null;
  bodyConditionStatus: 'Underweight' | 'Ideal' | 'Above Ideal' | 'Obese' | 'Unknown';
  dietType: string;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high' | '';
  healthGoal: 'maintenance' | 'weight_loss' | 'muscle_gain' | 'unknown';
  neutered: boolean | null;
  allergies: string[];
  pastIllnesses: string[];
  medicalHistory: string;
  currentDietPlan: string;
  walkTimings: { morning?: string; evening?: string };
  emergencyContactId: string | null;
  linkedVetId: string | null;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type OwnerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  notificationPreferences: {
    vaccines: boolean;
    deworming: boolean;
    vetVisits: boolean;
    nutrition: boolean;
  };
  preferredUnits: { weight: 'kg' | 'lbs'; calories: 'kcal' };
  appLanguage: string;
  subscriptionStatus: 'free' | 'premium' | 'unknown';
  savedVetLocations: { name: string; address?: string; phone?: string }[];
  cloudBackupEnabled: boolean;
  encryptionEnabled: boolean;
  consentForAI: boolean;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type VetProfile = {
  id: string;
  clinicName: string;
  vetName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  address: string;
  emergencyHours: string;
  specializations: string[];
  availability: string;
  verifiedPartner: boolean;
  notes: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type BreedKnowledge = {
  id: string;
  name: string;
  origin: string;
  sizeClass: 'small' | 'medium' | 'large' | 'giant' | 'unknown';
  minWeightKg: number | null;
  maxWeightKg: number | null;
  exerciseMinutesPerDay: number | null;
  temperamentTags: string[];
  apartmentFriendly: boolean | null;
  heatSensitivity: 'low' | 'medium' | 'high' | 'unknown';
  groomingNeed: 'low' | 'medium' | 'high' | 'unknown';
  trainingDifficulty: 'easy' | 'medium' | 'hard' | 'unknown';
  commonRiskTags: string[];
  notes: string;
  sourceNames: string[];
  confidenceScore: number; // 0-100
  sources: SourceMetadata[];
  bcsGuidance?: string;
  bodyAreaRisks?: Record<string, string>;
  nutritionCautions?: string[];
  emergencyRedFlags?: string[];
  indianClimateCautions?: string;
  pawAiContextNote?: string;
  visionScanNote?: string;
  bcsNote?: string;
  reminderNote?: string;
  groomingSkinCareGuidance?: string;
  exerciseGuidance?: string;
  heatColdCaution?: string;
  obesityTendency?: 'low' | 'medium' | 'high';
  lifeStageNotes?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type NutritionLogEntry = {
  id: string;
  userId: string | null;
  petId: string | null;
  occurredAt: ISOTimestamp;
  date: ISODateString;
  foodName: string;
  portionGrams: number | null;
  totalKcal: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Treat' | 'Other';
  notes: string;
  macros?: { proteinG?: number; fatG?: number; carbsG?: number };
  source?: SourceMetadata;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type FoodScanLog = {
  id: string;
  userId: string | null;
  petId: string | null;
  scannedAt: ISOTimestamp;
  imageDataUrl?: string; // local preview only (not for backend storage)
  imageFileName?: string;
  manualFoodName?: string;
  manualPortionGrams?: number;
  estimate: {
    foodName: string;
    portionGrams: number | null;
    totalKcal: number;
    macros?: { proteinG?: number; fatG?: number; carbsG?: number };
    safetyWarnings: string[];
    confidenceScore: number; // 0-100
    confidenceBreakdown: {
      sourceMatch: number;
      imageQuality: number;
      nutritionCompleteness: number;
      portionConfidence: number;
      dogProfileCompleteness: number;
      safetyRuleCheck: number;
    };
    source?: SourceMetadata;
  };
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type VaccineRecord = {
  id: string;
  userId: string | null;
  petId: string | null;
  kind: 'vaccine' | 'deworming';
  name: string;
  dueDate: ISODateString;
  completed: boolean;
  completedDate: ISODateString | null;
  clinicOrVetName: string;
  batchNumber: string;
  notes: string;
  nextDueDate: ISODateString | null;
  source?: SourceMetadata;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type Reminder = {
  id: string;
  type: 'vaccine' | 'deworming' | 'nutrition' | 'vet_visit';
  title: string;
  dueDate: ISODateString;
  status: 'overdue' | 'upcoming' | 'done';
  relatedId?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type VetVisitLog = {
  id: string;
  userId: string | null;
  petId: string | null;
  visitDate: ISODateString;
  vetName: string;
  clinicName: string;
  reasonForVisit: string;
  vetInsightRemarks: string;
  diagnosisOrObservation: string;
  medicinesPrescribed: string;
  followUpDate: ISODateString | null;
  attachments: { name: string; url?: string }[];
  notes: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
};

export type AppDataState = {
  petProfile: PetProfile | null;
  ownerProfile: OwnerProfile | null;
  vetProfile: VetProfile | null;
  breedKnowledge: Record<string, BreedKnowledge>;
  nutritionLogs: NutritionLogEntry[];
  foodScanLogs: FoodScanLog[];
  vaccineRecords: VaccineRecord[];
  reminders: Reminder[];
  vetVisitLogs: VetVisitLog[];
  // Legacy engines still used by existing pages
  walkLogs: { id: string; date: ISOTimestamp; durationMinutes: number }[];
  behaviorLogs: any[];
  reportExports: { id: string; reportType: string; createdAt: ISOTimestamp; fileName: string }[];
  cloudSyncEnabled: boolean;
  cloudAvailable: boolean;
  lastCloudSyncAt: ISOTimestamp | null;
};

export function isoDate(d: Date): ISODateString {
  return d.toISOString().split('T')[0];
}

export function nowIso(): ISOTimestamp {
  return new Date().toISOString();
}

export function newUuid(): string {
  // Browser-safe UUID generation
  // crypto.randomUUID() is supported in modern browsers; fallback is a unique string.
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}

export function computeAge(dob: ISODateString | ''): PetProfile['autoAge'] {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return { years, months };
}

