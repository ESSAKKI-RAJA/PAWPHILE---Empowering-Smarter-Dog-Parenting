/** Organizations.tsx — BIN4 clinic/org administration: identity, members with
 * distinct clinical vs administrative authority, professional verification
 * review, and pet relationships. Membership never implies pet access. */
import { useEffect, useState } from 'react';
import { foundationApi } from '../services/foundationApi';
import { EmptyState, ErrorState, LoadingState } from '../components/foundation/DataStates';

const inputCls = 'rounded border px-2 py-1 text-sm w-full dark:bg-slate-800';
const btnCls = 'rounded bg-teal-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50';
const ghostCls = 'rounded border px-3 py-1.5 text-sm disabled:opacity-50';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function Organizations() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [profs, setProfs] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('STAFF');
  const [profName, setProfName] = useState('');

  async function load() {
    setState('loading');
    try {
      setOrgs(((await foundationApi.orgList()) as any).organizations ?? []);
      setState('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load organizations.');
      setState('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openOrg(o: any) {
    setOpen(o);
    try {
      setMembers((await foundationApi.orgMembers(o.id)) as any[]);
      setProfs((await foundationApi.profList(o.id)) as any[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load organization.');
    }
  }

  if (state === 'loading') return <div className="mx-auto max-w-4xl p-4"><LoadingState label="Loading organizations…" /></div>;
  if (state === 'error') return <div className="mx-auto max-w-4xl p-4"><ErrorState message={error} onRetry={() => void load()} /></div>;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-black">Organizations</h1>
        <p className="text-sm opacity-70">Clinics and partners. Administer members and verify professionals — pet access always stays owner-granted per pet.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card title="Create organization">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic / organization name" className={inputCls} aria-label="Organization name" />
          <button onClick={() => void (async () => { await foundationApi.orgCreate({ name }); setName(''); await load(); })()} className={btnCls} disabled={!name.trim()}>Create</button>
        </div>
        <p className="text-xs opacity-70">You become OWNER. OWNER/ADMIN administer; VETERINARIAN/TECHNICIAN/STAFF/VIEWER do not gain pet access by membership.</p>
      </Card>

      <Card title="My organizations">
        {orgs.length === 0 ? <EmptyState title="No organizations" hint="Create one above or ask an admin to add you." /> : (
          <ul className="space-y-2 text-sm">
            {orgs.map((o: any) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="font-bold">{o.name}</span>
                <span className="opacity-70">{o.org_type} · {o.status} · my role {o.my_role}</span>
                <button onClick={() => void openOrg(o)} className="underline">Manage</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <>
          <Card title={`Members · ${open.name}`}>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="Member email" className={inputCls} aria-label="Member email" />
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className={inputCls} aria-label="Role">
                {['OWNER', 'ADMIN', 'VETERINARIAN', 'TECHNICIAN', 'CARE_COORDINATOR', 'STAFF', 'VIEWER'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => void (async () => { await foundationApi.orgMemberAdd(open.id, { user_email: memberEmail, role: memberRole }); setMemberEmail(''); setMembers((await foundationApi.orgMembers(open.id)) as any[]); })()} className={btnCls} disabled={!memberEmail.trim()}>Add</button>
            </div>
            <ul className="space-y-1 text-sm">
              {members.map((m: any) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{m.user_id.slice(0, 8)}…</span>
                  <span>{m.role} · {m.status}</span>
                  {m.status === 'ACTIVE' ? (
                    <button onClick={() => void (async () => { await foundationApi.orgMemberUpdate(open.id, m.id, { status: 'SUSPENDED' }); setMembers((await foundationApi.orgMembers(open.id)) as any[]); })()} className="underline">Suspend</button>
                  ) : (
                    <button onClick={() => void (async () => { await foundationApi.orgMemberUpdate(open.id, m.id, { status: 'ACTIVE' }); setMembers((await foundationApi.orgMembers(open.id)) as any[]); })()} className="underline">Reactivate</button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Professionals · ${open.name}`}>
            <div className="flex gap-2">
              <input value={profName} onChange={(e) => setProfName(e.target.value)} placeholder="Professional display name" className={inputCls} aria-label="Professional name" />
              <button onClick={() => void (async () => { await foundationApi.profCreate({ display_name: profName, org_id: open.id }); setProfName(''); setProfs((await foundationApi.profList(open.id)) as any[]); })()} className={btnCls} disabled={!profName.trim()}>Register (unverified)</button>
            </div>
            <ul className="space-y-2 text-sm">
              {profs.map((p: any) => (
                <li key={p.id} className="rounded-lg border p-3">
                  <p className="font-bold">{p.display_name}</p>
                  <p className="opacity-70">{p.verification_label}</p>
                  <div className="mt-1 flex gap-3">
                    {p.verification_state === 'PENDING' ? (
                      <button onClick={() => void (async () => { await foundationApi.profReview(p.id, { approve: true }); setProfs((await foundationApi.profList(open.id)) as any[]); })()} className={ghostCls}>Approve (attest license on file)</button>
                    ) : null}
                    {p.verification_state === 'VERIFIED' || p.verification_state === 'PENDING' ? (
                      <button onClick={() => void (async () => { await foundationApi.profSuspend(p.id); setProfs((await foundationApi.profList(open.id)) as any[]); })()} className="underline">Suspend</button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-70">Approval records org-attested verification with license evidence — never self-asserted, never an independent credential check. Suspended professionals lose vet access immediately.</p>
          </Card>
        </>
      )}
    </div>
  );
}
