import { api } from './client';
import type { PatientDashboard, PatientProfile } from '../types';

export async function getPatientProfile() {
  const { data } = await api.get<PatientProfile>('/patient/profile');
  return data;
}

export async function createPatientProfile(payload: {
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  address?: string;
  basicHealthInfo?: string;
}) {
  const { data } = await api.post<PatientProfile>('/patient/profile', payload);
  return data;
}

export async function updatePatientProfile(payload: {
  fullName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  basicHealthInfo?: string;
}) {
  const { data } = await api.patch<PatientProfile>('/patient/profile', payload);
  return data;
}

export async function getPatientDashboard() {
  const { data } = await api.get<{ message: string; data: PatientDashboard }>(
    '/patient/dashboard',
  );
  return data.data;
}

