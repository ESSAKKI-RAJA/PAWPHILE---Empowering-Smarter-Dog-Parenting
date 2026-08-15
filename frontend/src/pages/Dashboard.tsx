import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePawphileData } from "../context/PawphileDataContext";
import { DogIdentityHeader } from "../components/ui/DogIdentityHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { AttentionCard, NextActionCard } from "../components/ui/Cards";
import { TimelineEvent } from "../components/ui/TimelineEvent";
import { Activity, Camera, Flame, Info, Sparkles, ShieldAlert, CheckCircle, Scale, UtensilsCrossed } from "lucide-react";
import { daysUntil } from "../lib/dateUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    selectedDog,
    vaccineRecords,
    symptomLogs,
    triageResults,
    nutritionLogs,
    medications,
  } = usePawphileData();
  
  /* --- Computed Logic --- */
  
  const latestTriage = useMemo(() => {
    if (!selectedDog) return null;
    const mine = triageResults
      .filter((t) => t.dogId === selectedDog.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!mine.length) return null;
    return mine[0];
  }, [selectedDog, triageResults]);

  const upcomingAlerts = useMemo(() => {
    if (!selectedDog) return { alerts: [], missingLog: false };
    const alerts = [];
    const myVacs = vaccineRecords
      .filter((r) => r.dogId === selectedDog.id)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
      
    if (myVacs.length) {
      const diff = daysUntil(myVacs[0].nextDueDate);
      if (diff <= 30 && diff >= 0) {
        alerts.push({
          type: 'vaccine',
          title: `Vaccine: ${myVacs[0].vaccineName}`,
          desc: diff === 0 ? 'Due today' : `Due in ${diff} days`
        });
      } else if (diff < 0) {
         alerts.push({
          type: 'vaccine_overdue',
          title: `Vaccine: ${myVacs[0].vaccineName}`,
          desc: `Overdue by ${Math.abs(diff)} days`
        });
      }
    }
    
    // Check missing recent logs
    const todayStr = new Date().toISOString().split("T")[0];
    const loggedToday = nutritionLogs.some(l => l.dogId === selectedDog.id && l.createdAt.startsWith(todayStr));
    
    return { alerts, missingLog: !loggedToday };
  }, [selectedDog, vaccineRecords, nutritionLogs]);

  const recentEvents = useMemo(() => {
    if (!selectedDog) return [];
    // Collect a few recent timeline events just to show
    const events = [];
    symptomLogs.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({ type: 'Observation', title: l.mainConcern, date: l.createdAt, id: l.id });
    });
    nutritionLogs.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({ type: 'Nutrition', title: 'Appetite recorded', date: l.createdAt, id: l.id });
    });
    
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  }, [selectedDog, symptomLogs, nutritionLogs]);

  if (!selectedDog) {
    return (
      <div className="pw-page flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-teal-50 border-2 border-primary">
          <Scale className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-24px font-bold mb-2 text-ink-950">Welcome to PAWPHILE</h1>
        <p className="text-15px text-muted-600 text-center max-w-sm mb-8 leading-relaxed">
          Create your dog's profile to start building their preventive health record.
        </p>
        <button onClick={() => navigate("/profile")} className="pw-btn-primary w-full max-w-xs">
          Create Profile
        </button>
      </div>
    );
  }

  /* --- Render --- */

  return (
    <div className="pw-page pb-24">
      <DogIdentityHeader />
      
      <div className="px-4 mt-6 max-w-4xl mx-auto space-y-8 animate-fadeIn">
        
        {/* Status Summary & Alerts */}
        <section className="space-y-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h1 className="text-24px font-bold text-ink-950 leading-tight">Good morning, {selectedDog.name}</h1>
              <p className="text-14px text-muted-600 mt-1">Here is what deserves your attention today.</p>
            </div>
          </div>
          
          {latestTriage && latestTriage.severity === 'RED' && (
            <AttentionCard 
              status="RED"
              title="Recent Triage Alert"
              description="A recent symptom log resulted in a RED triage state. Seek immediate veterinary care."
              actionLabel="View Details"
              onAction={() => navigate('/timeline')}
            />
          )}

          {latestTriage && latestTriage.severity === 'YELLOW' && (
            <AttentionCard 
              status="YELLOW"
              title="Monitor Closely"
              description="A recent symptom log resulted in a YELLOW triage state. Please monitor closely."
              actionLabel="Review Timeline"
              onAction={() => navigate('/timeline')}
            />
          )}

          {upcomingAlerts.alerts.some(a => a.type === 'vaccine_overdue') && (
             <AttentionCard 
              status="YELLOW"
              title="Overdue Vaccination"
              description={upcomingAlerts.alerts.find(a => a.type === 'vaccine_overdue')?.desc || 'A vaccine is overdue.'}
              actionLabel="Schedule Now"
              onAction={() => navigate('/preventive-care')}
            />
          )}

          <div className="pw-card p-5">
            <h3 className="text-14px font-bold text-ink-950 mb-3">{selectedDog.name}'s current wellbeing</h3>
            {latestTriage ? (
               <StatusBadge 
                status={latestTriage.severity as any} 
                label={latestTriage.severity === 'GREEN' ? 'Stable / Monitor' : latestTriage.severity === 'YELLOW' ? 'Needs Attention' : 'Urgent'} 
                description="Based on recent symptom logs" 
              />
            ) : (
              <StatusBadge status="GREEN" label="Stable" description="No recent urgent logs" />
            )}
          </div>
        </section>

        {/* Next Action & Today's Care */}
        <section className="space-y-4">
          <h2 className="text-18px font-bold text-ink-950">Today's Care</h2>
          
          {upcomingAlerts.missingLog ? (
            <NextActionCard 
              title="Record Appetite"
              reason="You have not logged what your dog ate today."
              actionLabel="Log now"
              onAction={() => navigate('/nutrition')}
              icon={<UtensilsCrossed className="w-5 h-5" />}
            />
          ) : (
             <NextActionCard 
              title="Health Check"
              reason="Everything looks up to date for today."
              actionLabel="Add observation"
              onAction={() => navigate('/triage')}
              icon={<CheckCircle className="w-5 h-5" />}
            />
          )}
          
          {medications?.length > 0 && (
             <div className="pw-card p-4 flex justify-between items-center bg-teal-50/50">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-primary">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-14px font-bold text-ink-950">Medication</h4>
                    <p className="text-12px text-muted-600">{medications.length} active prescription(s)</p>
                  </div>
               </div>
               <button onClick={() => navigate('/preventive-care')} className="text-13px font-bold text-primary px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-teal-100 transition">
                 Review
               </button>
             </div>
          )}
        </section>

        {/* Recent Timeline Preview */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-18px font-bold text-ink-950">Recent Timeline</h2>
            <button onClick={() => navigate('/timeline')} className="text-13px font-bold text-primary">View all</button>
          </div>
          
          <div className="bg-ivory-50 rounded-2xl p-4 border border-line-200">
             {recentEvents.length > 0 ? (
               <div className="space-y-1">
                 {recentEvents.map((evt, i) => {
                   const dateObj = new Date(evt.date);
                   return (
                     <TimelineEvent 
                       key={evt.id}
                       time={dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       dateStr={dateObj.toLocaleDateString([], {month: 'short', day: 'numeric'})}
                       icon={evt.type === 'Observation' ? <Activity className="w-4 h-4" /> : <Flame className="w-4 h-4"/>}
                       title={evt.title}
                       summary={evt.type}
                       source="you"
                     />
                   )
                 })}
               </div>
             ) : (
               <p className="text-13px text-muted-600 py-4 text-center">No recent records found.</p>
             )}
          </div>
        </section>

        {/* PAW AI Prompts */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-lavender-600" />
            <h2 className="text-15px font-bold text-ink-950">Ask PAW AI</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Is chocolate safe?', 'Why is he scratching?', 'How much exercise?'].map(prompt => (
              <button key={prompt} onClick={() => navigate(`/paw-ai?q=${encodeURIComponent(prompt)}`)} className="px-4 py-2 bg-lavender-100/50 hover:bg-lavender-100 text-lavender-600 text-13px font-bold rounded-xl border border-lavender-600/20 transition">
                {prompt}
              </button>
            ))}
          </div>
        </section>
        
        {/* Quick Links */}
        <section className="pt-4 border-t border-line-200">
           <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Camera, label: "Scan", path: "/vision" },
              { icon: ShieldAlert, label: "Care", path: "/preventive-care" },
              { icon: Sparkles, label: "AI", path: "/paw-ai" },
              { icon: Info, label: "News", path: "/news" },
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-ivory-100 transition"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-line-200 flex items-center justify-center text-primary shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-muted-600">{label}</span>
              </button>
            ))}
          </div>
        </section>
        
        <p className="text-[11px] italic text-center pb-6 leading-relaxed px-4 text-muted-400">
          PAWPHILE is not a diagnostic tool. Always consult a licensed veterinarian for medical decisions.
        </p>
      </div>
    </div>
  );
}
