import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Edit2, Users, FileText, CheckSquare } from 'lucide-react';
import { getAvailabilityDashboard } from '../../api/availability';
import { getDoctorAppointments, getDoctorProfile, updateDoctorProfile } from '../../api/doctor';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../context/AuthContext';
import { todayIST, formatDate } from '../../lib/utils';

export function DoctorDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = todayIST();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: getDoctorProfile,
    enabled: !!user?.id,
  });

  const { data: appointments } = useQuery({
    queryKey: ['doctor-appointments', today, user?.id],
    queryFn: () => getDoctorAppointments(today),
    enabled: !!user?.id,
  });

  const { data: availability } = useQuery({
    queryKey: ['availability-dashboard', user?.id],
    queryFn: getAvailabilityDashboard,
    enabled: !!user?.id,
  });

  const todayAppointments = appointments?.data ?? [];
  const confirmedToday = todayAppointments.filter((a) => a.status === 'CONFIRMED').length;
  const recurringCount = availability?.recurring.length ?? 0;

  return (
    <AppLayout>
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">Manage your clinics, slots, and live queue</p>
        </div>
      </div>

      <div className="mb-10 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Today's Appointments"
          value={String(todayAppointments.length)}
          icon={<Users className="h-5 w-5 text-white" />}
          gradient="from-indigo-500 to-indigo-600 shadow-indigo-100"
        />
        <StatCard
          label="Confirmed Slots"
          value={String(confirmedToday)}
          icon={<Calendar className="h-5 w-5 text-white" />}
          gradient="from-emerald-500 to-teal-600 shadow-emerald-100"
        />
        <StatCard
          label="Weekly Scheduled Blocks"
          value={String(recurringCount)}
          icon={<Clock className="h-5 w-5 text-white" />}
          gradient="from-violet-500 to-fuchsia-600 shadow-violet-100"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card interactive>
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <h3 className="font-bold text-slate-900 text-lg">Professional Profile</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditProfile(true)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </div>
          {profile ? (
            <div className="space-y-3.5">
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">Full Name</p>
                <p className="font-bold text-slate-900 text-base mt-0.5">{profile.fullName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">Specialization</p>
                  <p className="capitalize text-indigo-600 font-semibold mt-0.5">{profile.specialization}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">Experience</p>
                  <p className="text-slate-800 font-semibold mt-0.5">{profile.experience} years</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">Qualification</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{profile.qualification}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">Consult Fee</p>
                  <p className="text-slate-900 font-bold mt-0.5">₹{profile.consultationFee}</p>
                </div>
              </div>
              {profile.profileDetails && (
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider text-xs">About</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{profile.profileDetails}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Loading profile data...</p>
          )}
        </Card>

        <Card interactive className="flex flex-col justify-between">
          <div>
            <CardHeader title="Practice Operations" subtitle="Quick access to availability templates and consultation queue." />
            <div className="my-6 space-y-4">
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <FileText className="h-5 w-5 text-indigo-500" />
                <span>Configure custom schedule overrides and set leave days.</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <CheckSquare className="h-5 w-5 text-emerald-500" />
                <span>Perform manual check-ins, complete sessions, and mark no-shows.</span>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/doctor/availability">
              <Button variant="secondary" className="w-full py-3">
                <Clock className="h-4 w-4" />
                Manage Slots
              </Button>
            </Link>
            <Link to="/doctor/appointments">
              <Button className="w-full py-3">
                <Calendar className="h-4 w-4" />
                View Queue
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {todayAppointments.length > 0 && (
        <Card className="mt-8">
          <CardHeader title="Today's Queue Preview" subtitle={formatDate(today)} />
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {todayAppointments.slice(0, 5).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between bg-white px-5 py-4 text-sm transition hover:bg-slate-50/50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{appt.patient?.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{appt.startTime.slice(0, 5)} – {appt.endTime.slice(0, 5)}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {appt.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
          {todayAppointments.length > 5 && (
            <Link to="/doctor/appointments" className="mt-4 inline-block text-sm font-bold text-primary-600 hover:text-primary-800">
              View all {todayAppointments.length} appointments →
            </Link>
          )}
        </Card>
      )}

      {showEditProfile && profile && (
        <EditDoctorProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSuccess={() => {
            setShowEditProfile(false);
            queryClient.invalidateQueries({ queryKey: ['doctor-profile', user?.id] });
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-tr ${gradient} p-6 text-white shadow-lg`}>
      <div className="absolute -right-6 -bottom-6 opacity-10">
        <Users className="h-32 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-white/80">{label}</p>
        <div className="rounded-xl bg-white/20 p-2 backdrop-blur-xs">{icon}</div>
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

// ─── Edit Doctor Profile Modal ─────────────────────────────────────────────────

const SPECIALIZATIONS = [
  'cardiologist', 'dermatologist', 'neurologist', 'pediatrician',
  'orthopedist', 'general physician', 'gynecologist', 'psychiatrist',
  'ophthalmologist', 'ent specialist',
];

function EditDoctorProfileModal({
  profile,
  onClose,
  onSuccess,
}: {
  profile: import('../../types').DoctorProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [specialization, setSpecialization] = useState(profile.specialization);
  const [experience, setExperience] = useState(String(profile.experience));
  const [qualification, setQualification] = useState(profile.qualification);
  const [consultationFee, setConsultationFee] = useState(String(profile.consultationFee));
  const [profileDetails, setProfileDetails] = useState(profile.profileDetails ?? '');
  const [allowFutureBooking, setAllowFutureBooking] = useState(profile.allowFutureBooking ?? true);
  const [maxFutureBookingDays, setMaxFutureBookingDays] = useState(
    profile.maxFutureBookingDays != null ? String(profile.maxFutureBookingDays) : ''
  );
  const [success, setSuccess] = useState('');

  const updateMutation = useMutation({
    mutationFn: updateDoctorProfile,
    onSuccess: () => {
      setSuccess('Profile updated successfully!');
      setTimeout(() => onSuccess(), 800);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      fullName,
      specialization,
      experience: parseInt(experience, 10),
      qualification,
      consultationFee: parseFloat(consultationFee),
      profileDetails: profileDetails || undefined,
      allowFutureBooking,
      maxFutureBookingDays: maxFutureBookingDays ? parseInt(maxFutureBookingDays, 10) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Edit Doctor Profile</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {updateMutation.isError && (
            <Alert message={getErrorMessage(updateMutation.error)} />
          )}
          {success && <Alert type="success" message={success} />}
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Select
            label="Specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            options={SPECIALIZATIONS.map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
            }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Experience (years)"
              type="number"
              min={0}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              min={0}
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              required
            />
          </div>
          <Input
            label="Qualification"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">About (optional)</label>
            <textarea
              value={profileDetails}
              onChange={(e) => setProfileDetails(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Brief bio, clinic info..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="allowFutureBooking"
              type="checkbox"
              checked={allowFutureBooking}
              onChange={(e) => setAllowFutureBooking(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="allowFutureBooking" className="text-sm font-medium text-slate-700">
              Allow future bookings (next days)
            </label>
          </div>
          {allowFutureBooking && (
            <Input
              label="Maximum Future Booking Days (leave empty for unlimited)"
              type="number"
              min={1}
              value={maxFutureBookingDays}
              onChange={(e) => setMaxFutureBookingDays(e.target.value)}
              placeholder="e.g. 7, 30"
            />
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
