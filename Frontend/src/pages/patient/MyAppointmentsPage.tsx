import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPinCheck, RefreshCw, User } from 'lucide-react';
import { cancelAppointment, getMyAppointments, rescheduleAppointment } from '../../api/appointment';
import { patientCheckIn } from '../../api/check-in';
import { getDoctorSlots } from '../../api/doctor';
import { getPatientProfile } from '../../api/patient';
import { getErrorMessage, useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { CheckInRequestBanner } from '../../components/appointments/CheckInRequestBanner';
import { AppointmentLiveTracker } from '../../components/appointments/AppointmentLiveTracker';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAppointmentSocket } from '../../hooks/useAppointmentSocket';
import { formatDate, formatTime, STATUS_COLORS, todayIST } from '../../lib/utils';
import type { Appointment, Slot } from '../../types';

export function MyAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  const refreshCheckIn = () =>
    queryClient.invalidateQueries({ queryKey: ['check-in-requests', user?.id] });

  const { data: profile } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: getPatientProfile,
    enabled: !!user?.id,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-appointments', user?.id],
    queryFn: getMyAppointments,
    enabled: !!user?.id,
  });

  const { connected, queuePosition } = useAppointmentSocket(
    'PATIENT',
    profile?.id,
    () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
    },
    refreshCheckIn,
  );

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-dashboard', user?.id] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: patientCheckIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
    },
  });

  const appointments = data?.data ?? [];
  const activeAppointments = appointments.filter(
    (a) => !['CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'].includes(a.status),
  );
  const pastAppointments = appointments.filter((a) =>
    ['CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'].includes(a.status),
  );

  return (
    <AppLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
          <p className="mt-1 text-slate-500">View, check in, and track your queue live</p>
        </div>
        {connected && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live connected
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Alert message={getErrorMessage(error)} />
        </div>
      )}

      <CheckInRequestBanner />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No appointments yet.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeAppointments.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Active</h2>
              <div className="space-y-3">
                {activeAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    live={connected}
                    queuePosition={queuePosition}
                    onCancel={() => cancelMutation.mutate(appt.id)}
                    onCheckIn={() => checkInMutation.mutate(appt.id)}
                    onReschedule={() => setRescheduleAppt(appt)}
                    cancelling={
                      cancelMutation.isPending && cancelMutation.variables === appt.id
                    }
                    checkingIn={
                      checkInMutation.isPending && checkInMutation.variables === appt.id
                    }
                    cancelError={
                      cancelMutation.variables === appt.id && cancelMutation.isError
                        ? getErrorMessage(cancelMutation.error)
                        : undefined
                    }
                    checkInError={
                      checkInMutation.variables === appt.id && checkInMutation.isError
                        ? getErrorMessage(checkInMutation.error)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {pastAppointments.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">History</h2>
              <div className="space-y-3">
                {pastAppointments.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => {
            setRescheduleAppt(null);
            queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['patient-dashboard', user?.id] });
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Reschedule Modal ────────────────────────────────────────────────────────

function RescheduleModal({
  appt,
  onClose,
  onSuccess,
}: {
  appt: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState('');

  const doctorId = appt.doctor?.id;

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['reschedule-slots', doctorId, selectedDate],
    queryFn: () => getDoctorSlots(doctorId!, selectedDate),
    enabled: !!doctorId && !!selectedDate,
    retry: false,
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      rescheduleAppointment(appt.id, {
        doctorId: doctorId!,
        date: selectedDate,
        startTime: selectedSlot!.startTime,
        endTime: selectedSlot!.endTime,
      }),
    onSuccess: () => onSuccess(),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const allSlots = Array.isArray(slotsData?.data) ? slotsData.data : [];
  const availableSlots = allSlots.filter(
    (s) =>
      s.status === 'AVAILABLE' ||
      (s.availableCount != null && s.availableCount > 0),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reschedule Appointment</h2>
            <p className="text-sm text-slate-500">
              Dr. {appt.doctor?.fullName} · {appt.doctor?.specialization}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {error && <Alert message={error} />}

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Current appointment</p>
            <p className="mt-1">
              {formatDate(appt.date)} · {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
            </p>
          </div>

          <Input
            label="Select New Date"
            type="date"
            value={selectedDate}
            min={todayIST()}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot(null);
            }}
          />

          {slotsLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            </div>
          ) : (slotsData as any)?.onLeave ? (
            <p className="text-sm text-amber-600">Doctor is on leave on {selectedDate}.</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-slate-500">No available slots for {formatDate(selectedDate)}.</p>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Select New Time Slot</p>
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={`${slot.startTime}-${slot.endTime}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      selectedSlot?.startTime === slot.startTime &&
                      selectedSlot?.endTime === slot.endTime
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-700 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {formatTime(slot.startTime)}
                    {slot.availableCount != null && slot.availableCount > 1 && (
                      <span className="ml-1 text-xs text-slate-400">
                        ({slot.availableCount} left)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => rescheduleMutation.mutate()}
            disabled={!selectedSlot}
            loading={rescheduleMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Confirm Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  live,
  queuePosition,
  onCancel,
  onCheckIn,
  onReschedule,
  cancelling,
  checkingIn,
  cancelError,
  checkInError,
}: {
  appt: Appointment;
  live?: boolean;
  queuePosition?: import('../../hooks/useAppointmentSocket').QueuePositionUpdate | null;
  onCancel?: () => void;
  onCheckIn?: () => void;
  onReschedule?: () => void;
  cancelling?: boolean;
  checkingIn?: boolean;
  cancelError?: string;
  checkInError?: string;
}) {
  const isToday = appt.date === todayIST();
  const canCancel = appt.status === 'CONFIRMED';
  const canCheckIn = isToday && appt.status === 'CONFIRMED';
  const canReschedule = appt.status === 'CONFIRMED';

  const liveQueue =
    queuePosition && isToday && ['CONFIRMED', 'CHECKED_IN'].includes(appt.status)
      ? {
          peopleAhead: queuePosition.peopleAhead,
          estimatedWait: queuePosition.estimatedWait,
        }
      : undefined;

  return (
    <Card className="!p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-900">
                {appt.doctor?.fullName ?? 'Unknown Doctor'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {appt.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm capitalize text-slate-500">
              {appt.doctor?.specialization}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(appt.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
              </span>
              {appt.tokenNumber != null && (
                <span className="font-medium text-primary-600">
                  Token #{appt.tokenNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {checkInError && <p className="text-xs text-red-600">{checkInError}</p>}
            {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
            {canCheckIn && onCheckIn && (
              <Button size="sm" onClick={onCheckIn} loading={checkingIn}>
                <MapPinCheck className="h-4 w-4" />
                Check In Now
              </Button>
            )}
            {canReschedule && onReschedule && (
              <Button variant="secondary" size="sm" onClick={onReschedule}>
                <RefreshCw className="h-4 w-4" />
                Reschedule
              </Button>
            )}
            {canCancel && onCancel && (
              <Button variant="danger" size="sm" onClick={onCancel} loading={cancelling}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {!['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(appt.status) && (
          <AppointmentLiveTracker
            appt={appt}
            live={live}
            peopleAhead={liveQueue?.peopleAhead}
            estimatedWait={liveQueue?.estimatedWait}
          />
        )}
      </div>
    </Card>
  );
}


