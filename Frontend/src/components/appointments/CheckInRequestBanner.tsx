import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, X } from 'lucide-react';
import {
  approveCheckInRequest,
  getPendingCheckInRequests,
  rejectCheckInRequest,
  type CheckInRequestItem,
} from '../../api/check-in';
import { getErrorMessage, useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatDate, formatTime } from '../../lib/utils';

export function CheckInRequestBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['check-in-requests', user?.id],
    queryFn: getPendingCheckInRequests,
    enabled: !!user?.id,
    refetchInterval: 15_000,
  });

  const approveMutation = useMutation({
    mutationFn: approveCheckInRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-in-requests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments', user?.id] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectCheckInRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-in-requests', user?.id] });
    },
  });

  const requests = data?.data ?? [];
  if (requests.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {requests.map((req) => (
        <RequestCard
          key={req.id}
          request={req}
          onApprove={() => approveMutation.mutate(req.id)}
          onReject={() => rejectMutation.mutate(req.id)}
          approving={approveMutation.isPending && approveMutation.variables === req.id}
          rejecting={rejectMutation.isPending && rejectMutation.variables === req.id}
          error={
            approveMutation.variables === req.id && approveMutation.isError
              ? getErrorMessage(approveMutation.error)
              : rejectMutation.variables === req.id && rejectMutation.isError
                ? getErrorMessage(rejectMutation.error)
                : undefined
          }
        />
      ))}
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
  approving,
  rejecting,
  error,
}: {
  request: CheckInRequestItem;
  onApprove: () => void;
  onReject: () => void;
  approving?: boolean;
  rejecting?: boolean;
  error?: string;
}) {
  const expires = new Date(request.expiresAt);
  const minsLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 60_000));

  return (
    <Card className="border-amber-200 bg-amber-50 !p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Check-in request at hospital</span>
          </div>
          <p className="text-sm text-amber-900">
            Someone scanned your QR code. Approve only if <strong>you</strong> are at the
            clinic right now.
          </p>
          {request.appointment && (
            <p className="mt-2 text-xs text-amber-800">
              Dr. {request.appointment.doctorName} · {formatDate(request.appointment.date)} ·{' '}
              {formatTime(request.appointment.startTime)}
            </p>
          )}
          <p className="mt-1 text-xs text-amber-600">Expires in ~{minsLeft} min</p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            loading={approving}
            disabled={rejecting}
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onReject}
            loading={rejecting}
            disabled={approving}
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Call from socket handler to refresh pending requests */
export function useRefreshCheckInRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['check-in-requests', user?.id] });
}
