import { DogProfile, VaccineRecord, DewormingRecord, SymptomLog, BehaviorLog, VetVisit, WellnessScore, NutritionLog } from '../types/pawphile';
import { isWithinDays, daysUntil } from '../lib/dateUtils';
import { calculateMER } from '../utils/bcsUtils';

export function calculateWellnessScore(
  selectedDog: DogProfile,
  vaccineRecords: VaccineRecord[],
  dewormingRecords: DewormingRecord[],
  symptomLogs: SymptomLog[],
  behaviorLogs: BehaviorLog[],
  vetVisits: VetVisit[],
  nutritionLogs: NutritionLog[] = []
): WellnessScore {
  let recentSymptoms = 30;   // 30%
  let vaccineDeworming = 25; // 25%
  let nutritionScore = 0;    // 20%
  let behaviorActivity = 0; // 15%
  let vetFollowUp = 10;      // 10%

  const reasons: string[] = [];
  const missingData: string[] = [];
  let safetyNote = '';

  // 1. Recent Symptoms (30%)
  const recentLogs = symptomLogs.filter(log => isWithinDays(log.createdAt, 7));
  if (recentLogs.length > 0) {
    const hasEmergency = recentLogs.some(log => 
      log.energyLevel === 'collapsed' || 
      log.gumColor === 'white' || 
      log.gumColor === 'blue' || 
      log.breathingStatus === 'labored' ||
      log.toxinExposure
    );
    const hasModerate = recentLogs.some(log => 
      log.energyLevel === 'lethargic' || 
      log.energyLevel === 'weak' || 
      (log.vomitingCount && log.vomitingCount > 0) || 
      (log.diarrheaFrequency && log.diarrheaFrequency > 0)
    );

    if (hasEmergency) {
      recentSymptoms = 0;
      reasons.push('Critical or emergency symptoms logged recently.');
      safetyNote = 'Critical safety warnings detected! Seek immediate veterinary care.';
    } else if (hasModerate) {
      recentSymptoms = 15;
      reasons.push('Moderate health issues/symptoms logged recently.');
      safetyNote = 'Recent symptoms include moderate indicators. Monitor closely.';
    } else {
      recentSymptoms = 30;
    }
  } else {
    recentSymptoms = 30; // no logged issues means healthy baseline
  }

  // 2. Vaccine & Deworming (25%)
  if (!vaccineRecords.length && !dewormingRecords.length) {
    vaccineDeworming = 0;
    missingData.push('Missing preventive vaccine and deworming records.');
  } else {
    let overdueCount = 0;
    vaccineRecords.forEach(v => { if (daysUntil(v.nextDueDate) < 0) overdueCount++; });
    dewormingRecords.forEach(d => { if (daysUntil(d.nextDueDate) < 0) overdueCount++; });

    if (overdueCount === 0) {
      vaccineDeworming = 25;
    } else if (overdueCount === 1) {
      vaccineDeworming = 12;
      reasons.push('A vaccine or deworming is overdue.');
    } else {
      vaccineDeworming = 0;
      reasons.push('Multiple preventive care items are overdue.');
    }
  }

  // 3. Nutrition (20%)
  if (!nutritionLogs || nutritionLogs.length === 0) {
    nutritionScore = 0;
    missingData.push('No nutrition logs on file.');
  } else {
    const targetMer = calculateMER(selectedDog);
    if (targetMer > 0) {
      // Get logs from last 3 days to calculate average daily intake
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentNutrition = nutritionLogs.filter(log => new Date(log.createdAt) >= threeDaysAgo);
      
      if (recentNutrition.length > 0) {
        const totalCalories = recentNutrition.reduce((sum, log) => sum + (log.calories || 0), 0);
        const dailyAverage = totalCalories / Math.max(1, new Set(recentNutrition.map(n => new Date(n.createdAt).toDateString())).size);
        
        const deviation = Math.abs(dailyAverage - targetMer) / targetMer;
        if (deviation <= 0.15) {
          nutritionScore = 20;
        } else {
          nutritionScore = 10;
          reasons.push('Average daily calorie intake deviates significantly from the recommended target.');
        }
      } else {
        nutritionScore = 5;
      }
    } else {
      nutritionScore = 10;
    }
  }

  // 4. Behavior & Activity (15%)
  const recentBehavior = behaviorLogs.filter(log => isWithinDays(log.createdAt, 7));
  if (!recentBehavior.length) {
    behaviorActivity = 0;
    missingData.push('No recent behavior/mood logs.');
  } else {
    const latest = recentBehavior[recentBehavior.length - 1];
    const isMoodOk = latest.mood === 'happy' || latest.mood === 'normal';
    const isActivityOk = latest.activityLevel === 'normal' || latest.activityLevel === 'high';

    if (isMoodOk && isActivityOk) {
      behaviorActivity = 15;
    } else {
      behaviorActivity = 7;
      reasons.push('Recent behavior logs indicate low mood or activity.');
    }
  }

  // 5. Vet Follow-up (10%)
  const recentVisit = vetVisits.length > 0 ? vetVisits[vetVisits.length - 1] : null;
  if (recentVisit) {
    if (recentVisit.nextVisitDate && daysUntil(recentVisit.nextVisitDate) < 0) {
      vetFollowUp = 3;
      reasons.push('Vet follow-up visit is overdue.');
    } else {
      vetFollowUp = 10;
    }
  } else {
    vetFollowUp = 10; // no overdue visits
  }

  const score = recentSymptoms + vaccineDeworming + nutritionScore + behaviorActivity + vetFollowUp;

  let zone: 'green' | 'yellow' | 'red' = 'red';
  let dailyAction = 'Book a vet visit immediately.';

  if (score >= 80) {
    zone = 'green';
    dailyAction = 'Keep up the good work! Continue daily monitoring.';
  } else if (score >= 50) {
    zone = 'yellow';
    dailyAction = 'Review warnings and schedule any outstanding preventive/vet care items.';
  }

  return {
    dogId: selectedDog.id,
    calculatedAt: new Date().toISOString(),
    score,
    zone,
    confidence: Math.max(10, 100 - (missingData.length * 20)),
    breakdown: {
      vaccineDeworming,
      recentSymptoms,
      behaviorActivity,
      weightBcs: nutritionScore, // map nutrition score here to match WellnessScore breakdown schema
      vetFollowUp,
      dataCompleteness: 0
    },
    reasons,
    missingDataWarning: missingData.length > 0 ? missingData.join(' ') : undefined,
    dailyAction,
    safetyNote: safetyNote || undefined,
    disclaimer: 'This is a wellness summary, not a clinical diagnosis.'
  };
}
