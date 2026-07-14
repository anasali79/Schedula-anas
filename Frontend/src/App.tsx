import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './routes/ProtectedRoute';
import { PatientProfileGuard, DoctorProfileGuard } from './routes/ProfileGuard';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { PatientDashboardPage } from './pages/patient/DashboardPage';
import { PatientProfileSetupPage } from './pages/patient/ProfileSetupPage';
import { FindDoctorsPage } from './pages/patient/FindDoctorsPage';
import { DoctorDetailPage } from './pages/patient/DoctorDetailPage';
import { MyAppointmentsPage } from './pages/patient/MyAppointmentsPage';
import { DoctorDashboardPage } from './pages/doctor/DashboardPage';
import { DoctorProfileSetupPage } from './pages/doctor/ProfileSetupPage';
import { DoctorAvailabilityPage } from './pages/doctor/AvailabilityPage';
import { DoctorAppointmentsPage } from './pages/doctor/AppointmentsPage';
import { KioskPage } from './pages/kiosk/KioskPage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['PATIENT']} />}>
              <Route element={<PatientProfileGuard />}>
                <Route path="/patient" element={<PatientDashboardPage />} />
                <Route
                  path="/patient/profile/setup"
                  element={<PatientProfileSetupPage />}
                />
                <Route path="/patient/doctors" element={<FindDoctorsPage />} />
                <Route
                  path="/patient/doctors/:doctorId"
                  element={<DoctorDetailPage />}
                />
                <Route
                  path="/patient/appointments"
                  element={<MyAppointmentsPage />}
                />
              </Route>
            </Route>

            <Route element={<ProtectedRoute roles={['DOCTOR']} />}>
              <Route element={<DoctorProfileGuard />}>
                <Route path="/doctor" element={<DoctorDashboardPage />} />
                <Route
                  path="/doctor/profile/setup"
                  element={<DoctorProfileSetupPage />}
                />
                <Route
                  path="/doctor/availability"
                  element={<DoctorAvailabilityPage />}
                />
                <Route
                  path="/doctor/appointments"
                  element={<DoctorAppointmentsPage />}
                />
              </Route>
            </Route>

            <Route path="/kiosk" element={<KioskPage />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
