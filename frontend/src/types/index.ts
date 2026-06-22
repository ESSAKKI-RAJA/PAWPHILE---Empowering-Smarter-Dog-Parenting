import { SourceCategory } from '../data/referenceSources';

export interface DogProfile {
  id?: string;
  name: string;
  breed: string;
  dateOfBirth: string; // ISO string
  ageYears?: number;
  ageMonths?: number;
  gender: 'male' | 'female' | 'Male' | 'Female';
  weightKg: number;
  heightCm?: number;
  bodyLengthCm?: number;
  allergies: string[];
  medicalHistory?: string;
  existingConditions?: string[];
  dietType: 'dry kibble' | 'wet food' | 'raw' | 'home cooked' | 'mixed' | 'Dry/Kibble' | 'Wet Food' | 'Raw/BARF' | 'Home-Cooked' | 'Mixed';
  dietDescription?: string;
  vaccinationStatus?: 'Up to date' | 'Partial' | 'Unknown';
  activityLevel: 'low' | 'medium' | 'high' | 'Low' | 'Moderate' | 'High' | 'Very High';
  neutered: boolean | 'Yes' | 'No' | 'Unknown';
  goal?: 'maintenance' | 'weight loss' | 'muscle gain';
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EngineSourceMetadata = {
  sourceCategory: SourceCategory;
  sourcesUsed: string[];
  sourceNote: string;
};

export interface AppSettings {
  healthGoal: string;
  activityLevel: string;
  foodPreference: string;
  medicalSensitivity: string;
  
  notifications: {
    vaccines: boolean;
    deworming: boolean;
    vetAppointments: boolean;
    medicineTimers: boolean;
    dailyWalks: boolean;
    feedingTimes: boolean;
    grooming: boolean;
    emergency: boolean;
    quietHours: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };

  emergencyMode: boolean;
  shareData: boolean;
  emergencyContact: string;
  primaryVetContact: string;

  aiResponseStyle: string;
  aiFeatures: {
    breedSpecific: boolean;
    ageSpecific: boolean;
    foodRecs: boolean;
    behaviorAnalysis: boolean;
    riskAlerts: boolean;
    showConfidence: boolean;
    alwaysShowVetWarning: boolean;
    saveChatHistory: boolean;
  };

  units: {
    weight: 'kg' | 'lbs';
    temperature: 'c' | 'f';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy';
    timeFormat: '12h' | '24h';
    currency: string;
  };

  location: {
    enabled: boolean;
    findVets: boolean;
    findEmergency: boolean;
    findStores: boolean;
    findGroomers: boolean;
    radiusKm: number;
  };

  privacy: {
    anonData: boolean;
    cloudBackup: boolean;
    encryptHealthData: boolean;
  };

  appearance: {
    theme: 'system' | 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reduceAnimations: boolean;
    simpleMode: boolean;
    accentColor: string;
  };

  language: string;
}

export interface BreedData {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large' | 'giant';
  weightRangeKg: { min: number; max: number };
  idealWeightKg: number;
  lifeExpectancyYears: { min: number; max: number };
  energyLevel: 1 | 2 | 3 | 4 | 5;
  climateSuitability: 'hot' | 'cold' | 'moderate' | 'all';
  exerciseMinutesPerDay: number;
  groomingLevel: 'low' | 'medium' | 'high';
  temperament: string[];
  apartmentFriendly: boolean;
  beginnerFriendly: boolean;
  commonDiseases: string[];
  emergencyRisks: string[];
  obesityRisk: 'low' | 'medium' | 'high';
  skinRisk: 'low' | 'medium' | 'high';
  jointRisk: 'low' | 'medium' | 'high';
  heartRisk: 'low' | 'medium' | 'high';
  heatSensitivity: 'low' | 'medium' | 'high';
  coldSensitivity: 'low' | 'medium' | 'high';
  vaccinationNotes: string;
  dewormingNotes: string;
  wellnessTips: string[];
  nutritionNotes: string;
  behaviorBaseline: string;
}

export interface HealthScoreResult {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  breakdown: {
    weightScore: number; // Max 20
    vaccineScore: number; // Max 20
    walkScore: number; // Max 15
    symptomScore: number; // Max 15
    dewormingScore: number; // Max 10
    behaviorScore: number; // Max 10
    nutritionScore: number; // Max 10
  };
  recommendations: string[];
  breedRiskAlerts: string[];
}

export interface SymptomInput {
  symptoms: string[];
  breed: string;
  ageYears: number;
  weightKg: number;
  appetite: 'normal' | 'reduced' | 'none';
  energyLevel: 'normal' | 'low' | 'very_low';
  poopCondition: 'normal' | 'loose' | 'bloody' | 'none';
  vomiting: 'none' | 'once' | 'repeated' | 'bloody';
  waterIntake: 'normal' | 'increased' | 'decreased';
}

export interface SymptomResult {
  probableConditions: {
    name: string;
    likelihood: number; // percentage
    description: string;
  }[];
  urgencyLevel: 'emergency' | 'urgent' | 'monitor' | 'normal';
  isEmergency: boolean;
  homeCareSteps: string[];
  vetTimeframe: string;
  breedSpecificWarning: string | null;
  disclaimer: string;
}

export interface VaccineSchedule {
  id: string;
  vaccineName: string;
  dueDate: string; // ISO string
  status: 'upcoming' | 'overdue' | 'completed';
  daysUntilDue: number;
  priority: 'high' | 'medium' | 'low';
  completedDate?: string; // ISO string
}

export interface NutritionPlan {
  dailyCalories: number;
  proteinPercentRange: { min: number; max: number };
  fatPercentRange: { min: number; max: number };
  dailyPortionGrams: number;
  mealFrequency: number;
  hydrationMl: number;
  foodsToAvoid: string[];
  healthyTreats: string[];
  feedingTips: string[];
}

export interface BehaviorLog {
  id: string;
  date: string; // ISO string
  sleepHours: number;
  appetiteScore: 1 | 2 | 3 | 4 | 5;
  barkingScore: 1 | 2 | 3 | 4 | 5;
  scratchingScore: 1 | 2 | 3 | 4 | 5;
  moodScore: 1 | 2 | 3 | 4 | 5;
  playfulness: 1 | 2 | 3 | 4 | 5;
  lethargyLevel: 1 | 2 | 3 | 4 | 5;
  vomitingCount: number;
  bathroomChanges: boolean;
}

export interface BehaviorResult {
  behaviorScore: number;
  stressScore: number;
  anomalies: string[];
  interventions: string[];
  vetSuggested: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

export interface WalkLog {
  id: string;
  date: string; // ISO string
  durationMinutes: number;
}

export interface NutritionLog {
  id: string;
  date: string; // ISO string
  foodName: string;
  quantityGrams: number;
  calories: number;
}
