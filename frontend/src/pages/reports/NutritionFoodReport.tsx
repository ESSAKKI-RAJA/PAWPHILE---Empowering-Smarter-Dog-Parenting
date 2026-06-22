import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Utensils, Droplets, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';
import { calculateMER } from '../../utils/bcsUtils';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

type Timeframe = '7d' | '30d';

export default function NutritionFoodReport({ dog, simulatedData }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const merTarget = useMemo(() => calculateMER(dog), [dog]);

  const { chartData, metrics, alerts } = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
      return { chartData: [], metrics: { avgCal: 0, avgWater: 0, waterStatus: 'N/A' }, alerts: [] };
    }
    const days = timeframe === '7d' ? 7 : 30;
    const recent = simulatedData.slice(-days);

    const avgCal = recent.reduce((sum, d) => sum + d.caloriesConsumed, 0) / (recent.length || 1);
    const avgWater = recent.reduce((sum, d) => sum + d.waterIntakeMl, 0) / (recent.length || 1);

    const chartData = recent.map(d => ({
      date: new Date(d.date).toLocaleDateString(undefined, { weekday: timeframe === '7d' ? 'short' : undefined, month: timeframe === '30d' ? 'short' : undefined, day: 'numeric' }),
      calories: d.caloriesConsumed,
      water: d.waterIntakeMl
    }));

    const targetWater = (Number(dog.weight) || 15) * 50; // Roughly 50ml per kg

    const alerts = [];
    if (avgCal > merTarget * 1.15) {
      alerts.push({ type: 'warning', text: 'Calorie intake is consistently 15% above target. Risk of weight gain.' });
    } else if (avgCal < merTarget * 0.85) {
      alerts.push({ type: 'warning', text: 'Calorie intake is consistently 15% below target.' });
    } else {
      alerts.push({ type: 'success', text: 'Calorie intake is well-aligned with MER.' });
    }

    if (avgWater < targetWater * 0.8) {
      alerts.push({ type: 'danger', text: 'Hydration levels are low. Increase water availability.' });
    }

    return {
      chartData,
      metrics: {
        avgCal: Math.round(avgCal),
        avgWater: Math.round(avgWater),
        waterStatus: avgWater >= targetWater * 0.9 ? 'Optimal' : 'Low'
      },
      alerts
    };
  }, [simulatedData, timeframe, dog.weight, merTarget]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 mb-4">
              <Utensils className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Avg Daily Calories</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{metrics.avgCal}</span>
              <span className="text-xl font-bold text-emerald-200">kcal</span>
            </div>
          </div>
          <div className="mt-6 text-sm font-bold bg-white/20 w-fit px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-sm">
            <Flame className="w-4 h-4 text-orange-300" /> Target: {merTarget} kcal
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 mb-4">
            <Droplets className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Avg Water Intake</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{metrics.avgWater}</span>
            <span className="text-xl font-bold text-slate-400">ml</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (metrics.avgWater / ((Number(dog.weight) || 15) * 50)) * 100)}%` }}></div>
            </div>
            <span className="text-xs font-bold text-slate-500">{metrics.waterStatus}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">AI Nutrition Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-700' :
                alert.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {alert.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <p className="text-xs font-bold leading-relaxed">{alert.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Consumption Trends</h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['7d', '30d'] as Timeframe[]).map(t => (
              <button key={t} onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  timeframe === t ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 w-full">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Calories vs MER</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={merTarget} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'top', value: 'Target MER', fill: '#f97316', fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} name="Calories (kcal)" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64 w-full">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Water Intake</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="water" name="Water (ml)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
