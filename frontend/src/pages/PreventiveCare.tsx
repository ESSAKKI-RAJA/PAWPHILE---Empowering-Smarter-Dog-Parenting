import { useState, useMemo } from 'react';
import {
  Syringe, Bug, Bell, FileText, Plus, X, AlertTriangle, CheckCircle2,
  ShieldAlert, Calendar, ChevronRight,
} from 'lucide-react';
import { usePawphileData } from '../context/PawphileDataContext';
import { daysUntil } from '../lib/dateUtils';
import { generateId } from '../lib/ids';
import type { VaccineRecord, DewormingRecord } from '../types/pawphile';

type Tab = 'vaccines' | 'deworming' | 'reminders' | 'records';

const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'vaccines',   label: 'Vaccines',       icon: Syringe },
  { id: 'deworming',  label: 'Deworming',      icon: Bug },
  { id: 'reminders',  label: 'Reminders',      icon: Bell },
  { id: 'records',    label: 'Health Records',  icon: FileText },
];

function StatusChip({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-400">Overdue</span>;
  if (daysLeft <= 14)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400">Due in {daysLeft}d</span>;
  if (daysLeft <= 30)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/15 text-yellow-400">Due in {daysLeft}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/15 text-teal-400">Up to date</span>;
}

export default function PreventiveCare() {
  const { selectedDog, vaccineRecords, dewormingRecords, addVaccineRecord, addDewormingRecord, ownerProfile } = usePawphileData();
  const [activeTab, setActiveTab] = useState<Tab>('vaccines');
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [showDewormForm, setShowDewormForm] = useState(false);
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

  if (!selectedDog) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto" style={{ color: 'var(--text-3)' }} />
          <p className="font-bold" style={{ color: 'var(--text-2)' }}>Please add a dog profile to track preventive care.</p>
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
    setShowVaccineForm(false);
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
    setShowDewormForm(false);
  };

  return (
    <div className="pw-page pb-28">
      {/* ── Header ─────────────────────────────── */}
      <div className="px-5 pt-10 pb-4" style={{ background: 'linear-gradient(180deg, rgba(20,184,166,0.08) 0%, transparent 100%)' }}>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Preventive Care</h1>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-2)' }}>
          Vaccines · Deworming · Reminders · Health Records
        </p>
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
          style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-glow)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-black" style={{ color: 'var(--teal)' }}>{selectedDog.name}</span>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────── */}
      <div className="px-4 mt-2">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-black transition-all"
              style={{
                background: activeTab === id ? 'var(--teal)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--text-2)',
              }}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">

        {/* ═══════════════════════════════════════
            VACCINES TAB
        ═══════════════════════════════════════ */}
        {activeTab === 'vaccines' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                {myVaccines.length} record{myVaccines.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowVaccineForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal-glow)' }}>
                {showVaccineForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showVaccineForm ? 'Cancel' : 'Add Vaccine'}
              </button>
            </div>

            {showVaccineForm && (
              <div className="pw-card p-4 space-y-3 animate-fadeIn">
                <p className="font-black text-sm" style={{ color: 'var(--text)' }}>Add Vaccine Record</p>
                <PwInput label="Vaccine Name *" value={vaccineForm.vaccineName}
                  onChange={v => setVaccineForm(f => ({ ...f, vaccineName: v }))} placeholder="e.g. Rabies, DHPPi" />
                <div className="grid grid-cols-2 gap-3">
                  <PwInput label="Date Given *" type="date" value={vaccineForm.dateGiven}
                    onChange={v => setVaccineForm(f => ({ ...f, dateGiven: v }))} />
                  <PwInput label="Next Due *" type="date" value={vaccineForm.nextDueDate}
                    onChange={v => setVaccineForm(f => ({ ...f, nextDueDate: v }))} />
                </div>
                <PwInput label="Vet Clinic (Optional)" value={vaccineForm.vetClinic}
                  onChange={v => setVaccineForm(f => ({ ...f, vetClinic: v }))} placeholder="e.g. PetCare Clinic" />
                <button onClick={handleSaveVaccine}
                  disabled={!vaccineForm.vaccineName || !vaccineForm.dateGiven || !vaccineForm.nextDueDate}
                  className="w-full py-3 rounded-xl font-black text-sm"
                  style={{ background: 'var(--teal)', color: '#fff', opacity: (!vaccineForm.vaccineName || !vaccineForm.dateGiven || !vaccineForm.nextDueDate) ? 0.5 : 1 }}>
                  Save Vaccine Record
                </button>
              </div>
            )}

            {myVaccines.length === 0 ? (
              <EmptyState icon={Syringe} title="No vaccines recorded" subtitle="Add your first vaccine record to track due dates." />
            ) : myVaccines.map(v => (
              <div key={v.id} className="pw-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black" style={{ color: 'var(--text)' }}>{v.vaccineName}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Given: {new Date(v.dateGiven).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <StatusChip daysLeft={daysUntil(v.nextDueDate)} />
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Next: {new Date(v.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}

            <DisclaimerBox text="Vaccination schedule is based on your logged records. Follow your vet's specific schedule — these reminders supplement, not replace, vet guidance." />
          </>
        )}

        {/* ═══════════════════════════════════════
            DEWORMING TAB
        ═══════════════════════════════════════ */}
        {activeTab === 'deworming' && (
          <>
            <div className="pw-card p-4"
              style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
              <p className="text-xs font-black" style={{ color: '#8b5cf6' }}>Why Deworming Matters</p>
              <p className="text-xs font-semibold mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Intestinal parasites are very common in India. Dogs should typically be dewormed every 3 months.
                Puppies and outdoor dogs need more frequent treatment. Always follow your vet's dosage instructions.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                {myDeworming.length} record{myDeworming.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => setShowDewormForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal-glow)' }}>
                {showDewormForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showDewormForm ? 'Cancel' : 'Add Record'}
              </button>
            </div>

            {showDewormForm && (
              <div className="pw-card p-4 space-y-3 animate-fadeIn">
                <p className="font-black text-sm" style={{ color: 'var(--text)' }}>Add Deworming Record</p>
                <PwInput label="Product Name (Optional)" value={dewormForm.productName}
                  onChange={v => setDewormForm(f => ({ ...f, productName: v }))} placeholder="e.g. Drontal Plus" />
                <div className="grid grid-cols-2 gap-3">
                  <PwInput label="Date Given *" type="date" value={dewormForm.dateGiven}
                    onChange={v => setDewormForm(f => ({ ...f, dateGiven: v }))} />
                  <PwInput label="Next Due *" type="date" value={dewormForm.nextDueDate}
                    onChange={v => setDewormForm(f => ({ ...f, nextDueDate: v }))} />
                </div>
                <PwInput label="Dog Weight (kg)" type="number" value={dewormForm.weightAtTreatment}
                  onChange={v => setDewormForm(f => ({ ...f, weightAtTreatment: v }))} placeholder="e.g. 13.5" />
                <PwInput label="Vet Notes (Optional)" value={dewormForm.vetNotes}
                  onChange={v => setDewormForm(f => ({ ...f, vetNotes: v }))} placeholder="Any additional notes..." />
                <button onClick={handleSaveDeworming}
                  disabled={!dewormForm.dateGiven || !dewormForm.nextDueDate}
                  className="w-full py-3 rounded-xl font-black text-sm"
                  style={{ background: 'var(--teal)', color: '#fff', opacity: (!dewormForm.dateGiven || !dewormForm.nextDueDate) ? 0.5 : 1 }}>
                  Save Record
                </button>
                <p className="text-[10px] italic text-center" style={{ color: 'var(--text-3)' }}>
                  Dosage must be confirmed with your vet based on your dog's current weight.
                </p>
              </div>
            )}

            {myDeworming.length === 0 ? (
              <EmptyState icon={Bug} title="No deworming recorded" subtitle="Track your dog's deworming history to stay on top of parasite prevention." />
            ) : myDeworming.map(d => (
              <div key={d.id} className="pw-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black" style={{ color: 'var(--text)' }}>{d.productName || 'Deworming Treatment'}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Given: {new Date(d.dateGiven).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {d.weightAtTreatment ? ` · ${d.weightAtTreatment} kg` : ''}
                    </p>
                  </div>
                  <StatusChip daysLeft={daysUntil(d.nextDueDate)} />
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  Next: {new Date(d.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                {d.vetNotes && (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--text-3)' }}>Notes: {d.vetNotes}</p>
                )}
              </div>
            ))}

            <DisclaimerBox text="Deworming products and frequency must be prescribed by your vet based on your dog's weight and health status." />
          </>
        )}

        {/* ═══════════════════════════════════════
            REMINDERS TAB
        ═══════════════════════════════════════ */}
        {activeTab === 'reminders' && (
          <>
            <UpcomingReminders vaccines={myVaccines} deworming={myDeworming} ownerProfile={ownerProfile} />
          </>
        )}

        {/* ═══════════════════════════════════════
            HEALTH RECORDS TAB
        ═══════════════════════════════════════ */}
        {activeTab === 'records' && (
          <>
            <div className="pw-card p-4 space-y-3">
              <p className="font-black text-sm" style={{ color: 'var(--text)' }}>Health Summary</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Vaccines" value={myVaccines.length} color="var(--teal)" />
                <StatCard label="Total Deworming" value={myDeworming.length} color="#8b5cf6" />
                <StatCard
                  label="Vaccines Due"
                  value={myVaccines.filter(v => daysUntil(v.nextDueDate) <= 30).length}
                  color={myVaccines.filter(v => daysUntil(v.nextDueDate) <= 0).length > 0 ? '#ef4444' : '#f59e0b'}
                />
                <StatCard
                  label="Deworm Due"
                  value={myDeworming.filter(d => daysUntil(d.nextDueDate) <= 30).length}
                  color={myDeworming.filter(d => daysUntil(d.nextDueDate) <= 0).length > 0 ? '#ef4444' : '#f59e0b'}
                />
              </div>
            </div>

            <div className="pw-card p-4">
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>
                Vaccine History
              </p>
              {myVaccines.length === 0 ? (
                <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>No vaccines recorded yet.</p>
              ) : myVaccines.slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{v.vaccineName}</p>
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>
                      {new Date(v.dateGiven).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </div>
              ))}
            </div>

            <DisclaimerBox text="These records are stored locally on your device. They are owner-reported summaries, not certified medical documents. Always keep originals with your vet." />
          </>
        )}

      </div>
    </div>
  );
}

// ── Upcoming Reminders ──────────────────────────────────────────────────────────
function UpcomingReminders({ vaccines, deworming, ownerProfile }: { vaccines: any[]; deworming: any[]; ownerProfile: any }) {
  const hasEmailReminders = ownerProfile?.notificationPreferences?.emailEnabled && 
    (ownerProfile?.notificationPreferences?.vaccines || ownerProfile?.notificationPreferences?.deworming);
  const upcoming = [
    ...vaccines.map(v => ({ type: 'Vaccine', name: v.vaccineName, date: v.nextDueDate, icon: Syringe, color: 'var(--teal)' })),
    ...deworming.map(d => ({ type: 'Deworming', name: d.productName || 'Deworming', date: d.nextDueDate, icon: Bug, color: '#8b5cf6' })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) {
    return <EmptyState icon={Bell} title="No upcoming reminders" subtitle="Add vaccine and deworming records to see reminders here." />;
  }

  const overdue = upcoming.filter(u => daysUntil(u.date) < 0);
  const soon = upcoming.filter(u => daysUntil(u.date) >= 0 && daysUntil(u.date) <= 30);
  const future = upcoming.filter(u => daysUntil(u.date) > 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pw-card p-3" style={{ background: 'rgba(20,184,166,0.05)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Email Reminders
          </p>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest">
          {hasEmailReminders ? 
            <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span> : 
            <span className="text-slate-400">Disabled</span>
          }
        </p>
      </div>
      {overdue.length > 0 && (
        <div className="pw-card p-4" style={{ borderColor: '#ef444440', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>Overdue</p>
          </div>
          {overdue.map((u, i) => <ReminderRow key={i} item={u} />)}
        </div>
      )}
      {soon.length > 0 && (
        <div className="pw-card p-4" style={{ borderColor: '#f59e0b40', background: 'rgba(245,158,11,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>Due Soon (30 days)</p>
          </div>
          {soon.map((u, i) => <ReminderRow key={i} item={u} />)}
        </div>
      )}
      {future.length > 0 && (
        <div className="pw-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#10b981' }}>Upcoming</p>
          </div>
          {future.map((u, i) => <ReminderRow key={i} item={u} />)}
        </div>
      )}
    </div>
  );
}

function ReminderRow({ item }: { item: any }) {
  const { icon: Icon, type, name, date, color } = item;
  const days = daysUntil(date);
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{name}</p>
          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>{type}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold" style={{ color: days < 0 ? '#ef4444' : days <= 30 ? '#f59e0b' : '#10b981' }}>
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `In ${days}d`}
        </p>
        <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>
          {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </p>
      </div>
    </div>
  );
}

// ── Reusable subcomponents ──────────────────────────────────────────────────────
function PwInput({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="pw-input text-sm" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ComponentType<any>; title: string; subtitle: string }) {
  return (
    <div className="pw-card p-10 flex flex-col items-center gap-3 text-center"
      style={{ border: '1px dashed var(--border-2)' }}>
      <Icon className="w-10 h-10" style={{ color: 'var(--text-3)' }} />
      <p className="font-black text-sm" style={{ color: 'var(--text-2)' }}>{title}</p>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
    </div>
  );
}

function DisclaimerBox({ text }: { text: string }) {
  return (
    <div className="px-1 py-2">
      <p className="text-[10px] text-center italic leading-relaxed" style={{ color: 'var(--text-3)' }}>{text}</p>
    </div>
  );
}
