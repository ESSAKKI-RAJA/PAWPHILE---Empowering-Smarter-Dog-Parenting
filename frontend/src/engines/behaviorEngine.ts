import type { BehaviorLog } from '../types/pawphile';

export interface BehaviorAnalysisResult {
  behaviorScore: number;
  stressScore: number;
  anomalies: string[];
  interventions: string[];
  vetSuggested: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

export function analyzeBehavior(logs: BehaviorLog[]): BehaviorAnalysisResult {
  if (!logs || logs.length === 0) {
    return {
      behaviorScore: 70,
      stressScore: 20,
      anomalies: [],
      interventions: ['Log your dog\'s daily behavior to start tracking trends.'],
      vetSuggested: false,
      trend: 'stable',
    };
  }

  // Sort by date, most recent first
  const sorted = [...logs].sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const recent = sorted.slice(0, 7); // last 7 logs
  const latest = sorted[0];

  const anomalies: string[] = [];
  const interventions: string[] = [];
  
  const getMoodScore = (m?: string) => {
    if (m === 'happy') return 5;
    if (m === 'normal') return 4;
    if (m === 'anxious') return 2;
    if (m === 'lethargic') return 2;
    if (m === 'aggressive') return 1;
    return 3;
  };
  
  const getAppetiteScore = (a?: string) => {
    if (a === 'increased') return 5;
    if (a === 'normal') return 4;
    if (a === 'decreased') return 2;
    if (a === 'refused') return 1;
    return 3;
  };

  const getActivityScore = (a?: string) => {
    if (a === 'high') return 5;
    if (a === 'normal') return 4;
    if (a === 'low') return 2;
    if (a === 'none') return 1;
    return 3;
  }

  // ── Mood assessment ────────────────────────────────────
  const avgMood = recent.reduce((s, l) => s + getMoodScore(l.mood), 0) / recent.length;
  if (latest.mood && getMoodScore(latest.mood) <= 2) {
    anomalies.push('Low mood detected in recent log — monitor for pain or stress triggers.');
  }

  // ── Appetite assessment ────────────────────────────────
  const avgAppetite = recent.reduce((s, l) => s + getAppetiteScore(l.appetiteLevel), 0) / recent.length;
  if (latest.appetiteLevel && getAppetiteScore(latest.appetiteLevel) <= 2) {
    anomalies.push('Reduced appetite detected — loss of appetite lasting > 24h warrants vet attention.');
  }

  // ── Energy / lethargy ─────────────────────────────────
  if (latest.activityLevel && getActivityScore(latest.activityLevel) <= 2) {
    anomalies.push('Low activity level logged — unusual exhaustion can indicate illness.');
  }

  // ── Trend calculation ─────────────────────────────────
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recent.length >= 3) {
    const older = recent.slice(Math.floor(recent.length / 2));
    const newer = recent.slice(0, Math.floor(recent.length / 2));
    const olderAvg = older.reduce((s, l) => s + getMoodScore(l.mood), 0) / (older.length || 1);
    const newerAvg = newer.reduce((s, l) => s + getMoodScore(l.mood), 0) / (newer.length || 1);
    if (newerAvg > olderAvg + 0.5) trend = 'improving';
    else if (newerAvg < olderAvg - 0.5) trend = 'declining';
  }

  // ── Behavior score ────────────────────────────────────
  const moodContrib = (avgMood / 5) * 40;
  const appetiteContrib = (avgAppetite / 5) * 30;
  const activityScore = getActivityScore(latest.activityLevel);
  const lethargyContrib = (activityScore / 5) * 20;
  const anomalyPenalty = Math.min(anomalies.length * 8, 30);
  const behaviorScore = Math.round(
    Math.max(0, Math.min(100, moodContrib + appetiteContrib + lethargyContrib - anomalyPenalty + 10))
  );

  // ── Stress score ──────────────────────────────────────
  const stressScore = Math.round(Math.min(100, anomalies.length * 20 + (5 - avgMood) * 8));

  // ── Interventions ─────────────────────────────────────
  if (trend === 'declining') {
    interventions.push('Behavioral trend is declining. Consider scheduling a vet wellness check-up.');
  }
  if (avgMood < 3) {
    interventions.push('Improve enrichment: try puzzle feeders, new walking routes, or play sessions.');
  }
  if (avgAppetite < 3) {
    interventions.push('Appetite concern: try warming food slightly, switch meal times, or check teeth for pain.');
  }
  if (interventions.length === 0 && anomalies.length === 0) {
    interventions.push('Great behavioral health! Keep up regular logs and consistent routines.');
  }

  const vetSuggested =
    anomalies.length >= 3 ||
    trend === 'declining' ||
    (latest.mood && getMoodScore(latest.mood) === 1);

  return {
    behaviorScore,
    stressScore,
    anomalies,
    interventions,
    vetSuggested: !!vetSuggested,
    trend,
  };
}
