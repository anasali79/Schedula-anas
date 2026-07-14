import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, IndianRupee } from 'lucide-react';
import { bookAppointment } from '../../api/appointment';
import { getDoctorById, getDoctorNextAvailable, getDoctorSlots } from '../../api/doctor';
import { getErrorMessage, useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import type { Slot } from '../../types';
import { formatDate, formatTime, isBookableSlot, todayIST } from '../../lib/utils';

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

function getHourStart(h: { startTime?: string; start?: string }) {
  return h.startTime ?? h.start ?? '';
}

function getHourEnd(h: { endTime?: string; end?: string }) {
  return h.endTime ?? h.end ?? '';
}

export function DoctorDetailPage() {
  const { user } = useAuth();
  const doctorId = useParams<{ doctorId: string }>().doctorId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => getDoctorById(doctorId!),
    enabled: !!doctorId,
  });

  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsQueryError,
  } = useQuery({
    queryKey: ['slots', doctorId, selectedDate],
    queryFn: () => getDoctorSlots(doctorId!, selectedDate),
    enabled: !!doctorId && !!selectedDate,
    retry: false,
  });

  const { data: nextAvailableData } = useQuery({
    queryKey: ['next-available', doctorId],
    queryFn: () => getDoctorNextAvailable(doctorId!, 30),
    enabled: !!doctorId,
  });

  const bookMutation = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      setSuccess('Appointment booked successfully!');
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['slots', doctorId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['patient-dashboard', user?.id] });
      setTimeout(() => navigate('/patient/appointments'), 1500);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const allSlots = Array.isArray(slotsData?.data) ? slotsData.data : [];
  const availableSlots = allSlots.filter((s) => isBookableSlot(s.status));

  const handleBook = () => {
    if (!selectedSlot || !doctorId) return;
    setError('');
    setSuccess('');
    bookMutation.mutate({
      doctorId,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    });
  };

  if (doctorLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </AppLayout>
    );
  }

  if (!doctor) {
    return (
      <AppLayout>
        <Alert message="Doctor not found" />
      </AppLayout>
    );
  }

  const consultationDays = Object.entries(doctor.consultationHours ?? {}).filter(
    ([, hours]) => Array.isArray(hours) && hours.length > 0,
  );

  return (
    <AppLayout>
      <Link
        to="/patient/doctors"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to doctors
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h1 className="text-xl font-bold text-slate-900">{doctor.fullName}</h1>
            <p className="mt-1 capitalize text-primary-600">{doctor.specialization}</p>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>{doctor.qualification}</p>
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {doctor.experience} years experience
              </p>
              <p className="flex items-center gap-1 font-medium text-slate-900">
                <IndianRupee className="h-4 w-4" />
                {doctor.consultationFee} consultation fee
              </p>
            </div>

            {doctor.profileDetails && (
              <p className="mt-4 text-sm text-slate-500">{doctor.profileDetails}</p>
            )}

            {nextAvailableData?.data ? (
              <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-medium text-emerald-700">Next Available</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatDate(nextAvailableData.data.date)}
                </p>
                <p className="text-xs text-emerald-600">
                  {formatTime(nextAvailableData.data.startTime)} – {formatTime(nextAvailableData.data.endTime)}
                </p>
              </div>
            ) : nextAvailableData !== undefined ? (
              <p className="mt-4 text-xs text-slate-400">No upcoming availability in next 30 days</p>
            ) : null}
          </Card>

          {consultationDays.length > 0 && (
            <Card>
              <CardHeader title="Consultation Hours" subtitle="Available days" />
              <div className="space-y-2 text-sm">
                {consultationDays.map(([day, hours]) => (
                  <div key={day} className="flex justify-between gap-2">
                    <span className="font-medium text-slate-700">
                      {DAY_LABELS[day] ?? day}
                    </span>
                    <span className="text-slate-500">
                      {hours
                        .map((h) => `${formatTime(getHourStart(h))}–${formatTime(getHourEnd(h))}`)
                        .join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Book Appointment" subtitle="Select a date and time slot" />

            {error && (
              <div className="mb-4">
                <Alert message={error} />
              </div>
            )}
            {success && (
              <div className="mb-4">
                <Alert type="success" message={success} />
              </div>
            )}

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={todayIST()}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Pick a day when the doctor has consultation hours
              </p>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              </div>
            ) : slotsData?.onLeave ? (
              <Alert type="info" message={slotsData.message ?? 'Doctor is on leave on this date.'} />
            ) : slotsError ? (
              <Alert
                type="info"
                message={
                  getErrorMessage(slotsQueryError).includes('No availability') ||
                  getErrorMessage(slotsQueryError).includes('No slots')
                    ? `Doctor has no schedule on ${formatDate(selectedDate)}. Try a day listed in Consultation Hours.`
                    : getErrorMessage(slotsQueryError)
                }
              />
            ) : availableSlots.length === 0 ? (
              <Alert
                type="info"
                message={
                  allSlots.length > 0
                    ? 'All slots for this date are already booked or have passed.'
                    : 'No available slots for this date.'
                }
              />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableSlots.map((slot) => (
                  <button
                    key={`${slot.startTime}-${slot.endTime}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      selectedSlot?.startTime === slot.startTime
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                    }`}
                  >
                    {formatTime(slot.startTime)}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50 p-4">
                <p className="text-sm text-primary-800">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Selected: {formatDate(selectedDate)} at {formatTime(selectedSlot.startTime)} –{' '}
                  {formatTime(selectedSlot.endTime)}
                </p>
                <Button
                  className="mt-3"
                  onClick={handleBook}
                  loading={bookMutation.isPending}
                >
                  Confirm Booking
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
