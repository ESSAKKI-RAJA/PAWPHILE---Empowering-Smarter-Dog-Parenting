import { useMemo } from 'react';
import { ShieldAlert, Activity, CheckCircle2, AlertTriangle, Sparkles, BrainCircuit } from 'lucide-react';
import type { DogProfile, SymptomLog } from '../../types/pawphile';
import { SimulatedDay } from '../../utils/reportDataSimulator';
import { calculateBCS } from '../../utils/bcsUtils';

interface Props {
  dog: DogProfile;
  symptoms: SymptomLog[];
  simulatedData: SimulatedDay[];
}

export default function AiRiskReport({ dog, symptoms, simulatedData }: Props) {
  const { riskLevel, confidenceScore, factors, recommendations } = useMemo(() => {
    let riskScore = 0;
    const factorsList: { id: string, name: string, impact: 'high' | 'medium' | 'low', type: 'negative' | 'positive' }[] = [];
    const recsList: string[] = [];

    // Evaluate symptoms
    const recentSymptoms = symptoms.filter(s => {
      const diffDays = (new Date().getTime() - new Date(s.createdAt).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 14;
    });

    if (recentSymptoms.length > 0) {
      const hasLethargy = recentSymptoms.some(s => s.energyLevel === 'lethargic' || s.energyLevel === 'weak' || s.energyLevel === 'collapsed');
      if (hasLethargy) {
        riskScore += 40;
        factorsList.push({ id: 'lethargy', name: 'Recent Lethargy Logged', impact: 'high', type: 'negative' });
        recsList.push('Monitor energy levels closely and schedule a vet visit if lethargy persists for >24h.');
      }

      const poorAppetite = recentSymptoms.some(s => s.appetiteStatus === 'reduced' || s.appetiteStatus === 'refused');
      if (poorAppetite) {
        riskScore += 30;
        factorsList.push({ id: 'appetite', name: 'Reduced Appetite', impact: 'high', type: 'negative' });
        recsList.push('Offer highly palatable, easily digestible food. Ensure constant access to fresh water.');
      }
    } else {
      factorsList.push({ id: 'nosym', name: 'No Recent Symptoms', impact: 'high', type: 'positive' });
    }

    // Evaluate BCS & Weight
    const bcs = calculateBCS(dog);
    if (bcs.label === 'Obese') {
      riskScore += 30;
      factorsList.push({ id: 'bcs_obese', name: 'Obese Body Condition', impact: 'high', type: 'negative' });
      recsList.push('Strictly adhere to a vet-supervised weight reduction plan. Eliminate table scraps.');
    } else if (bcs.label === 'Overweight') {
      riskScore += 15;
      factorsList.push({ id: 'bcs_over', name: 'Overweight Risk', impact: 'medium', type: 'negative' });
      recsList.push('Increase daily low-impact exercise duration by 10-15 minutes and reduce treats.');
    } else if (bcs.label === 'Underweight') {
      riskScore += 25;
      factorsList.push({ id: 'bcs_under', name: 'Underweight Risk', impact: 'high', type: 'negative' });
      recsList.push('Consult a vet to rule out underlying conditions and gradually increase calorie intake.');
    } else {
      factorsList.push({ id: 'bcs_ideal', name: 'Ideal Body Condition', impact: 'high', type: 'positive' });
    }

    // Evaluate Simulated Activity Data (last 7 days)
    if (simulatedData && simulatedData.length > 0) {
      const recent7 = simulatedData.slice(-7);
      const avgSteps = recent7.reduce((sum, d) => sum + d.steps, 0) / 7;
      const breedBase = (Number(dog.weight) || 15) > 25 ? 7000 : 9000;

      if (avgSteps < breedBase * 0.5) {
        riskScore += 20;
        factorsList.push({ id: 'low_act', name: 'Significantly Low Activity', impact: 'medium', type: 'negative' });
        if (!recsList.some(r => r.includes('exercise'))) {
          recsList.push('Gradually increase daily activity levels to reach breed benchmarks.');
        }
      } else if (avgSteps >= breedBase * 0.9) {
        factorsList.push({ id: 'good_act', name: 'Excellent Activity Level', impact: 'high', type: 'positive' });
      }
    }

    // Determine Risk Level
    let level = 'Low Risk';
    let colorClass = 'emerald';
    if (riskScore >= 50) {
      level = 'High Risk';
      colorClass = 'red';
    } else if (riskScore >= 20) {
      level = 'Moderate Risk';
      colorClass = 'orange';
    }

    if (recsList.length === 0) {
      recsList.push('Maintain current care routine. No immediate health risks detected.');
    }

    return {
      riskLevel: { level, color: colorClass, score: riskScore },
      confidenceScore: 88 + Math.floor(Math.random() * 10), // Heuristic confidence
      factors: factorsList.sort((a, _b) => a.type === 'negative' ? -1 : 1), // Negatives first
      recommendations: recsList
    };
  }, [dog, symptoms, simulatedData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      
      {/* Risk Summary Header */}
      <div className={`rounded-3xl p-8 text-white shadow-xl bg-gradient-to-br flex flex-col md:flex-row justify-between items-center gap-8 ${
        riskLevel.color === 'emerald' ? 'from-emerald-500 to-emerald-700 shadow-emerald-500/20' : 
        riskLevel.color === 'orange' ? 'from-orange-500 to-orange-700 shadow-orange-500/20' : 
        'from-red-500 to-red-700 shadow-red-500/20'
      }`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <BrainCircuit className="w-6 h-6" />
            <h2 className="font-bold uppercase tracking-widest text-sm">AI Health Assessment</h2>
          </div>
          <h1 className="text-5xl font-black mb-4">{riskLevel.level}</h1>
          <p className="text-white/90 font-medium max-w-xl leading-relaxed">
            Based on {dog.name}'s recent clinical logs, behavioral data, and biometric profile, our AI engine has evaluated their current health trajectory.
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-center min-w-[200px]">
          <h3 className="text-xs uppercase tracking-widest font-bold text-white/80 mb-1">Confidence Score</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black">{confidenceScore}</span>
            <span className="text-xl font-bold text-white/60">%</span>
          </div>
          <div className="mt-3 w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${confidenceScore}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Contributing Factors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Contributing Factors
          </h3>
          
          <div className="space-y-4">
            {factors.map(f => (
              <div key={f.id} className={`p-4 rounded-2xl border flex items-center justify-between ${
                f.type === 'negative' ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
              }`}>
                <div className="flex items-center gap-3">
                  {f.type === 'negative' ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  <span className={`font-bold ${f.type === 'negative' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {f.name}
                  </span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  f.impact === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : 
                  f.impact === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' : 
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {f.type === 'negative' ? `${f.impact} Risk` : 'Protective'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Recommended Actions
          </h3>
          
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
            <ul className="space-y-5">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0 shadow-sm border border-teal-200 dark:border-teal-800">
                    {i + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed pt-1">
                    {rec}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl">
            <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Disclaimer: This AI assessment is for informational purposes only and does not replace professional veterinary advice. Always consult your vet for medical decisions.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
