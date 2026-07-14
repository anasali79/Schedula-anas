import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit2, Search, Stethoscope, Clock, ShieldCheck } from 'lucide-react';
import { getPatientDashboard, getPatientProfile, updatePatientProfile } from '../../api/patient';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../context/AuthContext';

export function PatientDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['patient-dashboard', user?.id],
    queryFn: getPatientDashboard,
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: getPatientProfile,
    enabled: !!user?.id,
  });

  return (
    <AppLayout>
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">Manage your health and appointment requests</p>
        </div>
        {profile && (
          <Button variant="secondary" size="sm" onClick={() => setShowEditProfile(true)} className="self-start sm:self-auto">
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="mb-10 grid gap-5 sm:grid-cols-2">
        <StatCard
          label="Upcoming Appointments"
          value={isLoading ? '—' : String(data?.upcomingAppointments ?? 0)}
          gradient="from-indigo-500 to-indigo-600 shadow-indigo-100"
          icon={<Calendar className="h-5 w-5 text-white" />}
        />
        <StatCard
          label="Past Consultations"
          value={isLoading ? '—' : String(data?.pastAppointments ?? 0)}
          gradient="from-violet-500 to-fuchsia-600 shadow-violet-100"
          icon={<Clock className="h-5 w-5 text-white" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card interactive className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="Find a Specialist"
              subtitle="Browse through our verified top doctors and book an appointment instantly."
            />
            <div className="my-6 flex items-center gap-3 rounded-2xl bg-indigo-50/50 p-4 text-xs font-semibold text-indigo-700">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-indigo-600" />
              <span>All registered doctors are certified practitioners.</span>
            </div>
          </div>
          <Link to="/patient/doctors" className="mt-4">
            <Button className="w-full py-3">
              <Search className="h-4 w-4" />
              Browse Doctors
            </Button>
          </Link>
        </Card>

        <Card interactive className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="My Bookings"
              subtitle="Track active appointments, view queue status, check-in, or reschedule your slot."
            />
            <div className="my-6 flex items-center gap-3 rounded-2xl bg-violet-50/50 p-4 text-xs font-semibold text-violet-700">
              <Clock className="h-5 w-5 flex-shrink-0 text-violet-600" />
              <span>Real-time estimated wait times and live queue tracking.</span>
            </div>
          </div>
          <Link to="/patient/appointments" className="mt-4">
            <Button variant="secondary" className="w-full py-3">
              <Calendar className="h-4 w-4 text-primary-600" />
              View Appointments
            </Button>
          </Link>
        </Card>
      </div>

      {showEditProfile && profile && (
        <EditPatientProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSuccess={() => {
            setShowEditProfile(false);
            queryClient.invalidateQueries({ queryKey: ['patient-profile', user?.id] });
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditPatientProfileModal({
  profile,
  onClose,
  onSuccess,
}: {
  profile: import('../../types').PatientProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [age, setAge] = useState(String(profile.age));
  const [gender, setGender] = useState(profile.gender);
  const [phone, setPhone] = useState(profile.contactDetails?.phone ?? '');
  const [address, setAddress] = useState(profile.contactDetails?.address ?? '');
  const [basicHealthInfo, setBasicHealthInfo] = useState(profile.basicHealthInfo ?? '');
  const [success, setSuccess] = useState('');

  const updateMutation = useMutation({
    mutationFn: updatePatientProfile,
    onSuccess: () => {
      setSuccess('Profile updated successfully!');
      setTimeout(() => onSuccess(), 800);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      fullName,
      age: parseInt(age, 10),
      gender,
      phone,
      address: address || undefined,
      basicHealthInfo: basicHealthInfo || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Edit Profile</h2>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Age"
              type="number"
              min={1}
              max={150}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Health Info (optional)
            </label>
            <textarea
              value={basicHealthInfo}
              onChange={(e) => setBasicHealthInfo(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 hover:border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Allergies, conditions..."
            />
          </div>
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

function StatCard({
  label,
  value,
  gradient,
  icon,
}: {
  label: string;
  value: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-tr ${gradient} p-6 text-white shadow-lg`}>
      <div className="absolute -right-6 -bottom-6 opacity-10">
        <Stethoscope className="h-32 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-white/80">{label}</p>
        <div className="rounded-xl bg-white/20 p-2 backdrop-blur-xs">{icon}</div>
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
