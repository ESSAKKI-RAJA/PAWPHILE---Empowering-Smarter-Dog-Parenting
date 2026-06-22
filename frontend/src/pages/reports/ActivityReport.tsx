import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity, Footprints, Clock, Map, TrendingUp } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

type Timeframe = '7d' | '30d';

export default function ActivityReport({ dog, simulatedData }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const { chartData, metrics, benchmarkData } = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
        return { chartData: [], metrics: { avgSteps: 0, stepsChange: 0, avgDist: '0.0', avgActiveMin: 0 }, benchmarkData: [] };
    }
    const days = timeframe === '7d' ? 7 : 30;
    const recent = simulatedData.slice(-days);
    const prev = simulatedData.slice(-(days * 2), -days);

    const avgSteps = recent.reduce((sum, d) => sum + d.steps, 0) / (recent.length || 1);
    const prevSteps = prev.reduce((sum, d) => sum + d.steps, 0) / (prev.length || 1);
    const stepsChange = prevSteps ? ((avgSteps - prevSteps) / prevSteps) * 100 : 0;

    const avgDist = recent.reduce((sum, d) => sum + d.distanceKm, 0) / (recent.length || 1);
    const avgActiveMin = recent.reduce((sum, d) => sum + d.activeMinutes, 0) / (recent.length || 1);

    const cData = recent.map((d) => ({
      date: new Date(d.date).toLocaleDateString(undefined, { weekday: timeframe === '7d' ? 'short' : undefined, month: timeframe === '30d' ? 'short' : undefined, day: 'numeric' }),
      steps: d.steps,
      activeMinutes: d.activeMinutes
    }));

    // Breed Benchmark Simulation
    const breedBase = (Number(dog.weight) || 15) > 25 ? 7000 : 9000;
    const bData = [
      { name: 'Your Dog', steps: Math.round(avgSteps) },
      { name: 'Breed Avg', steps: breedBase },
      { name: 'Top 10%', steps: Math.round(breedBase * 1.3) }
    ];

    return {
      chartData: cData,
      metrics: {
        avgSteps: Math.round(avgSteps),
        stepsChange,
        avgDist: avgDist.toFixed(1),
        avgActiveMin: Math.round(avgActiveMin)
      },
      benchmarkData: bData
    };
  }, [simulatedData, timeframe, dog.weight]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20">
          <div className="flex items-center gap-2 text-orange-100 mb-4">
            <Footprints className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Avg Daily Steps</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black">{metrics.avgSteps?.toLocaleString()}</span>
          </div>
          <div className="mt-4 text-sm font-bold bg-white/20 w-fit px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
            <TrendingUp className="w-4 h-4" /> {metrics.stepsChange > 0 ? '+' : ''}{metrics.stepsChange?.toFixed(1)}% vs prev {timeframe}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Map className="w-5 h-5 text-teal-500" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Avg Distance</h3>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgDist} <span className="text-lg text-slate-400">km</span></span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Active Time</h3>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.avgActiveMin} <span className="text-lg text-slate-400">min</span></span>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Intensity</h3>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white">Moderate</span>
          <p className="text-xs font-semibold text-slate-400 mt-1">60% Walk / 40% Run</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Activity Trend</h3>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['7d', '30d'] as Timeframe[]).map(t => (
                <button key={t} onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
                <Bar dataKey="steps" fill="#f97316" radius={[6, 6, 0, 0]} name="Steps" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breed Comparison & AI Suggestion */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex-1">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">Breed Benchmark</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">See how {dog.name} compares to other {dog.breed || 'dogs'}s.</p>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="steps" radius={[0, 6, 6, 0]} barSize={24}>
                    {
                      benchmarkData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : '#cbd5e1'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-6 text-white shadow-sm">
            <h4 className="font-bold uppercase tracking-widest text-xs text-teal-100 mb-2">Smart Suggestion</h4>
            <p className="text-sm font-medium leading-relaxed">
              {metrics.avgSteps > benchmarkData[1]?.steps 
                ? `Great job! ${dog.name} is highly active and beating the breed average. Ensure they get enough rest to recover.`
                : `${dog.name}'s activity is slightly below the breed average. Try adding a 15-minute brisk walk in the evening.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
