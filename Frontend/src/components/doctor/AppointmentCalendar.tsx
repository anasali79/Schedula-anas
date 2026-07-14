import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { todayIST } from '../../lib/utils';

interface AppointmentCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  /** Map of date string (YYYY-MM-DD) → appointment count */
  appointmentCounts?: Record<string, number>;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AppointmentCalendar({
  selectedDate,
  onDateChange,
  appointmentCounts = {},
}: AppointmentCalendarProps) {
  const todayStr = todayIST();
  const { year: todayYear, month: todayMonth } = toLocalDateParts(todayStr);

  const { year: selYear, month: selMonth } = toLocalDateParts(selectedDate);
  const [viewYear, setViewYear] = useState(selYear);
  const [viewMonth, setViewMonth] = useState(selMonth);

  const goToToday = useCallback(() => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    onDateChange(todayStr);
  }, [todayYear, todayMonth, todayStr, onDateChange]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: Array<{ day: number; currentMonth: boolean; dateStr: string }> = [];

  // Prev month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, currentMonth: false, dateStr: formatYMD(prevY, prevM, d) });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateStr: formatYMD(viewYear, viewMonth, d) });
  }

  // Next month leading days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, currentMonth: false, dateStr: formatYMD(nextY, nextM, d) });
  }

  const isToday = (dateStr: string) => dateStr === todayStr;
  const isSelected = (dateStr: string) => dateStr === selectedDate;
  const isPast = (dateStr: string) => dateStr < todayStr;
  const isTodayView = viewYear === todayYear && viewMonth === todayMonth;

  const maxDots = 3;

  return (
    <div className="select-none">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800">
            {MONTHS[viewMonth]} {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 ${
              isTodayView && isSelected(todayStr)
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm'
            }`}
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Day Labels ──────────────────────────────────────────── */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* ─── Calendar Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ day, currentMonth, dateStr }) => {
          const count = appointmentCounts[dateStr] ?? 0;
          const selected = isSelected(dateStr);
          const today = isToday(dateStr);
          const past = isPast(dateStr) && !today;

          return (
            <button
              key={dateStr}
              onClick={() => onDateChange(dateStr)}
              className={`group relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all duration-150
                ${selected
                  ? 'bg-indigo-600 shadow-md shadow-indigo-200/60 scale-105'
                  : today
                  ? 'bg-indigo-50 ring-2 ring-indigo-400 ring-offset-1'
                  : currentMonth
                  ? 'hover:bg-slate-100'
                  : 'opacity-30 hover:opacity-50 hover:bg-slate-50'
                }
              `}
            >
              <span
                className={`text-xs font-bold leading-none ${
                  selected
                    ? 'text-white'
                    : today
                    ? 'text-indigo-600'
                    : past && currentMonth
                    ? 'text-slate-400'
                    : currentMonth
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {day}
              </span>

              {/* Appointment dot indicators */}
              {currentMonth && count > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(count, maxDots) }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full transition-colors ${
                        selected ? 'bg-white/70' : 'bg-indigo-400'
                      }`}
                    />
                  ))}
                  {count > maxDots && (
                    <span className={`text-[8px] font-bold leading-none ${selected ? 'text-white/70' : 'text-indigo-400'}`}>
                      +
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Legend ──────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          Has appointments
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-600" />
          Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full ring-2 ring-indigo-400" />
          Today
        </span>
      </div>
    </div>
  );
}
