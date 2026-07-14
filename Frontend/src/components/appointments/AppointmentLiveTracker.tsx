import { Activity, Clock, Users } from 'lucide-react';
import type { Appointment } from '../../types';
import { todayIST } from '../../lib/utils';

const STEPS = [
  { key: 'CONFIRMED', label: 'Booked' },
  { key: 'CHECKED_IN', label: 'Checked In' },
  { key: 'IN_CONSULTATION', label: 'In Consultation' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  CONFIRMED: 0,
  CHECKED_IN: 1,
  IN_CONSULTATION: 2,
  COMPLETED: 3,
  NO_SHOW: -1,
  CANCELLED: -1,
};

export function AppointmentLiveTracker({
  appt,
  peopleAhead,
  estimatedWait,
  live,
}: {
  appt: Appointment;
  peopleAhead?: number;
  estimatedWait?: string;
  live?: boolean;
}) {
  const currentStep = STATUS_ORDER[appt.status] ?? -1;
  const isToday = appt.date === todayIST();
  const showQueue =
    isToday &&
    ['CONFIRMED', 'CHECKED_IN'].includes(appt.status) &&
    (appt.queuePosition != null || peopleAhead != null);

  if (['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(appt.status)) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Live Tracking
        </span>
        {live && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = currentStep >= i;
          const active = currentStep === i;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? active
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : 'bg-primary-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden text-center text-[10px] sm:block ${
                    active ? 'font-semibold text-primary-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${currentStep > i ? 'bg-primary-400' : 'bg-slate-200'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {showQueue && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-center text-xs">
          {appt.tokenNumber != null && (
            <div>
              <p className="font-bold text-primary-700">#{appt.tokenNumber}</p>
              <p className="text-slate-400">Your Token</p>
            </div>
          )}
          <div>
            <p className="flex items-center justify-center gap-1 font-bold text-slate-800">
              <Users className="h-3 w-3" />
              {peopleAhead ?? appt.queuePosition ?? 0}
            </p>
            <p className="text-slate-400">Ahead of you</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 font-bold text-slate-800">
              <Clock className="h-3 w-3" />
              {estimatedWait ?? (appt.estimatedWaitTime != null ? `${appt.estimatedWaitTime} min` : '—')}
            </p>
            <p className="text-slate-400">Est. wait</p>
          </div>
        </div>
      )}

      {appt.status === 'IN_CONSULTATION' && isToday && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-purple-700">
          <Activity className="h-3.5 w-3.5" />
          Doctor is seeing you now
        </p>
      )}

      {appt.checkedInAt && appt.status !== 'CONFIRMED' && (
        <p className="mt-2 text-xs text-slate-400">
          Checked in at{' '}
          {new Date(appt.checkedInAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
          })}
        </p>
      )}
    </div>
  );
}
