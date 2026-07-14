import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../context/AuthContext';
import { createPatientProfile } from '../../api/patient';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export function PatientProfileSetupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('MALE');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [basicHealthInfo, setBasicHealthInfo] = useState('');
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
      await createPatientProfile({
        fullName,
        age: parseInt(age, 10),
        gender,
        phone,
        address: address || undefined,
        basicHealthInfo: basicHealthInfo || undefined,
      });
      navigate('/patient');
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
            title="Complete your profile"
            subtitle="Tell us a bit about yourself to start booking appointments"
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
              required
            />
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
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              required
              minLength={10}
            />
            <Input
              label="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Basic Health Info (optional)
              </label>
              <textarea
                value={basicHealthInfo}
                onChange={(e) => setBasicHealthInfo(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Allergies, chronic conditions, etc."
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
