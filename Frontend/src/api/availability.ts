import { api } from './client';

export interface RecurringSlot {
  id: string;
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  schedulingType: string;
  bufferTime?: number;
  maxPatients?: number;
}

export interface ScheduleDay {
  date: string;
  dayOfWeek: string;
  source: 'custom' | 'recurring' | 'none';
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    schedulingType?: string;
    dividedSlots: Array<{
      startTime: string;
      endTime: string;
      status: string;
      maxPatients?: number;
      bookedCount?: number;
      availableCount?: number;
    }>;
  }>;
}

export interface AvailabilityDashboard {
  doctorId: string;
  allowFutureBooking: boolean;
  maxFutureBookingDays: number | null;
  recurring: RecurringSlot[];
  customOverrides: unknown[];
  generatedSchedule: ScheduleDay[];
}

export async function getAvailabilityDashboard() {
  const { data } = await api.get<{
    message: string;
    data: AvailabilityDashboard;
  }>('/doctor/availability');
  return data.data;
}

export async function createRecurringSlot(payload: {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  schedulingType?: string;
  maxPatients?: number;
}) {
  const { data } = await api.post<{ message: string; data: RecurringSlot }>(
    '/doctor/availability',
    payload,
  );
  return data;
}

export async function deleteRecurringSlot(id: string) {
  const { data } = await api.delete<{ message: string }>(
    `/doctor/availability/${id}`,
  );
  return data;
}

export async function updateRecurringSlot(
  id: string,
  payload: {
    startTime?: string;
    endTime?: string;
    slotDuration?: number;
    schedulingType?: string;
    maxPatients?: number;
  },
) {
  const { data } = await api.patch<{ message: string; data: RecurringSlot }>(
    `/doctor/availability/${id}`,
    payload,
  );
  return data;
}

export async function setUnavailable(payload: {
  date: string;
  startTime?: string;
  endTime?: string;
}) {
  const { data } = await api.post<{
    message: string;
    rescheduledAppointments: unknown[];
  }>('/doctor/availability/unavailable', payload);
  return data;
}

export async function createCustomOverride(payload: {
  date: string;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  schedulingType?: string;
}) {
  const { data } = await api.post<{ message: string; data: unknown }>(
    '/doctor/availability/override',
    payload,
  );
  return data;
}

export async function cancelOccurrence(payload: {
  date: string;
  startTime: string;
  endTime: string;
}) {
  const { data } = await api.post<{ message: string }>(
    '/doctor/availability/cancel',
    payload,
  );
  return data;
}
