import { useMemo } from 'react';
import { BookOpen, Calendar, Stethoscope, FileText, Pill, Dumbbell, Utensils, Clock } from 'lucide-react';
import type { VetVisit } from '../../types/pawphile';

interface Props {
  vetVisits: VetVisit[];
}

export default function VetNotesReport({ vetVisits }: Props) {
  const sortedVisits = useMemo(() => {
    return [...vetVisits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [vetVisits]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" /> Veterinary Diary
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Detailed clinical consultation notes and recommendations.</p>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-bold px-4 py-2 rounded-xl text-sm border border-teal-200 dark:border-teal-900/50">
          {sortedVisits.length} Records
        </div>
      </div>

      <div className="space-y-10">
        {sortedVisits.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-slate-500 text-lg">No Vet Notes Available</p>
            <p className="text-sm text-slate-400 mt-1">Visit notes will appear here once recorded.</p>
          </div>
        ) : (
          sortedVisits.map((v, index) => (
            <div key={v.id} className="relative">
              {/* Timeline connector */}
              {index !== sortedVisits.length - 1 && (
                <div className="absolute left-8 top-24 bottom-[-40px] w-0.5 bg-slate-200 dark:bg-slate-800"></div>
              )}
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative z-10 ml-16 md:ml-0">
                {/* Date Badge placed absolutely for desktop, normally for mobile */}
                <div className="hidden md:flex absolute -left-16 top-6 bg-teal-500 text-white w-12 h-12 rounded-full items-center justify-center font-black text-center shadow-lg shadow-teal-500/30 leading-tight">
                  <span className="text-sm">{new Date(v.visitDate).getDate()}</span>
                  <span className="text-[10px] uppercase block">{new Date(v.visitDate).toLocaleDateString(undefined, { month: 'short' })}</span>
                </div>

                <div className="p-6 md:p-8">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                      <div className="md:hidden flex items-center gap-2 mb-2 text-teal-600 font-bold text-sm bg-teal-50 px-3 py-1 rounded-full w-fit">
                        <Calendar className="w-4 h-4" /> {new Date(v.visitDate).toLocaleDateString()}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{v.reasonForVisit}</h3>
                      <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                          <Stethoscope className="w-4 h-4 text-indigo-500" /> {v.clinicName || 'Unknown Clinic'}
                        </span>
                        {v.vetName && (
                          <span className="flex items-center gap-1.5">
                            Dr. {v.vetName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    {/* Symptoms & Diagnosis */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                          <FileText className="w-4 h-4 text-rose-400" /> Symptoms & Diagnosis
                        </h4>
                        <div className="bg-rose-50/50 dark:bg-rose-900/10 border-l-4 border-rose-400 p-4 rounded-r-2xl">
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {v.diagnosisAsEntered || 'No diagnosis details provided.'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                          <FileText className="w-4 h-4 text-slate-400" /> Clinical Notes
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                          {v.vetRemarks || 'No additional clinical notes.'}
                        </p>
                      </div>
                    </div>

                    {/* Treatments & Recs */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                          <Pill className="w-4 h-4 text-blue-500" /> Medications Prescribed
                        </h4>
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-r-2xl">
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {v.medicinesPrescribed || 'None prescribed.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <h5 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            <Dumbbell className="w-3.5 h-3.5 text-orange-500" /> Exercise Rec.
                          </h5>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {/* Dummy data for now, ideally parsed from notes or added to schema */}
                            Moderate activity
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <h5 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            <Utensils className="w-3.5 h-3.5 text-emerald-500" /> Diet Rec.
                          </h5>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Standard diet
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Footer */}
                  {v.followUpDate && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Appointment</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(v.followUpDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
