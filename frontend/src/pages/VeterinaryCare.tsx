/** VeterinaryCare.tsx — BIN3 owner experience: care team, prepare-for-vet
 * (review-before-share), shares + access history, consultations, questions,
 * follow-ups. Nothing is shown as "Shared" before the server acknowledges it.
 * Veterinary sharing requires an internet connection (server authorization). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';
import { usePawphileData } from '../context/PawphileDataContext';

type Tab = 'prepare' | 'team' | 'shares' | 'consults' | 'questions' | 'followups' | 'emergency';
type LoadState = 'loading' | 'ready' | 'error' | 'blocked' | 'offline';

const PURPOSES = ['VET_CONSULTATION', 'FOLLOW_UP', 'SECOND_OPINION', 'EMERGENCY_REVIEW', 'ROUTINE_REVIEW'];
const SCOPES = ['REPORT_ONLY', 'FULL_RECORD', 'SELECTED'];
const EXPIRIES = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
];

function usePetId(): string | undefined {
  const { selectedDog } = usePawphileData() as { selectedDog?: { id: string } };
  return selectedDog?.id;
}

function SourceBadge({ label }: { label: string }) {
  const color =
    label === 'VET-RECORDED' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
    : label === 'AI-DERIVED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
    : label === 'SYSTEM-DERIVED' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
    : label === 'CLINIC-RECORDED' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
    : label === 'IMPORTED' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${color}`}>{label}</span>;
}

function AiLabel() {
  return <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">PAWPHILE-generated — not veterinarian-verified.</p>;
}

function ConsentBlocked() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-5">
      <p className="font-black">Veterinary sharing is off</p>
      <p className="text-sm mt-1">Grant <strong>veterinary_sharing</strong> consent so PAWPHILE may prepare and share vet packages. Withdrawing it blocks new shares; existing active shares stay until they expire or you revoke them.</p>
      <Link to="/consent" className="inline-block mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">Open Consent Center</Link>
    </div>
  );
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
const btnCls = 'rounded bg-teal-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50';
const ghostCls = 'rounded border px-3 py-1.5 text-sm disabled:opacity-50';

export default function VeterinaryCare() {
  const petId = usePetId();
  const [tab, setTab] = useState<Tab>('prepare');
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');

  const [team, setTeam] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [consults, setConsults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);

  // prepare-form state
  const [pkgType, setPkgType] = useState('QUICK_SUMMARY');
  const [selTypes, setSelTypes] = useState('symptom,weight');
  const [reviewPkg, setReviewPkg] = useState<any>(null);
  const [share, setShare] = useState({ recipient: '', email: '', purpose: PURPOSES[0], scope: SCOPES[0], expiry: 24 * 7 });
  const [lastShare, setLastShare] = useState<any>(null);

  // team-form state
  const [member, setMember] = useState({ name: '', clinic: '', role: 'PRIMARY_VET', email: '' });
  // consult/question state
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [detail, setDetail] = useState<any>(null);
  const [qText, setQText] = useState('');
  const [outcome, setOutcome] = useState<Record<string, string>>({});
  const [emPkg, setEmPkg] = useState<any>(null);
  const [rels, setRels] = useState<any[]>([]);
  const [relOrg, setRelOrg] = useState('');

  async function load() {
    if (!petId) return;
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('loading');
    try {
      const [t, p, h, c, q, f] = await Promise.all([
        foundationApi.careTeamList(petId),
        foundationApi.packageList(petId),
        foundationApi.accessHistory(petId),
        foundationApi.consultList(petId),
        foundationApi.questionList(petId),
        foundationApi.followupList(petId),
      ]);
      setTeam(t as any[]);
      setPackages(p as any[]);
      setHistory(h as any);
      setConsults(c as any[]);
      setQuestions(q as any[]);
      setFollowups(f as any[]);
      try {
        setRels((await foundationApi.relList(petId)) as any[]);
      } catch {
        setRels([]);
      }
      setState('ready');
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 403) {
        setState('blocked');
        return;
      }
      setError(err.message || 'Could not load veterinary care.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  if (!petId) return <div className="mx-auto max-w-4xl p-4"><EmptyState title="No pet selected" hint="Select a pet to manage veterinary collaboration." /></div>;
  if (state === 'loading') return <div className="mx-auto max-w-4xl p-4"><LoadingState label="Loading veterinary care…" /></div>;
  if (state === 'error') return <div className="mx-auto max-w-4xl p-4"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (state === 'offline') return <div className="mx-auto max-w-4xl p-4"><EmptyState title="Veterinary sharing needs internet" hint="Preparing or approving shares requires server authorization. Drafted questions stay on this device until you are back online." /></div>;

  const tabs: Array<[Tab, string]> = [
    ['prepare', 'Prepare for vet'], ['team', 'Care team'], ['shares', 'Shares & access'],
    ['consults', 'Consultations'], ['questions', 'Questions'], ['followups', 'Follow-ups'],
    ['emergency', 'Emergency'],
  ];

  async function prepare() {
    if (!petId) return;
    try {
      const created = (await foundationApi.packageCreate(petId, {
        package_type: pkgType,
        selected_types: pkgType === 'SELECTED_RECORDS' ? selTypes.split(',').map((s) => s.trim()).filter(Boolean) : [],
      })) as any;
      const full = (await foundationApi.packageGet(petId, created.id)) as any;
      setReviewPkg(full);
      await load();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 403) setState('blocked');
      else setError(err.message || 'Could not prepare package.');
    }
  }

  async function approveAndShare() {
    if (!petId || !reviewPkg) return;
    if (!share.recipient.trim()) {
      setError('Name the recipient (vet / clinic) before sharing.');
      return;
    }
    try {
      await foundationApi.packageApprove(petId, reviewPkg.id);
      const expires_at = new Date(Date.now() + share.expiry * 3600 * 1000).toISOString();
      const res = (await foundationApi.packageShare(petId, reviewPkg.id, {
        recipient_label: share.recipient.trim(),
        purpose: share.purpose,
        scope: share.scope,
        selected_types: share.scope === 'SELECTED' ? selTypes.split(',').map((s) => s.trim()).filter(Boolean) : [],
        expires_at,
        ...(share.email.trim() ? { grantee_email: share.email.trim() } : {}),
      })) as any;
      setLastShare(res);
      setReviewPkg(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not share package.');
    }
  }

  const snap = reviewPkg?.snapshot as any;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-black">Veterinary Care</h1>
        <p className="text-sm opacity-70">You control what is shared, with whom, for how long. Review everything before approving — PAWPHILE never auto-shares.</p>
      </div>
      {state === 'blocked' ? <ConsentBlocked /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-3 py-1 text-sm font-bold ${tab === id ? 'bg-teal-600 text-white' : 'border'}`}>{label}</button>
        ))}
      </div>

      {tab === 'prepare' && (
        <div className="space-y-4">
          <Card title="1 · Prepare a draft package (not shared yet)">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">Package type
                <select value={pkgType} onChange={(e) => setPkgType(e.target.value)} className={inputCls}>
                  <option value="QUICK_SUMMARY">Quick summary</option>
                  <option value="FULL_REVIEW">Full review</option>
                  <option value="SELECTED_RECORDS">Selected records</option>
                </select>
              </label>
              {pkgType === 'SELECTED_RECORDS' ? (
                <label className="text-sm">Record types (comma-separated)
                  <input value={selTypes} onChange={(e) => setSelTypes(e.target.value)} className={inputCls} />
                </label>
              ) : null}
            </div>
            <button onClick={() => void prepare()} className={btnCls}>Prepare draft</button>
            <p className="text-xs opacity-70">Drafts include your open questions and descriptive intelligence with evidence. AI sections are labeled PAWPHILE-generated.</p>
          </Card>

          {packages.length > 0 && (
            <Card title="Drafts & versions">
              <ul className="space-y-1 text-sm">
                {packages.map((p: any) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{p.package_type} v{p.version}</span>
                    <span className="opacity-70">{p.status}{p.reviewed_by_owner ? ' · owner-reviewed' : ''}</span>
                    <button onClick={() => void (async () => setReviewPkg((await foundationApi.packageGet(petId, p.id)) as any))()} className="underline">Review</button>
                    {p.status === 'SHARED' ? (
                      <button onClick={() => void (async () => { await foundationApi.packageNewVersion(petId, p.id); await load(); })()} className="underline">New version</button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {snap && (
            <Card title={`2 · Review exactly what will be shared (${reviewPkg.package_type} v${reviewPkg.version})`}>
              <p className="text-xs opacity-70">Digest <code>{reviewPkg.snapshot_digest}</code> · {reviewPkg.generated_by}</p>
              <AiLabel />
              <div className="text-sm"><p className="font-bold">Timeline ({snap.timeline?.length ?? 0})</p>
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {(snap.timeline ?? []).slice(0, 20).map((t: any) => (
                    <li key={t.id}><SourceBadge label={t.source_label} /> {t.title ?? t.event_type} <span className="opacity-60">{(t.effective_at ?? '').slice(0, 10)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>Medications: <strong>{snap.medications?.length ?? 0}</strong></p>
                <p>Allergies: <strong>{snap.allergies?.length ?? 0}</strong></p>
                <p>Symptoms: <strong>{snap.symptoms?.length ?? 0}</strong></p>
                <p>Files: <strong>{snap.files?.length ?? 0}</strong> (metadata only)</p>
                <p>Data gaps: <strong>{(snap.intelligence?.data_gaps ?? []).join(', ') || 'none major'}</strong></p>
                <p>Owner questions: <strong>{snap.owner_questions?.length ?? 0}</strong></p>
              </div>
              <p className="text-xs opacity-70">{snap.disclaimer}</p>
            </Card>
          )}

          {snap && (
            <Card title="3 · Approve & share (explicit approval required)">
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={share.recipient} onChange={(e) => setShare({ ...share, recipient: e.target.value })} placeholder="Recipient (vet / clinic)" className={inputCls} aria-label="Recipient" />
                <input value={share.email} onChange={(e) => setShare({ ...share, email: e.target.value })} placeholder="Vet's PAWPHILE email (to enable portal access)" className={inputCls} aria-label="Vet email" />
                <label className="text-sm">Purpose
                  <select value={share.purpose} onChange={(e) => setShare({ ...share, purpose: e.target.value })} className={inputCls}>
                    {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="text-sm">Scope
                  <select value={share.scope} onChange={(e) => setShare({ ...share, scope: e.target.value })} className={inputCls}>
                    {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-sm">Expires after
                  <select value={share.expiry} onChange={(e) => setShare({ ...share, expiry: Number(e.target.value) })} className={inputCls}>
                    {EXPIRIES.map((x) => <option key={x.label} value={x.hours}>{x.label}</option>)}
                  </select>
                </label>
              </div>
              <p className="text-xs opacity-70">Sharing <strong>{share.scope}</strong> for <strong>{share.purpose}</strong>. No indefinite access — every share expires and can be revoked instantly.</p>
              <button onClick={() => void approveAndShare()} className={btnCls}>Review done — approve & share</button>
            </Card>
          )}
          {lastShare && <p className="text-sm text-teal-700">Shared. Scope {lastShare.scope} · purpose {lastShare.purpose} · status {lastShare.status}. The vet sees the frozen package version.</p>}
        </div>
      )}

      {tab === 'team' && (
        <Card title="My care team (pet-specific)">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} placeholder="Vet / provider name" className={inputCls} aria-label="Provider name" />
            <input value={member.clinic} onChange={(e) => setMember({ ...member, clinic: e.target.value })} placeholder="Clinic (optional)" className={inputCls} aria-label="Clinic" />
            <select value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value })} className={inputCls} aria-label="Role">
              {['PRIMARY_VET', 'SPECIALIST', 'EMERGENCY_CLINIC', 'SECONDARY_VET', 'OTHER_CARE_PROVIDER'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} placeholder="Vet's PAWPHILE email (optional link)" className={inputCls} aria-label="Vet email" />
          </div>
          <button
            onClick={() => void (async () => {
              await foundationApi.careTeamAdd(petId, {
                display_name: member.name, clinic_name: member.clinic || undefined,
                role: member.role, ...(member.email.trim() ? { vet_email: member.email.trim() } : {}),
              });
              setMember({ name: '', clinic: '', role: 'PRIMARY_VET', email: '' });
              await load();
            })()}
            className={btnCls} disabled={!member.name.trim()}>Add provider</button>
          {team.length === 0 ? <EmptyState title="No care team yet" hint="Add your veterinarian to start the continuity loop." /> : (
            <ul className="space-y-2">
              {team.map((m: any) => (
                <li key={m.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-bold">{m.display_name} <span className="font-normal opacity-70">{m.role} · {m.status}</span></p>
                  <p className="opacity-70">{m.verification_label}</p>
                  {m.status === 'ACTIVE' ? (
                    <button onClick={() => void (async () => { await foundationApi.careTeamEnd(petId, m.id); await load(); })()} className="mt-1 text-sm underline">End relationship</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'shares' && (
        <div className="space-y-4">
          <Card title="Organization relationships (clinics / partners)">
            <div className="flex gap-2">
              <input value={relOrg} onChange={(e) => setRelOrg(e.target.value)} placeholder="Clinic organization ID (shared by the clinic)" className={inputCls} aria-label="Organization ID" />
              <button onClick={() => void (async () => { await foundationApi.relCreate(petId, { org_id: relOrg.trim(), purpose: 'ROUTINE_REVIEW', scope: 'REPORT_ONLY' }); setRelOrg(''); setRels((await foundationApi.relList(petId)) as any[]); await load(); })()} className={btnCls} disabled={!relOrg.trim()}>Link</button>
            </div>
            {rels.length === 0 ? <p className="text-sm opacity-70">No organization links. Partner API and clinic workflows use these — never membership alone.</p> : (
              <ul className="space-y-1 text-sm">
                {rels.map((r: any) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{(r.org_id ?? '').slice(0, 8)}…</span>
                    <span>{r.purpose} · {r.scope} · {r.status}</span>
                    {r.status === 'ACTIVE' ? (
                      <button onClick={() => void (async () => { await foundationApi.relUpdate(petId, r.id, { status: 'REVOKED' }); setRels((await foundationApi.relList(petId)) as any[]); })()} className="underline">Revoke</button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Active & past shares">
            {(history?.shares ?? []).length === 0 ? <EmptyState title="No shares" hint="Approved packages appear here with access logging." /> : (
              <ul className="space-y-2 text-sm">
                {(history?.shares ?? []).map((s: any) => (
                  <li key={s.id} className="rounded-lg border p-3">
                    <p className="font-bold">{s.recipient_label}</p>
                    <p className="opacity-70">{s.scope} · {s.purpose ?? 'no purpose'} · {s.status} · opened {s.access_count}×{s.expires_at ? ` · expires ${(s.expires_at ?? '').slice(0, 10)}` : ''}</p>
                    <div className="mt-1 flex gap-3">
                      {s.status === 'ACTIVE' ? (
                        <button onClick={() => void (async () => { await foundationApi.revokeShare(petId, s.id); await load(); })()} className="underline">Revoke now</button>
                      ) : null}
                      {!s.grantee_linked && s.status === 'ACTIVE' ? (
                        <Link to="/share" className="underline">Link vet account</Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Access history (who · what · when · until when)">
            {(history?.events ?? []).length === 0 ? <p className="text-sm opacity-70">No collaboration events yet.</p> : (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {(history?.events ?? []).map((e: any, i: number) => (
                  <li key={i}><span className="font-bold">{e.action}</span> <span className="opacity-60">{(e.created_at ?? '').slice(0, 16).replace('T', ' ')}</span></li>
                ))}
              </ul>
            )}
            <p className="text-xs opacity-70">{history?.consent_rule}</p>
          </Card>
        </div>
      )}

      {tab === 'consults' && (
        <div className="space-y-4">
          <Card title="Consultations (records of collaboration, not bookings)">
            <div className="flex gap-2">
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} aria-label="Purpose">
                {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => void (async () => { await foundationApi.consultCreate(petId, { purpose }); await load(); })()} className={btnCls}>Start</button>
            </div>
            <ul className="space-y-1 text-sm">
              {consults.map((c: any) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{c.purpose}</span><span className="opacity-70">{c.status}</span>
                  <button onClick={() => void (async () => setDetail((await foundationApi.consultGet(c.id)) as any)())} className="underline">Open</button>
                  {c.status !== 'COMPLETED' && c.status !== 'CANCELLED' ? (
                    <button onClick={() => void (async () => { await foundationApi.consultComplete(c.id); await load(); })()} className="underline">Complete</button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
          {detail && (
            <Card title={`Consultation ${detail.purpose} · ${detail.status}`}>
              <div className="text-sm"><p className="font-bold">Veterinary notes</p>
                {detail.notes.length === 0 ? <p className="opacity-70">No vet feedback yet.</p> : detail.notes.map((n: any) => (
                  <div key={n.id} className="rounded border p-2"><SourceBadge label="VET-RECORDED" />
                    <p className="mt-1">{n.note_text}</p>
                    {n.follow_up_text ? <p className="mt-1 opacity-80">Follow-up guidance: {n.follow_up_text}</p> : null}
                  </div>
                ))}
              </div>
              <div className="text-sm"><p className="font-bold">Questions</p>
                {detail.questions.length === 0 ? <p className="opacity-70">None.</p> : detail.questions.map((q: any) => (
                  <p key={q.id}>Q: {q.question_text} → {q.answer_text ?? '(awaiting vet)'} [{q.status}]</p>
                ))}
              </div>
              <div className="text-sm"><p className="font-bold">Follow-ups</p>
                {detail.follow_ups.length === 0 ? <p className="opacity-70">None.</p> : detail.follow_ups.map((f: any) => (
                  <p key={f.id}>{f.recommendation} [{f.status}]</p>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <Card title="Questions for the vet (PAW AI never answers these as the vet)">
          <div className="flex gap-2">
            <input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="e.g. What should I monitor?" className={inputCls} aria-label="Question" />
            <button onClick={() => void (async () => { await foundationApi.questionCreate(petId, { question_text: qText }); setQText(''); await load(); })()} className={btnCls} disabled={!qText.trim()}>Ask</button>
          </div>
          <ul className="space-y-2 text-sm">
            {questions.map((q: any) => (
              <li key={q.id} className="rounded-lg border p-2">
                <p><strong>Q:</strong> {q.question_text} [{q.status}]</p>
                {q.answer_text ? <p><strong>Vet:</strong> {q.answer_text}</p> : null}
                {q.status === 'ANSWERED' ? (
                  <button onClick={() => void (async () => { await foundationApi.questionUpdate(q.id, { status: 'RESOLVED' }); await load(); })()} className="underline">Mark resolved</button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'followups' && (
        <Card title="Follow-ups (vet words → reminder → your outcome)">
          {followups.length === 0 ? <EmptyState title="No follow-ups" hint="Veterinarian recommendations appear here with reminders." /> : (
            <ul className="space-y-2 text-sm">
              {followups.map((f: any) => (
                <li key={f.id} className="rounded-lg border p-3">
                  <p>{f.recommendation}</p>
                  <p className="opacity-70">{f.status}{f.due_at ? ` · due ${(f.due_at ?? '').slice(0, 10)}` : ''}</p>
                  <p className="text-xs opacity-60">Recorded as the veterinarian&rsquo;s recommendation — not PAWPHILE&rsquo;s.</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {f.status === 'OPEN' ? (
                      <button onClick={() => void (async () => { await foundationApi.followupUpdate(f.id, { status: 'ACKNOWLEDGED' }); await load(); })()} className={ghostCls}>Acknowledge</button>
                    ) : null}
                    {f.status === 'OPEN' || f.status === 'ACKNOWLEDGED' ? (
                      <>
                        <input value={outcome[f.id] ?? ''} onChange={(e) => setOutcome({ ...outcome, [f.id]: e.target.value })} placeholder="Outcome note" className="rounded border px-2 py-1 text-sm" aria-label="Outcome note" />
                        <button onClick={() => void (async () => { await foundationApi.followupUpdate(f.id, { status: 'COMPLETED', outcome_note: outcome[f.id] ?? '' }); await load(); })()} className={ghostCls}>Complete</button>
                        <button onClick={() => void (async () => { await foundationApi.followupUpdate(f.id, { status: 'DISMISSED' }); await load(); })()} className={ghostCls}>Dismiss</button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'emergency' && (
        <div className="space-y-4">
          <Card title="Emergency packet (continuity aid — never a diagnosis)">
            <p className="text-sm opacity-70">Freezes the minimum a vet needs urgently: identity, allergies, medications, recent events, symptoms, visits, files. Still reviewed and approved by you — speed comes from the minimal format, not from skipping consent.</p>
            <button
              onClick={() => void (async () => {
                try {
                  const created = (await foundationApi.emergencyCreate(petId)) as any;
                  setEmPkg((await foundationApi.packageGet(petId, created.id)) as any);
                  await load();
                } catch (e: unknown) {
                  const err = e as Error & { status?: number };
                  if (err.status === 403) setState('blocked');
                  else setError(err.message || 'Could not prepare emergency packet.');
                }
              })()}
              className={btnCls}>Generate emergency packet</button>
          </Card>
          {emPkg && (
            <Card title={`Review emergency packet (digest ${emPkg.snapshot_digest})`}>
              <AiLabel />
              {(() => {
                const s = emPkg.snapshot as any;
                return (
                  <div className="space-y-2 text-sm">
                    <p><strong>{s.pet?.name}</strong> · {s.pet?.breed ?? ''} · generated {(s.generated_at ?? '').slice(0, 16).replace('T', ' ')}</p>
                    <p>Allergies: <strong>{(s.allergies ?? []).map((a: any) => a.allergen).join(', ') || 'none recorded'}</strong></p>
                    <p>Medications: <strong>{(s.medications ?? []).map((m: any) => m.name).join(', ') || 'none recorded'}</strong></p>
                    <p>Recent events: {(s.recent_events ?? []).length} · Symptoms: {(s.current_symptoms ?? []).length} · Files: {(s.files ?? []).length}</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {(s.recent_events ?? []).slice(0, 15).map((t: any, i: number) => (
                        <li key={i}><SourceBadge label={t.source_label ?? 'OWNER-RECORDED'} /> {t.title ?? t.event_type}</li>
                      ))}
                    </ul>
                    <p className="text-xs opacity-70">{s.disclaimer}</p>
                    <button
                      onClick={() => void (async () => {
                        await foundationApi.packageApprove(petId, emPkg.id);
                        const expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                        const res = (await foundationApi.packageShare(petId, emPkg.id, {
                          recipient_label: 'Emergency clinic', purpose: 'EMERGENCY_REVIEW',
                          scope: 'FULL_RECORD', expires_at,
                        })) as any;
                        setLastShare(res);
                        setEmPkg(null);
                        await load();
                      })()}
                      className={btnCls}>Reviewed — approve & share (24h)</button>
                  </div>
                );
              })()}
            </Card>
          )}
          {lastShare && <p className="text-sm text-teal-700">Shared for {lastShare.purpose}. Revoke it in Shares &amp; access when the emergency passes.</p>}
        </div>
      )}
    </div>
  );
}
