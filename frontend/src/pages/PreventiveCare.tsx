import React, { useState, useMemo } from 'react';
import {
  Syringe, Bug, Bell, FileText, Plus, X, AlertTriangle, CheckCircle2,
  ShieldAlert, Calendar, ChevronRight, Info, Activity, ArrowLeft
} from 'lucide-react';
import { usePawphileData } from '../context/PawphileDataContext';
import { usePersonalization } from '../context/PersonalizationContext';
import { BREEDS } from '../data/breeds';
import { daysUntil } from '../lib/dateUtils';
import { generateId } from '../lib/ids';
import type { VaccineRecord, DewormingRecord } from '../types/pawphile';
import { useNavigate } from 'react-router-dom';

type Tab = 'today' | 'upcoming' | 'records';

function StatusBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return <span className="px-2 py-0.5 rounded-sm text-11px font-bold bg-safety-red-light text-safety-red-border border border-safety-red-border/20 uppercase tracking-wide">Overdue</span>;
  if (daysLeft <= 14)
    return <span className="px-2 py-0.5 rounded-sm text-11px font-bold bg-safety-yellow-light text-safety-yellow-border border border-safety-yellow-border/20 uppercase tracking-wide">Due Soon</span>;
  if (daysLeft <= 30)
    return <span className="px-2 py-0.5 rounded-sm text-11px font-bold bg-safety-yellow-light text-safety-yellow-border border border-safety-yellow-border/20 uppercase tracking-wide">Due in {daysLeft}d</span>;
  return <span className="px-2 py-0.5 rounded-sm text-11px font-bold bg-safety-green-light text-safety-green-border border border-safety-green-border/20 uppercase tracking-wide">Up to date</span>;
}

export default function PreventiveCare() {
  const navigate = useNavigate();
  const { selectedDog, vaccineRecords, dewormingRecords, addVaccineRecord, addDewormingRecord, ownerProfile } = usePawphileData();
  const { breedIntel, breedName, ageCategory } = usePersonalization();
  
  const breedRecord = useMemo(() =>
    breedName ? BREEDS.find(b => b.name.toLowerCase() === breedName.toLowerCase()) ?? null : null,
    [breedName]
  );
  
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showForm, setShowForm] = useState<'vaccine' | 'deworming' | null>(null);
  const [vaccineForm, setVaccineForm] = useState({ vaccineName: '', dateGiven: '', nextDueDate: '', vetClinic: '', batchNumber: '' });
  const [dewormForm, setDewormForm] = useState({ productName: '', dateGiven: '', nextDueDate: '', weightAtTreatment: '', vetNotes: '' });

  const dogId = selectedDog?.id;

  const myVaccines = useMemo(() =>
    vaccineRecords.filter(v => v.dogId === dogId).sort((a, b) => b.dateGiven.localeCompare(a.dateGiven)),
    [vaccineRecords, dogId]
  );
  const myDeworming = useMemo(() =>
    dewormingRecords.filter(d => d.dogId === dogId).sort((a, b) => b.dateGiven.localeCompare(a.dateGiven)),
    [dewormingRecords, dogId]
  );

  const allReminders = useMemo(() => {
    return [
      ...myVaccines.map(v => ({ id: v.id, type: 'Vaccine', name: v.vaccineName, date: v.nextDueDate, icon: Syringe, color: 'text-primary', bg: 'bg-teal-50' })),
      ...myDeworming.map(d => ({ id: d.id, type: 'Deworming', name: d.productName || 'Deworming', date: d.nextDueDate, icon: Bug, color: 'text-lavender-600', bg: 'bg-lavender-100' })),
    ].sort((a, b) => a.date.localeCompare(b.date));
  }, [myVaccines, myDeworming]);

  if (!selectedDog) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto text-muted-400" />
          <p className="font-bold text-muted-600">Please select a dog to track preventive care.</p>
          <button onClick={() => navigate('/profile')} className="pw-btn-primary w-full max-w-xs mt-4">Go to Profile</button>
        </div>
      </div>
    );
  }

  const handleSaveVaccine = () => {
    if (!vaccineForm.dateGiven || !vaccineForm.nextDueDate || !vaccineForm.vaccineName) return;
    const now = new Date().toISOString();
    const record: VaccineRecord = {
      id: generateId(), dogId: selectedDog.id,
      createdAt: now, updatedAt: now, source: 'manual', syncStatus: 'local_only',
      vaccineName: vaccineForm.vaccineName,
      dateGiven: vaccineForm.dateGiven,
      nextDueDate: vaccineForm.nextDueDate,
      vetClinic: vaccineForm.vetClinic,
      batchNumber: vaccineForm.batchNumber,
    } as any;
    addVaccineRecord(record);
    setVaccineForm({ vaccineName: '', dateGiven: '', nextDueDate: '', vetClinic: '', batchNumber: '' });
    setShowForm(null);
  };

  const handleSaveDeworming = () => {
    if (!dewormForm.dateGiven || !dewormForm.nextDueDate) return;
    const now = new Date().toISOString();
    const record: DewormingRecord = {
      id: generateId(), dogId: selectedDog.id,
      createdAt: now, updatedAt: now, source: 'manual', syncStatus: 'local_only',
      productName: dewormForm.productName || 'General Dewormer',
      dateGiven: dewormForm.dateGiven,
      nextDueDate: dewormForm.nextDueDate,
      weightAtTreatment: dewormForm.weightAtTreatment ? parseFloat(dewormForm.weightAtTreatment) : undefined,
      vetNotes: dewormForm.vetNotes,
      reminderEnabled: true,
    } as any;
    addDewormingRecord(record);
    setDewormForm({ productName: '', dateGiven: '', nextDueDate: '', weightAtTreatment: '', vetNotes: '' });
    setShowForm(null);
  };

  const todayReminders = allReminders.filter(r => daysUntil(r.date) <= 14);
  const upcomingReminders = allReminders.filter(r => daysUntil(r.date) > 14);

  return (
    <div className="pw-page pb-28">
      {/* Header */}
      <div className="bg-ivory-50 border-b border-line-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-line-200/50 transition">
              <ArrowLeft className="w-5 h-5 text-ink-950" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <h1 className="text-16px font-bold text-ink-950 leading-none">Preventive Care</h1>
              </div>
              <p className="text-12px text-muted-600 mt-1">
                For {selectedDog.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-2xl mx-auto space-y-6">

        {/* Notes Alert */}
        {(breedRecord?.vaccinationNotes || breedIntel?.reminderNote) && (
          <div className="bg-safety-blue-light border border-safety-blue-border/20 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-safety-blue-border shrink-0 mt-0.5" />
            <div>
              <h4 className="text-13px font-bold text-safety-blue-border mb-1">{breedName} Guidelines</h4>
              <p className="text-13px text-ink-800 leading-relaxed">
                {breedRecord?.vaccinationNotes || breedIntel?.reminderNote}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-white border border-line-200 p-1 rounded-xl">
          {(['today', 'upcoming', 'records'] as Tab[]).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-13px font-bold rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-teal-50 text-primary' : 'text-muted-600 hover:text-ink-950'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in min-h-[400px]">
          
          {activeTab === 'today' && (
            <div className="space-y-4">
              <h2 className="text-16px font-bold text-ink-950 mb-2">Needs Attention</h2>
              {todayReminders.length === 0 ? (
                <div className="pw-card p-8 text-center bg-ivory-50 border-dashed">
                  <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                  <p className="text-15px font-bold text-ink-950">All caught up!</p>
                  <p className="text-14px text-muted-600 mt-1">No vaccines or deworming due soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayReminders.map(r => (
                    <ReminderRow key={r.id} item={r} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              <h2 className="text-16px font-bold text-ink-950 mb-2">Upcoming Schedule</h2>
              {upcomingReminders.length === 0 ? (
                <div className="pw-card p-8 text-center bg-ivory-50 border-dashed">
                  <Calendar className="w-10 h-10 text-muted-400 mx-auto mb-3 opacity-50" />
                  <p className="text-14px text-muted-600 mt-1">No upcoming records found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingReminders.map(r => (
                    <ReminderRow key={r.id} item={r} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-6">
              
              <div className="flex gap-3">
                <button onClick={() => setShowForm('vaccine')} className="flex-1 pw-btn-secondary !text-13px !min-h-[40px]">
                  <Plus className="w-4 h-4 mr-1" /> Add Vaccine
                </button>
                <button onClick={() => setShowForm('deworming')} className="flex-1 pw-btn-secondary !text-13px !min-h-[40px]">
                  <Plus className="w-4 h-4 mr-1" /> Add Deworming
                </button>
              </div>

              {showForm === 'vaccine' && (
                <div className="pw-card p-5 space-y-4 animate-slide-up">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ink-950">Add Vaccine Record</h3>
                    <button onClick={() => setShowForm(null)}><X className="w-5 h-5 text-muted-400" /></button>
                  </div>
                  <PwInput label="Vaccine Name *" value={vaccineForm.vaccineName} onChange={v => setVaccineForm(f => ({ ...f, vaccineName: v }))} placeholder="e.g. Rabies" />
                  <div className="grid grid-cols-2 gap-3">
                    <PwInput label="Date Given *" type="date" value={vaccineForm.dateGiven} onChange={v => setVaccineForm(f => ({ ...f, dateGiven: v }))} />
                    <PwInput label="Next Due *" type="date" value={vaccineForm.nextDueDate} onChange={v => setVaccineForm(f => ({ ...f, nextDueDate: v }))} />
                  </div>
                  <button onClick={handleSaveVaccine} disabled={!vaccineForm.vaccineName || !vaccineForm.dateGiven || !vaccineForm.nextDueDate} className="w-full pw-btn-primary mt-2">
                    Save Record
                  </button>
                </div>
              )}

              {showForm === 'deworming' && (
                <div className="pw-card p-5 space-y-4 animate-slide-up">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-ink-950">Add Deworming Record</h3>
                    <button onClick={() => setShowForm(null)}><X className="w-5 h-5 text-muted-400" /></button>
                  </div>
                  <PwInput label="Product Name" value={dewormForm.productName} onChange={v => setDewormForm(f => ({ ...f, productName: v }))} placeholder="e.g. Drontal Plus" />
                  <div className="grid grid-cols-2 gap-3">
                    <PwInput label="Date Given *" type="date" value={dewormForm.dateGiven} onChange={v => setDewormForm(f => ({ ...f, dateGiven: v }))} />
                    <PwInput label="Next Due *" type="date" value={dewormForm.nextDueDate} onChange={v => setDewormForm(f => ({ ...f, nextDueDate: v }))} />
                  </div>
                  <PwInput label="Dog Weight (kg)" type="number" value={dewormForm.weightAtTreatment} onChange={v => setDewormForm(f => ({ ...f, weightAtTreatment: v }))} placeholder="e.g. 13.5" />
                  <button onClick={handleSaveDeworming} disabled={!dewormForm.dateGiven || !dewormForm.nextDueDate} className="w-full pw-btn-primary mt-2">
                    Save Record
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-15px text-ink-950">History Log</h3>
                
                {allReminders.length === 0 && !showForm ? (
                  <p className="text-14px text-muted-600 text-center py-4">No records found.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Reverse sort for history view */}
                    {[...myVaccines.map(v => ({...v, type: 'Vaccine'})), ...myDeworming.map(d => ({...d, type: 'Deworming'}))]
                      .sort((a, b) => b.dateGiven.localeCompare(a.dateGiven))
                      .map((item, idx) => (
                        <div key={idx} className="pw-card p-4 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-ink-950 text-14px">{(item as any).vaccineName || (item as any).productName || 'Treatment'}</p>
                            <p className="text-12px text-muted-600 mt-0.5">{item.type} · Given {new Date(item.dateGiven).toLocaleDateString()}</p>
                          </div>
                          <StatusBadge daysLeft={daysUntil(item.nextDueDate)} />
                        </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────────────

function ReminderRow({ item }: { item: any }) {
  const { icon: Icon, type, name, date, color, bg } = item;
  const days = daysUntil(date);
  const isOverdue = days < 0;
  
  return (
    <div className={`pw-card p-4 flex items-center justify-between border-l-4 ${isOverdue ? 'border-l-safety-red-primary' : days <= 14 ? 'border-l-safety-yellow-primary' : 'border-l-primary'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-15px font-bold text-ink-950 leading-tight">{name}</p>
          <p className="text-13px text-muted-600">{type}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-13px font-bold ${isOverdue ? 'text-safety-red-primary' : days <= 14 ? 'text-safety-yellow-primary' : 'text-primary'}`}>
          {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due Today' : `In ${days}d`}
        </p>
        <p className="text-11px font-medium text-muted-400 mt-0.5">
          {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function PwInput({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-11px font-bold uppercase tracking-wider text-muted-600 mb-1.5 ml-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="pw-input text-14px" />
    </div>
  );
}
