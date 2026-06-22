import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Brain, Volume2, ShieldAlert, Sparkles } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

type Timeframe = '7d' | '30d';

export default function BehaviorAnalyticsReport({ dog: _dog, simulatedData }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const { chartData, metrics, riskLevel } = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
      return { chartData: [], metrics: { avgAnxiety: 0, avgBarking: 0, avgEnergy: 0 }, riskLevel: { level: 'Low', color: 'emerald' } };
    }
    const days = timeframe === '7d' ? 7 : 30;
    const recent = simulatedData.slice(-days);

    const avgAnxiety = recent.reduce((sum, d) => sum + d.anxietyScore, 0) / (recent.length || 1);
    const avgBarking = recent.reduce((sum, d) => sum + d.barkingScore, 0) / (recent.length || 1);
    const avgEnergy = recent.reduce((sum, d) => sum + d.energyScore, 0) / (recent.length || 1);

    const chartData = recent.map(d => ({
      date: new Date(d.date).toLocaleDateString(undefined, { weekday: timeframe === '7d' ? 'short' : undefined, month: timeframe === '30d' ? 'short' : undefined, day: 'numeric' }),
      anxiety: d.anxietyScore,
      barking: d.barkingScore
    }));

    let riskLevel = { level: 'Low', color: 'emerald' };
    if (avgAnxiety > 2.5 || avgBarking > 3.5) {
      riskLevel = { level: 'High', color: 'red' };
    } else if (avgAnxiety > 1.8 || avgBarking > 2.5) {
      riskLevel = { level: 'Moderate', color: 'orange' };
    }

    return {
      chartData,
      metrics: {
        avgAnxiety: avgAnxiety.toFixed(1),
        avgBarking: avgBarking.toFixed(1),
        avgEnergy: avgEnergy.toFixed(1)
      },
      riskLevel
    };
  }, [simulatedData, timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all ${
          riskLevel.color === 'emerald' ? 'border-emerald-200 dark:border-emerald-900/50' : 
          riskLevel.color === 'orange' ? 'border-orange-200 dark:border-orange-900/50' : 'border-red-200 dark:border-red-900/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className={`w-5 h-5 text-${riskLevel.color}-500`} />
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Risk Level</h3>
          </div>
          <span className={`text-3xl font-black text-${riskLevel.color}-600 dark:text-${riskLevel.color}-500`}>{riskLevel.level}</span>
        </div>

        <div className="bg-purple-500 rounded-3xl p-6 text-white shadow-lg shadow-purple-500/20 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-purple-100 mb-2">
            <Brain className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Anxiety Index</h3>
          </div>
          <span className="text-4xl font-black">{metrics.avgAnxiety} <span className="text-lg font-bold text-purple-200">/ 5</span></span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Volume2 className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Barking Freq</h3>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgBarking} <span className="text-lg font-bold text-slate-400">/ 5</span></span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Avg Mood</h3>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgEnergy} <span className="text-lg font-bold text-slate-400">/ 5</span></span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Behavioral Trends</h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['7d', '30d'] as Timeframe[]).map(t => (
              <button key={t} onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAnxiety" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBarking" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 5]} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="anxiety" name="Anxiety Level" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorAnxiety)" />
              <Area type="monotone" dataKey="barking" name="Barking Freq" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorBarking)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
