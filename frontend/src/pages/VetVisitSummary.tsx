import React, { useState } from 'react';
import { Plus, ClipboardList, Paperclip, Calendar, Activity } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import { generateId } from '../lib/ids';
import type { VetVisit } from '../types/pawphile';

export default function VetVisitSummary() {
  const { selectedDog, vetVisits, addVetVisit } = usePawphileData();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<VetVisit>>({
    visitDate: '',
    vetName: '',
    clinicName: '',
    reasonForVisit: '',
    symptomsBeforeVisit: '',
    vetRemarks: '',
    diagnosisAsEntered: '',
    medicinesPrescribed: '',
    dosageNotesCopied: '',
    followUpDate: '',
    ownerNotes: '',
    attachmentUrls: []
  });

  if (!selectedDog) {
    return (
      <PageWrapper className="bg-slate-50 flex items-center justify-center min-h-[80vh]">
        <p className="font-bold text-slate-500">Please add a dog profile to log vet visits.</p>
      </PageWrapper>
    );
  }

  const visits = vetVisits.filter(v => v.dogId === selectedDog.id).sort((a,b) => b.visitDate.localeCompare(a.visitDate));

  const handleSave = () => {
    if (!form.visitDate || !form.vetName || !form.reasonForVisit) {
      alert('Please fill out the visit date, vet name, and reason for visit.');
      return;
    }

    const newVisit: VetVisit = {
      id: generateId(),
      dogId: selectedDog.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual',
      syncStatus: 'local_only',
      visitDate: form.visitDate,
      vetName: form.vetName,
      clinicName: form.clinicName,
      reasonForVisit: form.reasonForVisit,
      symptomsBeforeVisit: form.symptomsBeforeVisit,
      vetRemarks: form.vetRemarks,
      diagnosisAsEntered: form.diagnosisAsEntered,
      medicinesPrescribed: form.medicinesPrescribed,
      dosageNotesCopied: form.dosageNotesCopied,
      followUpDate: form.followUpDate,
      ownerNotes: form.ownerNotes,
      attachmentUrls: form.attachmentUrls || []
    };

    addVetVisit(newVisit);

    setForm({
      visitDate: '', vetName: '', clinicName: '', reasonForVisit: '', symptomsBeforeVisit: '',
      vetRemarks: '', diagnosisAsEntered: '', medicinesPrescribed: '', dosageNotesCopied: '',
      followUpDate: '', ownerNotes: '', attachmentUrls: []
    });
    setShowForm(false);
  };

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
        <span className="font-black text-lg tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-teal-600" /> Vet Visits
        </span>
        <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 text-white p-2 rounded-xl">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        
        {showForm && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4">
            <h2 className="text-xl font-black mb-4">Log Vet Visit</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Visit Date *</label>
                  <input type="date" value={form.visitDate} onChange={e => setForm({...form, visitDate: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Follow-up Date</label>
                  <input type="date" value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Vet Name *</label>
                  <input type="text" value={form.vetName} onChange={e => setForm({...form, vetName: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" placeholder="Dr. Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Clinic Name</label>
                  <input type="text" value={form.clinicName} onChange={e => setForm({...form, clinicName: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" placeholder="Clinic" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reason for Visit *</label>
                <input type="text" value={form.reasonForVisit} onChange={e => setForm({...form, reasonForVisit: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" placeholder="e.g. Annual Checkup, Limping" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Symptoms Before Visit</label>
                <textarea value={form.symptomsBeforeVisit} onChange={e => setForm({...form, symptomsBeforeVisit: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" rows={2} />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-4">
                <h3 className="font-bold text-amber-800 text-sm">Medical Notes</h3>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Vet Remarks (Copy from vet note)</label>
                  <textarea value={form.vetRemarks} onChange={e => setForm({...form, vetRemarks: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-amber-200" rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Diagnosis (As written by vet)</label>
                  <input type="text" value={form.diagnosisAsEntered} onChange={e => setForm({...form, diagnosisAsEntered: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-amber-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Medicines Prescribed (Copy from prescription)</label>
                  <textarea value={form.medicinesPrescribed} onChange={e => setForm({...form, medicinesPrescribed: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-amber-200" rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Dosage Notes (Copy exactly — do not interpret)</label>
                  <textarea value={form.dosageNotesCopied} onChange={e => setForm({...form, dosageNotesCopied: e.target.value})} className="w-full p-3 rounded-xl bg-white border border-amber-200" rows={2} />
                </div>
                <p className="text-[10px] text-amber-700 italic border-t border-amber-200 pt-2">PAWPHILE never generates or suggests medication or dosage. Only enter what your vet provided.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Owner Notes</label>
                <textarea value={form.ownerNotes} onChange={e => setForm({...form, ownerNotes: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" rows={2} />
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50">
                <Paperclip className="w-8 h-8 text-slate-400 mb-1" />
                <p className="font-bold text-slate-600 text-sm">Upload Prescriptions/Bills (Placeholder)</p>
              </div>

              <button onClick={handleSave} className="w-full bg-teal-600 text-white font-black py-4 rounded-xl hover:bg-teal-700 transition-colors">
                Save Visit Log
              </button>
            </div>
          </div>
        )}

        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
          {visits.length === 0 ? (
            <div className="ml-6 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 border-dashed">
              <p className="font-bold text-slate-500">No vet visits logged yet.</p>
            </div>
          ) : (
            visits.map((v, i) => {
              const isExpanded = expandedId === v.id;
              return (
                <div key={v.id} className="relative ml-6">
                  <div className="absolute -left-[35px] top-4 w-4 h-4 rounded-full bg-teal-500 border-4 border-slate-50 dark:border-slate-950" />
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : v.id)} 
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-lg text-slate-800 dark:text-white">{v.reasonForVisit}</h3>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap"><Calendar className="w-3 h-3 inline mr-1"/>{new Date(v.visitDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Dr. {v.vetName} {v.clinicName ? `• ${v.clinicName}` : ''}</p>
                    
                    <div className="flex gap-4 mt-3">
                      {v.followUpDate && (
                        <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Follow up: {new Date(v.followUpDate).toLocaleDateString()}
                        </span>
                      )}
                      {(v.attachmentUrls && v.attachmentUrls.length > 0) && (
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {v.attachmentUrls.length} file(s)
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                        {v.symptomsBeforeVisit && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Symptoms</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{v.symptomsBeforeVisit}</p>
                          </div>
                        )}
                        {v.diagnosisAsEntered && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnosis</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{v.diagnosisAsEntered}</p>
                          </div>
                        )}
                        {v.vetRemarks && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vet Remarks</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 p-2 rounded">{v.vetRemarks}</p>
                          </div>
                        )}
                        {(v.medicinesPrescribed || v.dosageNotesCopied) && (
                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Prescription Copied</p>
                            {v.medicinesPrescribed && <p className="text-sm font-medium text-amber-900 mb-1">{v.medicinesPrescribed}</p>}
                            {v.dosageNotesCopied && <p className="text-xs font-bold text-amber-800">Dosage: {v.dosageNotesCopied}</p>}
                          </div>
                        )}
                        {v.ownerNotes && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Notes</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{v.ownerNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
