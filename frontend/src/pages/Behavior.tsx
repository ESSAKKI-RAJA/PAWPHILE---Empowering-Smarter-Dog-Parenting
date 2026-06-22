import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertCircle, CheckCircle2, ShieldAlert, Plus, X,
  TrendingUp, TrendingDown, Minus, Smile, Zap, Apple, Activity, Wind,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePawphileData } from '../context/PawphileDataContext';
import { analyzeBehavior } from '../engines/behaviorEngine';
import { generateId } from '../lib/ids';
import type { BehaviorLog } from '../types/pawphile';

const INDICATOR_CONFIG = [
  { key: 'moodScore',    label: 'Mood',     icon: Smile,    low: 'Sad', high: 'Happy',    color: '#14b8a6' },
  { key: 'playfulness',  label: 'Playful',  icon: Activity, low: 'None', high: 'Very Active', color: '#8b5cf6' },
  { key: 'appetiteScore',label: 'Appetite', icon: Apple,    low: 'Refused', high: 'Ravenous', color: '#f97316' },
  { key: 'lethargyLevel',label: 'Energy',   icon: Zap,      low: 'Exhausted', high: 'Full Energy', color: '#f59e0b', invert: true },
];

const FORM_DEFAULT = {
  sleepHours: 12,
  appetiteScore: 3 as 1|2|3|4|5,
  barkingScore: 2 as 1|2|3|4|5,
  scratchingScore: 1 as 1|2|3|4|5,
  moodScore: 3 as 1|2|3|4|5,
  playfulness: 3 as 1|2|3|4|5,
  lethargyLevel: 2 as 1|2|3|4|5,
  vomitingCount: 0,
  bathroomChanges: false,
};

function getLifeStage(age?: number): string {
  if (!age) return 'Adult';
  if (age < 1) return 'Puppy';
  if (age >= 8) return 'Senior';
  return 'Adult';
}

export default function Behavior() {
  const navigate = useNavigate();
  const { behaviorLogs = [], addBehaviorLog, selectedDog } = usePawphileData() as any;
  const [showLogForm, setShowLogForm] = useState(false);
  const [form, setForm] = useState<typeof FORM_DEFAULT>({ ...FORM_DEFAULT });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter logs for selected dog
  const logs: BehaviorLog[] = useMemo(() => {
    if (!selectedDog) return (behaviorLogs || []);
    return (behaviorLogs || []).filter((l: any) => !l.dogId || l.dogId === selectedDog.id);
  }, [behaviorLogs, selectedDog]);

  const { result, trendData, hasLoggedToday, latestLog } = useMemo(() => {
    const res = analyzeBehavior(logs);
    const today = new Date().toISOString().split('T')[0];
    const loggedToday = logs.some((l: any) => {
      const d = l.date || l.createdAt || '';
      return d.startsWith(today);
    });

    const trend: { name: string; mood: number | null; energy: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLog = logs.find((l: any) => {
        const ld = l.date || l.createdAt || '';
        return ld.startsWith(dateStr);
      }) as any;
      trend.push({
        name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        mood: dayLog ? (dayLog.moodScore || 3) * 20 : null,
        energy: dayLog ? ((6 - (dayLog.lethargyLevel || 3)) * 20) : null,
      });
    }

    const sorted = [...logs].sort((a: any, b: any) => {
      const da = a.date || a.createdAt || '';
      const db = b.date || b.createdAt || '';
      return db.localeCompare(da);
    });

    return { result: res, trendData: trend, hasLoggedToday: loggedToday, latestLog: sorted[0] as any };
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const newLog: BehaviorLog = {
      id: generateId(),
      date: now,
      ...(selectedDog ? { dogId: selectedDog.id } : {}),
      sleepHours: form.sleepHours,
      appetiteScore: form.appetiteScore,
      barkingScore: form.barkingScore,
      scratchingScore: form.scratchingScore,
      moodScore: form.moodScore,
      playfulness: form.playfulness,
      lethargyLevel: form.lethargyLevel,
      vomitingCount: form.vomitingCount,
      bathroomChanges: form.bathroomChanges,
    } as any;
    addBehaviorLog(newLog);
    setForm({ ...FORM_DEFAULT });
    setShowLogForm(false);
    setIsSubmitting(false);
  };

  const ringColor = result.behaviorScore > 75 ? '#10b981' : result.behaviorScore > 50 ? '#f59e0b' : '#ef4444';
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.behaviorScore / 100) * circumference;

  const lifeStage = selectedDog ? getLifeStage(selectedDog.age || (selectedDog as any).ageYears) : 'Adult';

  return (
    <div className="pw-page pb-28">
      {/* ── Header ───────────────────────────────── */}
      <div
        className="px-5 pt-10 pb-5"
        style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Brain className="w-5 h-5" style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Behavior Tracker</h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
              Behavioral guidance · Not a veterinary diagnosis
            </p>
          </div>
        </div>

        {/* Dog Context */}
        {selectedDog && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-glow)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-black" style={{ color: 'var(--teal)' }}>
              {selectedDog.name} · {selectedDog.breed} · {lifeStage}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4 max-w-lg mx-auto">

        {/* ── Vet Warning ──────────────────────── */}
        {result.vetSuggested && (
          <div className="pw-card p-4 flex items-start gap-3 animate-fadeIn"
            style={{ borderColor: '#ef444430', background: 'rgba(239,68,68,0.06)' }}>
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="font-black text-sm" style={{ color: '#ef4444' }}>Vet Visit Recommended</p>
              <p className="text-xs font-semibold mt-0.5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Multiple behavioral concerns detected. This is behavioral guidance, not a diagnosis. Consult your vet.
              </p>
              <button
                onClick={() => navigate('/vet-locator')}
                className="mt-2 text-xs font-black px-3 py-1.5 rounded-lg"
                style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}
              >
                Find Nearby Vet
              </button>
            </div>
          </div>
        )}

        {/* ── Score + Indicators ───────────────── */}
        <div className="pw-card p-5">
          <div className="flex items-center justify-between mb-4">
            {/* Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="transform -rotate-90 w-full h-full">
                <circle cx="48" cy="48" r={radius} strokeWidth="8" fill="transparent"
                  style={{ stroke: 'var(--border-2)' }} />
                <circle cx="48" cy="48" r={radius} stroke={ringColor} strokeWidth="8" fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black" style={{ color: 'var(--text)' }}>{result.behaviorScore}</span>
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Score</span>
              </div>
            </div>

            {/* Indicators grid */}
            <div className="grid grid-cols-2 gap-2 flex-1 ml-4">
              {INDICATOR_CONFIG.map(({ key, label, icon: Icon, color }) => {
                const val = latestLog ? (latestLog as any)[key] || 3 : 3;
                const pct = ((val - 1) / 4) * 100;
                return (
                  <div key={key} className="rounded-xl p-2.5" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3" style={{ color }} />
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{label}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border-2)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-bold mt-1 block" style={{ color: 'var(--text-3)' }}>{val}/5</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend badge */}
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {result.trend === 'improving' ? (
              <><TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} /><span className="text-xs font-black" style={{ color: '#10b981' }}>Trend: Improving</span></>
            ) : result.trend === 'declining' ? (
              <><TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} /><span className="text-xs font-black" style={{ color: '#ef4444' }}>Trend: Declining</span></>
            ) : (
              <><Minus className="w-4 h-4" style={{ color: 'var(--text-3)' }} /><span className="text-xs font-black" style={{ color: 'var(--text-3)' }}>Trend: Stable</span></>
            )}
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--card-2)', color: 'var(--text-3)' }}>
              Stress: {result.stressScore}%
            </span>
          </div>
        </div>

        {/* ── Check-In Button ──────────────────── */}
        {!showLogForm && (
          hasLoggedToday ? (
            <div className="pw-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />
                <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Today's check-in logged</span>
              </div>
              <button
                onClick={() => setShowLogForm(true)}
                className="text-xs font-black px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }}
              >
                Add Another
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogForm(true)}
              className="pw-card w-full py-4 flex items-center justify-center gap-2 font-black text-sm"
              style={{ background: 'var(--teal-dim)', borderColor: 'var(--teal-glow)', color: 'var(--teal)' }}
            >
              <Plus className="w-5 h-5" />
              Daily Behavior Check-In
            </button>
          )
        )}

        {/* ── Log Form ─────────────────────────── */}
        {showLogForm && (
          <form onSubmit={handleSubmit} className="pw-card p-5 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <p className="font-black" style={{ color: 'var(--text)' }}>Today's Check-In</p>
              <button type="button" onClick={() => { setShowLogForm(false); setForm({ ...FORM_DEFAULT }); }}>
                <X className="w-5 h-5" style={{ color: 'var(--text-3)' }} />
              </button>
            </div>

            <SliderField label="Mood (1=Sad · 5=Happy)" value={form.moodScore} min={1} max={5}
              onChange={v => setForm(f => ({ ...f, moodScore: v as any }))} color="#14b8a6" />
            <SliderField label="Playfulness (1=None · 5=Very Active)" value={form.playfulness} min={1} max={5}
              onChange={v => setForm(f => ({ ...f, playfulness: v as any }))} color="#8b5cf6" />
            <SliderField label="Appetite (1=Refused · 5=Ravenous)" value={form.appetiteScore} min={1} max={5}
              onChange={v => setForm(f => ({ ...f, appetiteScore: v as any }))} color="#f97316" />
            <SliderField label="Lethargy (1=Full Energy · 5=Exhausted)" value={form.lethargyLevel} min={1} max={5}
              onChange={v => setForm(f => ({ ...f, lethargyLevel: v as any }))} color="#f59e0b" />
            <SliderField label="Barking (1=Quiet · 5=Non-stop)" value={form.barkingScore} min={1} max={5}
              onChange={v => setForm(f => ({ ...f, barkingScore: v as any }))} color="#38bdf8" />
            <SliderField label="Sleep Hours" value={form.sleepHours} min={0} max={24}
              onChange={v => setForm(f => ({ ...f, sleepHours: v }))} color="#a78bfa" suffix="h" />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-xl cursor-pointer"
                style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.vomitingCount > 0}
                  onChange={e => setForm(f => ({ ...f, vomitingCount: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 accent-red-500" />
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Vomiting today</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl cursor-pointer"
                style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.bathroomChanges}
                  onChange={e => setForm(f => ({ ...f, bathroomChanges: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500" />
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Abnormal stool</span>
              </label>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-black text-sm"
              style={{ background: 'var(--teal)', color: '#fff', opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Saving...' : 'Save Log'}
            </button>

            <p className="text-[10px] text-center italic" style={{ color: 'var(--text-3)' }}>
              Behavioral logging is for tracking patterns only. Not a substitute for veterinary care.
            </p>
          </form>
        )}

        {/* ── Anomalies ────────────────────────── */}
        {result.anomalies.length > 0 && (
          <div className="pw-card p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--amber)' }}>
              Behavior Signals
            </p>
            {result.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--amber)' }} />
                <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>{a}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── AI Insights ──────────────────────── */}
        {result.interventions.length > 0 && (
          <div className="pw-card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
                Behavior Insights
              </p>
            </div>
            {result.interventions.map((item, i) => (
              <p key={i} className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>
                • {item}
              </p>
            ))}
            {selectedDog?.breed && (
              <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--teal)' }}>
                  Breed Context
                </p>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                  Monitoring behavior is especially important for {selectedDog.breed}s.
                  Behavioral changes can be early indicators of breed-specific health concerns.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 7-Day Chart ──────────────────────── */}
        <div className="pw-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-2)' }}>
            7-Day Trend
          </p>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Wind className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>No logs yet — start your first check-in</p>
            </div>
          ) : (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: 'var(--text-3)', fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: 'var(--text-3)' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--card)', color: 'var(--text)', fontSize: 11
                    }}
                    formatter={(v: any, name: any) => [`${v}%`, name]}
                  />
                  <Line type="monotone" dataKey="mood" name="Mood" stroke="#14b8a6" strokeWidth={2.5}
                    dot={{ fill: '#14b8a6', r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="energy" name="Energy" stroke="#f59e0b" strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Recent Logs ──────────────────────── */}
        {logs.length > 0 && (
          <div className="pw-card p-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>
              Recent Logs
            </p>
            <div className="space-y-2">
              {[...logs].sort((a: any, b: any) => {
                const da = a.date || a.createdAt || '';
                const db = b.date || b.createdAt || '';
                return db.localeCompare(da);
              }).slice(0, 5).map((log: any, i) => (
                <div key={log.id || i} className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                      {new Date(log.date || log.createdAt || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>
                      Mood {log.moodScore}/5 · Appetite {log.appetiteScore}/5
                      {log.vomitingCount ? ' · 🤢 Vomiting' : ''}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
                    style={{
                      background: (log.moodScore || 3) >= 4 ? 'rgba(16,185,129,0.15)' : (log.moodScore || 3) >= 2 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: (log.moodScore || 3) >= 4 ? '#10b981' : (log.moodScore || 3) >= 2 ? '#f59e0b' : '#ef4444',
                    }}>
                    {log.moodScore || 3}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Safety Disclaimer ────────────────── */}
        <div className="px-1 py-2">
          <p className="text-[10px] text-center italic leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Behavioral patterns are logged for tracking purposes only. Unusual behavioral changes can
            sometimes signal underlying health conditions. PAWPHILE is not a diagnostic tool.
            Always consult a licensed veterinarian for medical concerns.
          </p>
        </div>

      </div>
    </div>
  );
}

function SliderField({
  label, value, min, max, onChange, color = '#14b8a6', suffix = '',
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; color?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>{label}</label>
        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: color, background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--border-2) ${((value - min) / (max - min)) * 100}%, var(--border-2) 100%)` }}
      />
    </div>
  );
}
