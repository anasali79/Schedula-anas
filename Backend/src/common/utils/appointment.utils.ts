/**
 * Shared date/time formatting utilities
 * Used in appointment.service.ts and email.service.ts
 */

/**
 * Convert "17:00" → "5:00 PM"
 */
export function formatTime(time: string): string {
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
}

/**
 * Convert "2026-06-24" → "24 Jun 2026"
 */
export function formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(+year, +month - 1, +day));
}

/**
 * Get today's date string in YYYY-MM-DD (IST timezone)
 */
export function getTodayIST(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/**
 * Get tomorrow's date string in YYYY-MM-DD (IST timezone)
 */
export function getTomorrowIST(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(tomorrow);
}