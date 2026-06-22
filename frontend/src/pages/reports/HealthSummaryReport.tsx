import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ShieldCheck, Activity, Scale, Info } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';
import { calculateBCS, calculateMER } from '../../utils/bcsUtils';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

type Timeframe = '7d' | '30d' | '90d';

export default function HealthSummaryReport({ dog, simulatedData }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const filteredData = useMemo(() => {
    if (!simulatedData) return [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    return simulatedData.slice(-days);
  }, [simulatedData, timeframe]);

  const bcsResult = useMemo(() => calculateBCS(dog), [dog]);
  const merTarget = useMemo(() => calculateMER(dog), [dog]);

  const chartData = useMemo(() => {
    return filteredData.map(d => ({
      date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: dog.weight || 15,
      activity: d.activeMinutes,
      sleep: d.sleepHours
    }));
  }, [filteredData, dog]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Dog Profile Card & AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-black text-2xl shadow-inner">
              {dog.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{dog.name}</h2>
              <p className="text-sm font-semibold text-slate-500">{dog.breed || 'Unknown breed'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs uppercase font-bold text-slate-400">Age</p><p className="font-semibold">{dog.age || '?'} years</p></div>
            <div><p className="text-xs uppercase font-bold text-slate-400">Sex</p><p className="font-semibold capitalize">{dog.sex || 'Unknown'}</p></div>
            <div><p className="text-xs uppercase font-bold text-slate-400">Weight</p><p className="font-semibold">{dog.weight || '?'} kg</p></div>
            <div><p className="text-xs uppercase font-bold text-slate-400">Microchip</p><p className="font-semibold text-xs mt-1 truncate" title={(dog as any).microchipId}>{(dog as any).microchipId || 'Not registered'}</p></div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 text-indigo-100">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">AI Executive Summary</h3>
            </div>
            <p className="text-lg leading-relaxed font-medium mb-4">
              {dog.name}'s health metrics remain stable over the selected period. Activity levels are consistently maintained, and sleep quality indicates good recovery. 
              Nutrition is well-aligned with the optimal Maintenance Energy Requirement (MER).
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Stable Weight</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Consistent Activity</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Good Rest</span>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-500" /> Metric Trends
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['7d', '30d', '90d'] as Timeframe[]).map(t => (
              <button key={t} onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}>
                {t === '7d' ? '7 Days' : t === '30d' ? '1 Month' : '3 Months'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="activity" name="Active Min" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="sleep" name="Sleep Hrs" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weight & Body Condition */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
          <Scale className="w-5 h-5 text-orange-500" /> Weight & Body Condition Report
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Body Condition Score (BCS)</p>
            <div className="flex items-end gap-3 mb-5">
              <span className="text-5xl font-black text-slate-900 dark:text-white">{bcsResult.score}</span>
              <span className="text-xl font-bold text-slate-400 mb-1">/ 9</span>
              <span className={`text-sm font-bold px-3 py-1 rounded-full mb-1.5 ml-2 ${
                bcsResult.label === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {bcsResult.label}
              </span>
            </div>
            
            {/* BCS Visual Bar */}
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex mb-2">
              <div className="h-full w-[33.3%]" style={{ backgroundColor: '#60a5fa' }} title="Underweight (1-3)"></div>
              <div className="h-full w-[22.2%]" style={{ backgroundColor: '#10b981' }} title="Ideal (4-5)"></div>
              <div className="h-full w-[22.2%]" style={{ backgroundColor: '#fb923c' }} title="Overweight (6-7)"></div>
              <div className="h-full w-[22.2%]" style={{ backgroundColor: '#ef4444' }} title="Obese (8-9)"></div>
            </div>
            <div className="relative w-full h-4">
              <div className="absolute top-0 w-3 h-3 rounded-full bg-slate-900 shadow-md border-2 border-white -translate-x-1/2 -translate-y-[18px]" 
                   style={{ left: `${Math.min(100, Math.max(0, (bcsResult.score / 9) * 100))}%` }}></div>
            </div>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
              {bcsResult.advice}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Target Calorie Intake</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{merTarget}</span>
              <span className="text-sm font-bold text-slate-500 mb-1">kcal / day</span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mb-6">Maintenance Energy Requirement (MER)</p>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-teal-500" /> AI Dietary Recommendation
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To maintain ideal body condition, divide {merTarget} kcal into 2-3 meals per day. Monitor weight bi-weekly and adjust portions by 10% if weight fluctuates. Ensure constant access to fresh water.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
