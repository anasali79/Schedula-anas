import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, getErrorMessage } from '../../context/AuthContext';
import { createDoctorProfile } from '../../api/doctor';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const SPECIALIZATIONS = [
  'cardiologist',
  'dermatologist',
  'neurologist',
  'pediatrician',
  'orthopedist',
  'general physician',
  'gynecologist',
  'psychiatrist',
  'ophthalmologist',
  'ent specialist',
];

export function DoctorProfileSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0]);
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [profileDetails, setProfileDetails] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Complete Profile | Schedula';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createDoctorProfile({
        fullName,
        specialization,
        experience: parseInt(experience, 10),
        qualification,
        consultationFee: parseFloat(consultationFee),
        profileDetails: profileDetails || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['doctor-profile', user?.id] });
      navigate('/doctor');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader
            title="Complete your doctor profile"
            subtitle="Set up your professional details for patients to find you"
          />

          {error && (
            <div className="mb-4">
              <Alert message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. John Doe"
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
            <Input
              label="Years of Experience"
              type="number"
              min={0}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
            />
            <Input
              label="Qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="MBBS, MD Cardiology"
              required
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              min={0}
              step="0.01"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                About (optional)
              </label>
              <textarea
                value={profileDetails}
                onChange={(e) => setProfileDetails(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief bio, clinic info..."
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Save Profile
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
