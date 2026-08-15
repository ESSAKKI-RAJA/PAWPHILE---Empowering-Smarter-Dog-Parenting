import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePawphileData } from '../context/PawphileDataContext';
import { TimelineEvent } from '../components/ui/TimelineEvent';
import { Activity, Flame, Syringe, Bug, Scale, ArrowLeft } from 'lucide-react';
import { DogIdentityHeader } from '../components/ui/DogIdentityHeader';

export default function Timeline() {
  const navigate = useNavigate();
  const { 
    selectedDog, 
    symptomLogs, 
    nutritionLogs, 
    vaccineRecords, 
    dewormingRecords 
  } = usePawphileData();

  const allEvents = useMemo(() => {
    if (!selectedDog) return [];
    
    const events = [];
    
    // Add Symptoms
    symptomLogs.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({
        id: `sym_${l.id}`,
        date: new Date(l.createdAt),
        type: 'Observation',
        title: l.mainConcern || 'Symptom Log',
        summary: `Severity: ${l.severity || 'Unknown'}`,
        source: 'you',
        icon: <Activity className="w-4 h-4" />
      });
    });

    // Add Nutrition
    nutritionLogs.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({
        id: `nut_${l.id}`,
        date: new Date(l.createdAt),
        type: 'Nutrition',
        title: 'Appetite logged',
        summary: l.appetiteRating ? `Appetite: ${l.appetiteRating}` : 'Meal recorded',
        source: 'you',
        icon: <Flame className="w-4 h-4" />
      });
    });

    // Add Vaccines
    vaccineRecords.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({
        id: `vac_${l.id}`,
        date: new Date(l.dateGiven),
        type: 'Vaccine',
        title: l.vaccineName,
        summary: `Next due: ${new Date(l.nextDueDate).toLocaleDateString()}`,
        source: 'you',
        icon: <Syringe className="w-4 h-4" />
      });
    });

    // Add Deworming
    dewormingRecords.filter(l => l.dogId === selectedDog.id).forEach(l => {
      events.push({
        id: `dew_${l.id}`,
        date: new Date(l.dateGiven),
        type: 'Deworming',
        title: l.productName || 'Treatment',
        summary: `Next due: ${new Date(l.nextDueDate).toLocaleDateString()}`,
        source: 'you',
        icon: <Bug className="w-4 h-4" />
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedDog, symptomLogs, nutritionLogs, vaccineRecords, dewormingRecords]);

  if (!selectedDog) {
    return (
      <div className="pw-page flex flex-col items-center justify-center min-h-screen px-6">
        <Scale className="w-12 h-12 text-muted-400 mb-4" />
        <h1 className="text-24px font-bold text-ink-950 mb-2">Select Your Dog First</h1>
        <button onClick={() => navigate("/profile")} className="pw-btn-primary w-full max-w-xs mt-6">
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="pw-page pb-24 min-h-screen">
      <div className="bg-ivory-50 border-b border-line-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-line-200/50 transition">
              <ArrowLeft className="w-5 h-5 text-ink-950" />
            </button>
            <div>
              <h1 className="text-16px font-bold text-ink-950 leading-none">Health Timeline</h1>
              <p className="text-12px text-muted-600 mt-1">
                For {selectedDog.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {allEvents.length === 0 ? (
          <div className="pw-card p-8 text-center bg-ivory-50 border-dashed animate-fade-in">
            <Activity className="w-10 h-10 text-muted-400 mx-auto mb-3 opacity-50" />
            <p className="text-15px font-bold text-ink-950">No timeline events</p>
            <p className="text-14px text-muted-600 mt-1">Log an observation or preventive care record to see it here.</p>
          </div>
        ) : (
          <div className="space-y-1 mt-4 animate-slide-up pb-8">
            {allEvents.map((evt) => (
              <TimelineEvent
                key={evt.id}
                time={evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                dateStr={evt.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                icon={evt.icon}
                title={evt.title}
                summary={evt.summary}
                source={evt.source}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
