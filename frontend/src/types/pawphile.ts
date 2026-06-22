/**
 * PAWPHILE Extended Types
 * Backend-ready shape — every field maps to a database column or JSONB key.
 */

// ─────────────────────────────────────────────
// DIET TYPE & EXISTING UTILITIES
// ─────────────────────────────────────────────

export type DietType =
  | 'Dry / Kibble'
  | 'Wet Food'
  | 'Mixed Diet'
  | 'Home-Cooked'
  | 'Raw Diet'
  | 'Prescription Diet'
  | 'Vegetarian Diet'
  | 'High-Protein Diet'
  | 'Grain-Free Diet'
  | 'Treat-Heavy Diet'
  | 'Unknown / Not Sure';

export const DIET_OPTIONS: { value: DietType; label: string; helper: string }[] = [
  { value: 'Dry / Kibble', label: 'Dry / Kibble', helper: 'Convenient & balanced — great for busy Indian households. Choose a breed-specific kibble for best results.' },
  { value: 'Wet Food', label: 'Wet Food', helper: 'High moisture content — ideal for dogs that drink less water, especially in Indian summers.' },
  { value: 'Mixed Diet', label: 'Mixed Diet (Default)', helper: 'Mixed Diet – ideal balance for most Indian Labs, supports skin health & stool quality.' },
  { value: 'Home-Cooked', label: 'Home-Cooked', helper: 'Common in India — use boiled chicken, rice & veggies. Avoid onion, garlic, and excessive salt.' },
  { value: 'Raw Diet', label: 'Raw Diet (BARF)', helper: 'Biologically appropriate raw food — ensure proper hygiene. Not recommended in high-temperature cities.' },
  { value: 'Prescription Diet', label: 'Prescription Diet', helper: 'Vet-prescribed formula — follow dosage strictly. Do not mix with other foods without vet approval.' },
  { value: 'Vegetarian Diet', label: 'Vegetarian Diet', helper: 'Possible but requires careful protein supplementation. Consult your vet for balanced vegetarian recipes.' },
  { value: 'High-Protein Diet', label: 'High-Protein Diet', helper: 'Best for active breeds like German Shepherds & Boxers — monitor kidney health with regular blood tests.' },
  { value: 'Grain-Free Diet', label: 'Grain-Free Diet', helper: 'Suitable for dogs with grain allergies — linked to DCM in some breeds, consult your vet.' },
  { value: 'Treat-Heavy Diet', label: 'Treat-Heavy Diet', helper: 'Treats should be ≤10% of daily calories. Obesity risk is high — consider a diet transition plan.' },
  { value: 'Unknown / Not Sure', label: 'Unknown / Not Sure', helper: 'That\'s okay! Start with a vet consultation to build the right diet plan for your dog.' },
];

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// ─────────────────────────────────────────────
// BASE ENTITY
// ─────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
  source: 'manual' | 'ai' | 'vet' | 'imported' | 'ai_food_scan' | 'ai_label_scan';
  syncStatus: 'local_only' | 'synced' | 'sync_failed';
}

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

export interface DogProfile extends BaseEntity {
  name: string;
  breed: string;
  breedType: 'indian' | 'common' | 'mixed' | 'unknown';
  age?: number;
  dob?: string;
  sex: 'male' | 'female' | 'unknown';
  neutered: boolean;
  weight?: number;
  weightUnit: 'kg' | 'lbs';
  allergies?: string[];
  chronicConditions?: string[];
  pastIllnesses?: string[];
  currentMedications?: string[];
  vaccineStatus: 'up_to_date' | 'overdue' | 'unknown' | 'partial';
  dewormingStatus: 'up_to_date' | 'overdue' | 'unknown';
  photoUrl?: string;
  notes?: string;
  
  // Legacy / existing compatibility fields
  dietType?: DietType;
  activityLevel?: 'low' | 'medium' | 'high';
  goal?: 'maintenance' | 'weight loss' | 'muscle gain';
}

export interface OwnerProfile extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  city: string;
  language: 'en' | 'hi' | 'ta' | string;
  notificationPreference: 'push' | 'email' | 'sms' | 'none';
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredVetName?: string;
  preferredVetPhone?: string;
}

// ─────────────────────────────────────────────
// TRIAGE & EMERGENCY
// ─────────────────────────────────────────────

export interface SymptomLog extends BaseEntity {
  dogId: string;
  mainConcern: string;
  onsetTime: string; // ISO string
  progression: 'improving' | 'worsening' | 'stable' | 'recurring';
  appetiteStatus: 'normal' | 'reduced' | 'refused' | 'unknown';
  waterIntake: 'normal' | 'excessive' | 'reduced' | 'unable';
  vomitingCount?: number;
  vomitingColor?: string;
  vomitingBlood?: boolean;
  diarrheaFrequency?: number;
  diarrheaBlood?: boolean;
  diarrheaMucus?: boolean;
  blackStool?: boolean;
  energyLevel: 'normal' | 'quiet' | 'lethargic' | 'weak' | 'collapsed' | 'disoriented';
  breathingStatus: 'normal' | 'fast' | 'labored' | 'coughing';
  gumColor?: 'pink' | 'pale' | 'white' | 'blue' | 'unknown';
  temperatureMeasured?: boolean;
  temperatureValue?: number;
  tickFleasSeen?: boolean;
  recentTravel?: boolean;
  toxinExposure?: boolean;
  toxinDescription?: string;
  currentMedications?: string;
  allergies?: string;
  photoUrl?: string;
  notes?: string;
  triageResultId?: string;
}

export interface TriageResult extends BaseEntity {
  dogId: string;
  symptomLogId: string;
  severity: 'red' | 'yellow' | 'green';
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0–100
  reasons: string[];
  dataUsed: string[];
  missingData: string[];
  whatToDoNow: string;
  whatToMonitor: string[];
  whenToGoToVet: string;
  dailyAction?: string;
  safetyNote?: string;
  escalationTriggered: boolean;
  disclaimer: string;
  ruleVersion: string;
  modelVersion?: string;
  inputSnapshot: object;
  outputSnapshot: object;
  disclaimerShown: boolean;
}

export interface EmergencyFlag {
  id: string;
  dogId: string;
  triageResultId: string;
  createdAt: string; // ISO string
  flagType: string;
  description: string;
  escalationRequired: boolean;
}

// ─────────────────────────────────────────────
// RECORDS & VISITS
// ─────────────────────────────────────────────

export interface VaccineRecord extends BaseEntity {
  dogId: string;
  vaccineName: string;
  dateGiven: string; // ISO string
  nextDueDate: string; // ISO string
  vetName?: string;
  clinicName?: string;
  certificateUrl?: string;
  adverseReactionNotes?: string;
  reminderEnabled: boolean;
}

export interface DewormingRecord extends BaseEntity {
  dogId: string;
  productName?: string;
  dateGiven: string; // ISO string
  nextDueDate: string; // ISO string
  weightAtTreatment?: number;
  vetNotes?: string;
  reminderEnabled: boolean;
}

export interface VetVisit extends BaseEntity {
  dogId: string;
  vetName: string;
  clinicName: string;
  contactNumber?: string;
  visitDate: string; // YYYY-MM-DD
  visitTime?: string; // HH:MM
  visitType: string;
  symptoms?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  clinicalNotes?: string;
  followUpRequired: boolean;
  nextVisitDate?: string; // YYYY-MM-DD
  nextVisitTime?: string; // HH:MM
  attachmentUrls?: string[];
}

export interface Medication extends BaseEntity {
  dogId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
}

// ─────────────────────────────────────────────
// NUTRITION & BEHAVIOR
// ─────────────────────────────────────────────

export interface FoodCheck extends BaseEntity {
  dogId: string;
  foodName: string;
  safetyStatus: 'toxic_urgent' | 'avoid' | 'caution' | 'generally_safe' | 'unknown';
  reason: string;
  portionCaution?: string;
  toxicityWarning?: string;
  whenToContactVet?: string;
  referenceSource?: string;
}

export interface NutritionLog extends BaseEntity {
  dogId: string;
  dogName?: string;
  mealDescription?: string;
  foodName?: string;
  calories?: number;
  caloriesCal?: number;
  foodType?: string;
  portionNotes?: string;
  portionGrams?: number;
  proteinGrams?: number;
  fatGrams?: number;
  carbsGrams?: number;
  vetApproved?: boolean;
  source: 'manual' | 'ai_food_scan' | 'ai_label_scan' | 'vet' | 'imported' | 'ai';
  confidence?: number;
  imageQuality?: 'excellent' | 'good' | 'poor';
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  isTreat?: boolean;
  notes?: string;
  syncStatus: 'local_only' | 'synced' | 'sync_failed';
}

export interface BehaviorLog extends BaseEntity {
  dogId: string;
  mood: 'happy' | 'normal' | 'anxious' | 'lethargic' | 'aggressive';
  appetiteLevel: 'normal' | 'increased' | 'decreased' | 'refused';
  activityLevel: 'high' | 'normal' | 'low' | 'none';
  notes?: string;
}

// ─────────────────────────────────────────────
// VISION SCAN
// ─────────────────────────────────────────────

export interface ImageScan extends BaseEntity {
  dogId: string;
  bodyPart: 'skin' | 'eye' | 'ear' | 'paw' | 'wound' | 'tick' | 'other';
  imageUrl: string;
  imageQualityScore?: number;
  imageQualityPass?: boolean;
  modelResult?: string;
  severityColor?: 'red' | 'yellow' | 'green';
  confidence?: number;
  explanation?: string;
  safetyWarning?: string;
  linkedToTriageResultId?: string;
  consentGiven: boolean;
}

// ─────────────────────────────────────────────
// REPORTS & METADATA
// ─────────────────────────────────────────────

export interface Report extends BaseEntity {
  dogId: string;
  reportType: 'vet_visit' | 'triage_summary' | 'full_history' | 'vaccine_record';
  generatedPdfUrl?: string;
  sharedWithVet?: boolean;
  dateRangeStart?: string; // ISO string
  dateRangeEnd?: string; // ISO string
  includesAiOutput: boolean;
  disclaimer: string;
}

export interface ConsentLog {
  id: string;
  userId: string;
  createdAt: string; // ISO string
  consentType: 'dog_health_data' | 'image_scan' | 'image_training' | 'location' | 'notifications' | 'data_export';
  accepted: boolean;
  timestamp: string; // ISO string
  version: string;
  purpose: string;
}

export interface AuditLog {
  id: string;
  dogId?: string;
  userId?: string;
  createdAt: string; // ISO string
  module: 'triage' | 'emergency' | 'food' | 'vision' | 'wellness_score' | 'report' | 'vaccine' | 'deworming';
  inputSnapshot: object;
  outputSnapshot: object;
  ruleVersion: string;
  modelVersion?: string;
  confidence?: number;
  severityColor?: string;
  escalationTriggered: boolean;
  disclaimerShown: boolean;
}

export interface WellnessScore {
  dogId: string;
  calculatedAt: string; // ISO string
  score: number; // 0–100
  zone: 'green' | 'yellow' | 'red';
  confidence: number;
  breakdown: {
    vaccineDeworming: number; // 25%
    recentSymptoms: number;   // 25%
    behaviorActivity: number; // 20%
    weightBcs: number;        // 15%
    vetFollowUp: number;      // 10%
    dataCompleteness: number;  // 5%
  };
  reasons: string[];
  missingDataWarning?: string;
  dailyAction: string;
  safetyNote?: string;
  disclaimer: string;
}

export interface Reminder {
  id: string;
  dogId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  reminderType: 'vaccine' | 'deworming' | 'vet_followup' | 'behavior_log' | 'food_check';
  dueDate: string; // ISO string
  message: string;
  enabled: boolean;
  sent: boolean;
  sentAt?: string; // ISO string
}

export interface CloudBackupState {
  enabled: boolean;
  lastSyncedAt?: string;
  autoSync: boolean;
}

export const DEFAULT_CLOUD_BACKUP: CloudBackupState = {
  enabled: true,
  autoSync: true,
};

export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  id: '',
  name: 'User',
  city: '',
  language: 'en',
  notificationPreference: 'none',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: 'manual',
  syncStatus: 'local_only',
};
