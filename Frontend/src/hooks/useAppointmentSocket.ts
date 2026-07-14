import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_EVENTS = [
  'appointment.checked_in',
  'appointment.consultation_started',
  'appointment.completed',
  'appointment.cancelled',
  'appointment.no_show',
  'check_in.request',
  'queue.updated',
  'queue.position.updated',
  'doctor.status.board',
] as const;

export interface QueuePositionUpdate {
  patientId: string;
  yourToken: number | null;
  peopleAhead: number;
  estimatedWait: string;
}

export interface DoctorQueueUpdate {
  doctorId: string;
  currentServing: {
    appointmentId: string;
    token: number | null;
    startTime: string;
    patientName: string;
  } | null;
  next: Array<{
    appointmentId: string;
    token: number | null;
    startTime: string;
    patientName: string;
  }>;
  waitingCount: number;
}

export interface DoctorStatusBoard {
  current: string;
  next: string;
  status: 'IN_PROGRESS' | 'IDLE';
}

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function useAppointmentSocket(
  role: 'DOCTOR' | 'PATIENT' | null,
  entityId: string | undefined,
  onRefresh: () => void,
  onCheckInRequest?: () => void,
) {
  const [connected, setConnected] = useState(false);
  const [queuePosition, setQueuePosition] = useState<QueuePositionUpdate | null>(null);
  const [doctorQueue, setDoctorQueue] = useState<DoctorQueueUpdate | null>(null);
  const [statusBoard, setStatusBoard] = useState<DoctorStatusBoard | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const onCheckInRequestRef = useRef(onCheckInRequest);
  onRefreshRef.current = onRefresh;
  onCheckInRequestRef.current = onCheckInRequest;

  useEffect(() => {
    if (!role || !entityId) return;

    const socket = io(`${getSocketBaseUrl()}/appointments`, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const room =
        role === 'DOCTOR' ? `doctor:${entityId}` : `patient:${entityId}`;
      socket.emit('join_room', { room });
    });

    socket.on('disconnect', () => setConnected(false));

    const refresh = () => onRefreshRef.current();

    for (const event of SOCKET_EVENTS) {
      if (event.startsWith('appointment.')) {
        socket.on(event, refresh);
      }
    }

    socket.on('check_in.request', () => {
      onCheckInRequestRef.current?.();
      refresh();
    });

    socket.on('queue.position.updated', (payload: QueuePositionUpdate) => {
      setQueuePosition(payload);
      refresh();
    });

    socket.on('queue.updated', (payload: DoctorQueueUpdate) => {
      setDoctorQueue(payload);
      refresh();
    });

    socket.on('doctor.status.board', (payload: DoctorStatusBoard) => {
      setStatusBoard(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [role, entityId]);

  return { connected, queuePosition, doctorQueue, statusBoard };
}
