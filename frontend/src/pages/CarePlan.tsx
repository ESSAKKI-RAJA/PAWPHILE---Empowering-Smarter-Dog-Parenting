/** CarePlan.tsx — BIN1 "what needs to happen next" (server-authoritative reminders). */
import { useEffect, useState } from 'react';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

interface Reminder {
  id: string;
  reminder_type: string;
  title: string;
  due_at: string;
  status: string;
  version: number;
}

export default function CarePlan() {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string } };
  const petId = selectedDog?.id;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  async function load() {
    if (!petId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      const rows = (await foundationApi.listReminders(petId)) as Reminder[];
      setReminders(rows);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load care plan.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  async function create() {
    if (!petId || !title.trim() || !dueAt) return;
    setSaving(true);
    setSavedNote('');
    try {
      // Wait for server acknowledgement before showing "saved".
      await foundationApi.createReminder(petId, {
        reminder_type: 'general',
        title: title.trim(),
        due_at: new Date(dueAt).toISOString(),
      });
      setTitle('');
      setDueAt('');
      setSavedNote('Saved — confirmed by server.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save reminder.');
      setState('error');
    } finally {
      setSaving(false);
    }
  }

  async function complete(r: Reminder) {
    if (!petId) return;
    try {
      await foundationApi.updateReminder(petId, r.id, { status: 'COMPLETED', version: r.version });
      await load();
    } catch (e: unknown) {
      if (e instanceof Error && /409/.test(e.message)) {
        setError('This reminder changed elsewhere. Reloaded the latest version.');
        await load();
      } else {
        setError(e instanceof Error ? e.message : 'Could not update reminder.');
      }
    }
  }

  if (!petId) return <EmptyState title="No pet selected" hint="Select a pet to view its care plan." />;
  if (state === 'loading') return <LoadingState label="Loading care plan…" />;
  if (state === 'error') return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Care Plan</h1>
      <p className="text-sm opacity-70">What needs to happen next — scheduled by the server, not just this device.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" className="rounded border px-2 py-1 text-sm" aria-label="Reminder title" />
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded border px-2 py-1 text-sm" aria-label="Due date" />
        <button onClick={() => void create()} disabled={saving} className="rounded bg-teal-600 px-3 py-1 text-sm text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Add reminder'}
        </button>
      </div>
      {savedNote ? <p role="status" className="mt-2 text-sm text-green-700">{savedNote}</p> : null}
      <div className="mt-4">
        {reminders.length === 0 ? (
          <EmptyState title="No upcoming reminders" hint="Add the next vaccination, deworming, or vet visit due date." />
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="rounded-lg border p-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm opacity-70">{r.reminder_type} · due {new Date(r.due_at).toLocaleString()} · {r.status}</p>
                {r.status === 'SCHEDULED' ? (
                  <button onClick={() => void complete(r)} className="mt-1 text-sm underline">Mark complete</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
