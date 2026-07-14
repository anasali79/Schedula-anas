import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  Play,
  User,
  UserCheck,
  XCircle,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import {
  cancelDoctorAppointment,
  getDoctorAppointments,
  getDoctorProfile,
} from '../../api/doctor';
import {
  completeAppointment,
  doctorManualCheckIn,
  markNoShow,
  startConsultation,
} from '../../api/check-in';
import { getErrorMessage, useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { AppointmentLiveTracker } from '../../components/appointments/AppointmentLiveTracker';
import { AppointmentCalendar } from '../../components/doctor/AppointmentCalendar';
import { Alert } from '../../components/ui/Alert';
import { useAppointmentSocket } from '../../hooks/useAppointmentSocket';
import { formatDate, formatTime, STATUS_COLORS, todayIST } from '../../lib/utils';
import type { DoctorAppointment } from '../../api/doctor';

export function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchGlobally, setSearchGlobally] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: getDoctorProfile,
    enabled: !!user?.id,
  });

  const { data: allAppointmentsData, isLoading } = useQuery({
    queryKey: ['doctor-appointments', 'all', user?.id],
    queryFn: () => getDoctorAppointments(),
    enabled: !!user?.id,
  });

  const { connected, doctorQueue, statusBoard } = useAppointmentSocket(
    'DOCTOR',
    profile?.id,
    () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setActionId(id);
    setError('');
    try {
      await fn();
      invalidate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const cancelMutation = useMutation({
    mutationFn: cancelDoctorAppointment,
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const appointments = allAppointmentsData?.data ?? [];

  // Group appointment counts for calendar
  const appointmentCounts = appointments.reduce((acc, appt) => {
    if (appt.status !== 'CANCELLED') {
      acc[appt.date] = (acc[appt.date] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter list by selected date
  const dateAppointments = appointments.filter((a) => a.date === selectedDate);

  // Filter list by search term
  const activeList = searchGlobally ? appointments : dateAppointments;
  const filtered = activeList.filter((appt) => {
    const term = searchTerm.toLowerCase();
    const name = appt.patient?.fullName?.toLowerCase() ?? '';
    const phone = appt.patient?.phone?.toLowerCase() ?? '';
    return name.includes(term) || phone.includes(term);
  });

  // Sort: IN_CONSULTATION -> CHECKED_IN -> CONFIRMED -> COMPLETED -> NO_SHOW
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = {
      IN_CONSULTATION: 0,
      CHECKED_IN: 1,
      CONFIRMED: 2,
      COMPLETED: 3,
      NO_SHOW: 4,
    };
    // If global search, primary sort by date (descending), then status order
    if (searchGlobally) {
      return b.date.localeCompare(a.date) || (order[a.status] ?? 5) - (order[b.status] ?? 5) || a.startTime.localeCompare(b.startTime);
    }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5) || a.startTime.localeCompare(b.startTime);
  });

  // Selected date statistics
  const stats = dateAppointments.reduce(
    (acc, appt) => {
      acc.total += 1;
      if (appt.status === 'CONFIRMED') acc.confirmed += 1;
      if (appt.status === 'CHECKED_IN') acc.checkedIn += 1;
      if (appt.status === 'IN_CONSULTATION') acc.inConsultation += 1;
      if (appt.status === 'COMPLETED') acc.completed += 1;
      if (appt.status === 'NO_SHOW') acc.noShow += 1;
      return acc;
    },
    { total: 0, confirmed: 0, checkedIn: 0, inConsultation: 0, completed: 0, noShow: 0 }
  );

  return (
    <AppLayout>
      {/* ─── Premium Header ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3 w-3" /> Practice Hub
          </span>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">Appointments Queue</h1>
          <p className="mt-1.5 text-xs md:text-sm text-slate-300 font-medium">
            Live check-in, consultation progress & dynamic queue management.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          {connected ? (
            <span className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-400 backdrop-blur-xs">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              Live Connected
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-bold text-amber-400 backdrop-blur-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Offline Mode
            </span>
          )}
        </div>
      </div>

      {/* ─── Live Queue Summary Cards (Only show if Selected Date is Today) ─── */}
      {selectedDate === todayIST() && (doctorQueue || statusBoard) && (
        <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="!p-5 border-l-4 border-indigo-500 hover:shadow-md transition bg-gradient-to-br from-white to-slate-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Now Serving</p>
            <p className="mt-2 text-lg font-black text-slate-900 truncate">
              {doctorQueue?.currentServing
                ? `${doctorQueue.currentServing.patientName} ${doctorQueue.currentServing.token ? `(#${doctorQueue.currentServing.token})` : ''}`
                : statusBoard?.current ?? 'None'}
            </p>
          </Card>
          <Card className="!p-5 border-l-4 border-emerald-500 hover:shadow-md transition bg-gradient-to-br from-white to-slate-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Patient</p>
            <p className="mt-2 text-lg font-black text-slate-900 truncate">
              {doctorQueue?.next[0]?.patientName ?? statusBoard?.next ?? 'None'}
            </p>
          </Card>
          <Card className="!p-5 border-l-4 border-violet-500 hover:shadow-md transition bg-gradient-to-br from-white to-slate-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Queue Waitlist</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-black text-slate-900">
              <Activity className="h-5 w-5 text-violet-500 animate-pulse" />
              <span>{doctorQueue?.waitingCount ?? 0} waiting</span>
            </p>
          </Card>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert message={error} />
        </div>
      )}

      {/* ─── Two Column Layout ─────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Calendar & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-slate-100 hover:shadow-md transition-all duration-200">
            <AppointmentCalendar
              selectedDate={selectedDate}
              onDateChange={(date) => {
                setSelectedDate(date);
                setSearchGlobally(false); // Switch to date mode when calendar is clicked
              }}
              appointmentCounts={appointmentCounts}
            />
          </Card>

          {/* Date stats card */}
          <Card className="shadow-sm border-slate-100 p-5 space-y-4">
            <div className="border-b border-slate-50 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Stats for {formatDate(selectedDate)}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-50/70 rounded-xl p-3 text-center border border-slate-100/50">
                <p className="text-xl font-extrabold text-slate-800">{stats.total}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Slots</p>
              </div>
              <div className="bg-blue-50/40 rounded-xl p-3 text-center border border-blue-100/30">
                <p className="text-xl font-extrabold text-blue-700">{stats.confirmed}</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">Confirmed</p>
              </div>
              <div className="bg-amber-50/40 rounded-xl p-3 text-center border border-amber-100/30">
                <p className="text-xl font-extrabold text-amber-700">{stats.checkedIn}</p>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Checked In</p>
              </div>
              <div className="bg-green-50/40 rounded-xl p-3 text-center border border-green-100/30">
                <p className="text-xl font-extrabold text-green-700">{stats.completed}</p>
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mt-0.5">Completed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Appointment List */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="shadow-sm border-slate-100 !p-5">
            {/* Header controls inside card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {searchGlobally ? 'All Scheduled Bookings' : `Bookings on ${formatDate(selectedDate)}`}
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Showing {sorted.length} matching appointments
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSearchGlobally((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition border ${searchGlobally
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>{searchGlobally ? 'Viewing All' : 'Date Filter'}</span>
                </button>
              </div>
            </div>

            {/* Patient Search input */}
            <div className="relative mb-5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by patient name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 hover:border-slate-300 bg-white/50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition duration-150"
              />
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">No appointments found</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                  {searchTerm
                    ? 'Adjust your search query to find patient bookings.'
                    : 'There are no bookings recorded for this time range.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sorted.map((appt) => (
                  <DoctorAppointmentCard
                    key={appt.id}
                    appt={appt}
                    live={connected && appt.date === todayIST()}
                    loading={actionId === appt.id}
                    onManualCheckIn={() =>
                      runAction(appt.id, () => doctorManualCheckIn(appt.id))
                    }
                    onStart={() => runAction(appt.id, () => startConsultation(appt.id))}
                    onComplete={() => runAction(appt.id, () => completeAppointment(appt.id))}
                    onNoShow={() => runAction(appt.id, () => markNoShow(appt.id))}
                    onCancel={() => {
                      if (confirm('Are you sure you want to cancel this appointment?')) {
                        cancelMutation.mutate(appt.id);
                      }
                    }}
                    cancelling={
                      cancelMutation.isPending && cancelMutation.variables === appt.id
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function DoctorAppointmentCard({
  appt,
  live,
  loading,
  onManualCheckIn,
  onStart,
  onComplete,
  onNoShow,
  onCancel,
  cancelling,
}: {
  appt: DoctorAppointment;
  live?: boolean;
  loading?: boolean;
  onManualCheckIn: () => void;
  onStart: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  cancelling?: boolean;
}) {
  const trackerAppt = {
    id: appt.id,
    date: appt.date,
    startTime: appt.startTime,
    endTime: appt.endTime,
    status: appt.status,
    tokenNumber: appt.tokenNumber,
    doctor: null,
    checkedInAt: appt.checkedInAt,
    queuePosition: appt.queuePosition,
    estimatedWaitTime: appt.estimatedWaitTime,
    createdAt: '',
    updatedAt: '',
  };

  // Status color codes for vertical side bar border
  const statusBorderColor: Record<string, string> = {
    CONFIRMED: 'border-l-blue-500',
    CHECKED_IN: 'border-l-amber-500',
    IN_CONSULTATION: 'border-l-purple-500',
    COMPLETED: 'border-l-green-500',
    NO_SHOW: 'border-l-slate-400',
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 border-l-4 p-5 hover:shadow-md transition-all duration-200 ${statusBorderColor[appt.status] ?? 'border-l-slate-200'
        }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 flex-1">
            {/* Top row indicators */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                <User className="h-4 w-4 text-slate-400" />
                {appt.patient?.fullName ?? 'Unknown Patient'}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
              >
                {appt.status.replace(/_/g, ' ')}
              </span>
              {appt.tokenNumber != null && (
                <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600">
                  Token #{appt.tokenNumber}
                </span>
              )}
              {appt.queuePosition != null && (
                <span className="rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  Queue Position: {appt.queuePosition}
                </span>
              )}
            </div>

            {/* Time & Phone numbers */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(appt.date)} · {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
              </span>
              {appt.patient?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {appt.patient.phone}
                </span>
              )}
            </div>

            {appt.patient && (
              <p className="text-[11px] font-bold text-slate-400">
                {appt.patient.age} yrs · {appt.patient.gender} · {appt.schedulingType} mode
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2.5">
            {appt.status === 'CONFIRMED' && (
              <>
                <Button size="sm" onClick={onManualCheckIn} loading={loading} className="!rounded-xl shadow-xs">
                  <UserCheck className="h-3.5 w-3.5" />
                  Check In
                </Button>
                <Button variant="secondary" size="sm" onClick={onNoShow} loading={loading} className="!rounded-xl text-slate-600 hover:text-slate-900">
                  <XCircle className="h-3.5 w-3.5" />
                  No Show
                </Button>
                <Button variant="danger" size="sm" onClick={onCancel} loading={cancelling} className="!rounded-xl">
                  Cancel Slot
                </Button>
              </>
            )}
            {appt.status === 'CHECKED_IN' && (
              <Button size="sm" onClick={onStart} loading={loading} className="!rounded-xl shadow-xs bg-indigo-600 hover:bg-indigo-700">
                <Play className="h-3.5 w-3.5" />
                Start Session
              </Button>
            )}
            {appt.status === 'IN_CONSULTATION' && (
              <Button size="sm" onClick={onComplete} loading={loading} className="!rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700 border-none">
                <CheckCircle className="h-3.5 w-3.5" />
                Complete
              </Button>
            )}
          </div>
        </div>

        {/* Live tracker view inside card */}
        {!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status) && (
          <div className="pt-3 border-t border-slate-55">
            <AppointmentLiveTracker appt={trackerAppt} live={live} />
          </div>
        )}
      </div>
    </div>
  );
}

