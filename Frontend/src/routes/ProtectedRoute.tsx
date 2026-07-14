import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const redirect = user.role === 'DOCTOR' ? '/doctor' : '/patient';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (user) {
    const redirect = user.role === 'DOCTOR' ? '/doctor' : '/patient';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
