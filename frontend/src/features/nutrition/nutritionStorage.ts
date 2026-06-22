
export type NutritionLog = {
  id: string;
  userId?: string;
  dogId?: string;
  dogName?: string;
  source: "ai_food_scan" | "manual";
  foodName: string;
  imageName?: string;
  imagePreviewUrl?: string;
  portionGrams?: number;
  caloriesCal: number;
  proteinGrams?: number;
  fatGrams?: number;
  carbsGrams?: number;
  confidence?: number;
  imageQuality?: number;
  notes?: string;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Treat' | 'Other';
  isTreat?: boolean;
  createdAt: string;
};

const LS_KEY = 'pawphile_nutrition_logs';

export function getNutritionLogs(): NutritionLog[] {
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudNutritionLogs(): Promise<void> {
  // TODO: Implement with Neon
}

export async function saveNutritionLog(log: NutritionLog): Promise<void> {
  const existing = getNutritionLogs();
  const index = existing.findIndex(l => l.id === log.id);
  
  if (index >= 0) {
    existing[index] = log;
  } else {
    existing.unshift(log); // Add new at top
  }
  
  localStorage.setItem(LS_KEY, JSON.stringify(existing));

  // TODO: Sync to Neon
}

export async function updateNutritionLog(id: string, changes: Partial<NutritionLog>): Promise<void> {
  const logs = getNutritionLogs();
  const logIndex = logs.findIndex((l) => l.id === id);
  if (logIndex === -1) return;

  const updatedLog = { ...logs[logIndex], ...changes };
  await saveNutritionLog(updatedLog);
}

export async function deleteNutritionLog(id: string): Promise<void> {
  const logs = getNutritionLogs();
  const updated = logs.filter((l) => l.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  // TODO: Delete from Neon
}

export function getTodaysNutritionLogs(): NutritionLog[] {
  const logs = getNutritionLogs();
  const today = new Date().toISOString().split('T')[0];
  return logs.filter(l => l.createdAt.startsWith(today));
}

export function getNutritionLogsByRange(days: number): NutritionLog[] {
  const logs = getNutritionLogs();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return logs.filter(l => new Date(l.createdAt) >= start);
}

export function calculateDailyCalories(): number {
  return getTodaysNutritionLogs().reduce((sum, log) => sum + log.caloriesCal, 0);
}

export function calculateWeeklyCalories(): number[] {
  const logs = getNutritionLogsByRange(7);
  // Implementation will vary based on charting needs
  return logs.map(l => l.caloriesCal); 
}

export function calculateMonthlyCalories(): number[] {
  const logs = getNutritionLogsByRange(30);
  return logs.map(l => l.caloriesCal); 
}
