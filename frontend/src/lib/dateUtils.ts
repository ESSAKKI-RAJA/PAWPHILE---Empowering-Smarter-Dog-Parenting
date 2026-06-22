export function now(): string {
  return new Date().toISOString();
}

export function formatDisplay(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function daysUntil(iso: string): number {
  if (!iso) return 0;
  const targetDate = new Date(iso).getTime();
  const currentDate = new Date().getTime();
  const diffTime = targetDate - currentDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isOverdue(iso: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < new Date().getTime();
}

export function isWithinDays(iso: string, days: number): boolean {
  if (!iso) return false;
  const diff = Math.abs(daysUntil(iso));
  return diff <= days;
}
