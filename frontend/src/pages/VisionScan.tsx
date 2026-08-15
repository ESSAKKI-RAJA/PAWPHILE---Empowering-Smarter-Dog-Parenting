import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Image as ImageIcon, X, ArrowLeft, Camera } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PawphileLoader from '../components/ui/PawphileLoader';
import { usePawphileData } from '../context/PawphileDataContext';
import { usePersonalization } from '../context/PersonalizationContext';
import { calculateVisionSignal, VisionScreeningResult } from '../features/vision/visionScreeningEngine';
import { useToast } from '../context/ToastContext';
import { createEmergencyEvent } from '../services/emergencyEventsService';
import { VISION_BODY_AREAS, getBodyArea, type VisionBodyAreaId } from '../features/vision/visionBodyAreas';
import { TriageState } from '../components/ui/TriageState';

const MVP_PRIMARY_AREAS: VisionBodyAreaId[] = ['skin_coat', 'eyes', 'ears', 'paws_nails', 'injury_wound'];
const DURATION_OPTIONS = ['today', '1–2 days', '3–7 days', 'more than 1 week', 'recurring'];
const SEVERITY_SELF = ['mild', 'moderate', 'severe', 'worsening'];

export default function VisionScan() {
  const navigate = useNavigate();
  const { selectedDog } = usePawphileData();
  const { breedName } = usePersonalization();
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
      navigate('/');
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: 'Failed to save scan' });
    }
  };

  const handleVetAction = () => {
    navigate('/vet-locator');
  };

  const toggleFlag = (id: string) => {
    setCheckedFlags(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  if (loading) return <PawphileLoader message="Analyzing inputs..." fullScreen />;

  return (
    <div className="pw-page flex flex-col h-screen max-h-screen">
      <div className="bg-ivory-50 border-b border-line-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-line-200/50 transition">
              <ArrowLeft className="w-5 h-5 text-ink-950" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" />
                <h1 className="text-16px font-bold text-ink-950 leading-none">Vision Scan</h1>
              </div>
              <p className="text-12px text-muted-600 mt-1">
                For {selectedDog?.name || 'your dog'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6 pb-24">
          
          <div className="p-4 rounded-xl flex items-start gap-3 bg-teal-50 border border-primary/20">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" />
            <p className="text-13px leading-relaxed text-ink-800">
              <strong>Observation Only:</strong> This tool helps document and categorize visual symptoms. It cannot diagnose your dog and does not replace a veterinarian.
            </p>
          </div>

          {!result ? (
            <div className="space-y-6 animate-fade-in">
              {/* Photo Upload */}
              <div className="space-y-2">
                <h3 className="text-15px font-bold text-ink-950">1. Take a clear photo</h3>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-2 text-center cursor-pointer transition-colors ${image ? 'border-primary' : 'border-line-200 hover:border-primary/50'}`}
                  onClick={() => !image && fileInputRef.current?.click()}
                >
                  {image ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden group">
                      <img src={image} alt="Upload preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-ink-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-bold bg-ink-950/60 px-4 py-2 rounded-full text-13px">Change Photo</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                        className="absolute top-3 right-3 bg-safety-red-primary text-white p-2 rounded-full shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-ivory-100">
                        <ImageIcon className="w-8 h-8 text-muted-400" />
                      </div>
                      <div>
                        <p className="font-bold text-15px text-ink-950">Tap to upload image</p>
                        <p className="text-13px mt-1 text-muted-600">Ensure good lighting and focus</p>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              {/* Area Selection */}
              <div className="space-y-2">
                <h3 className="text-15px font-bold text-ink-950">2. Where is the issue?</h3>
                <div className="grid grid-cols-5 gap-2">
                  {VISION_BODY_AREAS.filter(a => MVP_PRIMARY_AREAS.includes(a.id)).map(a => (
                    <button 
                      key={a.id} 
                      onClick={() => { setAreaId(a.id); setCheckedFlags(new Set()); setConcernType(''); }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all border ${areaId === a.id ? 'bg-teal-50 border-primary' : 'bg-white border-line-200 hover:border-primary/50'}`}
                    >
                      <span className="text-2xl mb-1">{a.emoji}</span>
                      <span className={`text-[10px] font-bold leading-tight ${areaId === a.id ? 'text-primary' : 'text-muted-600'}`}>
                        {a.shortLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <h3 className="text-15px font-bold text-ink-950">3. Describe what you see</h3>
                
                <div className="space-y-3">
                  <select value={concernType} onChange={e => setConcernType(e.target.value)} className="pw-input text-14px">
                    <option value="">Select concern type...</option>
                    {area.commonConcernTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <select value={duration} onChange={e => setDuration(e.target.value)} className="pw-input text-14px">
                      <option value="">Duration...</option>
                      {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={severity} onChange={e => setSeverity(e.target.value)} className="pw-input text-14px">
                      <option value="">Severity...</option>
                      {SEVERITY_SELF.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {area.redFlags.length > 0 && (
                  <div className="pt-2">
                    <p className="text-12px font-bold text-safety-red-primary mb-2">Check any that apply</p>
                    <div className="space-y-2">
                      {area.redFlags.map(flag => (
                        <label key={flag.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${checkedFlags.has(flag.id) ? 'bg-safety-red-light border-safety-red-border/30' : 'bg-white border-line-200'}`}>
                          <input type="checkbox" checked={checkedFlags.has(flag.id)} onChange={() => toggleFlag(flag.id)} className="w-4 h-4 flex-shrink-0 accent-safety-red-primary" />
                          <span className="text-14px font-medium text-ink-950">{flag.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-13px font-medium text-safety-red-primary">{error}</p>
              )}

              <button onClick={handleAnalyze} className="pw-btn-primary w-full">
                Review Observation
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              <TriageState
                status={result.signalColor.toUpperCase() as any}
                title={result.signalTitle}
                summary={`Visual observations indicate: ${result.reasons.join('; ')}`}
                whatYouCanDo={result.nextActions.join('\n')}
                primaryActionLabel="Save to Timeline"
                onPrimaryAction={handleSaveScan}
                secondaryActionLabel="Find a Vet"
                onSecondaryAction={handleVetAction}
                escalationNote={result.safetyMessage}
              />
              <button 
                onClick={() => setResult(null)}
                className="w-full pw-btn-secondary"
              >
                Start Over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
