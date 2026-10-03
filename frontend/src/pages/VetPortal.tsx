/** VetPortal.tsx — BIN3 veterinarian experience. Everything shown here passed
 * server authorization (ACTIVE, unexpired, pet-specific share). 404 = no grant
 * (no leakage); 410 = expired/revoked. Files are metadata only; storage
 * pointers never leave the server. Intelligence always ships with evidence. */
import { useEffect, useState } from 'react';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';

type Gate = 'ready' | 'denied';
type LoadState = 'loading' | 'ready' | 'error' | 'offline';

function SourceBadge({ label }: { label: string }) {
  const color =
    label === 'VET-RECORDED' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
    : label === 'AI-DERIVED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
    : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${color}`}>{label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const inputCls = 'rounded border px-2 py-1 text-sm w-full dark:bg-slate-800';
const btnCls = 'rounded bg-violet-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50';
const ghostCls = 'rounded border px-3 py-1.5 text-sm disabled:opacity-50';

export default function VetPortal() {
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<Gate | string>('ready');
  const [pets, setPets] = useState<any[]>([]);
  const [consults, setConsults] = useState<any[]>([]);
  const [petView, setPetView] = useState<any>(null);
  const [pkgView, setPkgView] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [denied, setDenied] = useState('');

  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [noteFollow, setNoteFollow] = useState('');
  const [rec, setRec] = useState('');
  const [due, setDue] = useState('');

  async function load() {
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      const [p, c] = await Promise.all([foundationApi.vetPets(), foundationApi.vetConsultations()]);
      setPets((p as any).pets ?? []);
      setConsults((c as any).consultations ?? []);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load vet portal.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function gateMessage(e: unknown): boolean {
    const err = e as Error & { status?: number };
    if (err.status === 410) {
      setDenied('This access expired or was revoked by the owner. The audit record remains; the data is closed.');
      return true;
    }
    if (err.status === 404) {
      setDenied('Not shared with this account. Ask the owner to link your PAWPHILE email to the share.');
      return true;
    }
    setError(err.message || 'Request failed.');
    return false;
  }

  async function openPet(petId: string) {
    setDenied('');
    setPkgView(null);
    try {
      setPetView((await foundationApi.vetPetView(petId)) as any);
    } catch (e: unknown) {
      setPetView(null);
      gateMessage(e);
    }
  }

  async function openDetail(consultId: string) {
    setDenied('');
    try {
      setDetail((await foundationApi.consultGet(consultId)) as any);
    } catch (e: unknown) {
      setDetail(null);
      gateMessage(e);
    }
  }

  if (state === 'loading') return <div className="mx-auto max-w-4xl p-4"><LoadingState label="Loading authorized cases…" /></div>;
  if (state === 'error') return <div className="mx-auto max-w-4xl p-4"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (state === 'offline') return <div className="mx-auto max-w-4xl p-4"><EmptyState title="Vet portal needs internet" hint="Shared records are server-authorized and cannot be reviewed offline." /></div>;

  const h = petView?.header;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-black">Vet Portal</h1>
        <p className="text-sm opacity-70">Only pets whose owners shared records with your account appear here — one share, one pet, one expiry.</p>
      </div>
      {denied ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">{denied}</p> : null}

      <Card title="Assigned pets">
        {pets.length === 0 ? <EmptyState title="No shared cases" hint="When an owner links your PAWPHILE email to a share, their pet appears here." /> : (
          <ul className="space-y-2 text-sm">
            {pets.map((p: any) => (
              <li key={p.pet_id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="font-bold">{p.pet_name}</span>
                <span className="opacity-70">{p.scope} · {p.purpose ?? 'no purpose'}{p.expires_at ? ` · until ${(p.expires_at ?? '').slice(0, 10)}` : ''}</span>
                <button onClick={() => void openPet(p.pet_id)} className="underline">Open</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {h && (
        <Card title={`${h.pet_name} · ${h.share_scope}${h.share_purpose ? ` · ${h.share_purpose}` : ''}`}>
          <p className="text-xs opacity-70">Access {h.access_expires_at ? `until ${(h.access_expires_at ?? '').slice(0, 10)}` : 'without expiry on file'} · owner-controlled, revocable at any time.</p>
          {petView.timeline ? (
            <div className="text-sm"><p className="font-bold">Timeline</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {petView.timeline.map((t: any) => (
                  <li key={t.id}><SourceBadge label={t.source_label ?? 'OWNER-RECORDED'} /> {t.title ?? t.event_type} <span className="opacity-60">{(t.effective_at ?? '').slice(0, 10)}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
          {petView.reports ? (
            <div className="text-sm"><p className="font-bold">Reports shared</p>
              <ul>{petView.reports.map((r: any) => <li key={r.id}>{r.report_type}</li>)}</ul>
              {petView.shared_package_digest ? <p className="text-xs opacity-70">Package digest <code>{petView.shared_package_digest}</code></p> : null}
            </div>
          ) : null}
          {petView.medications ? <p className="text-sm">Medications on file: <strong>{petView.medications.length}</strong></p> : null}
          {petView.symptoms ? <p className="text-sm">Recent symptoms: <strong>{petView.symptoms.length}</strong></p> : null}
          {petView.files ? (
            <div className="text-sm"><p className="font-bold">Files (descriptions only — no direct storage access)</p>
              <ul>{petView.files.map((f: any) => <li key={f.id}>{f.file_name} · {f.category}</li>)}</ul>
            </div>
          ) : null}
          {petView.intelligence && !petView.intelligence.blocked ? (
            <div className="text-sm"><p className="font-bold">Descriptive intelligence (inspect the evidence, never a conclusion alone)</p>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">{petView.intelligence.origin}</p>
              <ul>{(petView.intelligence.flagged_changes ?? []).filter((c: any) => c.flagged).map((c: any) => (
                <li key={c.metric}>{c.metric}: {c.delta_pct?.toFixed?.(1) ?? '?'}% vs personal baseline</li>
              ))}</ul>
              <p className="text-xs opacity-70">Evidence records: {(petView.intelligence.evidence_refs ?? []).length} linked · {petView.intelligence.rules_version}</p>
            </div>
          ) : null}
          {petView.intelligence?.blocked ? <p className="text-sm opacity-70">Intelligence: {petView.intelligence.reason}</p> : null}
          {petView.owner_questions?.length ? (
            <div className="text-sm"><p className="font-bold">Owner questions</p>
              <ul>{petView.owner_questions.map((q: any) => <li key={q.id}>Q: {q.question_text} [{q.status}]</li>)}</ul>
            </div>
          ) : null}
        </Card>
      )}

      <Card title="My consultations">
        {consults.length === 0 ? <EmptyState title="No consultations" hint="Consultations linked to your shares appear here." /> : (
          <ul className="space-y-1 text-sm">
            {consults.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{c.pet_name}</span><span className="opacity-70">{c.purpose} · {c.status}</span>
                <button onClick={() => void openDetail(c.id)} className="underline">Review</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {detail && (
        <div className="space-y-4">
          <Card title={`Review · ${detail.purpose} · ${detail.status}`}>
            <div className="text-sm"><p className="font-bold">Questions awaiting you</p>
              {detail.questions.filter((q: any) => q.status === 'OPEN').length === 0
                ? <p className="opacity-70">None open.</p>
                : detail.questions.filter((q: any) => q.status === 'OPEN').map((q: any) => (
                  <div key={q.id} className="rounded border p-2">
                    <p>Q: {q.question_text}</p>
                    <div className="mt-1 flex gap-2">
                      <input value={answer[q.id] ?? ''} onChange={(e) => setAnswer({ ...answer, [q.id]: e.target.value })} placeholder="Your answer (recorded in your words)" className={inputCls} aria-label="Answer" />
                      <button
                        onClick={() => void (async () => {
                          await foundationApi.questionAnswer(q.id, { answer_text: answer[q.id] ?? '' });
                          setDetail((await foundationApi.consultGet(detail.id)) as any);
                        })()}
                        className={ghostCls} disabled={!(answer[q.id] ?? '').trim()}>Answer</button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="text-sm"><p className="font-bold">Notes so far</p>
              {detail.notes.length === 0 ? <p className="opacity-70">None yet.</p> : detail.notes.map((n: any) => (
                <p key={n.id} className="rounded border p-2"><SourceBadge label="VET-RECORDED" /> {n.note_text}</p>
              ))}
            </div>
            <div className="text-sm"><p className="font-bold">Follow-ups</p>
              {detail.follow_ups.length === 0 ? <p className="opacity-70">None yet.</p> : detail.follow_ups.map((f: any) => (
                <p key={f.id}>{f.recommendation} [{f.status}]</p>
              ))}
            </div>
          </Card>

          {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' ? (
            <>
              <Card title="Add a note (recorded as your words — never an AI assessment)">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observation / note" className={inputCls} rows={3} aria-label="Note" />
                <input value={noteFollow} onChange={(e) => setNoteFollow(e.target.value)} placeholder="Follow-up guidance (optional)" className={inputCls} aria-label="Follow-up guidance" />
                <button
                  onClick={() => void (async () => {
                    await foundationApi.noteCreate(detail.id, { note_text: note, ...(noteFollow.trim() ? { follow_up_text: noteFollow.trim() } : {}) });
                    setNote('');
                    setNoteFollow('');
                    setDetail((await foundationApi.consultGet(detail.id)) as any);
                  })()}
                  className={btnCls} disabled={!note.trim()}>Record note</button>
              </Card>
              <Card title="Recommend a follow-up (creates the owner's reminder)">
                <input value={rec} onChange={(e) => setRec(e.target.value)} placeholder="e.g. Recheck weight in 14 days" className={inputCls} aria-label="Recommendation" />
                <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className={inputCls} aria-label="Due date" />
                <button
                  onClick={() => void (async () => {
                    await foundationApi.followupCreate(detail.id, {
                      recommendation: rec, ...(due ? { due_at: new Date(due).toISOString() } : {}),
                    });
                    setRec('');
                    setDue('');
                    setDetail((await foundationApi.consultGet(detail.id)) as any);
                  })()}
                  className={btnCls} disabled={!rec.trim()}>Recommend follow-up</button>
              </Card>
              <button
                onClick={() => void (async () => {
                  await foundationApi.consultComplete(detail.id);
                  setDetail((await foundationApi.consultGet(detail.id)) as any);
                  await load();
                })()}
                className={ghostCls}>Mark consultation complete</button>
            </>
          ) : <p className="text-sm opacity-70">This consultation is {detail.status}: notes and follow-ups are closed; the record stays readable.</p>}
        </div>
      )}

      {pkgView && (
        <Card title={`Shared package v${pkgView.version} · ${pkgView.status}`}>
          <p className="text-xs opacity-70">Digest <code>{pkgView.snapshot_digest}</code> · {pkgView.generated_by}</p>
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Frozen owner-approved snapshot — live records may have moved on; this view never changes.</p>
          <pre className="max-h-96 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">{JSON.stringify(pkgView.snapshot, null, 1).slice(0, 8000)}</pre>
        </Card>
      )}
    </div>
  );
}
