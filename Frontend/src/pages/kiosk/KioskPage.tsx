import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { kioskScan } from '../../api/check-in';
import { getErrorMessage } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

function parseAppointmentId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.appointmentId && typeof parsed.appointmentId === 'string') {
      return parsed.appointmentId;
    }
  } catch {
    // not JSON — treat as plain UUID
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return trimmed;

  return null;
}

export function KioskPage() {
  const [scanInput, setScanInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const appointmentId = parseAppointmentId(scanInput);
    if (!appointmentId) {
      setError('Invalid QR data. Paste JSON from QR or appointment UUID.');
      return;
    }

    setLoading(true);
    try {
      const result = await kioskScan(appointmentId);
      setMessage(result.message);
      setScanInput('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white">
          <ScanLine className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Schedula Hospital Kiosk</h1>
        <p className="mt-2 text-slate-400">Scan patient QR — approval sent to their phone</p>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader
          title="Scan QR Code"
          subtitle="Patient must approve on their phone before check-in"
        />

        {message && (
          <div className="mb-4">
            <Alert type="success" message={message} />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert message={error} />
          </div>
        )}

        <form onSubmit={handleScan} className="space-y-4">
          <Input
            label="QR scan result / Appointment ID"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder='{"appointmentId":"..."} or paste UUID'
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            <ScanLine className="h-4 w-4" />
            Send Check-in Request
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Check-in will NOT happen until the patient taps Approve on their app.
        </p>
      </Card>
    </div>
  );
}
