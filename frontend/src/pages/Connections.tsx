/** Connections.tsx — BIN4 owner ecosystem: external sources with explicit
 * WHAT/WHY/status/sync/revoke. Consent-gated per category; revocation is
 * immediate and visible. Truthful states only — never "Connected" when not. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

const TYPES = ['LAB', 'IMAGING', 'DEVICE', 'PIMS', 'PARTNER'];
const WHY: Record<string, string> = {
  LAB: 'Imports lab results with recorded reference ranges. Values are displayed, never interpreted.',
  IMAGING: 'Imports imaging study metadata. No image diagnosis — foundation only.',
  DEVICE: 'Imports activity/sleep/movement readings as labeled observations. Never fed into baselines.',
  PIMS: 'Future clinic-system link. Manual imports only in this build.',
  PARTNER: 'Partner data sharing with explicit scopes. Nothing hidden.',
};

const inputCls = 'rounded border px-2 py-1 text-sm w-full dark:bg-slate-800';
const btnCls = 'rounded bg-teal-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50';

export default function Connections() {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string } };
  const petId = selectedDog?.id;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [conns, setConns] = useState<any[]>([]);
  const [labs, setLabs] = useState<any>(null);
  const [form, setForm] = useState({ type: 'DEVICE', name: '', scopes: 'activity' });

  async function load() {
    if (!petId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      const [c, l] = await Promise.all([
        foundationApi.connList(petId),
        foundationApi.labSummary(petId),
      ]);
      setConns(c as any[]);
      setLabs(l as any);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load connections.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  if (!petId) return <div className="mx-auto max-w-4xl p-4"><EmptyState title="No pet selected" hint="Select a pet to manage connected sources." /></div>;
  if (state === 'loading') return <div className="mx-auto max-w-4xl p-4"><LoadingState label="Loading connections…" /></div>;
  if (state === 'error') return <div className="mx-auto max-w-4xl p-4"><ErrorState message={error} onRetry={() => void load()} /></div>;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-black">Connections</h1>
        <p className="text-sm opacity-70">Each source names what it shares and why. Revoke any of them at any time — imported history keeps its provenance.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Connect a source</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls} aria-label="Source type">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider name" className={inputCls} aria-label="Provider name" />
          <input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} placeholder="Data categories (comma-separated)" className={inputCls} aria-label="Data categories" />
        </div>
        <p className="mt-2 text-xs opacity-70">{WHY[form.type]} Requires category consent first — <Link to="/consent" className="underline">Consent Center</Link>.</p>
        <button
          onClick={() => void (async () => {
            try {
              await foundationApi.connCreate(petId, {
                provider_type: form.type, provider_name: form.name,
                pet_id: petId, scopes: form.scopes.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setForm({ type: 'DEVICE', name: '', scopes: 'activity' });
              await load();
            } catch (e: unknown) {
              const err = e as Error & { status?: number };
              setError(err.status === 403 ? 'Category consent is required first — open Consent Center.' : (err.message || 'Could not connect.'));
            }
          })()}
          className={`${btnCls} mt-2`} disabled={!form.name.trim()}>Connect</button>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Connected sources</h2>
        {conns.length === 0 ? <p className="mt-2 text-sm opacity-70">Nothing connected.</p> : (
          <ul className="mt-2 space-y-2 text-sm">
            {conns.map((c: any) => (
              <li key={c.id} className="rounded-lg border p-3">
                <p className="font-bold">{c.provider_type}: {c.provider_name} <span className="font-normal opacity-70">· {c.status}</span></p>
                <p className="opacity-70">Shares: {(c.scopes ?? []).join(', ') || '—'} · consent {c.consent_status} · last sync {(c.last_sync_at ?? '').slice(0, 10) || 'never'}</p>
                {c.status === 'CONNECTED' ? (
                  <button onClick={() => void (async () => { await foundationApi.connRevoke(c.id); await load(); })()} className="mt-1 text-sm underline">Revoke</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Lab results (recorded values only)</h2>
        {(labs?.results ?? []).length === 0 ? <p className="mt-2 text-sm opacity-70">No lab results on file.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {(labs?.results ?? []).slice(0, 20).map((r: any) => (
              <li key={r.id}>{r.test_name}: <strong>{r.result_value ?? '—'} {r.result_unit ?? ''}</strong>
                <span className="opacity-70"> (range {r.reference_range ?? 'not recorded'})</span>
                {r.flag && r.flag !== 'WITHIN_RECORDED_RANGE' ? <span className="ml-2 font-bold text-amber-700">outside recorded range</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs opacity-70">{labs?.disclaimer}</p>
      </section>
    </div>
  );
}
