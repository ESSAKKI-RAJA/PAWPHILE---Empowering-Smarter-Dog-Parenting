/** Timeline.tsx — canonical unified health timeline (BIN1). */
import { useEffect, useMemo, useState } from 'react';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState, OfflineState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

interface TimelineItem {
  id: string;
  event_type: string;
  effective_at: string | null;
  recorded_at?: string | null;
  title: string | null;
  summary: string | null;
  source: string;
}

const TYPES = ['', 'vet_visit', 'symptom', 'medication', 'vaccination', 'weight', 'nutrition', 'behavior', 'lab_result', 'imaging', 'file', 'report'];

export default function Timeline() {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string; name: string } };
  const petId = selectedDog?.id;
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    if (!petId) {
      setState('ready');
      return;
    }
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      const params = new URLSearchParams();
      if (filter) params.set('event_type', filter);
      if (from) params.set('date_from', new Date(from).toISOString());
      if (to) params.set('date_to', new Date(to).toISOString());
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await foundationApi.getTimeline(petId, qs);
      setItems(res.items || []);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load timeline.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const it of items) {
      const day = (it.effective_at || '').slice(0, 10) || 'Unknown date';
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(it);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  if (!petId) return <EmptyState title="No pet selected" hint="Select or create a pet profile to view the health timeline." />;
  if (state === 'loading') return <LoadingState label="Loading timeline…" />;
  if (state === 'error') return <ErrorState message={error} onRetry={() => void load()} />;
  if (state === 'offline') return <OfflineState pending={0} />;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Health Timeline</h1>
      <p className="text-sm opacity-70">What happened to your dog — one chronological record.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border px-2 py-1 text-sm" aria-label="Filter by event type">
          {TYPES.map((t) => (
            <option key={t} value={t}>{t || 'All types'}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border px-2 py-1 text-sm" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border px-2 py-1 text-sm" aria-label="To date" />
        <button onClick={() => void load()} className="rounded border px-3 py-1 text-sm">Apply</button>
      </div>
      {items.length === 0 ? (
        <div className="mt-4"><EmptyState title="No health events yet" hint="Record a symptom, medication, vet visit, or measurement to start the timeline." /></div>
      ) : (
        <ol className="mt-4 space-y-4">
          {groups.map(([day, dayItems]) => (
            <li key={day}>
              <p className="text-sm font-medium opacity-70">{day}</p>
              <ul className="mt-1 space-y-2">
                {dayItems.map((it) => (
                  <li key={`${it.event_type}-${it.id}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border px-2 py-0.5 text-xs">{it.event_type}</span>
                      <span className="text-xs opacity-60">{it.source}</span>
                    </div>
                    <p className="mt-1 font-medium">{it.title || it.event_type}</p>
                    {it.summary ? <p className="text-sm opacity-80">{it.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
