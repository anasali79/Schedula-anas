import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  LogOut,
  Stethoscope,
  User,
  Menu,
  X,
  LayoutDashboard,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isPatient = user?.role === 'PATIENT';
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* ── Top Nav Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link
            to={isPatient ? '/patient' : '/doctor'}
            onClick={closeMenu}
            className="flex items-center gap-2.5 transition active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-500 text-white shadow-md">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Schedula
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-1.5">
              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                {isPatient ? (
                  <>
                    <NavLink to="/patient" label="Dashboard" />
                    <NavLink to="/patient/doctors" label="Find Doctors" />
                    <NavLink to="/patient/appointments" label="My Appointments" />
                  </>
                ) : (
                  <>
                    <NavLink to="/doctor" label="Dashboard" />
                    <NavLink to="/doctor/availability" label="Availability" />
                    <NavLink to="/doctor/appointments" label="Queue" />
                  </>
                )}
              </nav>

              {/* Desktop right side: name + bell + logout */}
              <div className="hidden md:flex items-center gap-2 border-l border-slate-100 pl-4 ml-1">
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{user.name}</span>
                </div>
                {isPatient && <NotificationBell />}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile notification bell */}
              {isPatient && (
                <div className="flex md:hidden">
                  <NotificationBell />
                </div>
              )}

              {/* Hamburger toggle (mobile only) */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:hidden transition active:scale-95"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Drawer — rendered at document body via portal ─── */}
      {user &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={closeMenu}
            />

            {/* Slide-in drawer panel */}
            <div
              className={`fixed right-0 top-0 bottom-0 z-[201] w-[82%] max-w-xs bg-white shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-out ${
                mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-500 text-white shadow-sm">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <span className="text-base font-extrabold text-slate-900">Schedula</span>
                </div>
                <button
                  onClick={closeMenu}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User profile card */}
              <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/60 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-500 text-white text-sm font-extrabold shadow">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mt-0.5">
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                {isPatient ? (
                  <>
                    <MobileNavLink
                      to="/patient"
                      label="Dashboard"
                      icon={<LayoutDashboard className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                    <MobileNavLink
                      to="/patient/doctors"
                      label="Find Doctors"
                      icon={<Search className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                    <MobileNavLink
                      to="/patient/appointments"
                      label="My Appointments"
                      icon={<Calendar className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                  </>
                ) : (
                  <>
                    <MobileNavLink
                      to="/doctor"
                      label="Dashboard"
                      icon={<LayoutDashboard className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                    <MobileNavLink
                      to="/doctor/availability"
                      label="Availability"
                      icon={<Calendar className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                    <MobileNavLink
                      to="/doctor/appointments"
                      label="Queue"
                      icon={<Stethoscope className="h-4.5 w-4.5" />}
                      onClick={closeMenu}
                    />
                  </>
                )}
              </nav>

              {/* Logout button at bottom */}
              <div className="border-t border-slate-100 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-200 bg-red-50/70 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 hover:border-red-300 active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  Logout Account
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active =
    pathname === to ||
    (to !== '/doctor' && to !== '/patient' && pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  to,
  label,
  icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const { pathname } = useLocation();
  const active =
    pathname === to ||
    (to !== '/doctor' && to !== '/patient' && pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition duration-150 ${
        active
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{icon}</span>
      {label}
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/60">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50/60 via-white to-slate-100/50 px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-primary-500 text-white shadow-lg">
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Schedula</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Appointment Booking
          </p>
        </div>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
