export type Role = 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface DoctorSummary {
  id: string;
  fullName: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  availabilityStatus: 'available' | 'unavailable';
}

export interface ConsultationHourBlock {
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
  slotDuration?: number;
}

export interface DoctorDetail extends DoctorSummary {
  qualification: string;
  consultationHours: Record<string, ConsultationHourBlock[]>;
  profileDetails?: string;
  allowFutureBooking?: boolean;
  maxFutureBookingDays?: number | null;
}

export interface Slot {
  startTime: string;
  endTime: string;
  status: string;
  schedulingType: string;
  maxPatients?: number;
  bookedCount?: number;
  availableCount?: number;
}

export interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  tokenNumber?: number;
  doctor: {
    id: string;
    fullName: string;
    specialization: string;
    consultationFee: number;
  } | null;
  checkedInAt: string | null;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string;
  age: number;
  gender: string;
  contactDetails: {
    phone: string;
    address?: string;
  };
  basicHealthInfo?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string;
  specialization: string;
  experience: number;
  qualification: string;
  consultationFee: number;
  profileDetails?: string;
  allowFutureBooking?: boolean;
  maxFutureBookingDays?: number | null;
}

export interface PatientDashboard {
  patientId: string;
  email: string;
  role: string;
  upcomingAppointments: number;
  pastAppointments: number;
}
