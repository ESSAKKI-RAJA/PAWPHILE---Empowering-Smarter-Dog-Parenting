import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Moon, ActivitySquare, AlertCircle } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

type Timeframe = '7d' | '30d';

export default function SleepAnalyticsReport({ dog: _dog, simulatedData }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const { chartData, metrics, sleepQuality } = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
      return { chartData: [], metrics: { avgTotal: 0, avgDeep: 0, avgLight: 0, restlessness: 0 }, sleepQuality: { status: 'N/A', color: 'slate' } };
    }
    const days = timeframe === '7d' ? 7 : 30;
    const recent = simulatedData.slice(-days);

    const avgTotal = recent.reduce((sum, d) => sum + d.sleepHours, 0) / (recent.length || 1);
    const avgDeep = recent.reduce((sum, d) => sum + d.deepSleep, 0) / (recent.length || 1);
    const avgLight = avgTotal - avgDeep;
    
    // Simulate restlessness based on anxiety score
    const restlessness = recent.reduce((sum, d) => sum + d.anxietyScore, 0) / (recent.length || 1);

    const chartData = recent.map(d => ({
      date: new Date(d.date).toLocaleDateString(undefined, { weekday: timeframe === '7d' ? 'short' : undefined, month: timeframe === '30d' ? 'short' : undefined, day: 'numeric' }),
      deepSleep: d.deepSleep,
      lightSleep: d.sleepHours - d.deepSleep,
      total: d.sleepHours,
      interruptions: Math.max(0, Math.floor(d.anxietyScore * 1.5))
    }));

    let sleepQuality = { status: 'Good', color: 'indigo' };
    if (avgTotal < 10 || restlessness > 2.5) {
      sleepQuality = { status: 'Poor', color: 'rose' };
    } else if (avgTotal > 12 && restlessness < 1.5) {
      sleepQuality = { status: 'Excellent', color: 'emerald' };
    } else if (avgTotal < 12) {
      sleepQuality = { status: 'Fair', color: 'amber' };
    }

    return {
      chartData,
      metrics: {
        avgTotal: avgTotal.toFixed(1),
        avgDeep: avgDeep.toFixed(1),
        avgLight: avgLight.toFixed(1),
        restlessness: restlessness.toFixed(1)
      },
      sleepQuality
    };
  }, [simulatedData, timeframe]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`bg-${sleepQuality.color}-500 rounded-3xl p-6 text-white shadow-lg shadow-${sleepQuality.color}-500/20 flex flex-col justify-center`}>
          <div className={`flex items-center gap-2 text-${sleepQuality.color}-100 mb-2`}>
            <Moon className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Sleep Quality</h3>
          </div>
          <span className="text-4xl font-black">{sleepQuality.status}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <Moon className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Avg Total Sleep</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgTotal}</span>
            <span className="text-sm font-bold text-slate-400">hours / day</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sky-500 mb-2">
            <ActivitySquare className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Avg Deep Sleep</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgDeep}</span>
            <span className="text-sm font-bold text-slate-400">hours / day</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-rose-500 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Restlessness</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.restlessness}</span>
            <span className="text-sm font-bold text-slate-400">/ 5 index</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sleep Stages</h3>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['7d', '30d'] as Timeframe[]).map(t => (
                <button key={t} onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {t === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="deepSleep" stackId="a" fill="#6366f1" name="Deep Sleep" maxBarSize={40} radius={[0, 0, 4, 4]} />
                <Bar dataKey="lightSleep" stackId="a" fill="#93c5fd" name="Light Sleep" maxBarSize={40} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Nightly Interruptions</h3>
            <p className="text-sm text-slate-500 mt-1">Estimated based on restlessness & anxiety logs</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="interruptions" name="Interruptions" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
