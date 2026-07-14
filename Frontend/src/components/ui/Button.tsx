import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-400 shadow-sm shadow-primary-200',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-300 shadow-xs',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-300 shadow-sm shadow-red-100',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4.5 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
