import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { usePawphileData } from '../context/PawphileDataContext';
import { analyzeSymptoms } from '../engines/symptomEngine';
import { generateId } from '../lib/ids';
import type { SymptomLog, AuditLog } from '../types/pawphile';

/* ── Symptom categories (matches pic 2) ───────────────── */
const SYMPTOM_CATEGORIES = [
  {
    label: 'Digestive',
    color: '#14b8a6',
    symptoms: ['Vomiting', 'Diarrhoea', 'Loose stool', 'Not eating', 'Bloated belly', 'Blood in stool', 'Straining', 'Mucus in stool'],
  },
  {
    label: 'Skin / Coat',
    color: '#a78bfa',
    symptoms: ['Itching', 'Rash', 'Hair loss', 'Redness', 'Crusty patches', 'Wounds', 'Foul skin odor'],
  },
  {
    label: 'Eyes / Ears',
    color: '#38bdf8',
    symptoms: ['Red eyes', 'Eye discharge', 'Squinting', 'Head shaking', 'Ear scratching', 'Ear odor', 'Brown ear wax'],
  },
  {
    label: 'Respiratory',
    color: '#fb923c',
    symptoms: ['Coughing', 'Sneezing', 'Breathing difficulty', 'Nasal discharge'],
  },
  {
    label: 'Neurological',
    color: '#f43f5e',
    symptoms: ['Seizure', 'Collapse', 'Tremors', 'Disorientation'],
  },
  {
    label: 'Mobility',
    color: '#facc15',
    symptoms: ['Limping', 'Stiffness', 'Reluctance to move', 'Bunny hop gait'],
  },
  {
    label: 'General',
    color: '#94a3b8',
    symptoms: ['Fever', 'Lethargy', 'Excessive thirst', 'Frequent urination', 'Weight loss', 'Pale gums', 'Jaundice', 'Swollen belly'],
  },
];

const YES_NO_QUESTIONS = [
  { key: 'tickExposure', label: 'Tick exposure in last 14 days?' },
  { key: 'dietChange', label: 'Recent diet change (last 7 days)?' },
  { key: 'boarding', label: 'Recent boarding or grooming?' },
  { key: 'toxin', label: 'Any toxin or chemical exposure?' },
];

export default function DogHealthTriage() {
  const navigate = useNavigate();
  const { selectedDog, addSymptomLog, addTriageResult, addAuditLog } = usePawphileData();

  /* ── Form state ──────────────────────────────────────── */
  const [breed, setBreed] = useState(selectedDog?.breed || '');
  const [age, setAge] = useState(selectedDog?.age?.toString() || '');
  const [weight, setWeight] = useState(
    selectedDog?.weight ? `${selectedDog.weight} ${selectedDog.weightUnit || 'kg'}` : ''
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [foodType, setFoodType] = useState('');
  const [vaccStatus, setVaccStatus] = useState('');
  const [duration, setDuration] = useState('');
  const [booleans, setBooleans] = useState<Record<string, boolean | null>>({
    tickExposure: null, dietChange: null, boarding: null, toxin: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /* ── No dog guard ────────────────────────────────────── */
  if (!selectedDog) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen px-6">
        <div className="text-center">
          <p className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Please add a dog profile first.</p>
          <button onClick={() => navigate('/profile')} className="pw-btn-teal px-6 py-3">Go to Profile</button>
        </div>
      </div>
    );
  }

  const toggle = (s: string) =>
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    const ts = new Date().toISOString();
    const logId = generateId();

    // Map UI selections to SymptomLog fields
    const hasBreathing = selected.includes('Breathing difficulty');

    const finalLog: SymptomLog = {
      id: logId,
      dogId: selectedDog.id,
      createdAt: ts,
      updatedAt: ts,
      source: 'manual',
      syncStatus: 'local_only',
      mainConcern: selected.length > 0 ? selected[0] : 'General Check',
      onsetTime: ts,
      progression: 'stable',
      appetiteStatus: selected.includes('Not eating') ? 'refused' : 'unknown',
      waterIntake: selected.includes('Excessive thirst') ? 'excessive' : 'normal',
      energyLevel: selected.includes('Lethargy') ? 'lethargic' : selected.includes('Collapse') ? 'collapsed' : 'normal',
      breathingStatus: hasBreathing ? 'labored' : 'normal',
      gumColor: selected.includes('Pale gums') ? 'pale' : 'unknown',
      diarrheaBlood: selected.includes('Blood in stool'),
      vomitingBlood: false,
      toxinExposure: booleans.toxin === true,
      toxinDescription: details || undefined,
      tickFleasSeen: booleans.tickExposure === true,
      recentTravel: booleans.boarding === true,
    };

    setTimeout(() => {
      try {
        const result = analyzeSymptoms(finalLog, selectedDog);
        finalLog.triageResultId = result.id;

        const auditLog: AuditLog = {
          id: generateId(),
          dogId: selectedDog.id,
          createdAt: ts,
          module: 'triage',
          inputSnapshot: { log: finalLog, profile: selectedDog },
          outputSnapshot: result,
          ruleVersion: result.ruleVersion,
          confidence: result.confidenceScore,
          severityColor: result.severity,
          escalationTriggered: result.escalationTriggered,
          disclaimerShown: result.disclaimerShown,
        };

        addSymptomLog(finalLog);
        addTriageResult(result);
        addAuditLog(auditLog);
        navigate(`/emergency?id=${result.id}`);
      } catch (e) {
        console.error('Triage error:', e);
        setIsAnalyzing(false);
      }
    }, 800);
  };

  return (
    <div className="pw-page min-h-screen pb-16">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="font-black text-sm" style={{ color: 'var(--text)' }}>PAWAI Health Triage</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Title block ──────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest" style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal-glow)' }}>
            PAWAI · DOG HEALTH TRIAGE
          </div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Dog Health Assessment</h1>
          <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Early guidance for symptoms, severity, and next care steps.{' '}
            <span className="font-black" style={{ color: '#f59e0b' }}>Not a replacement for veterinary diagnosis.</span>
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal-glow)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Using profile <span className="font-black mx-1">{selectedDog.name.toUpperCase()}</span> · {selectedDog.breed}
          </div>
        </div>

        {/* ── Profile Fields ───────────────────────────── */}
        <div className="pw-card p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Dog Breed</label>
              <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Labrador" className="pw-input text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Age</label>
              <input value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 3 years" className="pw-input text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Weight</label>
              <input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 13.8 kg" className="pw-input text-sm" />
            </div>
          </div>
        </div>

        {/* ── Symptom Checklist ────────────────────────── */}
        <div className="pw-card p-5 space-y-5">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Symptom Checklist</p>

          {SYMPTOM_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <p className="text-xs font-black mb-2" style={{ color: cat.color }}>{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {cat.symptoms.map(s => (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    className={`pw-chip ${selected.includes(s) ? 'selected' : ''}`}
                    style={selected.includes(s) ? {
                      background: `${cat.color}18`,
                      borderColor: cat.color,
                      color: cat.color,
                    } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Additional Details ───────────────────────── */}
        <div className="pw-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>Additional Details</p>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Describe any other observations..."
            rows={3}
            className="pw-input resize-none"
          />
        </div>

        {/* ── Dropdowns ────────────────────────────────── */}
        <div className="pw-card p-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Food Type</label>
              <select value={foodType} onChange={e => setFoodType(e.target.value)} className="pw-input text-sm">
                <option value="">Select...</option>
                <option>Dry kibble</option>
                <option>Wet food</option>
                <option>Raw diet</option>
                <option>Home cooked</option>
                <option>Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Vaccination Status</label>
              <select value={vaccStatus} onChange={e => setVaccStatus(e.target.value)} className="pw-input text-sm">
                <option value="">Select...</option>
                <option>Up to date</option>
                <option>Overdue</option>
                <option>Unknown</option>
                <option>Not vaccinated</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Symptom Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} className="pw-input text-sm">
                <option value="">Select...</option>
                <option>{'< 12 hours'}</option>
                <option>12–24 hours</option>
                <option>1–3 days</option>
                <option>3–7 days</option>
                <option>{'> 7 days'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Yes/No Questions ─────────────────────────── */}
        <div className="pw-card p-5 space-y-3">
          {YES_NO_QUESTIONS.map(q => (
            <div key={q.key} className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{q.label}</span>
              <div className="flex gap-2 flex-shrink-0">
                {(['Yes', 'No'] as const).map(v => {
                  const val = v === 'Yes';
                  const isActive = booleans[q.key] === val;
                  return (
                    <button
                      key={v}
                      onClick={() => setBooleans(prev => ({ ...prev, [q.key]: val }))}
                      className="px-4 py-1.5 rounded-lg text-xs font-black transition-all"
                      style={{
                        background: isActive ? (val ? '#ef444430' : 'var(--teal-dim)') : 'var(--card-2)',
                        border: `1px solid ${isActive ? (val ? '#ef4444' : 'var(--teal)') : 'var(--border-2)'}`,
                        color: isActive ? (val ? '#ef4444' : 'var(--teal)') : 'var(--text-2)',
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Submit ───────────────────────────────────── */}
        <div className="space-y-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || selected.length === 0}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all"
            style={{
              background: isAnalyzing || selected.length === 0 ? 'var(--border-2)' : '#F97316',
              color: isAnalyzing || selected.length === 0 ? 'var(--text-2)' : '#fff',
              cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: isAnalyzing || selected.length === 0 ? 'none' : '0 4px 20px rgba(249, 115, 22, 0.4)'
            }}
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5" />
                Analyze Dog Health →
              </>
            )}
          </button>

          {selected.length === 0 && (
            <p className="text-center text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              Select at least one symptom to proceed.
            </p>
          )}

          <p className="text-[10px] text-center italic leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Results are algorithmic guidance only. This is not a veterinary diagnosis. Always consult a licensed veterinarian — especially in emergencies.
          </p>
        </div>
      </div>
    </div>
  );
}
