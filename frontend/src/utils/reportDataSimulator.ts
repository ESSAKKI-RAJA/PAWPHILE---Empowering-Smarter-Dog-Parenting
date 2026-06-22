import { DogProfile } from '../types/pawphile';
import { calculateMER } from './bcsUtils';

export interface SimulatedDay {
  date: string;
  steps: number;
  distanceKm: number;
  activeMinutes: number;
  sleepHours: number;
  deepSleep: number;
  caloriesConsumed: number;
  waterIntakeMl: number;
  anxietyScore: number; // 1-10
  barkingScore: number; // 1-10
  energyScore: number; // 1-5
}

export function generateSimulatedData(dog: DogProfile, days: number = 90): SimulatedDay[] {
  const data: SimulatedDay[] = [];
  const now = new Date();
  
  // Base values depending on breed size / age
  const weight = Number(dog.weight) || 15; // default 15kg
  const age = Number(dog.age) || 3;
  const targetMER = calculateMER(dog);
  
  // Heuristics
  let baseSteps = 8000;
  if (weight < 10) baseSteps = 6000;
  if (weight > 30) baseSteps = 7000;
  if (age < 2) baseSteps += 2000;
  if (age > 8) baseSteps -= 3000;
  
  const baseWater = weight * 50; // roughly 50ml per kg
  
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    // Add some random noise
    const stepNoise = Math.floor(Math.random() * 3000) - 1500;
    const steps = Math.max(1000, baseSteps + stepNoise);
    
    const activeMinutes = Math.floor(steps / 100); // rough estimate
    const distanceKm = +(steps * 0.0007).toFixed(2);
    
    const sleepHours = +(12 + Math.random() * 4).toFixed(1);
    const deepSleep = +(sleepHours * (0.4 + Math.random() * 0.2)).toFixed(1);
    
    const calorieNoise = Math.floor(Math.random() * (targetMER * 0.2)) - (targetMER * 0.1);
    const caloriesConsumed = Math.max(100, Math.floor(targetMER + calorieNoise));
    
    const waterNoise = Math.floor(Math.random() * (baseWater * 0.2)) - (baseWater * 0.1);
    const waterIntakeMl = Math.max(100, Math.floor(baseWater + waterNoise));
    
    const anxietyScore = Math.floor(Math.random() * 3) + 1; // 1-3 usually, occasional spikes
    const barkingScore = Math.floor(Math.random() * 4) + 1; // 1-4
    
    const energyScore = Math.random() > 0.9 ? 3 : (Math.random() > 0.5 ? 5 : 4);
    
    data.push({
      date: d.toISOString(),
      steps,
      distanceKm,
      activeMinutes,
      sleepHours,
      deepSleep,
      caloriesConsumed,
      waterIntakeMl,
      anxietyScore,
      barkingScore,
      energyScore
    });
  }
  
  return data;
}
