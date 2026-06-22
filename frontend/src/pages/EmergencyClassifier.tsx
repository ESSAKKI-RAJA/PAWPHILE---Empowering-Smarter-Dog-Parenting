import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert, MapPin, FileText, CheckCircle, AlertTriangle, ArrowLeft,
  Save, X, AlertCircle, Loader2, ChevronRight,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import {
  createEmergencyEvent,
  mapTriageSeverityToEmergency,
  isTriageAlreadySaved,
  type EmergencyEvent,
} from '../services/emergencyEventsService';

export default function EmergencyClassifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const { triageResults, selectedDog } = usePawphileData();

  const queryParams = new URLSearchParams(location.search);
  const resultId = queryParams.get('id');

  const result = useMemo(() =>
    triageResults.find(t => t.id === resultId) || null,
    [triageResults, resultId]
  );

  // ── Emergency Modal State ─────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [ownerNotes, setOwnerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [savedEvent, setSavedEvent] = useState<EmergencyEvent | null>(null);

  const alreadySaved = result && selectedDog
    ? isTriageAlreadySaved(result.id, selectedDog.id)
    : false;

  if (!result) {
    return (
      <PageWrapper className="bg-slate-50 flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-slate-500 font-bold">Triage result not found.</p>
          <button onClick={() => navigate('/dashboard')}
            className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold">
            Go to Dashboard
          </button>
        </div>
      </PageWrapper>
    );
  }

  const isRed = result.severity === 'red';
  const isYellow = result.severity === 'yellow';

  const buttonLabel = isRed ? 'Save Emergency Record' : 'Mark as Emergency Anyway';

  const handleSaveEmergency = async () => {
    if (!selectedDog) return;
    setSaving(true);
    try {
      const event = await createEmergencyEvent({
        dog_id: selectedDog.id,
        user_id: (selectedDog as any).userId || 'local_user',
        triage_id: result.id,
        triage_result_id: result.id,
        emergency_type: result.reasons?.[0] || 'Triage Result',
        severity: mapTriageSeverityToEmergency(result.severity),
        confidence_score: result.confidenceScore,
        symptoms: (result as any).symptoms || result.dataUsed || [],
        ai_summary: result.whatToDoNow || result.whenToGoToVet,
        recommended_action: result.whatToDoNow,
        reason_for_result: result.reasons?.join('; '),
        data_analyzed: { dataUsed: result.dataUsed, severity: result.severity },
        owner_notes: ownerNotes.trim(),
      });
      setSavedEvent(event);
      setSaveStatus('success');
      setShowModal(false);
    } catch (err: any) {
      if (err.message?.includes('DUPLICATE_SAVE')) {
        setSaveStatus('success'); // Already saved — treat as success
      } else {
        console.error('[EmergencyClassifier] Save error:', err);
        setSaveStatus('error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen pb-20">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-slate-500 font-bold flex items-center gap-1">
          <ArrowLeft className="w-5 h-5" /> Dashboard
        </button>
        <span className="font-black text-sm tracking-wide">TRIAGE RESULT</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* 1. Severity Banner */}
        <div className={`p-6 rounded-3xl shadow-md border-2 text-center animate-in fade-in slide-in-from-bottom-2 ${
          isRed ? 'bg-red-500 border-red-600 text-white'
          : isYellow ? 'bg-amber-500 border-amber-600 text-white'
          : 'bg-green-500 border-green-600 text-white'
        }`}>
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-black mb-1 uppercase tracking-wider">
            {isRed ? 'Urgent veterinary care needed'
              : isYellow ? 'Monitor closely — book a vet if this continues'
              : 'Low urgency — continue monitoring'}
          </h1>
        </div>

        {/* RED: Find vet prominent */}
        {isRed && (
          <button onClick={() => navigate('/vet-locator')}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce">
            <MapPin className="w-6 h-6" /> Find Nearest Clinic NOW
          </button>
        )}

        {/* When to go to vet (RED) */}
        {isRed && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
            <h2 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">When to go to the vet</h2>
            <p className="text-red-900 font-black text-lg">{result.whenToGoToVet}</p>
          </div>
        )}

        {/* What to do now */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What to do now</h2>
          <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{result.whatToDoNow}</p>
        </div>

        {/* Confidence */}
        <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Confidence</h2>
            <span className="text-xs font-black bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded uppercase tracking-widest">
              {result.confidence} ({result.confidenceScore}%)
            </span>
          </div>
          {result.confidence === 'low' && (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              We could not gather enough data. When in doubt, contact a vet.
            </p>
          )}
        </div>

        {/* Why this result */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Why this result</h2>
          <ul className="space-y-3 mb-6">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{r}</span>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data Analyzed</h3>
            <div className="flex flex-wrap gap-2">
              {result.dataUsed.map((d, i) => (
                <span key={i} className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md">{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Missing data warning */}
        {result.missingData.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl">
            <h2 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Missing Data
            </h2>
            <ul className="list-disc pl-5 text-sm font-semibold text-amber-800 dark:text-amber-400 space-y-1">
              {result.missingData.map((m, i) => (
                <li key={i}>{m} — Consider providing this next time for better accuracy.</li>
              ))}
            </ul>
          </div>
        )}

        {/* What to monitor / When to vet (non-red) */}
        {!isRed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What to monitor</h2>
              <ul className="list-disc pl-4 text-sm font-semibold text-slate-700 dark:text-slate-300 space-y-1">
                {result.whatToMonitor.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">When to go to the vet</h2>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{result.whenToGoToVet}</p>
            </div>
          </div>
        )}

        {/* Safety disclaimer */}
        <div className="bg-slate-800 dark:bg-slate-950 border border-slate-700 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-300 font-bold leading-relaxed italic">
            "This is not a diagnosis. PAWPHILE is a decision-support tool. Please consult a veterinarian if you have any concerns about your dog's health."
          </p>
        </div>

        {/* ── MARK AS EMERGENCY CARD ────────────────────────── */}
        {!selectedDog ? (
          <div className="pw-card p-5 text-center space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
              Please select or create a dog profile before saving an emergency record.
            </p>
          </div>
        ) : saveStatus === 'success' || savedEvent || alreadySaved ? (
          <div className="pw-card p-5 space-y-4 animate-fadeIn"
            style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
              <p className="font-black text-sm" style={{ color: '#10b981' }}>
                Emergency record saved.
              </p>
            </div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
              This will appear in your dog's Emergency Report for vet reference.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={() => navigate('/reports')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black"
                style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal-glow)' }}>
                <FileText className="w-4 h-4" /> View Emergency Report
              </button>
              <button onClick={() => navigate('/vet-locator')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black"
                style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                <MapPin className="w-4 h-4" /> Find Nearby Vet
              </button>
              <button onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black"
                style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                <ChevronRight className="w-4 h-4" /> Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="pw-card p-5 space-y-4">
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--text)' }}>Need to save this as an emergency?</p>
              <p className="text-xs font-semibold mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                If this situation feels serious, save it as an emergency record.
                PAWPHILE will include it in future reports for vet reference.
              </p>
            </div>
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                <p className="text-xs font-bold" style={{ color: '#ef4444' }}>
                  Couldn't save emergency record. Please try again.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
                style={{
                  background: isRed ? '#ef4444' : 'var(--amber)',
                  color: '#fff',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : buttonLabel}
              </button>
              <button onClick={() => navigate('/vet-locator')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-black text-xs"
                style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                <MapPin className="w-4 h-4" /> Find Vet
              </button>
            </div>
          </div>
        )}

        {/* Action buttons row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => navigate('/reports')}
            className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-300 transition-colors">
            <FileText className="w-5 h-5" /> Generate vet report
          </button>
          {!isRed && (
            <button onClick={() => navigate('/vet-locator')}
              className="bg-teal-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors">
              <MapPin className="w-5 h-5" /> Find nearby vet
            </button>
          )}
        </div>

      </div>

      {/* ── Emergency Save Modal ──────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md animate-fadeIn rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border-2)' }}>
            {/* Modal header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-black" style={{ color: 'var(--text)' }}>Save as Emergency Record?</p>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--text-3)' }} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Body */}
              <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>
                This will save the current triage result, symptoms, severity, confidence, recommendation,
                timestamp, and dog profile reference into your dog's emergency history. This helps you
                create future emergency reports and explain the situation clearly to a vet.
              </p>

              {/* Disclaimer */}
              <div className="px-3 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs font-bold leading-relaxed" style={{ color: '#f87171' }}>
                  ⚠️ PAWPHILE does not diagnose emergencies. If your dog has breathing difficulty,
                  collapse, seizure, poisoning signs, heavy bleeding, pale/blue gums, or extreme weakness,
                  contact a vet immediately.
                </p>
              </div>

              {/* Owner Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-2)' }}>
                  Owner Notes (Optional)
                </label>
                <textarea
                  value={ownerNotes}
                  onChange={e => setOwnerNotes(e.target.value)}
                  rows={3}
                  className="pw-input resize-none text-sm"
                  placeholder="Add any extra details you noticed, such as vomit color, stool condition, weakness, breathing changes, injury, or vet advice."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl font-black text-sm"
                  style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmergency}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: isRed ? '#ef4444' : 'var(--amber)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Emergency Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
