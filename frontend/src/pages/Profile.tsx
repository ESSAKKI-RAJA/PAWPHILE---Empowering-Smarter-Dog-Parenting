import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Save, ShieldAlert, User } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { BREEDS } from '../data/breeds';
import { BREED_KNOWLEDGE_SEED } from '../data/breedKnowledgeSeed';
import { usePawphileData } from '../context/PawphileDataContext';
import type { OwnerProfile, PetProfile, VetProfile } from '../types/pawphileCore';
import { computeAge, isoDate, nowIso, newUuid } from '../types/pawphileCore';

type ProfileProps = { isNew?: boolean };
type TabId = 'pet' | 'owner' | 'vet';

function chipClass(kind: 'ok' | 'warn' | 'bad') {
  if (kind === 'ok') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
  if (kind === 'warn') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
  return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
}

export default function Profile({ isNew = false }: ProfileProps) {
  const { state, seedBreedKnowledge, savePetProfile, saveOwnerProfile, saveVetProfile } = usePawphileData();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultTab = (searchParams.get('tab') as TabId) || 'pet';
  const [tab, setTab] = useState<TabId>(defaultTab);

  useEffect(() => {
    if (Object.keys(state.breedKnowledge || {}).length === 0) seedBreedKnowledge(BREED_KNOWLEDGE_SEED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  }, [tab, setSearchParams]);

  const breedOptions = useMemo(() => BREEDS.map((b) => b.name), []);

  const [petForm, setPetForm] = useState<PetProfile>(() => {
    const ts = nowIso();
    const existing = state.petProfile;
    return existing || {
      id: newUuid(),
      name: '',
      photoUrl: '',
      breed: breedOptions[0] || '',
      dob: isoDate(new Date()),
      autoAge: computeAge(isoDate(new Date())),
      gender: 'male',
      weightKg: null,
      bodyConditionStatus: 'Unknown',
      dietType: 'Mixed Diet',
      activityLevel: 'medium',
      healthGoal: 'maintenance',
      neutered: null,
      allergies: [],
      pastIllnesses: [],
      medicalHistory: '',
      currentDietPlan: '',
      walkTimings: {},
      emergencyContactId: null,
      linkedVetId: null,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  const [ownerForm, setOwnerForm] = useState<OwnerProfile>(() => {
    const ts = nowIso();
    const existing = state.ownerProfile;
    return existing || {
      id: newUuid(),
      name: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      notificationPreferences: { vaccines: true, deworming: true, vetVisits: true, nutrition: true },
      preferredUnits: { weight: 'kg', calories: 'kcal' },
      appLanguage: 'en',
      subscriptionStatus: 'free',
      savedVetLocations: [],
      cloudBackupEnabled: false,
      encryptionEnabled: false,
      consentForAI: false,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  const [vetForm, setVetForm] = useState<VetProfile>(() => {
    const ts = nowIso();
    const existing = state.vetProfile;
    return existing || {
      id: newUuid(),
      clinicName: '',
      vetName: '',
      licenseNumber: '',
      phone: '',
      email: '',
      address: '',
      emergencyHours: '',
      specializations: [],
      availability: '',
      verifiedPartner: false,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
    };
  });

  useEffect(() => {
    if (state.petProfile) setPetForm(state.petProfile);
  }, [state.petProfile]);
  useEffect(() => {
    if (state.ownerProfile) setOwnerForm(state.ownerProfile);
  }, [state.ownerProfile]);
  useEffect(() => {
    if (state.vetProfile) setVetForm(state.vetProfile);
  }, [state.vetProfile]);

  const breedIntel = useMemo(() => {
    const name = petForm.breed;
    return state.breedKnowledge?.[name] ?? null;
  }, [state.breedKnowledge, petForm.breed]);

  const autoAge = useMemo(() => computeAge(petForm.dob), [petForm.dob]);

  const weightStatus = useMemo(() => {
    const w = petForm.weightKg;
    if (!w || w <= 0) return { label: 'Weight missing', kind: 'warn' as const };
    if (!breedIntel?.minWeightKg || !breedIntel?.maxWeightKg) return { label: 'BCS unknown', kind: 'warn' as const };
    if (w < breedIntel.minWeightKg) return { label: 'Below typical range', kind: 'warn' as const };
    if (w > breedIntel.maxWeightKg) return { label: 'Above typical range', kind: 'warn' as const };
    return { label: 'Within typical range', kind: 'ok' as const };
  }, [petForm.weightKg, breedIntel]);

  const handlePetPhoto = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPetForm((p) => ({ ...p, photoUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 flex flex-col h-full relative text-slate-900 dark:text-slate-100 pb-24">
      <div className="px-4 pt-12 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <h1 className="text-2xl font-black">{isNew ? 'Set up profiles' : 'Profiles'}</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          Single source of truth for your dog, owner, and vet details.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTab('pet')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              tab === 'pet'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            PET PROFILE
          </button>
          <button
            type="button"
            onClick={() => setTab('owner')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              tab === 'owner'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            OWNER PROFILE
          </button>
          <button
            type="button"
            onClick={() => setTab('vet')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${
              tab === 'vet'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            VET PROFILE
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-2xl mx-auto w-full">
        {tab === 'pet' && (
          <>
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0 relative group">
                    {petForm.photoUrl ? (
                      <img src={petForm.photoUrl} alt={petForm.name || 'Pet'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 font-black text-2xl">{petForm.name ? petForm.name[0]?.toUpperCase() : '🐶'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Pet Photo</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-1">Upload your dog's photo for quick recognition</p>
                  </div>
                </div>
                <label className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black cursor-pointer transition shadow-sm active:scale-95 w-full sm:w-auto text-center">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePetPhoto(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                <Field label="Dog name">
                  <input value={petForm.name} onChange={(e) => setPetForm((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Bruno" />
                </Field>
                <Field label="Breed">
                  <select value={petForm.breed} onChange={(e) => setPetForm((p) => ({ ...p, breed: e.target.value }))} className="input">
                    {breedOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input type="date" value={petForm.dob} onChange={(e) => setPetForm((p) => ({ ...p, dob: e.target.value }))} className="input" />
                </Field>
                <Field label="Auto age">
                  <div className="input flex items-center justify-between">
                    <span className="font-bold">{autoAge ? `${autoAge.years}y ${autoAge.months}m` : '—'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">auto</span>
                  </div>
                </Field>
                <Field label="Gender">
                  <select value={petForm.gender} onChange={(e) => setPetForm((p) => ({ ...p, gender: e.target.value as any }))} className="input">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={petForm.weightKg ?? ''}
                    onChange={(e) => setPetForm((p) => ({ ...p, weightKg: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="input"
                    placeholder="e.g. 18.5"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[11px] font-extrabold px-2 py-1 rounded-full ${chipClass(weightStatus.kind)}`}>{weightStatus.label}</span>
                    {breedIntel?.minWeightKg != null && breedIntel?.maxWeightKg != null && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Typical: {breedIntel.minWeightKg}–{breedIntel.maxWeightKg} kg</span>
                    )}
                  </div>
                </Field>
                <Field label="Diet type">
                  <input value={petForm.dietType} onChange={(e) => setPetForm((p) => ({ ...p, dietType: e.target.value }))} className="input" placeholder="e.g. Mixed diet / kibble + home cooked" />
                </Field>
                <Field label="Activity level">
                  <select value={petForm.activityLevel} onChange={(e) => setPetForm((p) => ({ ...p, activityLevel: e.target.value as any }))} className="input">
                    <option value="">Select</option>
                    <option value="low">Low</option>
                    <option value="medium">Moderate</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </Field>
                <Field label="Health goal">
                  <select value={petForm.healthGoal} onChange={(e) => setPetForm((p) => ({ ...p, healthGoal: e.target.value as any }))} className="input">
                    <option value="maintenance">Maintenance</option>
                    <option value="weight_loss">Weight loss</option>
                    <option value="muscle_gain">Muscle gain</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(petForm.neutered)}
                  onChange={(e) => setPetForm((p) => ({ ...p, neutered: e.target.checked }))}
                  className="w-5 h-5 accent-teal-600"
                />
                <span className="font-semibold">Neutered / Spayed</span>
              </label>

              <Field label="Allergies (comma separated)">
                <input
                  value={petForm.allergies.join(', ')}
                  onChange={(e) => setPetForm((p) => ({ ...p, allergies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                  className="input"
                  placeholder="e.g. chicken, wheat"
                />
              </Field>

              <Field label="Past illnesses (comma separated)">
                <input
                  value={petForm.pastIllnesses.join(', ')}
                  onChange={(e) => setPetForm((p) => ({ ...p, pastIllnesses: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                  className="input"
                  placeholder="e.g. skin allergy, IVDD"
                />
              </Field>

              <Field label="Medical notes">
                <textarea
                  value={petForm.medicalHistory}
                  onChange={(e) => setPetForm((p) => ({ ...p, medicalHistory: e.target.value }))}
                  className="input min-h-[120px]"
                  placeholder="Vet notes, medicines, surgeries, ongoing conditions (non-diagnostic)."
                />
              </Field>

              <button
                type="button"
                onClick={() => savePetProfile({ ...petForm, autoAge: computeAge(petForm.dob) })}
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                <Save className="w-4 h-4" /> Save Pet Profile
              </button>
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h2 className="font-black">Breed Intelligence</h2>
              </div>
              {!breedIntel ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Breed intelligence unavailable — using general dog profile logic.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard title="Weight range">
                      {breedIntel.minWeightKg != null && breedIntel.maxWeightKg != null ? `${breedIntel.minWeightKg}–${breedIntel.maxWeightKg} kg` : '—'}
                    </InfoCard>
                    <InfoCard title="Exercise">
                      {breedIntel.exerciseMinutesPerDay != null ? `${breedIntel.exerciseMinutesPerDay} min/day` : '—'}
                    </InfoCard>
                    <InfoCard title="Apartment">
                      {breedIntel.apartmentFriendly == null ? '—' : breedIntel.apartmentFriendly ? 'Friendly' : 'Not ideal'}
                    </InfoCard>
                    <InfoCard title="Heat sensitivity">{breedIntel.heatSensitivity}</InfoCard>
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Temperament</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {breedIntel.temperamentTags.map((t: string) => (
                        <span key={t} className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                          {t.split('_').join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Health risk tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {breedIntel.commonRiskTags.map((t: string) => (
                        <span key={t} className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                          {t.split('_').join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    Guidance only. Not a diagnosis. If you notice concerning signs, a vet check is recommended.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'owner' && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-teal-500" />
              <h2 className="font-black">Owner Profile</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Owner name">
                <input value={ownerForm.name} onChange={(e) => setOwnerForm((o) => ({ ...o, name: e.target.value }))} className="input" />
              </Field>
              <Field label="Phone">
                <input value={ownerForm.phone} onChange={(e) => setOwnerForm((o) => ({ ...o, phone: e.target.value }))} className="input" inputMode="tel" placeholder="+91…" />
              </Field>
              <Field label="Email">
                <input value={ownerForm.email} onChange={(e) => setOwnerForm((o) => ({ ...o, email: e.target.value }))} className="input" inputMode="email" />
              </Field>
              <Field label="City / Location">
                <input value={ownerForm.city} onChange={(e) => setOwnerForm((o) => ({ ...o, city: e.target.value }))} className="input" />
              </Field>
              <Field label="Address">
                <input value={ownerForm.address} onChange={(e) => setOwnerForm((o) => ({ ...o, address: e.target.value }))} className="input" />
              </Field>
              <Field label="Notification preferences">
                <div className="space-y-2">
                  {([
                    ['vaccines', 'Vaccines'],
                    ['deworming', 'Deworming'],
                    ['vetVisits', 'Vet visits'],
                    ['nutrition', 'Nutrition'],
                  ] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ownerForm.notificationPreferences[k]}
                        onChange={(e) =>
                          setOwnerForm((o) => ({ ...o, notificationPreferences: { ...o.notificationPreferences, [k]: e.target.checked } }))
                        }
                        className="w-5 h-5 accent-teal-600"
                      />
                      <span className="font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <button
              type="button"
              onClick={() => saveOwnerProfile(ownerForm)}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <Save className="w-4 h-4" /> Save Owner Profile
            </button>
          </section>
        )}

        {tab === 'vet' && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-500" />
              <h2 className="font-black">Vet Profile</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vet name">
                <input value={vetForm.vetName} onChange={(e) => setVetForm((v) => ({ ...v, vetName: e.target.value }))} className="input" />
              </Field>
              <Field label="Clinic name">
                <input value={vetForm.clinicName} onChange={(e) => setVetForm((v) => ({ ...v, clinicName: e.target.value }))} className="input" />
              </Field>
              <Field label="Phone">
                <input value={vetForm.phone} onChange={(e) => setVetForm((v) => ({ ...v, phone: e.target.value }))} className="input" inputMode="tel" />
              </Field>
              <Field label="Address">
                <input value={vetForm.address} onChange={(e) => setVetForm((v) => ({ ...v, address: e.target.value }))} className="input" />
              </Field>
              <Field label="License number">
                <input value={vetForm.licenseNumber} onChange={(e) => setVetForm((v) => ({ ...v, licenseNumber: e.target.value }))} className="input" />
              </Field>
              <Field label="Emergency hours">
                <input value={vetForm.emergencyHours} onChange={(e) => setVetForm((v) => ({ ...v, emergencyHours: e.target.value }))} className="input" placeholder="e.g. 24x7 / 8am–10pm" />
              </Field>
            </div>

            <Field label="Notes">
              <textarea value={vetForm.notes} onChange={(e) => setVetForm((v) => ({ ...v, notes: e.target.value }))} className="input min-h-[120px]" />
            </Field>

            <button
              type="button"
              onClick={() => saveVetProfile(vetForm)}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <Save className="w-4 h-4" /> Save Vet Profile
            </button>
          </section>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          Veterinary disclaimer: PAWPHILE provides preventive guidance and logging tools. It does not diagnose or replace a licensed veterinarian.
        </p>
      </div>

      <style>{`
        .input{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          font-weight:700;
          outline:none;
        }
        .dark .input{
          background: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: white;
        }
        .input:focus{
          border-color: rgb(13 148 136);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.15);
        }
      `}</style>
    </PageWrapper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-base font-black">{children}</p>
    </div>
  );
}

