import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Settings, ShieldAlert, CheckCircle, AlertTriangle, Calendar, FileText, Flame, Activity } from "lucide-react";
import NotificationBell from "../components/layout/NotificationBell";
import { usePawphileData } from "../context/PawphileDataContext";
import { daysUntil } from "../lib/dateUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    selectedDog,
    vaccineRecords,
    vetVisits,
    nutritionLogs,
    behaviorLogs,
  } = usePawphileData();

  const dogId = selectedDog?.id;

  // 1. Current Health Status Calculation
  const healthStatus = useMemo(() => {
    if (!dogId) return null;
    let status: 'Healthy' | 'Needs Attention' | 'At Risk' = 'Healthy';
    
    // Check overdue vaccines
    const overdueVacs = vaccineRecords.filter(v => v.dogId === dogId && daysUntil(v.nextDueDate) < 0);
    if (overdueVacs.length > 0) status = 'Needs Attention';

    // Check overdue vet visits
    const overdueVets = vetVisits.filter(v => v.dogId === dogId && v.followUpRequired && v.nextVisitDate && daysUntil(v.nextVisitDate) < 0);
    if (overdueVets.length > 0) status = 'Needs Attention';

    // Check recent behavior (anxiety/aggression)
    const recentBehavior = behaviorLogs.filter(b => b.dogId === dogId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
    const hasBadBehavior = recentBehavior.some(b => b.mood === 'aggressive' || b.mood === 'anxious');
    if (hasBadBehavior) status = 'Needs Attention';

    // If there are multiple flags, escalate to At Risk
    if (overdueVacs.length > 0 && overdueVets.length > 0) status = 'At Risk';

    return status;
  }, [dogId, vaccineRecords, vetVisits, behaviorLogs]);

  // 2. Upcoming Events Calculation
  const upcomingEvents = useMemo(() => {
    if (!dogId) return [];
    const events: any[] = [];
    
    // Vaccines
    vaccineRecords.filter(v => v.dogId === dogId).forEach(v => {
      const days = daysUntil(v.nextDueDate);
      if (days >= 0 && days <= 30) {
        events.push({ type: 'Vaccine', title: v.vaccineName, date: v.nextDueDate, days, icon: ShieldAlert, color: 'text-teal-500' });
      }
    });

    // Vet Visits
    vetVisits.filter(v => v.dogId === dogId && v.followUpRequired && v.nextVisitDate).forEach(v => {
      const days = daysUntil(v.nextVisitDate!);
      if (days >= 0 && days <= 30) {
        events.push({ type: 'Vet Visit', title: `Follow-up: ${v.clinicName}`, date: v.nextVisitDate, days, icon: Calendar, color: 'text-indigo-500' });
      }
    });

    return events.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [dogId, vaccineRecords, vetVisits]);

  // 3. Recent Records Feed
  const recentRecords = useMemo(() => {
    if (!dogId) return [];
    const feed: any[] = [];
    
    vetVisits.filter(v => v.dogId === dogId).forEach(v => {
      feed.push({ type: 'Vet Visit', title: v.visitType, subtitle: v.clinicName, date: v.visitDate, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' });
    });

    nutritionLogs.filter(n => n.dogId === dogId).forEach(n => {
      feed.push({ type: 'Nutrition', title: n.foodName || n.mealDescription || 'Meal', subtitle: `${n.calories || n.caloriesCal || 0} kcal`, date: n.createdAt.split('T')[0], icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' });
    });

    behaviorLogs.filter(b => b.dogId === dogId).forEach(b => {
      feed.push({ type: 'Behavior', title: b.mood, subtitle: `Activity: ${b.activityLevel}`, date: b.createdAt.split('T')[0], icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' });
    });

    return feed.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [dogId, vetVisits, nutritionLogs, behaviorLogs]);

  if (!selectedDog) {
    return (
      <div className="pw-page flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Welcome to PAWPHILE</h1>
        <p className="text-sm font-semibold mb-8 text-center max-w-xs text-slate-500">Your dog's complete health record. Add a profile to start.</p>
        <button onClick={() => navigate("/profile")} className="pw-btn-teal text-base px-8 py-4">+ Add Dog Profile</button>
      </div>
    );
  }

  return (
    <div className="pw-page pb-28 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-black text-lg tracking-tight">PAWPHILE Dashboard</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">Sign In</button>
            </SignInButton>
          </SignedOut>
          <button onClick={() => navigate("/settings")} className="p-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Settings className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto">
        {/* 1. Dog Information */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-teal-50 dark:bg-teal-900/30 flex-shrink-0 border-2 border-teal-100 dark:border-teal-900">
            {selectedDog.photoUrl ? (
              <img src={selectedDog.photoUrl} alt={selectedDog.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl text-teal-600">{selectedDog.name[0]}</div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black">{selectedDog.name.toUpperCase()}</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              {selectedDog.breed} · {selectedDog.age || "?"} yrs · {selectedDog.sex} · {selectedDog.weight ? `${selectedDog.weight} ${selectedDog.weightUnit || "kg"}` : "?"}
            </p>
          </div>
        </div>

        {/* 2. Current Health Status */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Current Health Status</h3>
          <div className={`rounded-2xl p-5 border ${
            healthStatus === 'Healthy' ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-900/50 text-teal-800 dark:text-teal-200' :
            healthStatus === 'Needs Attention' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50 text-amber-800 dark:text-amber-200' :
            'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {healthStatus === 'Healthy' && <CheckCircle className="w-8 h-8 text-teal-500" />}
              {healthStatus === 'Needs Attention' && <AlertTriangle className="w-8 h-8 text-amber-500" />}
              {healthStatus === 'At Risk' && <ShieldAlert className="w-8 h-8 text-red-500" />}
              <div>
                <p className="font-black text-xl">{healthStatus}</p>
                <p className="text-sm font-medium opacity-80 mt-1">Based on preventive care compliance and recent logs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Upcoming Events */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Upcoming Events</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {upcomingEvents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {upcomingEvents.map((e, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${e.color}`}>
                        <e.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{e.title}</p>
                        <p className="text-xs text-slate-500 font-medium">{e.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{e.days === 0 ? 'Today' : `In ${e.days}d`}</p>
                      <p className="text-xs text-slate-400 font-medium">{e.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-slate-500">No upcoming events.</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Recent Records */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Recent Records</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {recentRecords.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {recentRecords.map((r, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.bg} ${r.color}`}>
                        <r.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm capitalize">{r.title}</p>
                        <p className="text-xs text-slate-500 font-medium">{r.type} · {r.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-400">{r.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-slate-500">No recent health records.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
