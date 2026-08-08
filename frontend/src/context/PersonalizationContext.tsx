/**
 * PersonalizationContext.tsx
 *
 * Central source of truth for dog profile personalization.
 * Wraps PawphileDataContext and exposes a single `usePersonalization()` hook
 * that all features consume — PAW AI, Triage, Wellness, Nutrition, etc.
 *
 * Architecture:
 *   DogProfile
 *      └─> PersonalizationContext
 *             └─> PAW AI, Triage, Nutrition, Behavior, Vision, Reports, Wellness
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { usePawphileData } from './PawphileDataContext';
import type { BreedKnowledge } from '../types/pawphileCore';
import type { DogProfile } from '../types/pawphile';
import { BREEDS } from '../data/breeds';

// ── Age categorization ────────────────────────────────────────────────────────
export type AgeCategory = 'puppy' | 'adult' | 'senior' | 'unknown';

function getAgeCategory(dog: DogProfile | null): AgeCategory {
  if (!dog) return 'unknown';
  const age = (dog as any).ageYears ?? (dog as any).age ?? null;
  if (age == null) return 'unknown';
  const ageNum = typeof age === 'object' && age.years != null ? age.years : Number(age);
  if (Number.isNaN(ageNum)) return 'unknown';
  if (ageNum < 1) return 'puppy';
  if (ageNum >= 7) return 'senior';
  return 'adult';
}

// ── Personalization context type ──────────────────────────────────────────────
export interface DogPersonalizationContext {
  /** Currently selected dog profile */
  dog: DogProfile | null;

  /** Resolved breed intelligence from BREED_KNOWLEDGE_SEED — null if unsupported */
  breedIntel: BreedKnowledge | null;

  /** Whether breed intelligence is available for the current dog */
  isBreedSupported: boolean;

  /** Normalized breed ID e.g. 'labrador-retriever' */
  breedId: string | null;

  /** Display name of breed e.g. 'Labrador Retriever' */
  breedName: string | null;

  /** Age category derived from dog's date of birth */
  ageCategory: AgeCategory;

  /** Age in years (numeric) or null */
  ageYears: number | null;

  /** Size category from breed intelligence */
  sizeCategory: 'small' | 'medium' | 'large' | 'giant' | 'unknown';

  /** Risk tags from breed intelligence (e.g. ['obesity', 'hip_dysplasia']) */
  riskFlags: string[];

  /** Obesity tendency from breed intelligence */
  obesityTendency: 'low' | 'medium' | 'high' | 'unknown';

  /**
   * Standardized PAW AI context object — passed to all AI/RAG services.
   * Contains everything needed to generate breed-aware, personalized responses.
   */
  pawAiContext: PawAiContextObject;

  /**
   * Quick breed summary string for UI display
   * e.g. "Labrador Retriever • Large • High obesity risk"
   */
  breedSummaryLine: string;
}

export interface PawAiContextObject {
  dogName: string;
  breed: string;
  breedId: string | null;
  ageYears: number | null;
  ageCategory: AgeCategory;
  gender: string;
  weightKg: number | null;
  neutered: boolean | null;
  activityLevel: string;
  allergies: string[];
  pastIllnesses: string[];
  medicalHistory: string;
  // Breed intelligence fields
  breedNote: string;
  breedRiskTags: string[];
  breedEmergencyFlags: string[];
  breedNutritionCautions: string[];
  breedExerciseMinutes: number | null;
  breedObesityRisk: string;
  breedHeatSensitivity: string;
  breedSizeClass: string;
  breedBcsGuidance: string;
  breedVisionNote: string;
  breedBehaviorNote: string;
  isBreedSupported: boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────
const PersonalizationCtx = createContext<DogPersonalizationContext | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const { selectedDog, resolveBreedKnowledge } = usePawphileData();

  const ctx = useMemo<DogPersonalizationContext>(() => {
    const dog = selectedDog ?? null;
    const breedName = dog?.breed ?? null;
    const breedIntel = breedName ? resolveBreedKnowledge(breedName) : null;
    const isBreedSupported = breedIntel !== null;

    // Find canonical breed ID from BREEDS list
    const breedRecord = breedName
      ? BREEDS.find(b => b.name.toLowerCase() === breedName.toLowerCase())
      : null;
    const breedId = breedRecord?.id ?? null;

    // Age
    const ageCategory = getAgeCategory(dog);
    const rawAge = dog ? ((dog as any).ageYears ?? (dog as any).age ?? null) : null;
    const ageYears: number | null = rawAge == null
      ? null
      : typeof rawAge === 'object' && rawAge.years != null
        ? rawAge.years
        : Number.isNaN(Number(rawAge)) ? null : Number(rawAge);

    // Size
    const sizeCategory: DogPersonalizationContext['sizeCategory'] = breedIntel?.sizeClass ?? 'unknown';

    // Risk
    const riskFlags = breedIntel?.commonRiskTags ?? [];
    const obesityTendency: DogPersonalizationContext['obesityTendency'] = breedIntel?.obesityTendency ?? 'unknown';

    // Breed summary line
    const sizeLabel = sizeCategory !== 'unknown' ? sizeCategory.charAt(0).toUpperCase() + sizeCategory.slice(1) : null;
    const obesityLabel = obesityTendency !== 'unknown' ? `${obesityTendency} obesity risk` : null;
    const breedSummaryLine = [breedName, sizeLabel, obesityLabel].filter(Boolean).join(' • ');

    // PAW AI context
    const weightKg: number | null = dog
      ? ((dog as any).weightKg ?? (dog as any).weight ?? null)
      : null;
    const neutered: boolean | null = dog
      ? (typeof (dog as any).neutered === 'boolean' ? (dog as any).neutered : null)
      : null;

    const pawAiContext: PawAiContextObject = {
      dogName: dog?.name ?? 'Unknown',
      breed: breedName ?? 'Unknown',
      breedId,
      ageYears,
      ageCategory,
      gender: (dog as any)?.gender ?? (dog as any)?.sex ?? 'unknown',
      weightKg,
      neutered,
      activityLevel: (dog as any)?.activityLevel ?? 'unknown',
      allergies: (dog as any)?.allergies ?? [],
      pastIllnesses: (dog as any)?.pastIllnesses ?? [],
      medicalHistory: (dog as any)?.medicalHistory ?? '',
      // Breed intel
      breedNote: breedIntel?.notes ?? (isBreedSupported ? '' : 'Breed-specific data not yet available.'),
      breedRiskTags: riskFlags,
      breedEmergencyFlags: breedIntel?.emergencyRedFlags ?? [],
      breedNutritionCautions: breedIntel?.nutritionCautions ?? [],
      breedExerciseMinutes: breedIntel?.exerciseMinutesPerDay ?? null,
      breedObesityRisk: obesityTendency,
      breedHeatSensitivity: breedIntel?.heatSensitivity ?? 'unknown',
      breedSizeClass: sizeCategory,
      breedBcsGuidance: breedIntel?.bcsGuidance ?? '',
      breedVisionNote: breedIntel?.visionScanNote ?? '',
      breedBehaviorNote: breedRecord?.behaviorBaseline ?? '',
      isBreedSupported,
    };

    return {
      dog,
      breedIntel,
      isBreedSupported,
      breedId,
      breedName,
      ageCategory,
      ageYears,
      sizeCategory,
      riskFlags,
      obesityTendency,
      pawAiContext,
      breedSummaryLine,
    };
  }, [selectedDog, resolveBreedKnowledge]);

  return (
    <PersonalizationCtx.Provider value={ctx}>
      {children}
    </PersonalizationCtx.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function usePersonalization(): DogPersonalizationContext {
  const ctx = useContext(PersonalizationCtx);
  if (!ctx) throw new Error('usePersonalization must be used within PersonalizationProvider');
  return ctx;
}
