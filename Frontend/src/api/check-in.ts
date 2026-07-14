import { api } from './client';

export interface CheckInRequestItem {
  id: string;
  appointmentId: string;
  expiresAt: string;
  createdAt: string;
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    doctorName?: string;
  } | null;
}

export async function kioskScan(appointmentId: string) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data?: { requestId: string; expiresAt: string };
  }>('/kiosk/scan', { appointmentId });
  return data;
}

export async function getPendingCheckInRequests() {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: CheckInRequestItem[];
  }>('/appointments/check-in-requests/pending');
  return data;
}

export async function approveCheckInRequest(requestId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/check-in-requests/${requestId}/approve`,
  );
  return data;
}

export async function rejectCheckInRequest(requestId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/check-in-requests/${requestId}/reject`,
  );
  return data;
}

export async function patientCheckIn(appointmentId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/check-in`,
  );
  return data;
}

export async function doctorManualCheckIn(appointmentId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/manual-check-in`,
  );
  return data;
}

export async function startConsultation(appointmentId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/start-consultation`,
  );
  return data;
}

export async function completeAppointment(appointmentId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/complete`,
  );
  return data;
}

export async function markNoShow(appointmentId: string) {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/appointments/${appointmentId}/no-show`,
  );
  return data;
}
