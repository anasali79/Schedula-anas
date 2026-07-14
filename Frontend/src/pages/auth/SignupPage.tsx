import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage, useAuth } from '../../context/AuthContext';
import { AuthLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Role } from '../../types';
import { Stethoscope, UserRound, Eye, EyeOff } from 'lucide-react';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('PATIENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signup(name, email, password, role);
      const profilePath =
        user.role === 'DOCTOR' ? '/doctor/profile/setup' : '/patient/profile/setup';
      navigate(profilePath);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account ✨</h2>
          <p className="mt-1.5 text-sm text-slate-400 font-medium">Join Schedula — book smarter, wait less</p>
        </div>

        {error && (
          <div className="mb-6">
            <Alert message={error} onDismiss={() => setError('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            maxLength={100}
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 bottom-2.5 text-slate-400 hover:text-slate-600 transition"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'PATIENT', label: 'Patient', icon: UserRound, desc: 'Book appointments' },
                { value: 'DOCTOR', label: 'Doctor', icon: Stethoscope, desc: 'Manage practice' },
              ] as { value: Role; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[]).map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition-all duration-200 ${
                    role === r.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-100'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <r.icon className={`h-6 w-6 ${role === r.value ? 'text-primary-600' : 'text-slate-400'}`} />
                  <span>{r.label}</span>
                  <span className="text-[10px] font-medium opacity-60">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full py-3 mt-2 text-base" loading={loading}>
            Create Account
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium">Already a member?</span>
          </div>
        </div>

        <Link to="/login">
          <button className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
            Sign in instead
          </button>
        </Link>
      </div>
    </AuthLayout>
  );
}
