import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Image as ImageIcon, Shield, X, Save, Stethoscope, Phone } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PawphileLoader from '../components/ui/PawphileLoader';
import { usePawphileData } from '../context/PawphileDataContext';
import { calculateVisionSignal, VisionScreeningResult } from '../features/vision/visionScreeningEngine';
import { useToast } from '../context/ToastContext';
import { createEmergencyEvent } from '../services/emergencyEventsService';
import { VISION_BODY_AREAS, getBodyArea, type VisionBodyAreaId } from '../features/vision/visionBodyAreas';

const MVP_PRIMARY_AREAS: VisionBodyAreaId[] = ['skin_coat', 'eyes', 'ears', 'paws_nails', 'injury_wound'];
const DURATION_OPTIONS = ['today', '1–2 days', '3–7 days', 'more than 1 week', 'recurring'];
const SEVERITY_SELF = ['mild', 'moderate', 'severe', 'worsening'];

export default function VisionScan() {
  const navigate = useNavigate();
  const { selectedDog } = usePawphileData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [areaId, setAreaId] = useState<VisionBodyAreaId>('skin_coat');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [concernType, setConcernType] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('');
  const [checkedFlags, setCheckedFlags] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const area = getBodyArea(areaId);
  const hasUrgentFlag = [...checkedFlags].some(id => area.redFlags.find(f => f.id === id)?.urgency === 'urgent');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) { setError('Use JPG, PNG, or WEBP.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File over 10 MB. Please use a smaller image.'); return; }
    setError(null);
    const url = URL.createObjectURL(file);
    setImage(url);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!concernType || !duration || !severity) {
      setError('Please select concern type, duration, and severity.');
      return;
    }
    setLoading(true);
    setError(null);
    
    // Simulate slight delay for processing perception
    setTimeout(() => {
      const redFlagLabels = [...checkedFlags].map(id => area.redFlags.find(f => f.id === id)?.label).filter(Boolean) as string[];
      const res = calculateVisionSignal({
        areaId,
        concernType,
        duration,
        severity,
        redFlags: redFlagLabels,
        notes,
        hasImage: !!image
      });
      setResult(res);
      setLoading(false);
    }, 1500);
  };

  const handleSaveScan = () => {
    if (!result) return;
    try {
      const existing = JSON.parse(localStorage.getItem('pawphile_vision_scans') || '[]');
      existing.unshift({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        dogId: selectedDog?.id,
        areaId,
        concernType,
        severity,
        result: result,
      });
      localStorage.setItem('pawphile_vision_scans', JSON.stringify(existing));
      showToast({ type: 'success', message: 'Scan saved successfully' });
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Failed to save scan' });
    }
  };

  const handleMarkEmergency = async () => {
    if (!result || !selectedDog) return;
    try {
      await createEmergencyEvent({
        dog_id: selectedDog.id,
        user_id: 'local',
        emergency_type: 'Vision Scan Request',
        severity: result.signalColor === 'red' ? 'red_emergency' : result.signalColor === 'yellow' ? 'orange_urgent' : 'green_monitor',
        confidence_score: result.confidence === 'High' ? 90 : result.confidence === 'Medium' ? 60 : 30,
        symptoms: [area.shortLabel, concernType, ...[...checkedFlags].map(id => area.redFlags.find(f => f.id === id)?.label).filter(Boolean) as string[]],
        owner_notes: notes,
        recommended_action: result.signalTitle,
      });
      showToast({ type: 'success', message: 'Marked as Emergency' });
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Failed to mark emergency' });
    }
  };

  const toggleFlag = (id: string) => {
    setCheckedFlags(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  if (loading) return <PawphileLoader message="Analyzing inputs..." fullScreen />;

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <div className="px-4 pt-10 pb-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <h1 className="text-xl font-black">Vision Health Scan</h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Screening-style signal only • Not a diagnosis • Consult a vet for any concern.</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'var(--bg)', border: '1px solid var(--border-2)' }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--teal)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            <strong>Safety First:</strong> PAWPHILE Vision is awareness and preventive decision-support only. It is not a replacement for a licensed veterinarian.
          </p>
        </div>

        {/* ── STEP 1: Image Upload ──────────────────────────────── */}
        <div className="pw-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Step 1 · Upload Photo</p>
          </div>
          <div className="border-2 border-dashed rounded-2xl p-2 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: image ? 'var(--teal)' : 'var(--border-2)' }}
            onClick={() => !image && fileInputRef.current?.click()}>
            {image ? (
              <div className="relative aspect-video rounded-xl overflow-hidden group">
                <img src={image} alt="Upload preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold bg-black/50 px-3 py-1.5 rounded-full text-sm">Change Image</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                  className="absolute top-3 right-3 bg-white/20 hover:bg-red-500 text-white backdrop-blur-sm p-2 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-teal-50 dark:bg-teal-900/30 shadow-inner">
                  <ImageIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-black text-base text-teal-700 dark:text-teal-300">Upload Image</p>
                  <p className="text-xs font-semibold mt-1 text-slate-500 dark:text-slate-400">Clear lighting, focus on the affected area</p>
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>

        {/* ── STEP 2: Select Body Area ──────────────────────────────── */}
        <div className="pw-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-2)' }}>Step 2 · Select Body Area</p>
          <div className="grid grid-cols-5 gap-2">
            {VISION_BODY_AREAS.filter(a => MVP_PRIMARY_AREAS.includes(a.id)).map(a => (
              <button key={a.id} onClick={() => { setAreaId(a.id); setCheckedFlags(new Set()); setConcernType(''); setResult(null); }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all"
                style={{
                  background: areaId === a.id ? 'var(--teal)' : 'var(--card-2)',
                  border: areaId === a.id ? '2px solid var(--teal)' : '1px solid var(--border)',
                  color: areaId === a.id ? '#fff' : 'var(--text-2)',
                }}>
                <span className="text-xl mb-1">{a.emoji}</span>
                <span className="text-[10px] font-bold leading-tight">{a.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── STEP 3: Concern Details ─────────────────────────── */}
        <div className="pw-card p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Step 3 · Describe Concern</p>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Concern Type</label>
            <select value={concernType} onChange={e => setConcernType(e.target.value)} className="pw-input text-sm">
              <option value="">Select concern type...</option>
              {area.commonConcernTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Duration</label>
              <select value={duration} onChange={e => setDuration(e.target.value)} className="pw-input text-sm">
                <option value="">Select duration...</option>
                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="pw-input text-sm">
                <option value="">Select severity...</option>
                {SEVERITY_SELF.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {area.redFlags.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>Red Flag Checklist</p>
              <div className="space-y-2">
                {area.redFlags.map(flag => (
                  <label key={flag.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl"
                    style={{ background: checkedFlags.has(flag.id) ? 'rgba(239,68,68,0.08)' : 'var(--card-2)', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={checkedFlags.has(flag.id)} onChange={() => toggleFlag(flag.id)}
                      className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#ef4444' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{flag.label}</span>
                    {flag.urgency === 'urgent' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>URGENT</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Owner Notes (Optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="pw-input text-sm h-20" placeholder="Add any extra context..." />
          </div>

          {hasUrgentFlag && (
            <div className="rounded-xl p-4 animate-fadeIn" style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.4)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
                <p className="font-black text-sm" style={{ color: '#ef4444' }}>⚠️ Urgent Veterinary Attention Needed</p>
              </div>
              <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>
                One or more urgent red flags are checked. Do not delay — contact your vet or emergency animal clinic now.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <button onClick={handleAnalyze} disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-white transition-all hover:bg-teal-700 active:scale-[0.98] bg-teal-600 shadow-md flex items-center justify-center gap-2">
          {loading ? <span className="animate-pulse">Analyzing...</span> : 'Analyze Screening'}
        </button>

        {/* ── STEP 4: Result ─────────────────────────────────────────────── */}
        {result && (
          <div className="pw-card overflow-hidden animate-fadeIn border-2" 
               style={{ borderColor: result.signalColor === 'red' ? '#ef4444' : result.signalColor === 'yellow' ? '#f59e0b' : '#10b981' }}>
            
            <div className="p-5" style={{ background: result.signalColor === 'red' ? 'rgba(239,68,68,0.1)' : result.signalColor === 'yellow' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)' }}>
              <div className="flex items-center gap-3">
                {result.signalColor === 'red' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : result.signalColor === 'yellow' ? <AlertTriangle className="w-8 h-8 text-amber-500" /> : <CheckCircle className="w-8 h-8 text-emerald-500" />}
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>{result.signalTitle}</h2>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
                      Confidence: {result.confidence}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
                      {area.shortLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Primary Reasons</p>
                <ul className="space-y-1">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Next Actions</p>
                <ul className="space-y-2">
                  {result.nextActions.map((na, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      <CheckCircle className="w-4 h-4 mt-0.5" style={{ color: 'var(--teal)' }} /> {na}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-2)', background: 'var(--card-2)' }}>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium italic">
                  {result.safetyMessage}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={handleSaveScan} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Save className="w-4 h-4" /> Save Scan
                </button>
                <button onClick={handleMarkEmergency} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:opacity-80">
                  <AlertTriangle className="w-4 h-4" /> Emergency
                </button>
                <button onClick={() => navigate('/vet-locator')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 hover:opacity-80">
                  <Stethoscope className="w-4 h-4" /> Find Vet
                </button>
                <button onClick={() => navigate('/paw-ai')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 hover:opacity-80">
                  <Phone className="w-4 h-4" /> Ask PAW AI
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`
        .pw-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          outline: none;
        }
        .pw-input:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 2px rgba(13,148,136,0.15);
        }
      `}</style>
    </PageWrapper>
  );
}
