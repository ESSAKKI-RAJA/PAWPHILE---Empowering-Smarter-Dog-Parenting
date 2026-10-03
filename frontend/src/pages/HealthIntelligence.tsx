/** HealthIntelligence.tsx — BIN2 health intelligence experience.
 * Answers: WHAT CHANGED? WHAT IS NORMAL FOR MY DOG? WHAT EVIDENCE SUPPORTS
 * THIS? WHAT SHOULD I WATCH / DISCUSS WITH MY VET? Descriptive, personal,
 * evidence-linked. Never a diagnosis, never a health score. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'blocked' | 'offline';

interface Change {
  metric: string;
  status: string;
  flagged?: boolean;
  recent_median?: number;
  baseline_median?: number;
  delta_pct?: number | null;
  robust_z?: number | null;
  recent_n?: number;
}

function usePetId(): string | undefined {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string } };
  return selectedDog?.id;
}

function ConsentBlocked() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-5">
      <p className="font-black">Health intelligence is off</p>
      <p className="text-sm mt-1">Grant <strong>ai_analysis</strong> consent so PAWPHILE may analyze your pet&rsquo;s records. Nothing is processed without it.</p>
      <Link to="/consent" className="inline-block mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">Open Consent Center</Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function HealthIntelligence() {
  const petId = usePetId();
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [weight, setWeight] = useState<any>(null);
  const [completeness, setCompleteness] = useState<any>(null);
  const [vetSummary, setVetSummary] = useState<any>(null);

  async function load() {
    if (!petId) {
      setState('idle');
      return;
    }
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      const [ov, w, comp] = await Promise.all([
        foundationApi.analyticsOverview(petId),
        foundationApi.analyticsWeight(petId),
        foundationApi.analyticsCompleteness(petId),
      ]);
      setOverview(ov);
      setWeight(w);
      setCompleteness(comp);
      setState('ready');
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 403) {
        setState('blocked');
        return;
      }
      setError(err.message || 'Could not load intelligence.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  async function loadVetSummary() {
    if (!petId) return;
    try {
      setVetSummary(await foundationApi.intelligenceVetSummary(petId));
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 403) setState('blocked');
      else setError(err.message || 'Could not build vet summary.');
    }
  }

  if (!petId) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <EmptyState title="No pet selected" hint="Select a pet to see its health intelligence." />
      </div>
    );
  }
  if (state === 'loading' || state === 'idle') {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <LoadingState label="Analyzing your dog's history…" />
      </div>
    );
  }
  if (state === 'blocked') {
    return (
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <h1 className="text-xl font-black">Health Intelligence</h1>
        <ConsentBlocked />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }
  if (state === 'offline') {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <EmptyState title="You are offline" hint="Health intelligence needs a server connection. Your records remain available offline." />
      </div>
    );
  }

  const changes: Change[] = overview?.flagged_changes ?? [];
  const weightPts: Array<{ at: string; value: number }> = (weight?.evidence ?? [])
    .filter((e: any) => e.value != null)
    .map((e: any) => ({ at: String(e.effective_at).slice(0, 10), value: e.value }));
  const baselineMedian = weight?.baseline?.median;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 pb-28">
      <div>
        <h1 className="text-2xl font-black">Health Intelligence</h1>
        <p className="text-sm text-slate-500">What changed, what&rsquo;s normal for your dog, and what supports it. Descriptive only — never a diagnosis.</p>
      </div>

      <Section title="What changed?">
        {changes.length === 0 ? (
          <p className="text-sm">No flagged changes vs personal baselines. {overview?.symptoms?.episodes_30d
            ? `${overview.symptoms.episodes_30d} symptom episode(s) in 30 days — see Recent changes detail below.`
            : 'No recent symptom episodes either.'}</p>
        ) : (
          <ul className="space-y-2">
            {changes.map((c) => (
              <li key={c.metric} className="rounded-xl border p-3 text-sm">
                <p className="font-bold">{c.metric}: {c.delta_pct != null ? `${c.delta_pct > 0 ? '+' : ''}${c.delta_pct}%` : ''} vs personal baseline</p>
                <p className="text-xs text-slate-500">Recent median {c.recent_median} vs baseline {c.baseline_median} · {c.recent_n} recent records · robust z {c.robust_z}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Weight trend (observations + personal baseline)">
        {weight?.status === 'INSUFFICIENT_DATA' ? (
          <p className="text-sm">Not enough weight data yet — record a few more weigh-ins to form a baseline.</p>
        ) : (
          <>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={weightPts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" dot={{ r: 2 }} name="Weight (kg)" />
                  {baselineMedian != null ? (
                    <ReferenceLine y={baselineMedian} stroke="#14b8a6" strokeDasharray="5 3" label={{ value: 'personal baseline', fontSize: 10 }} />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-1">Dots are actual weigh-ins; dashed line is your dog&rsquo;s baseline median. Gaps mean no data — the line between distant points is visual only.</p>
            <p className="text-sm mt-2">{weight?.explanation?.what} {weight?.explanation?.why}</p>
            <p className="text-xs text-slate-500 mt-1">Limitation: {weight?.explanation?.limitation}</p>
          </>
        )}
      </Section>

      <Section title="Personal baselines">
        <Baselines petId={petId} />
      </Section>

      <Section title="Record completeness (coverage, not health)">
        {completeness ? (
          <>
            <p className="text-2xl font-black">{completeness.record_completeness_pct}%</p>
            <p className="text-xs text-slate-500">{completeness.label}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(completeness.dimensions ?? {}).map(([k, v]: [string, any]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="capitalize">{k}</span>
                  <span className="text-slate-500">{v.detail}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Section>

      <Section title="Multi-signal context">
        {(overview?.multi_signal ?? []).length === 0 ? (
          <p className="text-sm">No overlapping signals in the recent window.</p>
        ) : (
          <ul className="space-y-2">
            {overview.multi_signal.map((ctx: any, i: number) => (
              <li key={i} className="rounded-xl border p-3 text-sm">{ctx.statement}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ask PAW AI (supervised)">
        <SupervisorChat petId={petId} onBlocked={() => setState('blocked')} />
      </Section>

      <Section title="Vet-ready summary">
        {!vetSummary ? (
          <button onClick={() => void loadVetSummary()} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">
            Build vet summary
          </button>
        ) : (
          <div className="text-sm space-y-2">
            <p className="font-bold">Review before sharing — owner-entered records.</p>
            <p><strong>Questions for your vet:</strong></p>
            <ul className="list-disc list-inside">
              {(vetSummary.questions_for_vet ?? []).map((q: string, i: number) => <li key={i}>{q}</li>)}
            </ul>
            <p><strong>Data gaps:</strong> {(vetSummary.data_gaps ?? []).join(', ') || 'none major'}</p>
            <p className="text-xs text-slate-500">{vetSummary.disclaimer}</p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(vetSummary, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vet-summary.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-xl border px-4 py-2 text-sm font-bold"
            >
              Download summary
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}

function Baselines({ petId }: { petId: string }) {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    foundationApi.analyticsBaselines(petId)
      .then((d) => {
        setData(d);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [petId]);
  if (state === 'loading') return <LoadingState label="Loading baselines…" />;
  if (state === 'error') return <p className="text-sm">Could not load baselines.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {Object.entries(data?.baselines ?? {}).map(([m, b]: [string, any]) => (
        <li key={m} className="rounded-xl border p-3">
          <p className="font-bold capitalize">{m} <span className="ml-1 rounded-full border px-2 py-0.5 text-xs">{b.status}</span></p>
          {b.status === 'AVAILABLE' ? (
            <p className="text-xs text-slate-500 mt-1">
              {b.baseline.window_days}d window · {b.baseline.observations} obs · median {b.baseline.median} · latest {b.latest?.value} · freshness {b.freshness?.state}
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">{b.baseline?.reason ?? 'Insufficient data.'}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function SupervisorChat({ petId, onBlocked }: { petId: string; onBlocked: () => void }) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Array<{ q: string; a: string; safety: string }>>([]);
  const [working, setWorking] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  async function ask() {
    if (!question.trim()) return;
    setWorking(true);
    try {
      const res = (await foundationApi.supervisorAsk(petId, question.trim(), sessionId)) as any;
      setSessionId(res.session_id);
      setTurns((t) => [...t, { q: question.trim(), a: res.answer, safety: res.safety_level }]);
      setQuestion('');
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 403) onBlocked();
      else setTurns((t) => [...t, { q: question.trim(), a: `Could not answer: ${err.message}`, safety: 'INFORMATION' }]);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {turns.length === 0 ? (
          <p className="text-sm text-slate-500">Try: “Has my dog&rsquo;s weight been stable?” or “What changed recently?” or “What should I tell my vet?”</p>
        ) : null}
        {turns.map((t, i) => (
          <div key={i} className="rounded-xl border p-3 text-sm">
            <p className="font-bold">You: {t.q}</p>
            <p className="mt-1 whitespace-pre-line">{t.a}</p>
            <p className="mt-1 text-xs text-slate-500">Safety: {t.safety} · grounded in your pet&rsquo;s records</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask();
          }}
          placeholder="Ask about your dog's health history…"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          aria-label="Ask PAW AI"
        />
        <button onClick={() => void ask()} disabled={working || !question.trim()} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {working ? 'Thinking…' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
