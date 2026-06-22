import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, HeartPulse, ChevronLeft, Save } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';

export type BCSScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BMILog = {
  id: string;
  weightKg: number;
  heightCm: number;
  lengthCm: number;
  chestCm: number;
  bcs: BCSScore;
  bmi: number;
  category: string;
  rer: number;
  dailyCalEstimate: number;
  createdAt: string;
};

const LS_KEY = 'pawphile_bmi_bcs_logs';

// eslint-disable-next-line react-refresh/only-export-components
export function getBmiLogs(): BMILog[] {
  try {
    const data = localStorage.getItem(LS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function saveBmiLog(log: BMILog) {
  const existing = getBmiLogs();
  existing.unshift(log);
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}

export default function BMICalculator() {
  const navigate = useNavigate();
  const { state } = usePawphileData() as any;
  const profile = state.petProfile;

  const [weightKg, setWeightKg] = useState(profile?.weightKg?.toString() || '');
  const [heightCm, setHeightCm] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  
  const [bcsAnswers, setBcsAnswers] = useState({
    ribsFelt: 'easily', // 'distance', 'easily', 'hard'
    waist: 'clear', // 'clear', 'none'
    tuck: 'visible', // 'visible', 'sagging'
    fatDeposits: 'none', // 'none', 'present'
    energy: 'normal', // 'normal', 'reduced'
  });

  const [result, setResult] = useState<BMILog | null>(null);
  const [history, setHistory] = useState<BMILog[]>([]);

  useEffect(() => {
    setHistory(getBmiLogs());
  }, []);

  const calculateBCS = (): BCSScore => {
    let score = 5;
    if (bcsAnswers.ribsFelt === 'distance') score -= 2;
    if (bcsAnswers.ribsFelt === 'hard') score += 2;
    if (bcsAnswers.waist === 'none') score += 1;
    if (bcsAnswers.tuck === 'sagging') score += 1;
    if (bcsAnswers.fatDeposits === 'present') score += 1;
    return Math.max(1, Math.min(9, score)) as BCSScore;
  };

  const getCategory = (bcs: number) => {
    if (bcs <= 3) return 'Underweight';
    if (bcs <= 5) return 'Ideal';
    if (bcs <= 7) return 'Overweight';
    return 'Obese';
  };

  const getCategoryColor = (cat: string) => {
    if (cat === 'Ideal') return 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200';
    if (cat === 'Overweight' || cat === 'Underweight') return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200';
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100; // meters
    const l = parseFloat(lengthCm);
    const c = parseFloat(chestCm);
    
    if (!w || !h) return;

    const bmi = w / (h * h);
    const bcs = calculateBCS();
    const category = getCategory(bcs);
    const rer = 70 * Math.pow(w, 0.75);
    
    // Multiplier logic
    let mult = 1.6; // Neutered adult
    if (profile?.neutered === false) mult = 1.8; // Intact
    if (profile?.activityLevel === 'low') mult = 1.2;
    if (profile?.activityLevel === 'high') mult = 2.0;
    if (bcs > 5) mult = 1.0; // Weight loss
    if (bcs < 4) mult = 2.0; // Weight gain
    
    const dailyCalEstimate = Math.round(rer * mult);

    setResult({
      id: crypto.randomUUID(),
      weightKg: w,
      heightCm: parseFloat(heightCm),
      lengthCm: l || 0,
      chestCm: c || 0,
      bcs,
      bmi: Math.round(bmi * 10) / 10,
      category,
      rer: Math.round(rer),
      dailyCalEstimate,
      createdAt: new Date().toISOString(),
    });
  };

  const saveResult = () => {
    if (!result) return;
    saveBmiLog(result);
    setHistory(getBmiLogs());
    setResult(null); // Clear after save
  };

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black">Dog BMI & Body Condition</h1>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Canine BMI is less reliable than BCS because dog breeds vary widely. Use our BCS checklist to get an accurate body condition score.
          </p>
        </div>

        <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <form onSubmit={calculate} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2">Weight (kg)</label>
                <input required type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2">Height at withers (cm)</label>
                <input required type="number" step="1" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2">Body length (cm)</label>
                <input type="number" step="1" value={lengthCm} onChange={e => setLengthCm(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2">Chest girth (cm)</label>
                <input type="number" step="1" value={chestCm} onChange={e => setChestCm(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg mb-4">BCS Visual & Physical Checklist</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">1. Ribs feel</label>
                  <select value={bcsAnswers.ribsFelt} onChange={e => setBcsAnswers(prev => ({...prev, ribsFelt: e.target.value}))} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <option value="distance">Ribs visible from distance (Too thin)</option>
                    <option value="easily">Ribs easily felt with slight fat cover (Ideal)</option>
                    <option value="hard">Ribs hard to feel under fat layer (Too heavy)</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">2. Waist (viewed from top)</label>
                  <select value={bcsAnswers.waist} onChange={e => setBcsAnswers(prev => ({...prev, waist: e.target.value}))} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <option value="clear">Clear waist visible behind ribs</option>
                    <option value="none">No waist visible / back is broad</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">3. Abdominal tuck (viewed from side)</label>
                  <select value={bcsAnswers.tuck} onChange={e => setBcsAnswers(prev => ({...prev, tuck: e.target.value}))} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold">
                    <option value="visible">Abdominal tuck clearly visible</option>
                    <option value="sagging">Belly sagging / no tuck</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-lg transition-colors active:scale-[0.99]">
              Calculate BCS & BMI
            </button>
          </form>
        </div>

        {result && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-2 h-full ${getCategoryColor(result.category).split(' ')[0].replace('text-', 'bg-')}`}></div>
            
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-500" /> Results
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-2xl border ${getCategoryColor(result.category)}`}>
                <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-80">Category</p>
                <p className="text-2xl font-black">{result.category}</p>
                <p className="text-sm font-bold opacity-90 mt-1">BCS: {result.bcs} / 9</p>
              </div>
              
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Canine BMI</p>
                <p className="text-2xl font-black">{result.bmi}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Weight: {result.weightKg} kg</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Resting Energy (RER)</span>
                <span className="font-black">{result.rer} kcal/day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Suggested Daily Target</span>
                <span className="font-black text-teal-600 dark:text-teal-400">{result.dailyCalEstimate} Cal</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic mb-6">
              This tool is not a veterinary diagnosis. BCS should be confirmed by a licensed veterinarian.
            </p>

            <button onClick={saveResult} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors">
              <Save className="w-4 h-4" /> Save BMI/BCS Result
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-black text-lg mb-4">History</h3>
            <div className="space-y-3">
              {history.map(log => (
                <div key={log.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-black">{log.category} (BCS: {log.bcs})</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {new Date(log.createdAt).toLocaleDateString()} • {log.weightKg}kg • BMI: {log.bmi}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
