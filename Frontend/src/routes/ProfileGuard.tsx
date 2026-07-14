import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getPatientProfile } from '../api/patient';
import { getDoctorProfile } from '../api/doctor';
import { useAuth } from '../context/AuthContext';

export function PatientProfileGuard() {
  const location = useLocation();
  const { user } = useAuth();
  const isSetupPage = location.pathname.includes('/profile/setup');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: getPatientProfile,
    enabled: user?.role === 'PATIENT' && !!user?.id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const noProfile =
    isError && axios.isAxiosError(error) && error.response?.status === 404;

  if (noProfile && !isSetupPage) {
    return <Navigate to="/patient/profile/setup" replace />;
  }

  if (data && isSetupPage) {
    return <Navigate to="/patient" replace />;
  }

  return <Outlet />;
}

export function DoctorProfileGuard() {
  const location = useLocation();
  const { user } = useAuth();
  const isSetupPage = location.pathname.includes('/profile/setup');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: getDoctorProfile,
    enabled: user?.role === 'DOCTOR' && !!user?.id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const noProfile =
    isError && axios.isAxiosError(error) && error.response?.status === 404;

  if (noProfile && !isSetupPage) {
    return <Navigate to="/doctor/profile/setup" replace />;
  }

  if (data && isSetupPage) {
    return <Navigate to="/doctor" replace />;
  }

  return <Outlet />;
}
