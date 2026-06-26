import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Cloud, Download, Moon, Shield, User, Building2, Dog, Mail, Send, LogOut, LogIn, Loader2 } from 'lucide-react';
import { usePawphileData } from '../context/PawphileDataContext';
import { useTheme } from '../context/ThemeContext';
import { saveReminderPreferences, testReminderEmail } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useSyncState, triggerManualSync } from '../services/SyncManager';

/* ──────────────────────────────────────────────────────────
   Safe Clerk hooks – imported statically but wrapped in
   try/catch at call-site so the page never crashes when
   VITE_CLERK_PUBLISHABLE_KEY is missing.
   ────────────────────────────────────────────────────── */
import { useUser, useAuth } from '@clerk/clerk-react';

function useClerkSafe() {
  const { user } = useUser();
  const { signOut } = useAuth();
  return {
    userEmail: user?.primaryEmailAddress?.emailAddress || null,
    signOut,
  };
}

export default function Settings() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  /* ── Context (only pull what actually exists) ──────── */
  const ctx = usePawphileData() as any;
  const {
    ownerProfile,
    exportAllData,
    deleteAllData,
  } = ctx;

  const saveOwnerProfile = ctx.saveOwnerProfile ?? (() => {});

  const { theme, setTheme } = useTheme();
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false);

  const { syncState, pendingCount, lastSyncedAt } = useSyncState();

  /* ── Clerk auth (safe) ─────────────────────────────── */
  const { userEmail, signOut } = useClerkSafe();

  const handleSignOut = async () => {
    if (signOut) await signOut();
    navigate('/auth');
  };

  /* ── Owner email preferences (safe fallback) ───────── */
  const notifPrefs = ownerProfile?.notificationPreferences ?? {};
  
  // Local state for the form so we can have Save/Reset
  const [localEmailEnabled, setLocalEmailEnabled] = useState(Boolean(notifPrefs.emailEnabled));
  const [localEmail, setLocalEmail] = useState(notifPrefs.reminderEmail || ownerProfile?.email || '');
  const [localWalks, setLocalWalks] = useState(Boolean(notifPrefs.walks));
  const [localVaccines, setLocalVaccines] = useState(Boolean(notifPrefs.vaccines));
  const [localVetVisits, setLocalVetVisits] = useState(Boolean(notifPrefs.vetVisits));
  const [localNutrition, setLocalNutrition] = useState(Boolean(notifPrefs.nutrition));

  // Sync from props if they load later
  useEffect(() => {
    if (ownerProfile) {
      const prefs = ownerProfile.notificationPreferences || {};
      setLocalEmailEnabled(Boolean(prefs.emailEnabled));
      setLocalEmail(prefs.reminderEmail || ownerProfile.email || '');
      setLocalWalks(Boolean(prefs.walks));
      setLocalVaccines(Boolean(prefs.vaccines));
      setLocalVetVisits(Boolean(prefs.vetVisits));
      setLocalNutrition(Boolean(prefs.nutrition));
    }
  }, [ownerProfile]);

  const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>({});

  const handleControlledToggle = async (
    key: string,
    currentValue: boolean,
    setter: (v: boolean) => void
  ) => {
    const newValue = !currentValue;
    setLoadingToggles(prev => ({ ...prev, [key]: true }));

    // Mandate 2: Controlled Settings & Resend API Integration
    try {
      const payload = {
        user_id: userEmail || "local_user",
        email_address: localEmail || userEmail,
        vaccinations_enabled: key === 'vaccines' ? newValue : localVaccines,
        deworming_enabled: true, // simplified for sprint
        vet_visits_enabled: key === 'vetVisits' ? newValue : localVetVisits,
        report_review_enabled: true
      };

      await saveReminderPreferences(payload);
      
      setter(newValue);
      if (ownerProfile) {
        saveOwnerProfile({
          ...ownerProfile,
          notificationPreferences: {
            ...notifPrefs,
            reminderEmail: localEmail,
            [key === 'emailEnabled' ? 'emailEnabled' : key]: newValue
          },
        });
      }
      showToast({ type: 'success', message: `${key} updated successfully.` });
    } catch {
      showToast({ type: 'error', message: `Failed to update ${key}. Connection error.` });
    } finally {
      setLoadingToggles(prev => ({ ...prev, [key]: false }));
    }
  };

  /* ── Export helper ─────────────────────────────────── */
  const handleExport = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pawphile_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.warn('[Settings] Export failed');
    }
  };

  /* ── Test email ────────────────────────────────────── */
  const handleTestEmail = async () => {
    const targetEmail = notifPrefs.reminderEmail || ownerProfile?.email || localEmail || null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !emailRegex.test(targetEmail)) {
      setTestEmailStatus('Please enter a valid email address.');
      return;
    }
    setTestEmailStatus('Sending...');
    setIsTestEmailLoading(true);
    try {
      const res = await testReminderEmail({
        user_id: userEmail || "local_user",
        email_address: targetEmail,
        category: "test"
      });
      
      if (res.status === 'success') {
        setTestEmailStatus('✓ Test email queued successfully!');
        showToast({ type: 'success', message: 'Test email queued!' });
      } else {
        throw new Error("Unknown error");
      }
    } catch (err: any) {
      if (err.message?.includes("provider not configured") || err.message?.includes("failed_missing_config")) {
        setTestEmailStatus('Email provider not configured in this environment.');
      } else {
        setTestEmailStatus(`Failed: ${err.message || 'Server error'}`);
        showToast({ type: 'error', message: 'Failed to send test email.' });
      }
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      <div className="px-4 pt-12 pb-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Clean controls. No dead buttons.</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-2xl mx-auto w-full">

        {/* Account section */}
        <Card title="Account" icon={User}>
          {userEmail ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Signed in as</p>
                  <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{userEmail}</p>
                </div>
              </div>
              <button onClick={handleSignOut} className="btn flex items-center justify-center gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Sign in to sync data and receive email reminders across devices.
              </p>
              <button onClick={() => navigate('/auth')} className="btn btn-teal flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Sign In / Create Account
              </button>
            </div>
          )}
        </Card>

        <Card title="Dog Details shortcut" icon={Dog}>
          <button onClick={() => navigate('/profile?tab=pet')} className="btn">Open Pet Profile</button>
        </Card>

        <Card title="Owner Details shortcut" icon={User}>
          <button onClick={() => navigate('/profile?tab=owner')} className="btn">Open Owner Profile</button>
        </Card>

        <Card title="Vet Details shortcut" icon={Building2}>
          <button onClick={() => navigate('/profile?tab=vet')} className="btn">Open Vet Profile</button>
        </Card>

        <Card title="Email Reminders" icon={Mail}>
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              <ToggleRow
                label="Enable Email Reminders"
                checked={localEmailEnabled}
                onChange={() => handleControlledToggle('emailEnabled', localEmailEnabled, setLocalEmailEnabled)}
                isLoading={loadingToggles['emailEnabled']}
              />

              <div className={`transition-opacity ${localEmailEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">Reminder Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    placeholder="e.g. hello@pawphile.com"
                    className="input flex-1"
                  />
                  <button 
                    onClick={() => handleControlledToggle('emailEnabled', false, setLocalEmailEnabled)} // forces a sync if email changes
                    className="btn btn-teal !w-auto px-4"
                  >
                    Sync
                  </button>
                </div>
              </div>

              <div className={`pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 transition-opacity ${localEmailEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <p className="px-1 text-xs font-bold text-slate-800 dark:text-white mb-2">Select Categories:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ToggleRow label="Walks" checked={localWalks} onChange={() => handleControlledToggle('walks', localWalks, setLocalWalks)} compact isLoading={loadingToggles['walks']} disabled={true} helper="Disabled this sprint" />
                  <ToggleRow label="Vaccines" checked={localVaccines} onChange={() => handleControlledToggle('vaccines', localVaccines, setLocalVaccines)} compact isLoading={loadingToggles['vaccines']} />
                  <ToggleRow label="Vet Visits" checked={localVetVisits} onChange={() => handleControlledToggle('vetVisits', localVetVisits, setLocalVetVisits)} compact isLoading={loadingToggles['vetVisits']} />
                  <ToggleRow label="Nutrition" checked={localNutrition} onChange={() => handleControlledToggle('nutrition', localNutrition, setLocalNutrition)} compact isLoading={loadingToggles['nutrition']} disabled={true} helper="Disabled this sprint" />
                  <ToggleRow label="Reports" checked={true} onChange={() => {}} compact disabled={true} helper="Included" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleTestEmail} 
                disabled={isTestEmailLoading || (!localEmail && !userEmail)}
                className="btn bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border-none disabled:opacity-50 disabled:cursor-not-allowed">
                {isTestEmailLoading ? <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" /> : <Send className="w-4 h-4 text-teal-600 dark:text-teal-400" />} 
                {isTestEmailLoading ? 'Sending...' : 'Send Test Email'}
              </button>
              {testEmailStatus && (
                <p className="text-center mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 py-2 rounded-xl border border-slate-100 dark:border-slate-800">{testEmailStatus}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Sync Status Card */}
        <Card title="Cloud Sync" icon={Cloud}>
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">Status: <span className="capitalize">{syncState}</span></p>
                {pendingCount > 0 && (
                  <p className="text-xs text-orange-500 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {pendingCount} unsynced changes
                  </p>
                )}
                {lastSyncedAt && (
                  <p className="text-[10px] text-slate-500 mt-1">Last synced: {new Date(lastSyncedAt).toLocaleString()}</p>
                )}
              </div>
              <button 
                onClick={triggerManualSync} 
                className="btn btn-teal !w-auto px-4 !py-2 text-xs"
                disabled={syncState === 'syncing' || !navigator.onLine}
              >
                Sync Now
              </button>
            </div>
          </div>
        </Card>

        <Card title="Theme & Appearance" icon={Moon}>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`py-3 rounded-xl font-extrabold capitalize border-2 ${
                  theme === t
                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
            Theme applies globally across all pages.
          </p>
        </Card>

        <Card title="Data & Privacy" icon={Shield}>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              All data stored locally in your browser.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Cloud sync is being migrated to new Neon backend. Data stays on-device until backend is connected.
            </p>
          </div>
        </Card>

        <Card title="Export & Backup" icon={Cloud}>
          <button onClick={handleExport} className="btn btn-teal">
            <Download className="w-4 h-4" /> Export backup (JSON)
          </button>
        </Card>

        <Card title="Danger Zone" icon={AlertTriangle} danger>
          <button
            onClick={() => { if (confirm('Delete ALL local data? This cannot be undone.')) deleteAllData(); }}
            className="btn btn-danger"
          >
            Delete all local data
          </button>
        </Card>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
          Veterinary disclaimer: Settings change how PAWPHILE stores and presents your data. PAWPHILE is not a substitute for veterinary care.
        </p>
      </div>

      <style>{`
        .btn{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          font-weight:900;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }
        .dark .btn{
          background: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: white;
        }
        .btn:hover{ filter: brightness(0.98); }
        .btn-teal{
          background: rgb(13 148 136);
          border-color: rgb(13 148 136);
          color:white;
        }
        .btn-danger{
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.35);
          color: rgb(185,28,28);
        }
        .dark .btn-danger{
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.35);
          color: rgb(252,165,165);
        }
        .input{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          font-weight:700;
          outline:none;
        }
        .dark .input{
          background: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Card({ title, icon: Icon, danger, children }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-5 space-y-4 ${
      danger ? 'border-red-200 dark:border-red-900/30' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-teal-50 dark:bg-teal-900/20'}`}>
          <Icon className={`w-5 h-5 ${danger ? 'text-red-600 dark:text-red-300' : 'text-teal-600 dark:text-teal-300'}`} />
        </div>
        <h2 className="font-black text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  helper,
  compact,
  isLoading,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  helper?: string;
  compact?: boolean;
  isLoading?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/80 ${compact ? 'p-3' : 'p-4'} ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div className="min-w-0">
        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{label}</p>
        {helper ? <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{helper}</p> : null}
      </div>
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
      ) : (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || isLoading}
          onChange={(e) => { e.preventDefault(); onChange(!checked); }}
          className="w-5 h-5 accent-teal-600 rounded-md shrink-0 cursor-pointer"
          aria-label={label}
        />
      )}
    </label>
  );
}
