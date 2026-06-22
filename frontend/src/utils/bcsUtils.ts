import { DogProfile, EngineSourceMetadata } from '../types';

export interface BCSResult extends EngineSourceMetadata {
  score: number;
  pct_over: number;
  idealRange: [number, number];
  riskPct: number;
  advice: string;
  label: 'Underweight' | 'Healthy' | 'Overweight' | 'Obese';
  disclaimer: string;
}

function getNormalizedProfile(profile: any) {
  return {
    weightKg: Number(profile.weightKg || profile.weight || 0),
    gender: String(profile.gender || profile.sex || 'unknown').toLowerCase(),
    breed: String(profile.breed || '').toLowerCase(),
    neutered: profile.neutered === true || profile.neutered === 'Yes' || String(profile.neutered).toLowerCase() === 'yes',
    activityLevel: String(profile.activityLevel || 'medium').toLowerCase(),
    ageYears: Number(profile.ageYears || profile.age || 0),
    dateOfBirth: profile.dateOfBirth || profile.dob || '',
    goal: String(profile.goal || 'maintenance').toLowerCase()
  };
}

export function calculateBCS(rawProfile: DogProfile): BCSResult {
  const profile = getNormalizedProfile(rawProfile);
  if (!profile.weightKg || profile.weightKg <= 0) {
    return {
      score: 5, pct_over: 0, idealRange: [0, 0], riskPct: 0,
      label: 'Healthy',
      advice: 'Weight data unavailable. Please update your dog profile for an accurate estimate.',
      disclaimer: 'This estimate requires weight data. Please complete the dog profile.',
      sourceCategory: 'bcs',
      sourcesUsed: ['WSAVA', 'AAHA', 'MSD/Merck Veterinary Manual'],
      sourceNote: 'Estimated BCS is based on profile data and veterinary nutrition references. True BCS requires visual and physical assessment by a veterinarian.'
    };
  }

  const gender = profile.gender;
  const breed = profile.breed;

  let idealMin = 10;
  let idealMax = 15;

  if (breed.includes('labrador')) { idealMin = gender === 'male' ? 29 : 25; idealMax = gender === 'male' ? 36 : 32; }
  else if (breed.includes('german shepherd')) { idealMin = gender === 'male' ? 30 : 22; idealMax = gender === 'male' ? 40 : 32; }
  else if (breed.includes('golden retriever')) { idealMin = gender === 'male' ? 29 : 25; idealMax = gender === 'male' ? 34 : 29; }
  else if (breed.includes('pug')) { idealMin = 6; idealMax = 8; }
  else if (breed.includes('beagle')) { idealMin = gender === 'male' ? 10 : 9; idealMax = gender === 'male' ? 11 : 10; }
  else if (breed.includes('shih tzu')) { idealMin = 4; idealMax = 7; }
  else if (breed.includes('rottweiler')) { idealMin = gender === 'male' ? 50 : 35; idealMax = gender === 'male' ? 60 : 48; }
  else if (breed.includes('pariah') || breed.includes('indie')) { idealMin = 15; idealMax = 25; }
  else if (breed.includes('dachshund')) { idealMin = 7; idealMax = 15; }
  else if (breed.includes('doberman')) { idealMin = gender === 'male' ? 34 : 27; idealMax = gender === 'male' ? 45 : 41; }
  else {
    idealMin = Math.max(1, profile.weightKg * 0.8);
    idealMax = profile.weightKg * 1.2;
  }

  const idealMid = (idealMin + idealMax) / 2;
  const pct_over = (profile.weightKg - idealMid) / idealMid;

  let baseBcs = 5;
  if (pct_over < -0.20) baseBcs = 2;
  else if (pct_over >= -0.20 && pct_over < -0.10) baseBcs = 3;
  else if (pct_over >= -0.10 && pct_over < 0.00) baseBcs = 4;
  else if (pct_over >= 0.00 && pct_over < 0.10) baseBcs = 5;
  else if (pct_over >= 0.10 && pct_over < 0.20) baseBcs = 6;
  else if (pct_over >= 0.20 && pct_over < 0.30) baseBcs = 7;
  else if (pct_over >= 0.30 && pct_over < 0.40) baseBcs = 8;
  else baseBcs = 9;

  const isNeutered = profile.neutered === true || profile.neutered === 'Yes';
  if (isNeutered) baseBcs += 0.5;

  const act = (profile.activityLevel || 'medium').toLowerCase();
  if (act === 'low') baseBcs += 0.5;
  if (act === 'very high') baseBcs -= 0.5;

  let ageYears = profile.ageYears || 0;
  if (!ageYears && profile.dateOfBirth) {
    const d = new Date(profile.dateOfBirth);
    const diff = new Date().getTime() - d.getTime();
    ageYears = diff / 31557600000;
  }
  if (ageYears >= 7) baseBcs += 0.5;
  if (ageYears < 1 && baseBcs > 5) baseBcs = Math.max(5, baseBcs - 1);

  let score = Math.round(baseBcs);
  score = Math.max(1, Math.min(9, score));

  let riskPct = 0;
  if (score === 6) riskPct = 15;
  else if (score === 7) riskPct = 30;
  else if (score === 8) riskPct = 60;
  else if (score === 9) riskPct = 85;

  let label: BCSResult['label'] = 'Healthy';
  if (score <= 3) label = 'Underweight';
  else if (score <= 5) label = 'Healthy';
  else if (score <= 7) label = 'Overweight';
  else label = 'Obese';

  let advice = '';
  if (score <= 3) advice = 'Consider increasing daily food portions. Please consult a veterinarian to rule out underlying illness or parasites.';
  else if (score <= 5) advice = 'Weight appears to be in a healthy range. Continue current diet and exercise routine. Confirm with your vet at the next visit.';
  else if (score === 6) advice = 'Consider reducing daily calories by ~10% and increasing walk time. Consult your veterinarian for a personalised weight plan.';
  else if (score === 7) advice = 'Overweight risk detected. Reduce treats, increase activity. A vet-supervised weight management plan is recommended.';
  else advice = 'Significant obesity risk estimate. Please consult your veterinarian promptly for a medically supervised diet plan.';

  return {
    score,
    pct_over,
    idealRange: [idealMin, idealMax],
    riskPct,
    label,
    advice,
    disclaimer: 'This is an algorithmic estimate based on profile data. True BCS requires physical assessment by a veterinarian (WSAVA guidelines).',
    sourceCategory: 'bcs',
    sourcesUsed: ['WSAVA', 'AAHA', 'MSD/Merck Veterinary Manual'],
    sourceNote: 'Estimated BCS is based on profile data and veterinary nutrition references. True BCS requires visual and physical assessment by a veterinarian.'
  };
}

/**
 * Maintenance Energy Requirement (MER) calculation.
 * Formula: RER = 70 × (bodyweight_kg ^ 0.75), then multiplied by life-stage factor.
 * Sources: MSD/Merck Veterinary Manual, WSAVA, AAHA Nutrition Guidelines.
 */
export function calculateMER(rawProfile: DogProfile): number {
  const profile = getNormalizedProfile(rawProfile);
  if (!profile.weightKg || profile.weightKg <= 0) return 0;

  const rer = 70 * Math.pow(profile.weightKg, 0.75);

  let ageYears = profile.ageYears;
  if (!ageYears && profile.dateOfBirth) {
    const diff = new Date().getTime() - new Date(profile.dateOfBirth).getTime();
    ageYears = diff / 31557600000;
  }

  const isNeutered = profile.neutered;
  const act = profile.activityLevel;

  // Life-stage multipliers per WSAVA/AAHA guidelines
  let factor = 1.8; // Intact adult default
  if (ageYears < (4 / 12)) factor = 3.0;   // < 4 months
  else if (ageYears < 1) factor = 2.5;      // puppy
  else if (ageYears >= 7) factor = 1.4;     // senior
  else if (isNeutered) factor = 1.6;        // neutered adult

  // Activity overrides
  if (act === 'high') factor = 2.0;
  if (act === 'very high') factor = 5.0;

  // Weight loss prescription
  if (profile.goal === 'weight loss') factor = 1.0;

  return Math.round(rer * factor);
}

