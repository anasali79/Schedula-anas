import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Star, Sparkles } from 'lucide-react';
import { getDoctors } from '../../api/doctor';
import { AppLayout } from '../../components/layout/AppLayout';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const SPECIALIZATIONS = [
  { value: '', label: 'All Specializations' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'dermatologist', label: 'Dermatologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'pediatrician', label: 'Pediatrician' },
  { value: 'orthopedist', label: 'Orthopedist' },
  { value: 'general physician', label: 'General Physician' },
  { value: 'gynecologist', label: 'Gynecologist' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'ent specialist', label: 'ENT Specialist' },
];

export function FindDoctorsPage() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = () => setDebouncedSearch(search);

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', debouncedSearch, specialization],
    queryFn: () =>
      getDoctors({
        search: debouncedSearch || undefined,
        specialization: specialization || undefined,
      }),
  });

  return (
    <AppLayout>
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Find Doctors</h1>
        <p className="mt-1.5 text-sm font-medium text-slate-400">Search by doctor name or browse specialties</p>
      </div>

      <Card className="mb-8 !p-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by doctor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="!py-3"
            />
          </div>
          <Select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            options={SPECIALIZATIONS}
            className="sm:w-60 !py-3"
          />
          <Button onClick={handleSearch} className="px-6 py-3">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : data?.data.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-slate-400 font-semibold">No doctors found matching your criteria.</p>
          <p className="text-xs text-slate-300 mt-1">Try refining your search terms or specialization filters.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((doctor) => (
            <Card key={doctor.id} interactive className="flex flex-col justify-between min-h-[220px]">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{doctor.fullName}</h3>
                    <p className="text-xs font-bold capitalize text-primary-500 mt-0.5">
                      {doctor.specialization}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${doctor.availabilityStatus === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}
                  >
                    {doctor.availabilityStatus === 'available' ? 'Active' : 'Offline'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    {doctor.experience} yrs experience
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    ₹{doctor.consultationFee} fee
                  </span>
                </div>
              </div>

              <Link to={`/patient/doctors/${doctor.id}`} className="mt-4 block w-full">
                <Button variant="secondary" className="w-full py-2.5 group" size="sm">
                  View & Book Appointment
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
