import { useMemo } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Utensils, 
  Brain, 
  Moon, 
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { DogProfile } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';

interface Props {
  dog: DogProfile;
  simulatedData: SimulatedDay[];
}

export default function ReportsDashboard({ dog: _dog, simulatedData }: Props) {
  const { 
    healthScore, 
    healthTrend,
    activityScore,
    nutritionScore,
    behaviorScore,
    sleepScore,
    complianceScore,
    trendData 
  } = useMemo(() => {
    if (!simulatedData || simulatedData.length === 0) {
        return {
            healthScore: 0,
            healthTrend: { change: 0, isUp: true },
            activityScore: { rating: 'N/A', steps: 0, change: 0 },
            nutritionScore: { status: 'N/A', intake: 0 },
            behaviorScore: { index: 0 },
            sleepScore: { hours: 0, quality: 'N/A' },
            complianceScore: { rate: 0, status: 'N/A' },
            trendData: []
        };
    }
    const recent = simulatedData.slice(-7);
    const previous = simulatedData.slice(-14, -7);

    const avgSteps = recent.reduce((sum, d) => sum + d.steps, 0) / (recent.length || 1);
    const prevSteps = previous.reduce((sum, d) => sum + d.steps, 0) / (previous.length || 1);

    const avgSleep = recent.reduce((sum, d) => sum + d.sleepHours, 0) / (recent.length || 1);
    
    const baseHealth = 85; 
    const healthScore = Math.min(100, Math.round(baseHealth + (avgSteps > 6000 ? 5 : 0) + (avgSleep > 12 ? 5 : 0)));
    const prevHealthScore = healthScore - 2 + Math.floor(Math.random() * 5);
    const healthChange = prevHealthScore ? ((healthScore - prevHealthScore) / prevHealthScore) * 100 : 0;
    
    let activityRating = 'Active';
    if (avgSteps > 10000) activityRating = 'Highly Active';
    else if (avgSteps < 4000) activityRating = 'Low Activity';

    const avgCal = recent.reduce((sum, d) => sum + d.caloriesConsumed, 0) / (recent.length || 1);
    const avgAnxiety = recent.reduce((sum, d) => sum + d.anxietyScore, 0) / (recent.length || 1);

    const trendData = recent.map((_d, i) => ({
      name: `Day ${i+1}`,
      score: 80 + Math.random() * 15
    }));

    return {
      healthScore,
      healthTrend: { change: healthChange.toFixed(1), isUp: healthChange >= 0 },
      activityScore: { rating: activityRating, steps: Math.round(avgSteps), change: prevSteps ? Math.round(((avgSteps - prevSteps) / prevSteps) * 100) : 0 },
      nutritionScore: { status: avgCal > 1500 ? 'Surplus' : 'Optimal', intake: Math.round(avgCal) },
      behaviorScore: { index: avgAnxiety.toFixed(1) },
      sleepScore: { hours: avgSleep.toFixed(1), quality: avgSleep > 10 ? 'Excellent' : 'Fair' },
      complianceScore: { rate: 95, status: 'Up to date' },
      trendData
    };
  }, [simulatedData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Overall Health Score Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="w-full md:w-auto">
              <div className="flex items-center gap-2 mb-3 text-teal-100">
                <HeartPulse className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-widest text-sm">Overall Health Score</h2>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black">{healthScore}</span>
                <span className="text-teal-200 text-2xl font-bold">/ 100</span>
              </div>
              <div className="flex items-center gap-2 mt-6 text-sm font-bold bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                {healthTrend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{healthTrend.isUp ? '+' : ''}{healthTrend.change}% from last week</span>
              </div>
            </div>
            
            <div className="h-40 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="score" stroke="#ffffff" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-900 opacity-30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
        </div>

        {/* Activity Card */}
        <DashboardCard 
          title="Activity" 
          icon={<Activity className="w-6 h-6 text-orange-500" />}
          value={activityScore.rating}
          subtext={`${activityScore.steps.toLocaleString()} avg daily steps`}
          trend={`${activityScore.change > 0 ? '+' : ''}${activityScore.change}% vs last week`}
          trendPositive={activityScore.change >= 0}
          bgClass="bg-gradient-to-br from-white to-orange-50 dark:from-slate-900 dark:to-slate-800"
          borderClass="border-orange-100 dark:border-slate-700"
        />

        {/* Nutrition Card */}
        <DashboardCard 
          title="Nutrition" 
          icon={<Utensils className="w-6 h-6 text-emerald-500" />}
          value={nutritionScore.status}
          subtext={`${nutritionScore.intake} kcal avg daily`}
          trend="Hydration levels optimal"
          trendPositive={true}
          bgClass="bg-gradient-to-br from-white to-emerald-50 dark:from-slate-900 dark:to-slate-800"
          borderClass="border-emerald-100 dark:border-slate-700"
        />

        {/* Behavior Card */}
        <DashboardCard 
          title="Behavior" 
          icon={<Brain className="w-6 h-6 text-purple-500" />}
          value="Stable"
          subtext={`Anxiety Index: ${behaviorScore.index}`}
          trend="No recent spikes"
          trendPositive={true}
          bgClass="bg-gradient-to-br from-white to-purple-50 dark:from-slate-900 dark:to-slate-800"
          borderClass="border-purple-100 dark:border-slate-700"
        />

        {/* Sleep Card */}
        <DashboardCard 
          title="Sleep" 
          icon={<Moon className="w-6 h-6 text-indigo-500" />}
          value={sleepScore.quality}
          subtext={`${sleepScore.hours}h avg nightly`}
          trend="Consistent routine"
          trendPositive={true}
          bgClass="bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900 dark:to-slate-800"
          borderClass="border-indigo-100 dark:border-slate-700"
        />

        {/* Vet Compliance Card */}
        <DashboardCard 
          title="Vet Compliance" 
          icon={<ShieldCheck className="w-6 h-6 text-blue-500" />}
          value={`${complianceScore.rate}%`}
          subtext={complianceScore.status}
          trend="Next visit in 32 days"
          trendPositive={true}
          bgClass="bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800"
          borderClass="border-blue-100 dark:border-slate-700"
        />

      </div>
    </div>
  );
}

function DashboardCard({ title, icon, value, subtext, trend, trendPositive, bgClass, borderClass }: any) {
  return (
    <div className={`rounded-3xl p-6 border ${borderClass} ${bgClass} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
          {icon}
        </div>
        <h3 className="font-bold text-slate-700 dark:text-slate-300">{title}</h3>
      </div>
      <div className="mb-6">
        <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{value}</p>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{subtext}</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 w-fit">
        {trendPositive ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
        <span className={trendPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{trend}</span>
      </div>
    </div>
  );
}
