import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Edit3, Flame, Plus, Trash2, X } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import { calculateMER } from '../utils/bcsUtils';
import type { FoodScanLog } from '../types/pawphileCore';
import { isoDate, nowIso } from '../types/pawphileCore';
import { getNutritionLogs, saveNutritionLog, updateNutritionLog, deleteNutritionLog as storageDeleteNutritionLog, NutritionLog } from '../features/nutrition/nutritionStorage';

type Period = '1W' | '1M' | '6M';

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}



const UNSAFE_INGREDIENTS = [
  'chocolate',
  'onion',
  'garlic',
  'grape',
  'grapes',
  'raisin',
  'raisins',
  'xylitol',
  'alcohol',
  'caffeine',
  'cooked bone',
  'cooked bones',
];

type FoodDbItem = {
  key: string;
  displayName: string;
  keywords: string[];
  kcalPer100g: number;
  macrosPer100g?: { proteinG: number; fatG: number; carbsG: number };
  safetyNotes?: string[];
};

const FOOD_DB: FoodDbItem[] = [
  { key: 'dry_kibble', displayName: 'Dry kibble', keywords: ['kibble', 'dry', 'pedigree', 'royal canin', 'drools'], kcalPer100g: 360, macrosPer100g: { proteinG: 24, fatG: 14, carbsG: 40 } },
  { key: 'wet_food', displayName: 'Wet food', keywords: ['wet', 'gravy', 'can'], kcalPer100g: 120, macrosPer100g: { proteinG: 8, fatG: 6, carbsG: 4 } },
  { key: 'chicken_boiled', displayName: 'Boiled chicken', keywords: ['chicken', 'boiled chicken'], kcalPer100g: 165, macrosPer100g: { proteinG: 31, fatG: 4, carbsG: 0 } },
  { key: 'rice_cooked', displayName: 'Cooked rice', keywords: ['rice', 'boiled rice'], kcalPer100g: 130, macrosPer100g: { proteinG: 2.7, fatG: 0.3, carbsG: 28 } },
  { key: 'egg', displayName: 'Egg', keywords: ['egg', 'boiled egg'], kcalPer100g: 155, macrosPer100g: { proteinG: 13, fatG: 11, carbsG: 1 } },
  { key: 'fish', displayName: 'Fish (cooked)', keywords: ['fish'], kcalPer100g: 140, macrosPer100g: { proteinG: 22, fatG: 6, carbsG: 0 } },
  { key: 'curd', displayName: 'Curd / yogurt', keywords: ['curd', 'yogurt', 'dahi'], kcalPer100g: 60, macrosPer100g: { proteinG: 3.5, fatG: 3.3, carbsG: 4.7 }, safetyNotes: ['Avoid if lactose sensitive. Prefer plain, unsweetened.'] },
  { key: 'paneer', displayName: 'Paneer', keywords: ['paneer'], kcalPer100g: 265, macrosPer100g: { proteinG: 18, fatG: 20, carbsG: 2 }, safetyNotes: ['High fat; portion carefully.'] },
  { key: 'treat_biscuit', displayName: 'Treat / biscuit', keywords: ['treat', 'biscuit', 'cookie'], kcalPer100g: 430, macrosPer100g: { proteinG: 10, fatG: 16, carbsG: 60 }, safetyNotes: ['Treat calories add up fast. Keep treats ≤10% of daily calories.'] },
];

function pickFoodFromDb(text: string): FoodDbItem | null {
  const t = text.toLowerCase();
  let best: { item: FoodDbItem; score: number } | null = null;
  for (const item of FOOD_DB) {
    const score = item.keywords.reduce((s, kw) => (t.includes(kw) ? s + 1 : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item || null;
}

function safetyWarningsForText(text: string): string[] {
  const t = text.toLowerCase();
  const hits = UNSAFE_INGREDIENTS.filter((x) => t.includes(x));
  if (hits.length === 0) return [];
  return hits.map((h) => `Potentially unsafe: ${h}`);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function confidenceScore(parts: FoodScanLog['estimate']['confidenceBreakdown']): number {
  // confidence = sourceMatch 30% + imageQuality 20% + nutritionCompleteness 20% + portionConfidence 15% + dogProfileCompleteness 10% + safetyRuleCheck 5%
  const c =
    parts.sourceMatch * 0.3 +
    parts.imageQuality * 0.2 +
    parts.nutritionCompleteness * 0.2 +
    parts.portionConfidence * 0.15 +
    parts.dogProfileCompleteness * 0.1 +
    parts.safetyRuleCheck * 0.05;
  return Math.round(clamp(c, 0, 100));
}

function estimateFromFallback(args: {
  fileName?: string;
  manualFoodName?: string;
  manualPortionGrams?: number;
  imageQualityScore: number; // 0-100
  dogProfileCompletenessScore: number; // 0-100
}): FoodScanLog['estimate'] {
  const rawGuess = (args.manualFoodName || args.fileName || 'Unknown food').trim() || 'Unknown food';
  const db = pickFoodFromDb(rawGuess);
  const nameGuess = db?.displayName || rawGuess;
  const portion = Number.isFinite(args.manualPortionGrams as number) ? (args.manualPortionGrams as number) : null;

  const kcalPer100g = db?.kcalPer100g ?? 160;
  const macrosPer100g = db?.macrosPer100g;

  const totalKcal = Math.max(1, Math.round(((portion ?? 100) * kcalPer100g) / 100));
  const safetyWarnings = [
    ...safetyWarningsForText(rawGuess),
    ...(db?.safetyNotes ? db.safetyNotes.map((n) => `Note: ${n}`) : []),
  ];

  const macros = macrosPer100g && (portion ?? 0)
    ? {
        proteinG: Math.round((macrosPer100g.proteinG * (portion ?? 100)) / 100 * 10) / 10,
        fatG: Math.round((macrosPer100g.fatG * (portion ?? 100)) / 100 * 10) / 10,
        carbsG: Math.round((macrosPer100g.carbsG * (portion ?? 100)) / 100 * 10) / 10,
      }
    : undefined;

  const confidenceBreakdown: FoodScanLog['estimate']['confidenceBreakdown'] = {
    sourceMatch: db ? 80 : args.manualFoodName ? 55 : 35,
    imageQuality: args.imageQualityScore,
    nutritionCompleteness: macros ? 80 : args.manualFoodName ? 55 : 35,
    portionConfidence: portion ? 75 : 40,
    dogProfileCompleteness: args.dogProfileCompletenessScore,
    safetyRuleCheck: safetyWarnings.length === 0 ? 95 : 75,
  };

  const conf = confidenceScore(confidenceBreakdown);

  return {
    foodName: nameGuess,
    portionGrams: portion,
    totalKcal,
    macros,
    safetyWarnings,
    confidenceScore: conf,
    confidenceBreakdown,
    source: {
      sourceName: db ? 'PAWPHILE food DB fallback' : 'PAWPHILE fallback estimator',
      sourceType: 'other',
      confidenceScore: conf,
      notes: 'Offline estimate using a small food database + heuristics. Not veterinary diet advice.',
      sourceCategory: 'nutrition',
    },
  };
}

export default function Nutrition() {
  const { dogProfile: profile, addFoodScanLog, securitySettings } = usePawphileData() as any;
  const [period, setPeriod] = useState<Period>('1W');
  const [quickWindow, setQuickWindow] = useState<'Today' | '7D' | '30D'>('Today');
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

  // Load from unified storage
  const loadLogs = () => setNutritionLogs(getNutritionLogs());
  React.useEffect(() => { loadLogs(); }, []);

  const merTarget = useMemo(() => (profile ? calculateMER(profile) : 0), [profile]);

  const todayKey = isoDate(new Date());

  const todayLogs = useMemo(() => {
    return nutritionLogs.filter((l) => l.createdAt.startsWith(todayKey));
  }, [nutritionLogs, todayKey]);

  const todayCals = useMemo(() => sum(todayLogs.map((l) => l.caloriesCal)), [todayLogs]);

  const days = period === '1W' ? 7 : period === '1M' ? 30 : 180;

  const trendData = useMemo(() => {
    if (!profile) return [];
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const map: Record<string, number> = {};
    for (const l of nutritionLogs) {
      const dateStr = l.createdAt.split('T')[0];
      map[dateStr] = (map[dateStr] || 0) + (l.caloriesCal || 0);
    }

    const out: any[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = isoDate(d);
      const cals = map[key] || 0;
      out.push({
        name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        date: key,
        cals,
        surplus: merTarget > 0 && cals > merTarget ? cals - merTarget : 0,
        deficit: merTarget > 0 && cals < merTarget ? cals - merTarget : 0,
      });
    }
    return out;
  }, [nutritionLogs, days, profile, merTarget]);

  const quickData = useMemo(() => {
    const w = quickWindow === 'Today' ? 1 : quickWindow === '7D' ? 7 : 30;
    const start = new Date();
    start.setDate(start.getDate() - (w - 1));
    const map: Record<string, number> = {};
    for (const l of nutritionLogs) {
      const dateStr = l.createdAt.split('T')[0];
      map[dateStr] = (map[dateStr] || 0) + (l.caloriesCal || 0);
    }
    const out: any[] = [];
    for (let i = 0; i < w; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = isoDate(d);
      out.push({ name: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), cals: map[key] || 0 });
    }
    return out;
  }, [nutritionLogs, quickWindow]);

  const hasAnyLogs = nutritionLogs.length > 0;

  if (!profile || merTarget === 0) {
    return (
      <PageWrapper className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center">
        <div className="text-center p-8 space-y-4 max-w-md">
          <Flame className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-900 dark:text-white font-bold">Nutrition Tracker</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Add weight in Pet Profile to calculate daily MER target.
          </p>
        </div>
      </PageWrapper>
    );
  }

  const progressPct = merTarget > 0 ? Math.min(120, (todayCals / merTarget) * 100) : 0;
  const isOver = todayCals > merTarget;
  const isDanger = todayCals > merTarget * 1.1;

  const editingLog = editingId ? nutritionLogs.find((l) => l.id === editingId) || null : null;

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white relative">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-12 pb-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex justify-between items-end shadow-sm">
        <div>
          <h1 className="text-2xl font-black">Nutrition</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily target: {merTarget} Cal (kcal)</p>
        </div>
        <div className="flex gap-2">
          {/* TODO: Phase 2 AI Food Scan 
          <button
            onClick={() => setShowScanModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Camera className="w-4 h-4" /> AI Food Scan
          </button>
          */}
          <button
            onClick={() => { setEditingId(null); setShowLogModal(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Meal
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto w-full pb-24">
        {/* Insight Card */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-4 flex gap-3 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            {todayLogs.length === 0 ? "Start by logging today's meals." 
              : todayLogs.filter(l => l.isTreat || l.mealType === 'Treat').reduce((sum, l) => sum + l.caloriesCal, 0) > merTarget * 0.1 ? "Treat calories add up. Keep treats limited to 10% of diet and ask your vet for advice." 
              : isOver ? "Today is above the estimated target. Monitor portions and avoid extra treats." 
              : "Today's intake is close to the estimated daily target."}
          </p>
        </div>
        {isDanger && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex gap-3 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Today’s intake is above target. Calorie targets are estimates — if your dog is a puppy, senior, pregnant, or has illness, confirm with a veterinarian.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-end gap-4">
            <div>
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Today’s Intake</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-4xl font-black ${isDanger ? 'text-red-500' : isOver ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                  {todayCals}
                </span>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">/ {merTarget} Cal</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${
                isDanger ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : isOver ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              }`}>
                {Math.min(120, Math.round(progressPct))}% {isOver ? 'over' : 'of'} target
              </span>
            </div>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isDanger ? 'bg-red-500' : isOver ? 'bg-orange-500' : 'bg-teal-500'}`}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic leading-relaxed">
            Disclaimer: “Cal” means Calories (kcal). MER is an estimate (RER × multiplier). Not veterinary diet advice.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest">Today’s Logs</h2>
            {!hasAnyLogs && <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">No logs yet</span>}
          </div>

          {todayLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
              Add your first meal using <span className="font-bold">Log</span> or <span className="font-bold">AI Food Scan</span>. Tip: log treats too (they add up).
            </div>
          ) : (
            <div className="space-y-3">
              {todayLogs.map((l) => (
                <div key={l.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {l.mealType || 'Meal'}
                      </span>
                      {l.isTreat && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Treat</span>}
                    </div>
                    <p className="font-black truncate">{l.foodName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                      {new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {l.portionGrams ? `${l.portionGrams} g` : 'portion unknown'}
                    </p>
                    {l.notes ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{l.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right mr-2">
                      <p className="text-lg font-black">{l.caloriesCal} Cal</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingId(l.id); setShowLogModal(true); }}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      aria-label="Edit log"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        storageDeleteNutritionLog(l.id).then(loadLogs);
                      }}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                      aria-label="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest">Charts</h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {(['1W', '1M', '6M'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg ${period === p ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {!hasAnyLogs ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
              No nutrition logs yet. Once you log meals, you’ll see intake vs MER target and surplus/deficit trends here.
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black uppercase tracking-widest">Quick view</p>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {(['Today', '7D', '30D'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setQuickWindow(w)}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg ${quickWindow === w ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quickData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgb(15, 23, 42)', border: 'none', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="cals" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgb(15, 23, 42)', border: 'none', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <ReferenceLine y={merTarget} stroke="#f5a623" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="cals" stroke="#0ea5e9" strokeWidth={3} dot={period === '1W'} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6">
                <p className="text-sm font-black uppercase tracking-widest mb-3">Surplus / Deficit</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgb(15, 23, 42)', border: 'none', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="surplus" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="deficit" fill="#0ea5e9" radius={[0, 0, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
          Veterinary disclaimer: Nutrition targets are estimates, not diet prescriptions. Confirm diet changes with a veterinarian, especially for puppies, seniors, pregnant dogs, or dogs with illness.
          {securitySettings?.consentForAI ? ' AI analysis consent is enabled.' : ' AI analysis consent is disabled.'}
        </p>
      </div>

      {showLogModal && (
        <LogModal
          initial={editingLog}
          onClose={() => { setShowLogModal(false); setEditingId(null); }}
          onSave={async (payload) => {
            if (editingLog) {
              await updateNutritionLog(editingLog.id, payload);
            } else {
              await saveNutritionLog({
                id: crypto.randomUUID(),
                ...payload
              } as NutritionLog);
            }
            loadLogs();
            setShowLogModal(false);
            setEditingId(null);
          }}
        />
      )}

      {showScanModal && (
        <FoodScanModal
          onClose={() => setShowScanModal(false)}
          onSaveToLog={async (estimate) => {
            const occurredAt = nowIso();
            // 1. Write to localStorage synchronously (inside saveNutritionLog)
            const logEntry: NutritionLog = {
              id: crypto.randomUUID(),
              userId: undefined,
              dogId: undefined,
              dogName: profile?.name || 'Unassigned',
              source: 'ai_food_scan',
              foodName: estimate.foodName,
              portionGrams: estimate.portionGrams || undefined,
              caloriesCal: estimate.totalKcal,
              proteinGrams: estimate.macros?.proteinG,
              fatGrams: estimate.macros?.fatG,
              carbsGrams: estimate.macros?.carbsG,
              confidence: estimate.confidenceScore,
              imageQuality: undefined,
              notes: `AI Food Scan (confidence: ${estimate.confidenceScore}%). ${estimate.safetyWarnings.length ? estimate.safetyWarnings.join(' | ') : ''}`.trim(),
              createdAt: occurredAt,
            };
            // Write to localStorage immediately (synchronous part of saveNutritionLog)
            const existing = getNutritionLogs();
            existing.unshift(logEntry);
            localStorage.setItem('pawphile_nutrition_logs', JSON.stringify(existing));
            // 2. Immediately refresh UI state — TODAY's logs updates before modal closes
            loadLogs();
            // 3. Close the modal
            setShowScanModal(false);
            // 4. Fire Backend sync in background (non-blocking)
            saveNutritionLog(logEntry).catch(() => {});
            // 5. Also track in food scan log history
            addFoodScanLog({
              userId: null,
              petId: null,
              scannedAt: nowIso(),
              imageDataUrl: undefined,
              imageFileName: undefined,
              manualFoodName: estimate.foodName,
              manualPortionGrams: estimate.portionGrams ?? undefined,
              estimate,
            });
          }}
        />
      )}
    </PageWrapper>
  );
}

function LogModal({
  initial,
  onClose,
  onSave,
}: {
  initial: NutritionLog | null;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const initialAt = initial?.createdAt ? new Date(initial.createdAt) : new Date();
  const initialTime = `${String(initialAt.getHours()).padStart(2, '0')}:${String(initialAt.getMinutes()).padStart(2, '0')}`;
  const initialDate = initial?.createdAt ? initial.createdAt.split('T')[0] : isoDate(new Date());

  const [foodName, setFoodName] = useState(initial?.foodName || '');
  const [portionGrams, setPortionGrams] = useState(initial?.portionGrams?.toString() || '');
  const [totalKcal, setTotalKcal] = useState(initial?.caloriesCal?.toString() || '');
  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState(initialTime);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [mealType, setMealType] = useState(initial?.mealType || 'Breakfast');
  const [isTreat, setIsTreat] = useState(initial?.isTreat || false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const occurredAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
    const payload = {
      source: 'manual',
      foodName: foodName.trim(),
      portionGrams: portionGrams ? Number(portionGrams) : undefined,
      caloriesCal: Math.max(1, Number(totalKcal || 0)),
      notes,
      mealType,
      isTreat,
      createdAt: occurredAt,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{initial ? 'Edit Food Log' : 'Log Food Entry'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Food name">
            <input value={foodName} onChange={(e) => setFoodName(e.target.value)} required className="input" placeholder="e.g. kibble, chicken, rice" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Portion (g)">
              <input value={portionGrams} onChange={(e) => setPortionGrams(e.target.value)} type="number" inputMode="numeric" className="input" placeholder="optional" />
            </Field>
            <Field label="Total Cal (kcal)">
              <input value={totalKcal} onChange={(e) => setTotalKcal(e.target.value)} type="number" inputMode="numeric" required min={1} className="input" placeholder="required" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Time">
              <input value={timeStr} onChange={(e) => setTimeStr(e.target.value)} type="time" className="input" />
            </Field>
          </div>
          <Field label="Date">
            <input value={dateStr} onChange={(e) => setDateStr(e.target.value)} type="date" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meal Type">
              <select value={mealType} onChange={(e) => setMealType(e.target.value as any)} className="input">
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
                <option value="Treat">Treat</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isTreat" checked={isTreat || mealType === 'Treat'} onChange={(e) => setIsTreat(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600" />
              <label htmlFor="isTreat" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mark as Treat</label>
            </div>
          </div>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[90px]" placeholder="optional" />
          </Field>
          <button type="submit" className="w-full py-3 mt-2 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black shadow-sm active:scale-[0.99] transition">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

function FoodScanModal({
  onClose,
  onSaveToLog,
}: {
  onClose: () => void;
  onSaveToLog: (estimate: FoodScanLog['estimate']) => void;
}) {
  const { state } = usePawphileData();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualPortionGrams, setManualPortionGrams] = useState('');
  const [imageQualityScore, setImageQualityScore] = useState(35);

  const dogProfileCompletenessScore = useMemo(() => {
    const p = state.petProfile;
    if (!p) return 10;
    const fields = [
      p.name?.trim(),
      p.breed?.trim(),
      p.dob,
      p.gender,
      p.weightKg,
      p.activityLevel,
      p.healthGoal,
      p.neutered,
    ];
    const filled = fields.filter((x) => x !== null && x !== undefined && String(x).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [state.petProfile]);

  const estimate = useMemo(() => {
    return estimateFromFallback({
      fileName: file?.name,
      manualFoodName: manualFoodName.trim() || undefined,
      manualPortionGrams: manualPortionGrams ? Number(manualPortionGrams) : undefined,
      imageQualityScore,
      dogProfileCompletenessScore,
    });
  }, [file?.name, manualFoodName, manualPortionGrams, imageQualityScore, dogProfileCompletenessScore]);

  const onFile = async (f: File | null) => {
    setFile(f);
    if (!f) {
      setPreviewUrl('');
      setImageQualityScore(35);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    // simple image quality heuristic: file size (>= 200kb => better)
    const sizeKb = f.size / 1024;
    const score = clamp(Math.round((sizeKb / 600) * 100), 10, 90);
    setImageQualityScore(score);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">AI Food Scan</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
            Always disclaimer: “This is an estimate, not veterinary diet advice. Confirm diet changes with a veterinarian, especially for puppies, seniors, pregnant dogs, or dogs with illness.”
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Image upload / camera">
            <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0] || null)} className="input" />
          </Field>
          {previewUrl ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={previewUrl} alt="Food preview" className="w-full h-56 object-cover" />
            </div>
          ) : null}

          <Field label="Optional manual food name">
            <input value={manualFoodName} onChange={(e) => setManualFoodName(e.target.value)} className="input" placeholder="e.g. chicken rice" />
          </Field>
          <Field label="Optional portion (g)">
            <input value={manualPortionGrams} onChange={(e) => setManualPortionGrams(e.target.value)} type="number" inputMode="numeric" className="input" placeholder="e.g. 120" />
          </Field>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Estimate</p>
            <p className="mt-2 text-lg font-black">{estimate.foodName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Portion: {estimate.portionGrams ? `${estimate.portionGrams} g` : 'unknown'} · Total: <span className="text-slate-900 dark:text-white font-black">{estimate.totalKcal} Cal</span>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Protein</p>
                <p className="text-sm font-black">{estimate.macros?.proteinG != null ? `${estimate.macros.proteinG} g` : '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Fat</p>
                <p className="text-sm font-black">{estimate.macros?.fatG != null ? `${estimate.macros.fatG} g` : '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Carbs</p>
                <p className="text-sm font-black">{estimate.macros?.carbsG != null ? `${estimate.macros.carbsG} g` : '—'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Confidence: <span className="font-black text-teal-600 dark:text-teal-400">{estimate.confidenceScore}%</span> · Image quality: {imageQualityScore}% · Dog profile completeness: {dogProfileCompletenessScore}%
            </p>
            {estimate.safetyWarnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3">
                <p className="text-xs font-black text-red-700 dark:text-red-300">Safety warnings</p>
                <ul className="mt-2 text-xs text-red-700 dark:text-red-200 list-disc pl-5 space-y-1">
                  {estimate.safetyWarnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSaveToLog(estimate)}
            className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black active:scale-[0.99] transition"
          >
            Save as Nutrition Log
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
            If a barcode / USDA / Open Food Facts API is configured later, PAWPHILE will replace the fallback estimator with a higher-confidence source match.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
        {label}
      </label>
      {children}
      <style>{`
        .input{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          font-weight:700;
          outline:none;
        }
        .dark .input{
          background: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: white;
        }
        .input:focus{
          border-color: rgb(13 148 136);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.15);
        }
      `}</style>
    </div>
  );
}

