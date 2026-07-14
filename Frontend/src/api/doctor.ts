import { api } from './client';
import type { DoctorDetail, DoctorProfile, DoctorSummary } from '../types';

export async function getDoctors(params?: {
  search?: string;
  specialization?: string;
  page?: number;
  limit?: number;
  availability?: boolean;
}) {
  const { data } = await api.get<{
    message: string;
    data: DoctorSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>('/doctor', { params });
  return data;
}

export async function getDoctorById(id: string) {
  const { data } = await api.get<{ message: string; data: DoctorDetail }>(
    `/doctor/${id}`,
  );
  return data.data;
}

export async function getDoctorSlots(doctorId: string, date: string) {
  const { data } = await api.get<{
    message: string;
    onLeave?: boolean;
    data: import('../types').Slot[];
  }>(`/doctor/${doctorId}/slots`, { params: { date } });
  return data;
}

export async function getDoctorProfile() {
  const { data } = await api.get<DoctorProfile>('/doctor/profile');
  return data;
}

export async function createDoctorProfile(payload: {
  fullName: string;
  specialization: string;
  experience: number;
  qualification: string;
  consultationFee: number;
  profileDetails?: string;
  allowFutureBooking?: boolean;
  maxFutureBookingDays?: number | null;
}) {
  const { data } = await api.post<DoctorProfile>('/doctor/profile', payload);
  return data;
}

export interface DoctorAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  schedulingType: string;
  tokenNumber?: number;
  patient: {
    id: string;
    fullName: string;
    age: number;
    gender: string;
    phone: string;
  } | null;
  checkedInAt: string | null;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
}

export async function getDoctorAppointments(date?: string) {
  const { data } = await api.get<{
    message: string;
    data: DoctorAppointment[];
  }>('/doctor/appointments', { params: date ? { date } : undefined });
  return data;
}

export async function cancelDoctorAppointment(id: string) {
  const { data } = await api.patch<{ message: string; data: DoctorAppointment }>(
    `/doctor/appointments/${id}/cancel`,
  );
  return data;
}

export async function updateDoctorProfile(payload: {
  fullName?: string;
  specialization?: string;
  experience?: number;
  qualification?: string;
  consultationFee?: number;
  profileDetails?: string;
  allowFutureBooking?: boolean;
  maxFutureBookingDays?: number | null;
}) {
  const { data } = await api.patch<DoctorProfile>('/doctor/profile', payload);
  return data;
}

export async function getDoctorNextAvailable(
  doctorId: string,
  searchWindow?: number,
) {
  const { data } = await api.get<{
    message: string;
    data: { date: string; startTime: string; endTime: string } | null;
  }>(`/doctor/${doctorId}/next-available`, {
    params: searchWindow ? { searchWindow } : undefined,
  });
  return data;
}

