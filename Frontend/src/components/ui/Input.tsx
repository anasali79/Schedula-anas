import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
            error ? 'border-red-400 bg-red-50/10' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
