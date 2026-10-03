/** ConsentCenter.tsx — foundation-level privacy controls (server-recorded). */
import { useEffect, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';

interface Consent {
  id: string;
  purpose: string;
  status: 'GRANTED' | 'DENIED' | 'WITHDRAWN';
  explanation?: string | null;
  created_at: string;
}

const PURPOSES = [
  { id: 'care_reminders', label: 'Care reminders', hint: 'Use my contact details to send due-care reminders.' },
  { id: 'ai_analysis', label: 'AI analysis', hint: 'Allow decision-support analysis over my pet records.' },
  { id: 'sharing', label: 'Vet sharing', hint: 'Allow scoped shares I explicitly create.' },
];

export default function ConsentCenter() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      setConsents((await foundationApi.listConsent()) as Consent[]);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load consent records.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setConsent(purpose: string, status: Consent['status']) {
    setSaving(purpose);
    try {
      // Server acknowledgement required — consent is only shown as saved after 201.
      await foundationApi.saveConsent({ purpose, status });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save consent.');
      setState('error');
    } finally {
      setSaving(null);
    }
  }

  function current(purpose: string): Consent['status'] | null {
    return consents.find((c) => c.purpose === purpose)?.status ?? null;
  }

  if (state === 'loading') {
    return (
      <PageWrapper className="max-w-2xl mx-auto p-4">
        <LoadingState label="Loading consent records…" />
      </PageWrapper>
    );
  }

  if (state === 'error') {
    return (
      <PageWrapper className="max-w-2xl mx-auto p-4">
        <ErrorState message={error} onRetry={() => void load()} />
      </PageWrapper>
    );
  }

  if (state === 'offline') {
    return (
      <PageWrapper className="max-w-2xl mx-auto p-4">
        <EmptyState title="You are offline" hint="Consent changes require a server connection so they are recorded truthfully. Reconnect to manage consent." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-black">Consent Center</h1>
      <p className="text-sm text-slate-500 mt-1">Your health data is never used for unrelated purposes. Changes take effect only after the server confirms.</p>
      <ul className="mt-4 space-y-3">
        {PURPOSES.map((p) => {
          const cur = current(p.id);
          return (
            <li key={p.id} className="rounded-2xl border p-4">
              <p className="font-bold">{p.label}</p>
              <p className="text-sm text-slate-500">{p.hint}</p>
              <p className="mt-1 text-sm">
                Current: <strong>{cur ?? 'not set'}</strong>
              </p>
              <div className="mt-2 flex gap-2">
                {(['GRANTED', 'DENIED', 'WITHDRAWN'] as const).map((s) => (
                  <button
                    key={s}
                    disabled={saving === p.id}
                    onClick={() => void setConsent(p.id, s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${cur === s ? 'bg-teal-600 text-white' : 'bg-white'}`}
                  >
                    {saving === p.id ? 'Saving…' : s}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </PageWrapper>
  );
}
