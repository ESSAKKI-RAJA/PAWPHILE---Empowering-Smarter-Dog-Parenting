/** DataExport.tsx — canonical server export (owner-only structured JSON). */
import { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';

export default function DataExport() {
  const { dogProfiles } = usePawphileData() as { dogProfiles: Array<{ id: string; name: string }> };
  const [petId, setPetId] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');

  async function runExport() {
    if (!petId) return;
    setState('loading');
    setError('');
    try {
      // Server is authoritative: export contains only this user's pet subtree.
      const payload = (await foundationApi.exportPet(petId)) as Record<string, unknown>;
      const counts = Object.entries(payload)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => `${k}: ${(v as unknown[]).length}`)
        .join(', ');
      setSummary(counts);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pawphile_export_${petId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed.');
      setState('error');
    }
  }

  return (
    <PageWrapper className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-black">Data Export</h1>
      <p className="text-sm text-slate-500 mt-1">
        Download your pet&rsquo;s complete server health record as structured JSON. Exports never include other users&rsquo; data.
      </p>
      {dogProfiles.length === 0 ? (
        <div className="mt-4"><EmptyState title="No pets found" hint="Create a pet profile first, then export its record." /></div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <select value={petId} onChange={(e) => setPetId(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" aria-label="Select pet">
            <option value="">Select a pet…</option>
            {dogProfiles.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button onClick={() => void runExport()} disabled={!petId || state === 'loading'} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {state === 'loading' ? 'Exporting…' : 'Export from server'}
          </button>
        </div>
      )}
      <div className="mt-4">
        {state === 'loading' ? <LoadingState label="Building your export…" /> : null}
        {state === 'error' ? <ErrorState message={error} onRetry={() => void runExport()} /> : null}
        {state === 'ready' ? (
          <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm">
            Export downloaded. Contents — {summary}.
          </p>
        ) : null}
      </div>
    </PageWrapper>
  );
}
