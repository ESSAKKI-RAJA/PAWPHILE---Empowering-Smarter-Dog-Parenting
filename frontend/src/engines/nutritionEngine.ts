import { DogProfile, NutritionLog } from '../types/pawphile';

export function calculateNutrition(profile: DogProfile, logs: NutritionLog[]) {
  // RER = 70 * (weight in kg)^0.75
  const weight = profile.weight || 0;
  let rer = 0;
  if (weight > 0) {
    rer = 70 * Math.pow(weight, 0.75);
  }

  // MER multipliers (approximate)
  let multiplier = 1.6; // average neutered adult
  if (!profile.neutered) multiplier = 1.8;
  if (profile.activityLevel === 'low') multiplier -= 0.2;
  if (profile.activityLevel === 'high') multiplier += 0.4;
  if (profile.goal === 'weight loss') multiplier -= 0.2;

  const estimatedDailyCalories = Math.round(rer * multiplier);
  
  const todayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString());
  const consumedCalories = todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const diff = estimatedDailyCalories - consumedCalories;

  return {
    rer: Math.round(rer),
    mer: estimatedDailyCalories,
    estimatedDailyCalories,
    consumedCalories,
    calorieDifference: diff,
    status: diff > 0 ? 'deficit' : (diff < 0 ? 'surplus' : 'balanced'),
    disclaimer: 'This is an estimate. For illness, obesity, or growth, confirm with a veterinarian.'
  };
}
