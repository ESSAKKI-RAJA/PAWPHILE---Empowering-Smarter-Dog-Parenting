import { useMemo } from 'react';
import { Syringe, Calendar, CheckCircle2, AlertTriangle, ShieldAlert, Clock, Stethoscope } from 'lucide-react';
import type { VaccineRecord } from '../../types/pawphile';

interface Props {
  vaccines: VaccineRecord[];
}

export default function VaccinationReport({ vaccines }: Props) {
  const { upcoming, history, stats } = useMemo(() => {
    const now = new Date();
    const sorted = [...vaccines].sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime());

    const history = sorted.map(v => {
      let status: 'up-to-date' | 'due-soon' | 'overdue' = 'up-to-date';
      let daysRemaining = null;

      if (v.nextDueDate) {
        const dueDate = new Date(v.nextDueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          status = 'overdue';
        } else if (daysRemaining <= 30) {
          status = 'due-soon';
        }
      }

      return { ...v, status, daysRemaining };
    });

    // Group by upcoming/overdue vs up-to-date/historical
    const upcoming = history
      .filter(v => v.status === 'due-soon' || v.status === 'overdue' || (v.daysRemaining !== null && v.daysRemaining <= 90))
      .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0));

    const stats = {
      total: history.length,
      upToDate: history.filter(v => v.status === 'up-to-date').length,
      dueSoon: history.filter(v => v.status === 'due-soon').length,
      overdue: history.filter(v => v.status === 'overdue').length,
    };

    return { upcoming, history, stats };
  }, [vaccines]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-2">Total Vaccines</h3>
          <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-100 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Up to Date</h3>
          </div>
          <span className="text-3xl font-black">{stats.upToDate}</span>
        </div>
        <div className={`rounded-3xl p-6 text-white shadow-lg flex flex-col justify-center ${stats.dueSoon > 0 ? 'bg-orange-500 shadow-orange-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
          <div className={`flex items-center gap-2 mb-2 ${stats.dueSoon > 0 ? 'text-orange-100' : 'text-slate-500'}`}>
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Due Soon</h3>
          </div>
          <span className={`text-3xl font-black ${stats.dueSoon > 0 ? '' : 'text-slate-400'}`}>{stats.dueSoon}</span>
        </div>
        <div className={`rounded-3xl p-6 text-white shadow-lg flex flex-col justify-center ${stats.overdue > 0 ? 'bg-red-500 shadow-red-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
          <div className={`flex items-center gap-2 mb-2 ${stats.overdue > 0 ? 'text-red-100' : 'text-slate-500'}`}>
            <ShieldAlert className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-widest">Overdue</h3>
          </div>
          <span className={`text-3xl font-black ${stats.overdue > 0 ? '' : 'text-slate-400'}`}>{stats.overdue}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Action Required */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-full">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Action Required
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {upcoming.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-sm text-slate-500 mt-1">No vaccines due in the next 90 days.</p>
              </div>
            ) : (
              upcoming.map((v, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${
                  v.status === 'overdue' ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/50' : 
                  v.status === 'due-soon' ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/50' : 
                  'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold ${v.status === 'overdue' ? 'text-red-700 dark:text-red-400' : v.status === 'due-soon' ? 'text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {v.vaccineName}
                    </h4>
                    {v.status === 'overdue' && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Overdue</span>}
                    {v.status === 'due-soon' && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Due Soon</span>}
                  </div>
                  <div className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 opacity-50" />
                    <span>Due: {new Date(v.nextDueDate!).toLocaleDateString()}</span>
                  </div>
                  {v.daysRemaining !== null && (
                    <p className={`text-xs font-bold mt-2 ${
                      v.daysRemaining < 0 ? 'text-red-600 dark:text-red-400' : 
                      v.daysRemaining <= 30 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'
                    }`}>
                      {v.daysRemaining < 0 ? `${Math.abs(v.daysRemaining)} days overdue` : `In ${v.daysRemaining} days`}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Syringe className="w-5 h-5 text-teal-500" /> Vaccination Timeline
          </h3>

          <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 pl-6 space-y-8 pb-4">
            {history.length === 0 ? (
              <p className="text-slate-500 italic">No vaccination history recorded.</p>
            ) : (
              history.map((v, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[33px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                    v.status === 'up-to-date' ? 'bg-emerald-500' : 
                    v.status === 'due-soon' ? 'bg-orange-500' : 'bg-red-500'
                  }`}></div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md hover:border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-2">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          {v.vaccineName}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            v.status === 'up-to-date' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            v.status === 'due-soon' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {v.status.replace('-', ' ')}
                          </span>
                        </h4>
                      </div>
                      <div className="text-sm font-bold text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 w-fit">
                        <Calendar className="w-4 h-4" /> {new Date(v.dateGiven).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {v.nextDueDate && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Expires / Next Due</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{new Date(v.nextDueDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {(v.clinicName || v.vetName) && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Administered By</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-500" /> {v.clinicName || v.vetName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
