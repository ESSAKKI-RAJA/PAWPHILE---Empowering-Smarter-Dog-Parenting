import { VaccineRecord, DogProfile } from '../types/pawphile';
import { daysUntil } from '../lib/dateUtils';

export function analyzeVaccines(records: VaccineRecord[], _profile: DogProfile) {
  const nextDueVaccines: VaccineRecord[] = [];
  const overdueVaccines: VaccineRecord[] = [];

  records.forEach(record => {
    const days = daysUntil(record.nextDueDate);
    if (days < 0) {
      overdueVaccines.push(record);
    } else if (days <= 30) {
      nextDueVaccines.push(record);
    }
  });

  return {
    nextDueVaccines,
    overdueVaccines,
    hasOverdue: overdueVaccines.length > 0,
    reminderStatus: overdueVaccines.length > 0 ? 'urgent' : (nextDueVaccines.length > 0 ? 'upcoming' : 'clear'),
    disclaimer: 'Due date is based on saved records and should be confirmed with your veterinarian.'
  };
}
