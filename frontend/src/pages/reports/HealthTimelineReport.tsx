import { useMemo, useState } from 'react';
import { Clock, Activity, Syringe, Stethoscope, ShieldCheck } from 'lucide-react';
import type { DogProfile, VetVisit, VaccineRecord, SymptomLog } from '../../types/pawphile';

interface Props {
  dog: DogProfile;
  vetVisits: VetVisit[];
  vaccines: VaccineRecord[];
  symptoms: SymptomLog[];
}

type TimelineEvent = {
  id: string;
  date: Date;
  type: 'visit' | 'vaccine' | 'symptom';
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
};

export default function HealthTimelineReport({ dog, vetVisits, vaccines, symptoms }: Props) {
  const [filter, setFilter] = useState<'all' | 'visit' | 'vaccine' | 'symptom'>('all');

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    vetVisits.forEach(v => {
      events.push({
        id: `visit-${v.id}`,
        date: new Date(v.visitDate),
        type: 'visit',
        title: `Vet Visit: ${v.reasonForVisit}`,
        description: `${v.clinicName || 'Clinic'} - ${v.diagnosisAsEntered || 'Routine checkup'}`,
        icon: <Stethoscope className="w-5 h-5 text-indigo-500" />,
        colorClass: 'text-indigo-500',
        bgClass: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-900/50'
      });
    });

    vaccines.forEach(v => {
      events.push({
        id: `vac-${v.id}`,
        date: new Date(v.dateGiven),
        type: 'vaccine',
        title: `Vaccination: ${v.vaccineName}`,
        description: `Administered. Next due: ${v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : 'N/A'}`,
        icon: <Syringe className="w-5 h-5 text-emerald-500" />,
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50'
      });
    });

    symptoms.forEach(s => {
      let severityClass = 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-900/20 dark:border-amber-900/50';
      if (s.energyLevel === 'lethargic' || s.energyLevel === 'weak' || s.energyLevel === 'collapsed') {
        severityClass = 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-900/50';
      }

      events.push({
        id: `sym-${s.id}`,
        date: new Date(s.createdAt),
        type: 'symptom',
        title: `Symptom Logged: ${s.mainConcern}`,
        description: `Energy: ${s.energyLevel}, Appetite: ${s.appetiteStatus}`,
        icon: <Activity className={`w-5 h-5 ${severityClass.includes('text-red') ? 'text-red-500' : 'text-amber-500'}`} />,
        colorClass: severityClass.includes('text-red') ? 'text-red-500' : 'text-amber-500',
        bgClass: severityClass
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [vetVisits, vaccines, symptoms]);

  const filteredEvents = timelineEvents.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl mx-auto">
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-600" /> Unified Medical Journal
          </h2>
          <p className="text-sm text-slate-500 font-medium">A chronological history of {dog.name}'s health events.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(['all', 'visit', 'vaccine', 'symptom'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                filter === f ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 md:ml-8 pl-8 space-y-8 pb-8">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-500">No events found</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="relative group">
              <div className="absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white dark:border-slate-950 bg-white flex items-center justify-center">
                <div className={`w-2.5 h-2.5 rounded-full bg-current ${event.colorClass}`}></div>
              </div>

              <div className={`rounded-2xl p-5 border transition-all hover:shadow-md ${event.bgClass}`}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {event.icon} {event.title}
                  </h4>
                  <span className="text-xs font-bold text-slate-500 bg-white/50 dark:bg-slate-900/50 px-2 py-1 rounded-md w-fit backdrop-blur-sm">
                    {event.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
