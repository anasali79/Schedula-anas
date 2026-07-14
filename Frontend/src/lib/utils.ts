export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatTime(time: string | undefined | null): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const SLOT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  CANCEL_AND_AVAILABLE: 'cancel and available for booking',
} as const;

export function isBookableSlot(status: string): boolean {
  return (
    status === SLOT_STATUS.AVAILABLE ||
    status === SLOT_STATUS.CANCEL_AND_AVAILABLE
  );
}
export const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-amber-100 text-amber-700',
  IN_CONSULTATION: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-100 text-slate-600',
  RESCHEDULED: 'bg-orange-100 text-orange-700',
  available: 'bg-green-100 text-green-700',
  booked: 'bg-red-100 text-red-700',
  'cancel and available for booking': 'bg-amber-100 text-amber-700',
};

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
