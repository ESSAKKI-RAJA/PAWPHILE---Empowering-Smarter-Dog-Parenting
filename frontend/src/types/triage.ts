import { SourceCategory } from '../data/referenceSources';

export type TriageSeverity = "green" | "orange" | "red";

export interface TriageInput {
  breed: string;
  age: string;
  weight: string;
  symptoms: string;
  foodType: string;
  vaccinationStatus: string;
  duration: string;
  // Extended fields from PAWPHILE symptom checklist:
  selectedSymptoms: string[];
  tickExposure: boolean;
  recentDietChange: boolean;
  recentBoarding: boolean;
  toxinExposure: boolean;
}

export interface TriageResult {
  severity: TriageSeverity;
  severityLabel: string;
  title: string;
  summary: string;
  possibleCauses: string[];
  homeCare: string[];
  warningSigns: string[];
  preventionTips: string[];
  confidence: number;
  nextStep: string;
  isEmergency: boolean;
  sourceCategory: SourceCategory;
  sourcesUsed: string[];
  sourceTags: string[];
  sourceNote: string;
}
