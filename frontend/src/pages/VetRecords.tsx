import { useState, useMemo } from 'react';
import { usePawphileData } from '../context/PawphileDataContext';
import { ShieldAlert, Plus, Edit2, Trash2, FileText, Pill, Calendar, Building } from 'lucide-react';
import type { VetVisit, Medication } from '../types/pawphile';

type Tab = 'visits' | 'medications';

export default function VetRecords() {
  const { selectedDog, vetVisits, medications, addVetVisit, updateVetVisit, deleteVetVisit, addMedication, updateMedication, deleteMedication } = usePawphileData();
  const [activeTab, setActiveTab] = useState<Tab>('visits');
  
  // Visit Modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState<Partial<VetVisit>>({
    vetName: '', clinicName: '', contactNumber: '', visitDate: '', visitTime: '', visitType: 'General Checkup',
    symptoms: '', diagnosis: '', treatmentPlan: '', clinicalNotes: '', followUpRequired: false, nextVisitDate: '', nextVisitTime: ''
  });

  // Medication Modal
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medForm, setMedForm] = useState<Partial<Medication>>({
    name: '', dosage: '', frequency: '', duration: '', instructions: '', startDate: '', endDate: ''
  });

  const dogId = selectedDog?.id;
  const myVisits = useMemo(() => vetVisits.filter(v => v.dogId === dogId).sort((a, b) => b.visitDate.localeCompare(a.visitDate)), [vetVisits, dogId]);
  const myMeds = useMemo(() => medications.filter(m => m.dogId === dogId).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')), [medications, dogId]);

  if (!selectedDog) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-400" />
          <p className="font-bold text-slate-500">Please add a dog profile to track veterinary records.</p>
        </div>
      </div>
    );
  }

  const handleSaveVisit = () => {
    if (!visitForm.vetName || !visitForm.clinicName || !visitForm.visitDate || !visitForm.visitType) return;
    const now = new Date().toISOString();
    
    if (editingVisitId) {
      updateVetVisit(editingVisitId, { ...visitForm, updatedAt: now });
    } else {
      addVetVisit({
        ...visitForm,
        id: crypto.randomUUID(),
        dogId: selectedDog.id,
        createdAt: now,
        source: 'manual',
        syncStatus: 'local_only'
      } as VetVisit);
    }
    setShowVisitModal(false);
  };

  const handleSaveMed = () => {
    if (!medForm.name || !medForm.dosage || !medForm.frequency || !medForm.duration) return;
    const now = new Date().toISOString();
    
    if (editingMedId) {
      updateMedication(editingMedId, { ...medForm, updatedAt: now });
    } else {
      addMedication({
        ...medForm,
        id: crypto.randomUUID(),
        dogId: selectedDog.id,
        createdAt: now,
        source: 'manual',
        syncStatus: 'local_only'
      } as Medication);
    }
    setShowMedModal(false);
  };

  return (
    <div className="pw-page pb-28 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="px-5 pt-10 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <h1 className="text-2xl font-black">Veterinary Records</h1>
        <p className="text-xs font-semibold mt-0.5 text-slate-500">
          Manage clinical history for {selectedDog.name}
        </p>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mt-4">
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'visits' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500'}`}
          >
            <FileText className="w-4 h-4" /> Visits
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'medications' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            <Pill className="w-4 h-4" /> Medications
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {activeTab === 'visits' && (
          <>
            <button
              onClick={() => { setEditingVisitId(null); setVisitForm({ visitType: 'General Checkup', followUpRequired: false }); setShowVisitModal(true); }}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              <Plus className="w-5 h-5" /> Add Vet Visit
            </button>
            
            {myVisits.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full">{v.visitType}</span>
                    <h3 className="font-bold text-lg mt-2">{v.vetName}</h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                      <Building className="w-3 h-3" /> {v.clinicName}
                      <Calendar className="w-3 h-3 ml-2" /> {v.visitDate} {v.visitTime}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingVisitId(v.id); setVisitForm(v); setShowVisitModal(true); }} className="p-2 text-slate-400 hover:text-teal-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteVetVisit(v.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {v.symptoms && <div className="mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Symptoms</p><p className="text-sm">{v.symptoms}</p></div>}
                {v.diagnosis && <div className="mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis</p><p className="text-sm font-semibold">{v.diagnosis}</p></div>}
                {v.treatmentPlan && <div className="mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Treatment Plan</p><p className="text-sm">{v.treatmentPlan}</p></div>}
                {v.clinicalNotes && <div className="mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Notes</p><p className="text-sm text-slate-600 dark:text-slate-300 italic">"{v.clinicalNotes}"</p></div>}
                {v.followUpRequired && (
                  <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-xs font-bold text-orange-800 dark:text-orange-200">Follow-up on {v.nextVisitDate} at {v.nextVisitTime}</p>
                  </div>
                )}
              </div>
            ))}
            {myVisits.length === 0 && <p className="text-center text-slate-500 py-10">No veterinary visits recorded.</p>}
          </>
        )}

        {activeTab === 'medications' && (
          <>
            <button
              onClick={() => { setEditingMedId(null); setMedForm({}); setShowMedModal(true); }}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <Plus className="w-5 h-5" /> Add Medication
            </button>
            
            {myMeds.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{m.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                      <Pill className="w-3 h-3" /> {m.dosage} · {m.frequency}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMedId(m.id); setMedForm(m); setShowMedModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteMedication(m.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                    <p className="text-xs font-semibold">{m.duration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timeline</p>
                    <p className="text-xs font-semibold">{m.startDate} to {m.endDate}</p>
                  </div>
                </div>
                {m.instructions && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructions</p>
                    <p className="text-sm">{m.instructions}</p>
                  </div>
                )}
              </div>
            ))}
            {myMeds.length === 0 && <p className="text-center text-slate-500 py-10">No active or past medications recorded.</p>}
          </>
        )}
      </div>

      {/* Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 relative max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-black mb-4">{editingVisitId ? 'Edit' : 'Add'} Vet Visit</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Vet Name *</label>
                  <input type="text" className="pw-input w-full" value={visitForm.vetName || ''} onChange={e => setVisitForm({...visitForm, vetName: e.target.value})} placeholder="Dr. Smith" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Clinic Name *</label>
                  <input type="text" className="pw-input w-full" value={visitForm.clinicName || ''} onChange={e => setVisitForm({...visitForm, clinicName: e.target.value})} placeholder="City Vet" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Date *</label>
                  <input type="date" className="pw-input w-full" value={visitForm.visitDate || ''} onChange={e => setVisitForm({...visitForm, visitDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Time</label>
                  <input type="time" className="pw-input w-full" value={visitForm.visitTime || ''} onChange={e => setVisitForm({...visitForm, visitTime: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Visit Type *</label>
                <select className="pw-input w-full" value={visitForm.visitType} onChange={e => setVisitForm({...visitForm, visitType: e.target.value})}>
                  <option>General Checkup</option><option>Vaccination</option><option>Illness/Injury</option><option>Follow-up</option><option>Surgery</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Symptoms</label>
                <textarea className="pw-input w-full min-h-[60px]" value={visitForm.symptoms || ''} onChange={e => setVisitForm({...visitForm, symptoms: e.target.value})} placeholder="What prompted the visit?"></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Diagnosis</label>
                <input type="text" className="pw-input w-full" value={visitForm.diagnosis || ''} onChange={e => setVisitForm({...visitForm, diagnosis: e.target.value})} placeholder="Diagnosis" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Treatment Plan</label>
                <textarea className="pw-input w-full min-h-[60px]" value={visitForm.treatmentPlan || ''} onChange={e => setVisitForm({...visitForm, treatmentPlan: e.target.value})} placeholder="Prescriptions, advice..."></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Clinical Notes</label>
                <textarea className="pw-input w-full min-h-[60px]" value={visitForm.clinicalNotes || ''} onChange={e => setVisitForm({...visitForm, clinicalNotes: e.target.value})} placeholder="Vet's exact notes..."></textarea>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <label className="flex items-center gap-2 font-bold text-sm mb-3 cursor-pointer">
                  <input type="checkbox" checked={visitForm.followUpRequired} onChange={e => setVisitForm({...visitForm, followUpRequired: e.target.checked})} className="w-4 h-4 text-teal-600 rounded" />
                  Follow-Up Required
                </label>
                {visitForm.followUpRequired && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <input type="date" className="pw-input w-full text-sm" value={visitForm.nextVisitDate || ''} onChange={e => setVisitForm({...visitForm, nextVisitDate: e.target.value})} />
                    <input type="time" className="pw-input w-full text-sm" value={visitForm.nextVisitTime || ''} onChange={e => setVisitForm({...visitForm, nextVisitTime: e.target.value})} />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowVisitModal(false)} className="flex-1 py-3 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
              <button onClick={handleSaveVisit} className="flex-1 py-3 font-bold bg-teal-600 text-white rounded-xl">Save Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Modal */}
      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 relative">
            <h2 className="text-xl font-black mb-4 text-indigo-600 dark:text-indigo-400">{editingMedId ? 'Edit' : 'Add'} Medication</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Medication Name *</label>
                <input type="text" className="pw-input w-full" value={medForm.name || ''} onChange={e => setMedForm({...medForm, name: e.target.value})} placeholder="e.g. NexGard" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Dosage *</label>
                  <input type="text" className="pw-input w-full" value={medForm.dosage || ''} onChange={e => setMedForm({...medForm, dosage: e.target.value})} placeholder="e.g. 1 Tablet" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Frequency *</label>
                  <input type="text" className="pw-input w-full" value={medForm.frequency || ''} onChange={e => setMedForm({...medForm, frequency: e.target.value})} placeholder="e.g. Once daily" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Duration *</label>
                <input type="text" className="pw-input w-full" value={medForm.duration || ''} onChange={e => setMedForm({...medForm, duration: e.target.value})} placeholder="e.g. 7 days" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Start Date</label>
                  <input type="date" className="pw-input w-full" value={medForm.startDate || ''} onChange={e => setMedForm({...medForm, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">End Date</label>
                  <input type="date" className="pw-input w-full" value={medForm.endDate || ''} onChange={e => setMedForm({...medForm, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Instructions</label>
                <textarea className="pw-input w-full min-h-[60px]" value={medForm.instructions || ''} onChange={e => setMedForm({...medForm, instructions: e.target.value})} placeholder="e.g. Give with food..."></textarea>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowMedModal(false)} className="flex-1 py-3 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
              <button onClick={handleSaveMed} className="flex-1 py-3 font-bold bg-indigo-600 text-white rounded-xl">Save Medication</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
