import { useMemo, useState } from 'react';
import { Stethoscope, Calendar, FileText, Pill, Paperclip, UploadCloud, FileImage, Download } from 'lucide-react';
import type { VetVisit } from '../../types/pawphile';

interface Props {
  vetVisits: VetVisit[];
}

export default function VeterinaryReport({ vetVisits }: Props) {
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const sortedVisits = useMemo(() => {
    return [...vetVisits].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [vetVisits]);

  const selectedVisit = useMemo(() => {
    return sortedVisits.find(v => v.id === selectedVisitId) || sortedVisits[0];
  }, [sortedVisits, selectedVisitId]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visit History List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-[600px]">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" /> Visit History
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {sortedVisits.length === 0 ? (
              <p className="text-slate-500 italic text-center mt-10">No veterinary visits logged.</p>
            ) : (
              sortedVisits.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVisitId(v.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedVisit?.id === v.id 
                      ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-900/50 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-teal-300'
                  }`}
                >
                  <p className={`font-bold text-sm mb-1 truncate ${selectedVisit?.id === v.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {v.reasonForVisit}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(v.visitDate).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Visit Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedVisit ? (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedVisit.reasonForVisit}</h2>
                    <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mt-2">
                      <Stethoscope className="w-4 h-4 text-teal-500" /> {selectedVisit.clinicName || selectedVisit.vetName || 'Unknown Clinic'}
                    </p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {new Date(selectedVisit.visitDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" /> Diagnosis Summary
                    </h4>
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-2xl min-h-[100px]">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedVisit.diagnosisAsEntered || 'No formal diagnosis recorded.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-blue-500" /> Prescription & Meds
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl min-h-[100px]">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedVisit.medicinesPrescribed || 'No medications prescribed.'}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" /> Vet Remarks & Notes
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl min-h-[80px]">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedVisit.vetRemarks || 'No additional remarks.'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedVisit.followUpDate && (
                  <div className="mt-6 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-900/50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm">
                        <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-teal-600/70 dark:text-teal-400/70 uppercase tracking-widest">Follow-up Appointment</p>
                        <p className="font-bold text-teal-800 dark:text-teal-300">{new Date(selectedVisit.followUpDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-teal-700 bg-teal-100 px-4 py-2 rounded-full hover:bg-teal-200 transition-colors">
                      Add to Calendar
                    </button>
                  </div>
                )}
              </div>

              {/* Medical Attachments Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-indigo-500" /> Medical Attachments
                  </h3>
                  <button className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                    <UploadCloud className="w-4 h-4" /> Upload
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Mock attachments based on reason/diagnosis length as a heuristic */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer group">
                    <FileImage className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 w-full mb-1">Prescription.jpg</p>
                    <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1"><Download className="w-3 h-3" /> 1.2 MB</div>
                  </div>
                  
                  {selectedVisit.diagnosisAsEntered && selectedVisit.diagnosisAsEntered.length > 20 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer group">
                      <FileText className="w-8 h-8 text-rose-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1 w-full mb-1">Lab_Results.pdf</p>
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1"><Download className="w-3 h-3" /> 3.5 MB</div>
                    </div>
                  )}

                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                    <UploadCloud className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Drop files here</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 shadow-sm flex flex-col items-center justify-center h-full text-center">
              <Stethoscope className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="font-bold text-xl text-slate-700 dark:text-slate-300">No Visit Selected</p>
              <p className="text-slate-500 mt-2">Select a visit from the history list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
