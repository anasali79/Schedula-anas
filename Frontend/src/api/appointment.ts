import { api } from './client';
import type { Appointment } from '../types';

export async function bookAppointment(payload: {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const { data } = await api.post<{ message: string; data: Appointment }>(
    '/appointment',
    payload,
  );
  return data;
}

export async function getMyAppointments() {
  const { data } = await api.get<{ message: string; data: Appointment[] }>(
    '/appointment/my',
  );
  return data;
}

export async function cancelAppointment(id: string) {
  const { data } = await api.patch<{ message: string; data: Appointment }>(
    `/appointment/${id}/cancel`,
  );
  return data;
}

export async function rescheduleAppointment(
  id: string,
  payload: { doctorId: string; date: string; startTime: string; endTime: string },
) {
  const { data } = await api.patch<{ message: string; data: Appointment }>(
    `/appointment/${id}/reschedule`,
    payload,
  );
  return data;
}
