import { useState, useMemo, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, Calendar, Pill } from 'lucide-react';
import { usePawphileData } from '../../context/PawphileDataContext';
import { daysUntil } from '../../lib/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedDog, vaccineRecords, vetVisits, medications } = usePawphileData();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const dogId = selectedDog?.id;

  const notifications = useMemo(() => {
    if (!dogId) return [];
    const notifs: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Vaccine Reminders (30, 14, 7, 1 days)
    vaccineRecords.filter(v => v.dogId === dogId).forEach(v => {
      const days = daysUntil(v.nextDueDate);
      if (days === 30 || days === 14 || days === 7 || days === 1 || days < 0) {
        notifs.push({
          id: `vac-${v.id}`,
          type: 'Vaccine',
          title: `${v.vaccineName} Due`,
          message: days < 0 ? `Overdue by ${Math.abs(days)} days!` : `Due in ${days} day(s) on ${v.nextDueDate}`,
          icon: ShieldAlert,
          color: days < 0 ? 'text-red-500' : 'text-amber-500',
          path: '/preventive-care'
        });
      }
    });

    // Vet Visit Reminders (7, 3, 1 days)
    vetVisits.filter(v => v.dogId === dogId && v.followUpRequired && v.nextVisitDate).forEach(v => {
      const days = daysUntil(v.nextVisitDate!);
      if (days === 7 || days === 3 || days === 1 || days < 0) {
        notifs.push({
          id: `vet-${v.id}`,
          type: 'Vet Visit',
          title: `Follow-up at ${v.clinicName}`,
          message: days < 0 ? `Missed appointment!` : `Coming up in ${days} day(s) at ${v.nextVisitTime || 'TBD'}`,
          icon: Calendar,
          color: days < 0 ? 'text-red-500' : 'text-indigo-500',
          path: '/vet-records'
        });
      }
    });

    // Medication Daily Reminders
    medications.filter(m => m.dogId === dogId).forEach(m => {
      // Check if today is within start and end date
      let isActive = true;
      if (m.startDate && m.startDate > todayStr) isActive = false;
      if (m.endDate && m.endDate < todayStr) isActive = false;
      
      if (isActive) {
        notifs.push({
          id: `med-${m.id}`,
          type: 'Medication',
          title: `Time for ${m.name}`,
          message: `Dosage: ${m.dosage} (${m.frequency})`,
          icon: Pill,
          color: 'text-teal-500',
          path: '/vet-records'
        });
      }
    });

    return notifs;
  }, [dogId, vaccineRecords, vetVisits, medications]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 rounded-full border border-slate-200 dark:border-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Bell className="w-5 h-5 text-slate-500" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-black text-sm">Notifications</h3>
            <span className="text-xs font-bold text-slate-400">{notifications.length} New</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => (
                  <button 
                    key={n.id} 
                    onClick={() => { setIsOpen(false); navigate(n.path); }}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex gap-3 items-start"
                  >
                    <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${n.color}`}>
                      <n.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">{n.type}</p>
                      <p className="text-sm font-bold">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
