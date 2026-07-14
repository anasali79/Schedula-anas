import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export function Alert({
  type = 'error',
  message,
  onDismiss,
}: {
  type?: 'error' | 'success' | 'info';
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    error:  'border-red-100   bg-red-50/80   text-red-800',
    success:'border-emerald-100 bg-emerald-50/80 text-emerald-800',
    info:   'border-indigo-100 bg-indigo-50/80 text-indigo-800',
  };

  const iconStyles = {
    error:   'text-red-500',
    success: 'text-emerald-500',
    info:    'text-indigo-500',
  };

  const Icon = type === 'success' ? CheckCircle : type === 'info' ? Info : AlertCircle;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${styles[type]}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyles[type]}`} />
      <span className="flex-1 leading-relaxed">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto shrink-0 opacity-50 hover:opacity-100 transition">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
