import { useMemo, useState } from 'react';
import { usePawphileData } from '../context/PawphileDataContext';
import { usePersonalization } from '../context/PersonalizationContext';
import { Download, FileText, Printer, Stethoscope, AlertTriangle, CheckCircle, Info, Server, RefreshCw } from 'lucide-react';
import { generatePdfFromElement } from '../services/pdfGenerator';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { daysUntil } from '../lib/dateUtils';
import { calculateBCS } from '../utils/bcsUtils';

interface ServerReport {
  id: string;
  report_type: string;
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'FAILED';
  storage_ref?: string | null;
  error?: string | null;
  created_at: string;
}

function ServerReportSection({ dogId, dogName }: { dogId: string; dogName: string }) {
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [reportType, setReportType] = useState('monthly_summary');

  async function load() {
    setState('loading');
    try {
      const rows = (await foundationApi.listReports?.(dogId)) as ServerReport[] | undefined;
      // listReports may not exist on older clients — fall back to empty.
      setReports(rows ?? []);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load server reports.');
      setState('error');
    }
  }

  async function createAndGenerate() {
    setWorking(true);
    setError('');
    try {
      // Server acknowledgement gates every step: only READY is shown as ready.
      const created = (await foundationApi.createReport(dogId, { report_type: reportType })) as ServerReport;
      const ready = (await foundationApi.generateReport(dogId, created.id)) as ServerReport;
      if (ready.status !== 'READY') {
        throw new Error(ready.error || 'Report generation did not complete.');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Report generation failed.');
      setState('error');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 p-5 mb-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-teal-800 dark:text-teal-200 flex items-center gap-2">
        <Server className="w-4 h-4" /> Server-verified report (authoritative)
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
        Generated from {dogName}&rsquo;s server health record. A report is only shown as ready after the server confirms READY.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm bg-white dark:bg-slate-900" aria-label="Report type">
          <option value="monthly_summary">Monthly summary</option>
          <option value="vet_visit_summary">Vet visit summary</option>
          <option value="full_record">Full record</option>
        </select>
        <button onClick={() => void load()} className="rounded-lg border px-3 py-1.5 text-sm font-bold bg-white dark:bg-slate-900 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={() => void createAndGenerate()} disabled={working} className="rounded-lg px-3 py-1.5 text-sm font-bold bg-teal-600 text-white disabled:opacity-50">
          {working ? 'Generating…' : 'Generate server report'}
        </button>
      </div>
      <div className="mt-3">
        {state === 'idle' ? <EmptyState title="Not loaded yet" hint="Press Refresh to list server reports for this pet." /> : null}
        {state === 'loading' ? <LoadingState label="Loading server reports…" /> : null}
        {state === 'error' ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {state === 'ready' ? (
          reports.length === 0 ? (
            <EmptyState title="No server reports yet" hint="Generate one above — it becomes visible only when the server reports READY." />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border bg-white dark:bg-slate-900 p-3 text-sm">
                  <p className="font-bold">{r.report_type} <span className="ml-1 rounded-full border px-2 py-0.5 text-xs">{r.status}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Created {new Date(r.created_at).toLocaleString()}</p>
                  {r.status === 'FAILED' ? <p className="text-xs text-red-600 mt-1">{r.error || 'Generation failed.'}</p> : null}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function Reports() {
  const {
    selectedDog,
    ownerProfile,
    vaccineRecords,
    dewormingRecords,
    vetVisits,
    medications,
    nutritionLogs,
    triageResults
  } = usePawphileData();
  const { breedIntel, breedName, sizeCategory, riskFlags } = usePersonalization();

  const [isExporting, setIsExporting] = useState(false);

  const dogId = selectedDog?.id;

  const myVaccines = useMemo(() => vaccineRecords.filter(r => r.dogId === dogId).sort((a,b) => b.dateGiven.localeCompare(a.dateGiven)), [vaccineRecords, dogId]);
  const myDeworming = useMemo(() => dewormingRecords.filter(r => r.dogId === dogId).sort((a,b) => b.dateGiven.localeCompare(a.dateGiven)), [dewormingRecords, dogId]);
  const myVetVisits = useMemo(() => vetVisits.filter(r => r.dogId === dogId).sort((a,b) => b.visitDate.localeCompare(a.visitDate)), [vetVisits, dogId]);
  const myMedications = useMemo(() => medications.filter(r => r.dogId === dogId), [medications, dogId]);
  const myNutrition = useMemo(() => nutritionLogs.filter(r => r.dogId === dogId).slice(-7), [nutritionLogs, dogId]);
  const myTriage = useMemo(() => triageResults.filter(r => r.dogId === dogId).slice(-5), [triageResults, dogId]);

  const handleExport = async () => {
    setIsExporting(true);
    await generatePdfFromElement('master-health-report', `PAWPHILE_${selectedDog?.name}_Medical_Record.pdf`);
    setIsExporting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedDog) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen px-6">
        <p className="text-slate-500 font-bold">Please select a dog to view reports.</p>
      </div>
    );
  }

  const bcs = calculateBCS(selectedDog);

  return (
    <div className="pw-page pb-28 min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Fixed Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Master Health Report
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1">Veterinary-Grade Medical Record</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* The Printable Report Container */}
      <div className="p-4 max-w-4xl mx-auto mt-4">
        {dogId ? <ServerReportSection dogId={dogId} dogName={selectedDog.name} /> : null}
        <p className="text-xs italic text-slate-500 mb-3 px-1">Below: on-device printable view built from local data (for printing/sharing a snapshot). The authoritative record is the server report above.</p>
        <div id="master-health-report" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 overflow-hidden">
          
          {/* Header */}
          <div className="border-b-4 border-slate-900 dark:border-white pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">PAWPHILE MEDICAL RECORD</h1>
              <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Sec 1: Demographics */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">1. Patient Demographics</h2>
              <div className="space-y-1 text-sm font-medium">
                <p><span className="font-bold text-slate-500 w-24 inline-block">Name:</span> <span className="font-black text-lg">{selectedDog.name}</span></p>
                <p><span className="font-bold text-slate-500 w-24 inline-block">Breed:</span> {breedName || 'Unknown'}</p>
                <p><span className="font-bold text-slate-500 w-24 inline-block">Age/DOB:</span> {selectedDog.age || '?'} years</p>
                <p><span className="font-bold text-slate-500 w-24 inline-block">Gender/Sex:</span> {selectedDog.sex}</p>
                {breedIntel && (
                  <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Current Breed Context
                    </p>
                    <p className="text-xs"><span className="font-bold">Size:</span> <span className="capitalize">{sizeCategory}</span></p>
                    {riskFlags.length > 0 && (
                      <p className="text-xs mt-0.5"><span className="font-bold">Key Risks:</span> {riskFlags.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sec 2: Owner Contact */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">2. Owner Contact</h2>
              {ownerProfile ? (
                <div className="space-y-1 text-sm font-medium">
                  <p><span className="font-bold text-slate-500 w-24 inline-block">Name:</span> {ownerProfile.name || 'Not Recorded'}</p>
                  <p><span className="font-bold text-slate-500 w-24 inline-block">Phone:</span> {ownerProfile.phone || 'Not Recorded'}</p>
                  <p><span className="font-bold text-slate-500 w-24 inline-block">Email:</span> {ownerProfile.email || 'Not Recorded'}</p>
                  <p><span className="font-bold text-slate-500 w-24 inline-block">City:</span> {ownerProfile.city || 'Not Recorded'}</p>
                </div>
              ) : (
                <p className="text-sm italic text-slate-500">Owner information not recorded.</p>
              )}
            </div>
          </div>

          {/* Sec 3 & 4: Wellness & AI Narrative */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">3 & 4. Current Status & AI Summary</h2>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl text-sm leading-relaxed border border-slate-200 dark:border-slate-700">
              <p className="mb-2"><span className="font-bold">Current Weight:</span> {selectedDog.weight ? `${selectedDog.weight} ${selectedDog.weightUnit}` : 'Not Recorded'}</p>
              <p className="mb-4"><span className="font-bold">Body Condition Score (Est):</span> {bcs.score}/9 - {bcs.label}</p>
              <p className="italic text-slate-600 dark:text-slate-300">
                "{selectedDog.name} is a {selectedDog.age}-year-old {breedName || 'unknown breed'} presenting with {myVetVisits.length} recorded vet visits. 
                {myVaccines.length > 0 ? ` Vaccinations are tracked, with the most recent being ${myVaccines[0]?.vaccineName}.` : ' No vaccination history is currently recorded.'}
                {myMedications.length > 0 ? ` Patient is currently on ${myMedications.length} active medication(s).` : ' Patient is not currently taking any active medications.'}
                {myTriage.length > 0 && myTriage[0].severity === 'red' ? ' ALERT: A recent severe triage event was logged requiring immediate attention.' : ' No severe acute events logged recently.'}
                "
              </p>
            </div>
          </div>

          {/* Sec 5: Vaccines */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">5. Vaccination History</h2>
            {myVaccines.length > 0 ? (
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="p-2 font-bold">Vaccine</th>
                    <th className="p-2 font-bold">Date Given</th>
                    <th className="p-2 font-bold">Next Due</th>
                    <th className="p-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {myVaccines.map(v => {
                    const days = daysUntil(v.nextDueDate);
                    return (
                      <tr key={v.id}>
                        <td className="p-2 font-medium">{v.vaccineName}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{v.dateGiven}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{v.nextDueDate}</td>
                        <td className="p-2">
                          {days < 0 ? <span className="text-red-600 font-bold">Overdue</span> : <span className="text-teal-600 font-bold">Up to date</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-500 italic">No vaccination records.</p>}
          </div>

          {/* Sec 6: Vet Visits */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">6. Veterinary Visits History</h2>
            {myVetVisits.length > 0 ? (
              <div className="space-y-4">
                {myVetVisits.map(v => (
                  <div key={v.id} className="border-l-4 border-indigo-200 dark:border-indigo-900 pl-4 py-1">
                    <p className="font-bold text-sm flex items-center gap-2">
                      {v.visitDate} <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded uppercase">{v.visitType}</span>
                    </p>
                    <p className="text-sm font-medium mt-1">Dr. {v.vetName} ({v.clinicName})</p>
                    {v.diagnosis && <p className="text-sm mt-1"><span className="font-bold text-slate-500">Diagnosis:</span> {v.diagnosis}</p>}
                    {v.clinicalNotes && <p className="text-sm italic text-slate-600 dark:text-slate-400 mt-1">Notes: "{v.clinicalNotes}"</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500 italic">No veterinary visits recorded.</p>}
          </div>

          {/* Sec 7: Medications */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">7. Current Medications</h2>
            {myMedications.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-sm">
                {myMedications.map(m => (
                  <li key={m.id}>
                    <span className="font-bold">{m.name}</span> — {m.dosage}, {m.frequency} (Duration: {m.duration})
                    {m.instructions && <span className="text-slate-500 block ml-5 italic">Instr: {m.instructions}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500 italic">No current medications.</p>}
          </div>

          {/* Sec 8 & 9: Nutrition & Weight */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">8. Recent Nutrition</h2>
              {myNutrition.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {myNutrition.map(n => (
                    <li key={n.id} className="flex justify-between">
                      <span className="truncate w-3/4">{n.foodName || n.mealDescription}</span>
                      <span className="font-bold text-slate-500">{n.calories || n.caloriesCal || 0} kcal</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500 italic">Insufficient data.</p>}
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">9. Body Condition</h2>
              <p className="text-sm">Weight: <span className="font-bold">{selectedDog.weight || '?'} {selectedDog.weightUnit || 'kg'}</span></p>
              <p className="text-sm">BCS Estimate: <span className="font-bold">{bcs.score}/9</span></p>
              <p className="text-xs text-slate-500 mt-2 italic">{bcs.advice}</p>
            </div>
          </div>

          {/* Sec 11 & 12: Parasite & Triage */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">11. Parasite Prevention</h2>
              {myDeworming.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {myDeworming.map(d => (
                    <li key={d.id} className="border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span className="font-bold">{d.productName || 'Dewormer'}</span>
                      <span className="block text-slate-500 text-xs">Given: {d.dateGiven} | Due: {d.nextDueDate}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500 italic">Insufficient data.</p>}
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">12. Acute Events / Alerts</h2>
              {myTriage.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {myTriage.map(t => (
                    <li key={t.id} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800 p-2 rounded">
                      {t.severity === 'red' ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> : 
                       t.severity === 'yellow' ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> : 
                       <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />}
                      <div>
                        <span className="font-bold uppercase text-[10px] tracking-wider block">{t.severity} Priority</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500 italic">No acute events logged.</p>}
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            <p>Generated by PAWPHILE Intelligence Engine V2 — Software Edition</p>
            <p>This document is a summary of user-entered records and is not a replacement for veterinary diagnostic testing.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
