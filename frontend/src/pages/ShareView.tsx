/** ShareView.tsx — controlled sharing (scoped + revocable, no public links). */
import { useEffect, useState } from 'react';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

interface Share {
  id: string;
  recipient_label: string;
  scope: string;
  status: string;
  access_count: number;
  created_at: string;
}

export default function ShareView() {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string } };
  const petId = selectedDog?.id;
  const [shares, setShares] = useState<Share[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [recipient, setRecipient] = useState('');
  const [scope, setScope] = useState('REPORT_ONLY');
  const [linkEmail, setLinkEmail] = useState<Record<string, string>>({});

  async function load() {
    if (!petId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      setShares((await foundationApi.listShares(petId)) as Share[]);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load shares.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  async function create() {
    if (!petId || !recipient.trim()) return;
    try {
      await foundationApi.createShare(petId, { recipient_label: recipient.trim(), scope });
      setRecipient('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create share.');
      setState('error');
    }
  }

  async function link(id: string) {
    if (!petId) return;
    const email = (linkEmail[id] ?? '').trim();
    if (!email) return;
    try {
      await foundationApi.shareLink(petId, id, { grantee_email: email });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not link vet account.');
      setState('error');
    }
  }

  async function revoke(id: string) {
    if (!petId) return;
    await foundationApi.revokeShare(petId, id);
    await load();
  }

  if (!petId) return <EmptyState title="No pet selected" hint="Select a pet to manage sharing." />;
  if (state === 'loading') return <LoadingState label="Loading shares…" />;
  if (state === 'error') return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Share</h1>
      <p className="text-sm opacity-70">Give your veterinarian scoped, revocable access. No public links.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient (vet / clinic)" className="rounded border px-2 py-1 text-sm" aria-label="Recipient" />
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded border px-2 py-1 text-sm" aria-label="Scope">
          <option value="REPORT_ONLY">Reports only</option>
          <option value="FULL_RECORD">Full record</option>
          <option value="SELECTED">Selected records</option>
        </select>
        <button onClick={() => void create()} className="rounded bg-teal-600 px-3 py-1 text-sm text-white">Grant access</button>
      </div>
      <div className="mt-4">
        {shares.length === 0 ? (
          <EmptyState title="No active shares" hint="Grants appear here with access logging and expiry." />
        ) : (
          <ul className="space-y-2">
            {shares.map((s) => (
              <li key={s.id} className="rounded-lg border p-3">
                <p className="font-medium">{s.recipient_label}</p>
                <p className="text-sm opacity-70">{s.scope} · {s.status} · accessed {s.access_count}×</p>
                {s.status === 'ACTIVE' ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <button onClick={() => void revoke(s.id)} className="text-sm underline">Revoke</button>
                    <input
                      value={linkEmail[s.id] ?? ''}
                      onChange={(e) => setLinkEmail({ ...linkEmail, [s.id]: e.target.value })}
                      placeholder="Vet's PAWPHILE email"
                      className="rounded border px-2 py-0.5 text-sm"
                      aria-label="Vet email for portal access"
                    />
                    <button onClick={() => void link(s.id)} className="text-sm underline">Link vet account</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
